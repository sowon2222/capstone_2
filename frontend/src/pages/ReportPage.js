import React, { useState } from 'react';
// 필요하면 import axios from 'axios';
// 또는 services 폴더의 함수 import

function GrowthReportPage() {
  // 백지 복습 평가 관련 상태
  const [blankInput, setBlankInput] = useState('');
  const [blankResult, setBlankResult] = useState(null);

  // 성장 추이 리포트 관련 상태
  const [report, setReport] = useState(null);

  // 백지 복습 평가 API 호출 예시
  const handleBlankReview = async () => {
    // 실제 API 주소/데이터로 수정!
    // const res = await axios.post('http://localhost:8000/blank-review', { answer: blankInput });
    // setBlankResult(res.data);
  };

  // 성장 추이 리포트 API 호출 예시
  const handleFetchReport = async () => {
    // const res = await axios.get('http://localhost:3000/api/study-intensity/today');
    // setReport(res.data);
  };

  return (
    <div>
      <h2>성장 추이 리포트</h2>
      {/* 1. 백지 복습 평가 */}
      <section>
        <h3>백지 복습 평가</h3>
        <textarea value={blankInput} onChange={e => setBlankInput(e.target.value)} />
        <button onClick={handleBlankReview}>평가하기</button>
        {blankResult && (
          <div>
            <div>유사도: {blankResult.similarity}</div>
            <div>GPT 평가: {blankResult.gpt_score}</div>
            <div>피드백: {blankResult.feedback}</div>
          </div>
        )}
      </section>
      {/* 2. 성장 추이 리포트 */}
      <section>
        <h3>성장 추이</h3>
        <button onClick={handleFetchReport}>리포트 불러오기</button>
        {report && (
          <div>
            <div>날짜: {report.date}</div>
            <div>학습 강도: {report.intensity_score}</div>
            {/* 그래프 등 추가 가능 */}
          </div>
        )}
      </section>
    </div>
  );
}

export default GrowthReportPage;
