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

# 1) 한국어 불용어 로드 (예시)
korean_stopwords = set([
    "그", "이", "저", "수", "등", "및", "가", "을", "를", "에", "의", "도", "더", 
    # 필요한 만큼 추가…
])
# 2) 영어 불용어 로드 (NLTK 등에서 가져와도 됩니다)
english_stopwords = set([
    "the", "and", "is", "in", "to", "of", "for", "with", "on", "that", 
    # 필요한 만큼 추가…
])
stopwords = korean_stopwords.union(english_stopwords)

# 3) 문장 임베딩 모델 (다국어)
emb_model = SentenceTransformer('xlm-r-bert-base-nli-stsb-mean-tokens')
kw_model  = KeyBERT(model=emb_model)

def extract_keywords_mmr(text: str,
                         top_n: int = 10,
                         use_mmr: bool = True,
                         diversity: float = 0.7) -> list[str]:
    """
    KeyBERT + MMR 기반 키워드 추출 함수.
    
    Args:
        text: 원본문 텍스트
        top_n: 최종 반환할 키워드 개수
        use_mmr: MMR 알고리즘 사용 여부
        diversity: MMR 적용 시 다양성 계수 (0~1)
    """
    # 1) Kiwi로 한글 토큰화 + 명사만 추출
    kiwi    = Kiwi()
    tokens  = kiwi.tokenize(text)
    noun_tags = {"NNG", "NNP", "NNB", "NP", "NR"}
    nouns   = [tok.form for tok in tokens if tok.tag in noun_tags]
    clean_text = " ".join(nouns)
    
    # 2) KeyBERT에 불용어, MMR 옵션 전달
    keywords = kw_model.extract_keywords(
        clean_text,
        keyphrase_ngram_range=(1, 2),
        stop_words=list(stopwords),
        use_mmr=use_mmr,
        diversity=diversity,
        top_n=top_n,
        nr_candidates=top_n * 3  # 후보 풀은 최종 개수의 3배
    )
    # 3) (키워드, 점수) 튜플에서 키워드만 추출
    return [kw for kw, score in keywords]



# ───────────────────────────────────────────────────────────
# 2️⃣ Fusion Layer 정의
# ───────────────────────────────────────────────────────────
class MultiLayerCrossAttentionFusion(nn.Module):
    def __init__(self, hidden_dim, num_layers=2, num_heads=8):
        super().__init__()
        self.num_layers = num_layers
        self.cross_attentions = nn.ModuleList([
            nn.MultiheadAttention(hidden_dim, num_heads, batch_first=True)
            for _ in range(num_layers)
        ])
        self.layer_norms = nn.ModuleList([
            nn.LayerNorm(hidden_dim) for _ in range(num_layers)
        ])

    def forward(self, text_embeds, image_embeds):
        x = text_embeds
        for i in range(self.num_layers):
            res = x
            out, _ = self.cross_attentions[i](query=x, key=image_embeds, value=image_embeds)
            x = self.layer_norms[i](out + res)
        return x

# ───────────────────────────────────────────────────────────
# 3️⃣ 멀티모달 MT5 모델 정의
# ───────────────────────────────────────────────────────────
class MultiModalMT5ForInference(nn.Module):
    def __init__(self, t5_name, vit_name, adapter_dir, fusion_w):
        super().__init__()
        base = MT5ForConditionalGeneration.from_pretrained(t5_name)
        self.t5 = PeftModel.from_pretrained(
            base, adapter_dir, local_files_only=True
        )
        self.vit = ViTModel.from_pretrained(vit_name)
        for p in self.vit.parameters():
            p.requires_grad = False
        hidden_dim = self.t5.config.d_model
        self.fusion = MultiLayerCrossAttentionFusion(hidden_dim, num_layers=2)
        self.fusion.load_state_dict(
            torch.load(fusion_w, map_location=device)
        )
        self.to(device).eval()

    def encode(self, ids, mask, pix):
        img_emb = self.vit(pixel_values=pix).last_hidden_state
        txt_emb = self.t5.get_encoder().embed_tokens(ids)
        fused = self.fusion(txt_emb, img_emb)
        return self.t5.get_encoder()(inputs_embeds=fused, attention_mask=mask, return_dict=True)

    def generate(self, input_ids, attention_mask, pixel_values, **kwargs):
        enc = self.encode(input_ids, attention_mask, pixel_values)
        gen_kwargs = {
            **kwargs,
            "encoder_outputs": enc,
            "attention_mask": attention_mask,
            "decoder_start_token_id": self.t5.config.decoder_start_token_id,
        }
        return self.t5.generate(**gen_kwargs)

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
    kws = extract_keywords_mmr(txt, top_n=5)
    start_text = kws[0] if kws else ""

    prompt_template = textwrap.dedent("""\
    [KEYWORDS] {kws}
    [TEXT] {txt}
    
    위 강의자료를 아래 [SUMMARY]에 자세하고 풍부하게 요약 및 설명합니다.
    [SUMMARY]""")
    
    # 3) 실제 텍스트로 포맷팅
    prompt = prompt_template.format(
        kws=", ".join(kws),
        txt=txt
    )

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
