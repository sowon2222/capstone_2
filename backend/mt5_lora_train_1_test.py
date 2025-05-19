from transformers import (
    AutoTokenizer, MT5ForConditionalGeneration,
    DataCollatorForSeq2Seq, TrainingArguments, Trainer
)
from datasets import Dataset
from peft import get_peft_model, LoraConfig, TaskType
import json
import torch

# ✅ 모델 설정
model_name = "google/mt5-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.padding_side = "right"

base_model = MT5ForConditionalGeneration.from_pretrained(model_name)

# ✅ LoRA 구성
lora_config = LoraConfig(
    r=8,
    lora_alpha=32,
    target_modules=["q", "v"],
    lora_dropout=0.1,
    bias="none",
    task_type=TaskType.SEQ_2_SEQ_LM
)
model = get_peft_model(base_model, lora_config)

# ✅ GPU 할당
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)
model.print_trainable_parameters()

# ✅ 데이터 로드 (빈 output 제거)
def load_jsonl_dataset(path):
    with open(path, "r", encoding="utf-8") as f:
        data = [
            json.loads(line)
            for line in f
            if "output" in json.loads(line) and len(json.loads(line)["output"].strip()) > 0
        ]
    return Dataset.from_list(data)

raw_dataset = load_jsonl_dataset("step1_from_augmented_please.jsonl")

# ✅ 토크나이징
def tokenize_function(example):
    inputs = tokenizer(
        example["input"], truncation=True, padding="max_length", max_length=512
    )
    targets = tokenizer(
        example["output"], truncation=True, padding="max_length", max_length=256
    )

    labels = [
        token if token != tokenizer.pad_token_id else -100
        for token in targets["input_ids"]
    ]
    inputs["labels"] = labels
    return inputs

processed_dataset = raw_dataset.map(tokenize_function, batched=False)

# ✅ Collator
collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model)

# ✅ 학습 설정
training_args = TrainingArguments(
    output_dir="./lora_step1_question_model",
    per_device_train_batch_size=4,
    num_train_epochs=7,
    logging_steps=50,
    save_steps=200,
    save_total_limit=2,
    logging_dir="./logs",
    report_to="none"
)

# ✅ Trainer 구성
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=processed_dataset,
    tokenizer=tokenizer,
    data_collator=collator
)

# ✅ 학습 시작
trainer.train()

# ✅ 모델 저장
model.save_pretrained("./lora_step1_question_model/lora_adapter")
tokenizer.save_pretrained("./lora_step1_question_model")
model.base_model.save_pretrained("lora_step1_question_model/base")

print("✅ 학습 완료 및 저장됨")
