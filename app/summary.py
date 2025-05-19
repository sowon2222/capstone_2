import os
import torch
import torch.nn as nn
from PIL import Image
from transformers import (
    MT5Tokenizer,
    MT5ForConditionalGeneration,
    ViTModel,
    ViTImageProcessor,
)
from peft import PeftModel
from keybert import KeyBERT
import textwrap

# 디바이스 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ───────────────────────────────────────────────────────────
# 1️⃣ 키워드 추출 함수
# ───────────────────────────────────────────────────────────
def extract_noun_chunk_keywords(text, top_n=7):
    kw_model = KeyBERT()
    keywords = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1,2),
        stop_words=None,
        top_n=top_n
    )
    return [kw for kw, _ in keywords]

# ───────────────────────────────────────────────────────────
# 2️⃣ Fusion Layer 정의
# ───────────────────────────────────────────────────────────
class MultiLayerCrossAttentionFusion(nn.Module):
    def __init__(self, hidden_dim, num_layers=2, num_heads=8):
        super().__init__()
        self.cross_attentions = nn.ModuleList([
            nn.MultiheadAttention(hidden_dim, num_heads, batch_first=True)
            for _ in range(num_layers)
        ])
        self.layer_norms = nn.ModuleList([
            nn.LayerNorm(hidden_dim) for _ in range(num_layers)
        ])

    def forward(self, text_embeds, image_embeds):
        x = text_embeds
        for attn, ln in zip(self.cross_attentions, self.layer_norms):
            res = x
            out, _ = attn(query=x, key=image_embeds, value=image_embeds)
            x = ln(out + res)
        return x

# ───────────────────────────────────────────────────────────
# 3️⃣ 멀티모달 MT5 모델 정의
# ───────────────────────────────────────────────────────────
class MultiModalMT5ForInference(nn.Module):
    def __init__(self, t5_name, vit_name, adapter_dir, fusion_w):
        super().__init__()
        base = MT5ForConditionalGeneration.from_pretrained(t5_name)
        self.t5 = PeftModel.from_pretrained(base, adapter_dir, local_files_only=True)
        self.vit = ViTModel.from_pretrained(vit_name)
        for p in self.vit.parameters():
            p.requires_grad = False

        hidden_dim = self.t5.config.d_model
        self.fusion = MultiLayerCrossAttentionFusion(hidden_dim, num_layers=2)
        self.fusion.load_state_dict(torch.load(fusion_w, map_location=device))

        self.to(device).eval()

    def encode(self, ids, mask, pix):
        img_emb = self.vit(pixel_values=pix).last_hidden_state
        txt_emb = self.t5.get_encoder().embed_tokens(ids)
        fused = self.fusion(txt_emb, img_emb)
        return self.t5.get_encoder()(
            inputs_embeds=fused,
            attention_mask=mask,
            return_dict=True
        )

    def generate(self, input_ids, attention_mask, pixel_values, **kwargs):
        enc_outputs = self.encode(input_ids, attention_mask, pixel_values)
        return self.t5.generate(
            encoder_outputs=enc_outputs,
            attention_mask=attention_mask,
            decoder_start_token_id=self.t5.config.decoder_start_token_id,
            **kwargs
        )

# ───────────────────────────────────────────────────────────
# 4️⃣ 모델 초기화
# ───────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model", "text_summary_model")

ADAPTER_DIR    = os.path.join(MODEL_DIR, "lora_weights")
FUSION_WEIGHTS = os.path.join(MODEL_DIR, "fusion_weights.pt")
TOKENIZER_DIR  = MODEL_DIR

T5_NAME  = "google/mt5-base"
VIT_NAME = "google/vit-base-patch16-224-in21k"

tokenizer     = MT5Tokenizer.from_pretrained(TOKENIZER_DIR, local_files_only=True)
vit_processor = ViTImageProcessor.from_pretrained(VIT_NAME)
mm_model      = MultiModalMT5ForInference(
    T5_NAME,
    VIT_NAME,
    ADAPTER_DIR,
    FUSION_WEIGHTS
)

# ───────────────────────────────────────────────────────────
# 5️⃣ 요약 함수
# ───────────────────────────────────────────────────────────
def summarize_slide(image: Image.Image, text: str) -> str:
    """
    - image: PIL.Image 객체
    - text : OCR로 추출된 텍스트
    """
    kws = extract_noun_chunk_keywords(text)
    first_kw = kws[0] if kws else ""
    prompt = textwrap.dedent(f"""
        요약: '{first_kw}'로 시작하여, 강의자료의 핵심 내용을 간결하게 정리합니다.
        내용: {text}
        키워드: {', '.join(kws)}
    """).strip()

    # 1) 텍스트 토큰화
    enc = tokenizer(
        prompt,
        return_tensors="pt",
        padding="max_length",
        truncation=True,
        max_length=512
    ).to(device)

    # 2) 이미지 임베딩
    pix = vit_processor(images=image, return_tensors="pt").pixel_values.to(device)

    # 3) 생성
    out_ids = mm_model.generate(
        input_ids=enc.input_ids,
        attention_mask=enc.attention_mask,
        pixel_values=pix,
        max_new_tokens=150,
        num_beams=4,
        no_repeat_ngram_size=2,
        early_stopping=True,
        repetition_penalty=1.2,
    )

    return tokenizer.decode(out_ids[0], skip_special_tokens=True).strip()
