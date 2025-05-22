import streamlit as st
import requests

st.title("기출문제 자동 생성 테스트")

slide_title = st.text_input("슬라이드 제목")
concept_explanation = st.text_area("개념 설명")
image_description = st.text_input("이미지 설명")
keywords = st.text_input("주요 키워드 (쉼표로 구분)")
important_sentences = st.text_area("중요 문장 (줄바꿈으로 구분)")
slide_summary = st.text_area("슬라이드 전체 요약")
slide_id = st.number_input("슬라이드 ID", min_value=1, value=1)
keyword_id = st.number_input("키워드 ID", min_value=1, value=1)

if st.button("문제 생성 요청"):
    data = {
        "slide_title": slide_title,
        "concept_explanation": concept_explanation,
        "image_description": image_description,
        "keywords": [k.strip() for k in keywords.split(",") if k.strip()],
        "important_sentences": [s.strip() for s in important_sentences.split("\n") if s.strip()],
        "slide_summary": slide_summary,
        "slide_id": slide_id,
        "keyword_id": keyword_id
    }
    response = requests.post("http://localhost:8000/generate_and_register", json=data)
    st.write(response.json())