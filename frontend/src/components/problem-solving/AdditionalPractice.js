//보충학습 문제 풀기 컴포넌트
//틀린 문제 유형 기반의 보충학습 문제 제공
//문제 풀이 진행 상황 표시, 해설 및 관련 개념 제공
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdditionalPractice = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    // localStorage에서 오답노트 데이터 가져오기
    const storedWrongAnswers = localStorage.getItem('wrongAnswers');
    if (storedWrongAnswers) {
      const wrongAnswers = JSON.parse(storedWrongAnswers);
      // 틀린 문제 유형 기반으로 보충학습 문제 생성
      const practiceProblems = wrongAnswers.map((wrong, index) => ({
        id: index + 1,
        question: wrong.question,
        options: [
          wrong.correctAnswer,
          wrong.userAnswer,
          '보기 3',
          '보기 4'
        ],
        correctAnswer: 0,
        explanation: wrong.explanation,
        relatedConcepts: wrong.relatedConcepts
      }));
      setProblems(practiceProblems);
    }
    setLoading(false);
  }, []);

  const handleAnswerSelect = (problemId, answerIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [problemId]: answerIndex,
    }));
  };

  const handleNext = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex((prev) => prev + 1);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex((prev) => prev - 1);
      setShowExplanation(false);
    }
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
  };

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

  if (problems.length === 0) {
    return (
      <div className="min-h-screen bg-[#18181B]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">보충학습</h1>
            <button 
              onClick={handleBack}
              className="px-4 py-2 bg-[#346aff] text-white rounded-lg hover:bg-[#2554b0] transition"
            >
              돌아가기
            </button>
          </div>
          <div className="text-center py-8 text-gray-400">
            보충학습할 문제가 없습니다.
          </div>
        </div>
      </div>
    );
  }

  const currentProblem = problems[currentProblemIndex];
  const isAnswered = answers[currentProblem.id] !== undefined;
  const isCorrect = isAnswered && answers[currentProblem.id] === currentProblem.correctAnswer;

  return (
    <div className="min-h-screen bg-[#18181B]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">보충학습</h1>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-[#346aff] text-white rounded-lg hover:bg-[#2554b0] transition"
          >
            돌아가기
          </button>
        </div>

        <div className="bg-[#232329] rounded-xl p-6 shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">
              문제 {currentProblemIndex + 1} / {problems.length}
            </h3>
            <div className="text-sm text-gray-400">
              {Object.keys(answers).length} / {problems.length} 문제 풀이 완료
            </div>
          </div>

          <p className="text-lg mb-6 text-white">{currentProblem.question}</p>
          <div className="space-y-4">
            {currentProblem.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors text-white text-base font-medium
                  ${answers[currentProblem.id] === index
                    ? showExplanation
                      ? index === currentProblem.correctAnswer
                        ? 'border-green-500 bg-green-900/30 border-2'
                        : 'border-red-500 bg-red-900/30 border-2'
                      : 'border-[#346aff] bg-[#2d2d35] border-2 text-[#346aff]'
                    : 'border border-[#3a3a42] bg-[#2a2a32] hover:bg-[#2d2d35]'}
                `}
              >
                <input
                  type="radio"
                  name={`problem-${currentProblem.id}`}
                  checked={answers[currentProblem.id] === index}
                  onChange={() => handleAnswerSelect(currentProblem.id, index)}
                  className="mr-3 accent-[#346aff]"
                  disabled={showExplanation}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>

          {showExplanation && (
            <div className="mt-6 p-4 bg-[#18181B] rounded-lg">
              <h4 className="font-medium text-green-300 mb-2">해설</h4>
              <p className="text-[#bbbbbb]">{currentProblem.explanation}</p>
              <div className="mt-4">
                <h4 className="font-medium text-blue-300 mb-2">관련 개념</h4>
                <div className="flex flex-wrap gap-2">
                  {currentProblem.relatedConcepts.map((concept, index) => (
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
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentProblemIndex === 0}
              className={`px-4 py-2 rounded-lg font-semibold text-base transition
                ${currentProblemIndex === 0
                  ? 'bg-[#3a3a42] text-[#bbbbbb] cursor-not-allowed'
                  : 'bg-[#346aff] text-white hover:bg-[#2554b0]'}
              `}
            >
              이전 문제
            </button>
            {!showExplanation ? (
              <button
                onClick={handleCheckAnswer}
                disabled={!isAnswered}
                className={`px-4 py-2 rounded-lg font-semibold text-base transition
                  ${!isAnswered
                    ? 'bg-[#3a3a42] text-[#bbbbbb] cursor-not-allowed'
                    : 'bg-[#346aff] text-white hover:bg-[#2554b0]'}
                `}
              >
                답안 확인
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={currentProblemIndex === problems.length - 1}
                className={`px-4 py-2 rounded-lg font-semibold text-base transition
                  ${currentProblemIndex === problems.length - 1
                    ? 'bg-[#3a3a42] text-[#bbbbbb] cursor-not-allowed'
                    : 'bg-[#346aff] text-white hover:bg-[#2554b0]'}
                `}
              >
                다음 문제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdditionalPractice; 