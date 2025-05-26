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
    <div className="w-full max-w-2xl" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      margin: '0 auto',
      width: '100%'
    }}>
      <div style={{
        border: '1px solid #23232a', // 카드 테두리 색
        borderRadius: 8,
        padding: 16,
        background: '#23232a',      // 카드 바탕색(배경색)
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: 8,
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'center',
        color: '#fff',              // 카드 내 글씨색
        fontSize: 16
      }}>
        복습 추천 키워드가 없습니다.
      </div>
    </div>
  );

  const card = cards[0];
  if (!card) return (
    <div className="w-full max-w-2xl" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      margin: '0 auto',
      width: '100%'
    }}>
      <div style={{
        border: '1px solid #23232a', // 카드 테두리 색
        borderRadius: 8,
        padding: 16,
        background: '#23232a',      // 카드 바탕색(배경색)
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: 8,
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'center',
        color: '#fff',              // 카드 내 글씨색
        fontSize: 16
      }}>
        복습 추천 키워드가 없습니다.
      </div>
    </div>
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSolution(true);
    if (card.answer !== undefined) {
      setIsCorrect(answer.trim().toLowerCase() === String(card.answer).trim().toLowerCase());
    }
  };

  return (
    <div className="w-full max-w-2xl" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      margin: '0 auto',
      width: '100%'
    }}>
      <div key={card.question_id} style={{
        border: '1px solid #23232a', // 카드 테두리 색
        borderRadius: 8,
        padding: 16,
        background: '#23232a',      // 카드 바탕색(배경색)
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: 8,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
          <b>키워드:</b> {card.keyword_name}
        </div>
        <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
          Q. {getQuestionText(card.content)}
        </div>
        <form onSubmit={handleSubmit} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="정답을 입력하세요"
            style={{
              padding: '8px',
              border: '1px solid #bbb',
              borderRadius: 4,
              width: '50%',
              marginRight: 8,
              color: '#000'
            }}
            disabled={showSolution}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              marginRight: 8,
              fontSize: 16,
              height: 40,
              minWidth: 90
            }}
            disabled={showSolution}
          >
            제출
          </button>
          {/* 정답 여부 텍스트 */}
          {showSolution && card.answer !== undefined && (
            <span style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
              {isCorrect ? (
                <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 14 }}>정답!</span>
              ) : (
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14 }}>오답!</span>
              )}
            </span>
          )}
        </form>
        {/* 해설: 정답 제출 후에만 summary(프리픽스 제거) 노출 */}
        {showSolution && (
          <div style={{ color: '#fff', marginBottom: 4 }}>
            <b>해설:</b> {getFilteredSummary(card.summary) || '해설이 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewCurationCard;