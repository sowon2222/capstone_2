from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import fitz
import numpy as np
from PIL import Image
import easyocr
from app.summary import summarize_text
import torch

router = APIRouter()


# 1) GPU 사용 가능 여부 체크
use_gpu = torch.cuda.is_available()
if use_gpu:
    print("✅ GPU 사용 가능: EasyOCR에 GPU 모드로 초기화합니다.")
else:
    print("❌ GPU 사용 불가: CPU 모드로 초기화합니다.")

# 2) OCR 리더 초기화 (ko+en)
ocr_reader = easyocr.Reader(
    ['ko', 'en'],
    gpu=use_gpu          # 여기만 True로 바뀌면 GPU 사용
)

@router.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "PDF 파일만 업로드할 수 있습니다.")

    data = await file.read()
    try:
        pdf = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        raise HTTPException(422, f"PDF 파싱 실패: {e}")

    summaries = []
    for page_number in range(pdf.page_count):
        page = pdf.load_page(page_number)
        text = page.get_text().strip()

        # 텍스트 레이어가 없으면 OCR
        if not text:
            pix = page.get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            results = ocr_reader.readtext(np.array(img))
            text = " ".join([res[1] for res in results]).strip()

        if not text:
            summaries.append("(텍스트 없음)")
        else:
            summaries.append(summarize_text(text))

    return JSONResponse({"filename": file.filename, "summaries": summaries})
