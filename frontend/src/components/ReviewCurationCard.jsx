import React, { useEffect, useState } from 'react';

// 문제 텍스트 파싱 유틸
function getQuestionText(content) {
  if (!content) return '';
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return parsed.question || parsed.content || content;
    } catch {
      return content;
    }
  }
  if (typeof content === 'object') {
    return content.question || content.content || '';
  }
  return '';
}

// 슬라이드 요약/전체요약 프리픽스 제거 유틸
function getFilteredSummary(summary) {
  if (!summary) return '';
  // 모든 줄에서 '슬라이드 전체요약 :' 또는 '슬라이드 요약 :' 패턴 제거
  return summary.replace(/^슬라이드( 전체)?요약 *: */gm, '').trim();
}

function ReviewCurationCard() {
  const [cards, setCards] = useState([]);
  const [answer, setAnswer] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/report/review-curation?user_id=1&top_n=3')
      .then(res => res.json())
      .then(data => setCards(Array.isArray(data.cards) ? data.cards : []));
  }, []);

  // 데이터가 없을 때도 카드 형태의 기본 UI를 보여줌
  if (!cards.length) return (
    <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 w-full min-h-[120px] flex items-center justify-center text-[#bbbbbb] text-base">
      복습 추천 키워드가 없습니다.
    </div>
  );

  const card = cards[0];
  if (!card) return (
    <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 w-full min-h-[120px] flex items-center justify-center text-[#bbbbbb] text-base">
      복습 추천 키워드가 없습니다.
    </div>
  );

  let parsed = card.content;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = { question: card.content };
    }
  }
  const options = parsed.options
    ? Array.isArray(parsed.options)
      ? parsed.options
      : Object.values(parsed.options)
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSolution(true);
    if (card.answer !== undefined) {
      setIsCorrect(answer.trim().toLowerCase() === String(card.answer).trim().toLowerCase());
    }
  };

  return (
    <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 w-full min-h-[120px] flex flex-col gap-3">
      <div className="text-xs text-[#bbbbbb] mb-1">
        <b className="text-[#346aff]">키워드:</b> {card.keyword_name}
      </div>
      <div className="font-bold text-base text-white mb-3">
        Q. {parsed.question}
      </div>
      {options.length > 0 && (
        <ul>
          {options.map((opt, idx) => (
            <li key={idx}>{String.fromCharCode(65 + idx)}. {opt}</li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-row items-center gap-2 mb-2">
        <input
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="정답을 입력하세요"
          disabled={showSolution}
          className="px-3 py-2 rounded-lg border border-[#444] bg-[#18181b] text-white focus:outline-none focus:border-[#346aff] w-4/5 min-w-[120px]"
        />
        <button
          type="submit"
          disabled={showSolution}
          className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${showSolution ? 'bg-[#bbb] cursor-not-allowed' : 'bg-[#346aff] hover:bg-[#2554b0] cursor-pointer'}`}
        >
          제출
        </button>
        {/* 정답 여부 텍스트 */}
        {showSolution && card.answer !== undefined && (
          <span className={`ml-2 font-bold ${isCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {isCorrect ? '정답!' : '오답!'}
          </span>
        )}
      </form>
      {/* 해설: 정답 제출 후에만 summary(프리픽스 제거) 노출 */}
      {showSolution && (
        <div className="text-[#bbbbbb] mt-2">
          <b className="text-white">해설:</b> {getFilteredSummary(card.summary) || '해설이 없습니다.'}
        </div>
      )}
    </div>
  );
}

export default ReviewCurationCard;