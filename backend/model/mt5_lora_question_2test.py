from transformers import MT5Tokenizer, MT5ForConditionalGeneration
from peft import PeftModel
import torch, re

# ✅ 환경 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
tokenizer = MT5Tokenizer.from_pretrained("google/mt5-base")

# ✅ 1단계 모델 로딩 (문제 + 보기)
base_model_1 = MT5ForConditionalGeneration.from_pretrained("google/mt5-base")
model_1 = PeftModel.from_pretrained(base_model_1, "./lora_step1_question_model/lora_adapter")
model_1 = model_1.merge_and_unload().to(device).eval()

# ✅ 2단계 모델 로딩 (정답 + 해설)
base_model_2 = MT5ForConditionalGeneration.from_pretrained("google/mt5-base")
model_2 = PeftModel.from_pretrained(base_model_2, "./lora_step2_answer_model/lora_adapter")
model_2 = model_2.merge_and_unload().to(device).eval()

# ✅ 입력 슬라이드 요약 예시
slide_summary = "IP 데이터그램은 다양한 제어 정보와 데이터를 담기 위해 여러 필드로 구성됩니다. 주요 필드에는 버전, 헤더 길이, 서비스 유형, 전체 길이, 식별자, 플래그, 프래그먼트 오프셋, TTL, 상위 계층 프로토콜, 체크섬, 출발지 및 목적지 IP 주소, 옵션, 데이터가 포함됩니다. TCP와 함께 사용될 경우 20바이트의 IP 헤더와 20바이트의 TCP 헤더로 인해 총 40바이트의 오버헤드가 발생합니다. 이미지 설명 그림에는 IP 데이터그램 구조는 상단부터 하단까지 여러 필드로 나뉘며, 각 필드는 32비트 단위로 구성되어 있습니다. 왼쪽 상단에는 IP 프로토콜 버전 번호와 헤더 길이 필드가 있으며, 중앙에는 데이터 유형, 전체 데이터그램 길이, 식별자, 플래그 및 프래그먼트 오프셋이 나열되어 있습니다. 그 아래에는 TTL, 상위 계층 프로토콜, 체크섬 필드가 있고, 이어서 32비트의 출발지 및 목적지 IP 주소 필드가 나옵니다. 마지막 부분에는 옵션 필드와 실제 데이터가 배치되어 있습니다. 좌측 하단에는 TCP 사용 시 발생하는 오버헤드 크기를 20바이트(IP) + 20바이트(TCP)로 계산한 설명이 박스로 강조되어 있습니다."


# ✅ 1단계 프롬프트: 문제 + 보기
prompt1 = (
    "다음 내용을 바탕으로 객관식 문제와 보기 A~D를 생성하세요.\n"
    "보기는 반드시 A, B, C, D 순서로 포함되어야 하며, 각 보기 문장은 간결하게 작성하세요.\n"
    "보기는 문제와 중복되지 않도록 주의하세요.\n\n"
    + slide_summary
)
inputs1 = tokenizer(prompt1, return_tensors="pt", truncation=True, max_length=512).to(device)

outputs1 = model_1.generate(
    inputs1["input_ids"],
    max_length=512,           
    num_beams=5,
    repetition_penalty=1.2,
    no_repeat_ngram_size=3,
    early_stopping=True
)

step1_result = tokenizer.decode(outputs1[0], skip_special_tokens=False)
step1_result = re.sub(r"<extra_id_\d+>", "", step1_result).replace("<pad>", "").replace("</s>", "").strip()
print("\n📘 [1단계] 문제 + 보기:\n", step1_result)

# ✅ 2단계 프롬프트: 정답 + 해설
prompt2 = (
    "다음 문제에 대해 정답과 해설을 생성하세요.\n"
    "정답은 반드시 보기 중 하나를 정확히 선택하고, 해설은 한 문장 이상으로 구체적으로 작성하세요.\n\n"
    + step1_result
)
inputs2 = tokenizer(prompt2, return_tensors="pt", truncation=True, max_length=512).to(device)

outputs2 = model_2.generate(
    inputs2["input_ids"],
    max_length=384,
    num_beams=4,
    no_repeat_ngram_size=3,
    repetition_penalty=1.2,
    early_stopping=True
)

step2_result = tokenizer.decode(outputs2[0], skip_special_tokens=False)
step2_result = re.sub(r"<extra_id_\d+>", "", step2_result).replace("<pad>", "").replace("</s>", "").strip()
print("\n📙 [2단계] 정답 + 해설:\n", step2_result)

# ✅ 최종 출력
print("\n✅ 최종 문제 완성:\n")
print(step1_result + "\n" + step2_result)

# 예: '정답: A 해설: 흐름 제어는 ~' 형태인지 확인
match = re.match(r"정답:\s*(.*?)\s*해설:\s*(.*)", step2_result)
if match:
    answer, explanation = match.groups()
    print(f"정답: {answer}\n해설: {explanation}")
else:
    print("⚠️ 정답/해설 구조가 잘못됨:", step2_result)

