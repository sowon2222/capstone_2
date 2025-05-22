//틀린 문제 목록 표시 컴포넌트
//틀린 문제 목록 표시, 문제 복습 기능 제공
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WrongAnswerNote = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorage에서 오답노트 데이터 가져오기
    const storedWrongAnswers = localStorage.getItem('wrongAnswers');
    if (storedWrongAnswers) {
      setNotes(JSON.parse(storedWrongAnswers));
    }
    setLoading(false);
  }, []);

  const handleBack = () => {
    navigate('/problem-solving');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#18181B]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18181B]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">오답노트</h1>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-[#346aff] text-white rounded-lg hover:bg-[#2554b0] transition"
          >
            돌아가기
          </button>
        </div>
        <div className="space-y-6">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              틀린 문제가 없습니다.
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-[#232329] rounded-xl p-6 shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-white">{note.question}</h3>
                  <span className="text-sm text-gray-400">
                    문제풀이 일자: {note.lastAttempt}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">정답:</span> {note.correctAnswer}
                    </p>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">제출한 답:</span>{' '}
                      {note.userAnswer}
                    </p>
                  </div>
                  <div className="p-4 bg-[#18181B] rounded-lg">
                    <p className="text-[#bbbbbb]">{note.explanation}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">관련 개념</h4>
                    <div className="flex flex-wrap gap-2">
                      {(note.relatedConcepts || []).map((concept, index) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WrongAnswerNote; 