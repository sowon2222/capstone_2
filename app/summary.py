import os
import torch
from transformers import MT5Tokenizer, MT5ForConditionalGeneration
from peft import PeftModel

# 설정
ADAPTER_PATH = "model/text_summary_model"
BASE_MODEL   = "google/mt5-base"
DEVICE       = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 토크나이저 및 mT5-LoRA 모델 로드
print("🔄 모델 로드 중...")
tokenizer  = MT5Tokenizer.from_pretrained(ADAPTER_PATH)
base_model = MT5ForConditionalGeneration.from_pretrained(BASE_MODEL)
model      = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.to(DEVICE)
model.eval()
print("✅ 모델 로드 완료")


def summarize_text(text: str) -> str:
    """
    주어진 텍스트를 요약하여 반환합니다.
    """
    # 1) 입력 텍스트 토크나이징 (명시적으로 text 키워드 사용)
    inputs = tokenizer(
        text=text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=512
    )
    # 2) 텐서를 모델이 위치한 장치로 이동
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    # 3) 요약 생성
    with torch.no_grad():
        output_ids = model.generate(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            max_length=256,
            min_length=30,
            decoder_start_token_id=tokenizer.pad_token_id,
            num_beams=5,
            no_repeat_ngram_size=6,
            early_stopping=True
        )

    # 4) 디코딩 및 특수 토큰 제거
    summary = tokenizer.decode(output_ids[0], skip_special_tokens=True)
    summary = summary.replace("<extra_id_0>", "").strip()
    return summary
