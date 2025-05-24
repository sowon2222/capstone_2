import React, { useEffect, useState } from 'react';
import { parseJwt } from '../utils/jwt';

const WrongNotesPage = () => {
  const [wrongNotes, setWrongNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const userId = parseJwt(token)?.user_id;

  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:8000/quiz/wrong-notes?user_id=${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setWrongNotes(data || []))
      .finally(() => setLoading(false));
  }, [userId, token]);

  const getDisplayAnswer = (answer, options, type) => {
    if (!answer) return answer;
    if ((type === '객관식' || type === '참/거짓') && options) {
      if (typeof answer === 'string' && answer.length === 1 && options[answer]) {
        return options[answer];
      }
      if (Object.values(options).includes(answer)) {
        return answer;
      }
    }
    return answer;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className="min-h-screen bg-[#18181B] pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">전체 오답노트</h1>
        {loading ? (
          <div className="text-white text-center py-20">로딩 중...</div>
        ) : wrongNotes.length === 0 ? (
          <div className="text-[#bbbbbb] text-center py-20">오답노트가 없습니다.</div>
        ) : (
          <div className="space-y-6">
            {wrongNotes.filter(note => !note.is_correct).map((note, idx) => (
              <div key={note.question_id || idx} className="bg-[#232329] rounded-xl p-6 shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">{note.question}</h3>
                    <span className="text-xs text-blue-400 font-semibold ml-2">
                      문제 유형: {note.type || '알 수 없음'}
                    </span>
                  </div>
                  <span className="text-sm text-[#bbbbbb]">
                    문제풀이 일자: {formatDate(note.attempt_date)}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">정답:</span>{' '}
                      {getDisplayAnswer(note.correct_answer, note.options, note.type)}
                    </p>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">제출한 답:</span>{' '}
                      {getDisplayAnswer(note.user_answer, note.options, note.type)}
                    </p>
                  </div>
                  <div className="p-4 bg-[#18181B] rounded-lg">
                    <p className="text-[#bbbbbb]">{note.explanation}</p>
                  </div>
                  {note.material_title && (
                    <div className="text-xs text-[#bbbbbb]">자료명: {note.material_title}</div>
                  )}
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">관련 개념</h4>
                    <div className="flex flex-wrap gap-2">
                      {(note.relatedConcepts || note.keywords || []).map((concept, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-900/60 text-blue-200 rounded-full text-sm"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WrongNotesPage; 