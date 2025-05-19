from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import fitz
import numpy as np
from PIL import Image
import easyocr
from app.summary import summarize_slide
import torch
import os

router = APIRouter()

use_gpu = torch.cuda.is_available()
ocr_reader = easyocr.Reader(['ko', 'en'], gpu=use_gpu)

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
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # OCR
        results = ocr_reader.readtext(np.array(img))
        text = " ".join([res[1] for res in results]).strip()

        if not text:
            summaries.append("(텍스트 없음)")
        else:
            # 바로 PIL.Image 객체와 text를 넘겨서 요약
            try:
                summary = summarize_slide(img, text)
            except Exception as e:
                summary = f"(요약 중 오류: {e})"
            summaries.append(summary)

    return JSONResponse({"filename": file.filename, "summaries": summaries})
