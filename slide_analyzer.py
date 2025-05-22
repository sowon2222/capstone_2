# slide_analyzer.py
import fitz
import openai
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import networkx as nx
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from konlpy.tag import Okt
import os
import tempfile
from typing import List, Dict, Any
from dotenv import load_dotenv
import csv

# .env 파일을 자동으로 읽어서 환경변수로 등록
load_dotenv()

router = APIRouter()

openai.api_key = os.getenv("OPENAI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

print("OPENAI_API_KEY:", os.environ.get("OPENAI_API_KEY"))

def load_stopwords(filepath="stopwords-ko.txt"):
    with open(filepath, encoding="utf-8") as f:
        return set(line.strip() for line in f if line.strip())
STOPWORDS = load_stopwords()

def extract_texts_from_pdf(pdf_path: str) -> List[str]:
    try:
        texts = []
        doc = fitz.open(pdf_path)
        for page in doc:
            page_text = page.get_text()
            texts.append(page_text)
        return texts
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF 텍스트 추출 실패: {str(e)}")

def extract_title_from_pdf(pdf_path: str) -> str:
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return "제목없음"
        first_page = doc[0]
        text = first_page.get_text("text")
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        return lines[0] if lines else "제목없음"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF 제목 추출 실패: {str(e)}")

def get_top_n_tfidf_nouns(text, n=30, stopwords=None):
    okt = Okt()
    nouns = [word for word in okt.nouns(text) if len(word) > 1 and (not stopwords or word not in stopwords)]
    with open("nouns.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["명사"])
        for noun in nouns:
            writer.writerow([noun])
    doc = " ".join(nouns)
    vectorizer = TfidfVectorizer()
    tfidf = vectorizer.fit_transform([doc])
    scores = dict(zip(vectorizer.get_feature_names_out(), tfidf.toarray()[0]))
    top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:n]
    with open("tfidf_scores.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["명사", "TF-IDF 점수"])
        for k, v in top:
            writer.writerow([k, v])
    return set([k for k, v in top]), dict(scores)

def extract_subtopics_and_keywords_with_llm(text, api_key, n_sub=4, n_kw=12):
    prompt = f'''
아래 강의자료 전체 내용을 읽고,
1. 이 자료의 소주제(중요한 {n_sub}개)를 뽑아줘.
2. 각 소주제별로 학문적으로 중요한 개념어(명사형, 전문용어, 원리, 조건 등) {n_kw}개씩 뽑아줘.
3. 반드시 아래와 같은 JSON 구조로만 반환해줘.

예시:
{{
  "소주제1": ["개념어1", "개념어2", ...],
  "소주제2": ["개념어1", ...],
  "소주제3": [...],
  "소주제4": [...]
}}

실제 입력:
{text}
'''
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1200,
            api_key=api_key
        )
        result = response['choices'][0]['message']['content']
        data = json.loads(result)
        with open("llm_keywords.csv", "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["LLM 개념어"])
            for subtopic, keywords in data.items():
                for kw in keywords:
                    writer.writerow([kw])
        return data
    except Exception as e:
        print(f"LLM 소주제/개념어 추출 오류: {e}")
        return {}

def get_keyword_descriptions(keywords, text, api_key):
    # LLM에 한 번에 여러 개 요청(최대 10~15개씩)
    desc_dict = {}
    batch = list(keywords)
    for i in range(0, len(batch), 10):
        sub = batch[i:i+10]
        prompt = f"""
아래 강의자료에서 다음 용어들의 간단한 정의/설명을 1~2문장씩 JSON으로 반환해줘.
용어: {json.dumps(sub, ensure_ascii=False)}
강의자료:
{text}
예시:
{{"용어1": "설명1", "용어2": "설명2", ...}}
"""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=800,
                api_key=api_key
            )
            result = response['choices'][0]['message']['content']
            descs = json.loads(result)
            desc_dict.update(descs)
        except Exception as e:
            print(f"LLM 설명 생성 오류: {e}")
    return desc_dict

def get_keyword_importance(keywords, text, api_key):
    # LLM에게 각 용어의 학술적 중요도를 1~5점으로 평가하게 함
    prompt = f"""
아래 강의자료에서 다음 용어들의 학술적 중요도를 1~5점(5가 가장 중요)으로 평가해서 JSON으로 반환해줘.
용어: {json.dumps(list(keywords), ensure_ascii=False)}
강의자료:
{text}
예시:
{{"용어1": 5, "용어2": 3, ...}}
"""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=800,
            api_key=api_key
        )
        result = response['choices'][0]['message']['content']
        imp_dict = json.loads(result)
        return imp_dict
    except Exception as e:
        print(f"LLM 중요도 평가 오류: {e}")
        return {k: 3 for k in keywords}

def get_keyword_relations(keywords, text, api_key):
    # LLM에게 용어쌍 간 관계유형(상위-하위, 원인-결과 등) 추론
    rels = []
    pairs = [(a, b) for i, a in enumerate(keywords) for b in keywords[i+1:]]
    for i in range(0, len(pairs), 10):
        sub = pairs[i:i+10]
        prompt = f"""
아래 강의자료에서 다음 용어쌍의 관계유형(상위-하위, 원인-결과, 동의어, 관련없음 등)을 JSON으로 반환해줘.
예시: [["용어1", "용어2"], ...]
강의자료:
{text}
예시 반환:
[["용어1", "용어2", "관계유형"], ...]
용어쌍:
{sub}
"""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=800,
                api_key=api_key
            )
            result = response['choices'][0]['message']['content']
            rels += json.loads(result)
        except Exception as e:
            print(f"LLM 관계 추론 오류: {e}")
    return rels

def build_subtopic_network(subtopic_dict, main_title, tfidf_nouns, tfidf_scores, desc_dict, imp_dict, rels):
    G = nx.DiGraph()  # 방향 그래프로 변경
    freq_counter = Counter()
    all_keywords = set()
    subtopic_id_map = {}
    for subtopic, keywords in subtopic_dict.items():
        all_keywords.update(keywords)
        # 소주제 id는 15자 이내로 자르고, description에 전체 소주제
        short_id = subtopic.split('.')[0][:15]
        subtopic_id_map[subtopic] = short_id
        G.add_node(short_id, type="subtopic", label=short_id, description=subtopic)
    # 중앙 노드(제목)
    G.add_node(main_title, type="main", label=main_title, description="강의자료 제목")
    for subtopic, keywords in subtopic_dict.items():
        short_id = subtopic_id_map[subtopic]
        # 방향: main_title -> short_id (중심개념에서 소주제로)
        G.add_edge(main_title, short_id, type="main2subtopic", label="소주제")
        for kw in keywords:
            G.add_node(kw, type="keyword",
                       label=kw,
                       description=desc_dict.get(kw, ""),
                       importance=imp_dict.get(kw, 3),
                       tfidf=tfidf_scores.get(kw, 0))
            G.add_edge(short_id, kw, type="subtopic2keyword", label="핵심개념")
            freq_counter[kw] += 1
    # 관계유형 엣지 추가 (방향성 없음)
    for a, b, rel in rels:
        if a in all_keywords and b in all_keywords and rel != "관련없음":
            G.add_edge(a, b, type=rel, label=rel)
    # 노드/엣지 정보
    nodes = []
    for n, d in G.nodes(data=True):
        if d.get("type") == "main":
            nodes.append({
                "id": n,
                "group": 1,
                "label": d.get("label", n),
                "size": 70,
                "color": "#2b7ce9",
                "font": {"size": 30},
                "description": d.get("description", "")
            })
        elif d.get("type") == "subtopic":
            nodes.append({
                "id": n,
                "group": 2,
                "label": d.get("label", n),
                "size": 45,
                "color": "#7ec7f7",
                "font": {"size": 22},
                "description": d.get("description", "")
            })
        else:
            freq = freq_counter[n]
            nodes.append({
                "id": n,
                "group": 3,
                "label": d.get("label", n),
                "size": 18 + freq * 6 + d.get("importance", 3) * 2,
                "color": "#f9ab00",
                "font": {"size": 14 + freq * 2 + d.get("importance", 3)},
                "description": d.get("description", ""),
                "importance": d.get("importance", 3),
                "tfidf": d.get("tfidf", 0)
            })
    edges = []
    for u, v, d in G.edges(data=True):
        edges.append({
            "source": u,
            "target": v,
            "type": d.get("type", "rel"),
            "color": "#2b7ce9" if d.get("type") == "main2subtopic" else ("#7ec7f7" if d.get("type") == "subtopic2keyword" else "#aaa"),
            "label": d.get("label", "")
        })
    freq_table = [{
        "term": k,
        "freq": v,
        "importance": imp_dict.get(k, 3),
        "description": desc_dict.get(k, "")
    } for k, v in freq_counter.most_common()]
    return nodes, edges, freq_table

@router.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
    
    # 임시 파일 생성
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        try:
            # 파일 저장
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            
            # PDF 분석
            slide_texts = extract_texts_from_pdf(temp_file.name)
            joined_text = "\n".join(slide_texts)
            main_title = extract_title_from_pdf(temp_file.name)
            
            # 1. LLM 소주제/개념어 추출
            try:
                subtopic_dict = extract_subtopics_and_keywords_with_llm(joined_text, OPENAI_API_KEY, n_sub=4, n_kw=12)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"LLM 분석 실패: {str(e)}")
            
            # 2. TF-IDF 상위 명사 추출
            try:
                tfidf_nouns, tfidf_scores = get_top_n_tfidf_nouns(joined_text, n=30, stopwords=STOPWORDS)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"TF-IDF 분석 실패: {str(e)}")
            
            # 3. LLM+TF-IDF 혼합 필터링 (최소 10개씩 보장, LLM 결과를 더 많이 반영)
            filtered_subtopic_dict = {}
            for subtopic, keywords in subtopic_dict.items():
                filtered_keywords = [kw for kw in keywords if kw in tfidf_nouns]
                # 최소 10개까지 LLM 결과에서 채우기
                if len(filtered_keywords) < 10:
                    filtered_keywords += [kw for kw in keywords if kw not in filtered_keywords][:10-len(filtered_keywords)]
                filtered_subtopic_dict[subtopic] = filtered_keywords[:10]  # 최대 10개까지만 사용
            
            all_keywords = set()
            for kws in filtered_subtopic_dict.values():
                all_keywords.update(kws)
            
            # 4. 개념어별 설명/정의
            try:
                desc_dict = get_keyword_descriptions(all_keywords, joined_text, OPENAI_API_KEY)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"개념어 설명 생성 실패: {str(e)}")
            
            # 5. 개념어별 중요도 점수
            try:
                imp_dict = get_keyword_importance(all_keywords, joined_text, OPENAI_API_KEY)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"개념어 중요도 분석 실패: {str(e)}")
            
            # 6. 개념어 간 관계유형 추론
            try:
                rels = get_keyword_relations(list(all_keywords), joined_text, OPENAI_API_KEY)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"개념어 관계 분석 실패: {str(e)}")
            
            # 7. 네트워크 생성
            try:
                nodes, edges, freq_table = build_subtopic_network(
                    filtered_subtopic_dict, main_title, tfidf_nouns, tfidf_scores, desc_dict, imp_dict, rels
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"네트워크 생성 실패: {str(e)}")
            
            with open("final_keywords.csv", "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["최종 개념어"])
                for subtopic, keywords in filtered_subtopic_dict.items():
                    for kw in keywords:
                        writer.writerow([kw])
            
            return {
                "nodes": nodes,
                "edges": edges,
                "main_title": main_title,
                "freq_table": freq_table
            }
            
        except Exception as e:
            import traceback
            print("PDF 분석 중 오류 발생:", e)
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"PDF 분석 중 오류 발생: {str(e)}")
        finally:
            # 임시 파일 삭제
            try:
                os.unlink(temp_file.name)
            except:
                pass  # 임시 파일 삭제 실패는 무시