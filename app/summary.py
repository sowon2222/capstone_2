import os
import torch
import os
import torch
import torch.nn as nn
from PIL import Image
from transformers import (
    MT5ForConditionalGeneration,
    MT5Tokenizer,
    ViTModel,
    ViTImageProcessor,
)
from peft import PeftModel
from kiwipiepy import Kiwi
from keybert import KeyBERT
import textwrap

# 디바이스 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ───────────────────────────────────────────────────────────
# 1️⃣ 키워드 추출 함수
# ───────────────────────────────────────────────────────────

def extract_noun_keywords(text, top_n=7):
    kiwi = Kiwi()
    tokens = kiwi.tokenize(text)
    noun_tags = {"NNG", "NNP", "NNB", "NP", "NR"}  # 일반명사, 고유명사, 의존명사, 대명사, 수사 등 명사 관련 태그

    # 명사 단어들만 추출
    nouns = [tok.form for tok in tokens if tok.tag in noun_tags]

    # 명사만 연결해서 KeyBERT에 입력
    noun_text = " ".join(nouns)

    # KeyBERT 모델 호출
    kw_model = KeyBERT()
    keywords = kw_model.extract_keywords(
        noun_text,
        keyphrase_ngram_range=(1, 1),
        stop_words=None,
        top_n=top_n,
        diversity=0.7, 
    )
    return [kw for kw, score in keywords]

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
def summarize_slide(image: Image.Image, txt: str) -> str:
    # 1) 키워드 추출
    kws = extract_noun_keywords(txt, top_n=5)
    start_text = kws[0] if kws else ""

    # 2) 명령형 prefix 프롬프트 수정
    prompt = textwrap.dedent(f"""\  
            출력: 강의 내용에 대한 요약문을 키워드를 반드시 포함하여 간략하게 작성하세요.
            키워드: {', '.join(kws)}  
            강의 내용: {txt}

            출력:  
            1. 요약문:  
            """).strip()

    # 3) 토큰화
    enc = tokenizer(
        prompt,
        return_tensors="pt",
        padding="max_length",
        truncation=True,
        max_length=512
    ).to(device)


    # 2) 이미지 임베딩
    pix = vit_processor(images=image, return_tensors="pt").pixel_values.to(device)

    # 4) 시작 문장 토크나이징 (디코더 시작 토큰 강제)
    start_tokens = tokenizer(start_text, add_special_tokens=False, return_tensors="pt").input_ids.to(device)
    # add_special_tokens=False로 토큰만 얻음 (ex: '네트워크' -> [1234])

    # 6) generate 호출
    out_ids = mm_model.generate(
        input_ids=enc.input_ids,
        attention_mask=enc.attention_mask,
        pixel_values=pix,
        decoder_input_ids=start_tokens,
        max_new_tokens=200,
        num_beams=6,
        no_repeat_ngram_size=2,
        repetition_penalty=1.2,
        length_penalty=1.1,  # 길이에 약간 보상을 줘서 긴 문장 생성 유도
        early_stopping=True,
    )
    return tokenizer.decode(out_ids[0], skip_special_tokens=True).strip()
