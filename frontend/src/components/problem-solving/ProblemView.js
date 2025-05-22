//문제 풀이 페이지 메인 컴포넌트
//선택된 강의자료의 문제 목록 표시, 문제 풀이 진행 상황 표시
//문제 풀이 결과 제출 및 다음 문제 이동 기능 제공
import React, { useState, useEffect } from 'react';
import Timer from '../common/Timer';

const ProblemView = ({ document, onSubmit }) => {
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API 호출하여 선택된 강의자료의 문제 목록 가져오기
    const fetchProblems = async () => {
      try {
        // 임시 데이터
        const mockProblems = [
          {
            id: 1,
            question: 'OSI 7계층에서 전송 계층의 주요 역할은?',
            options: [
              '데이터의 전송 경로 설정',
              '데이터의 신뢰성 있는 전송',
              '데이터의 암호화',
              '데이터의 압축',
            ],
            correctAnswer: 1,
          },
          {
            id: 2,
            question: 'TCP/IP 프로토콜 스택에서 IP 프로토콜이 속한 계층은?',
            options: ['응용 계층', '전송 계층', '인터넷 계층', '네트워크 접근 계층'],
            correctAnswer: 2,
          },
        ];
        setProblems(mockProblems);
        setLoading(false);
      } catch (error) {
        console.error('문제를 불러오는데 실패했습니다:', error);
        setLoading(false);
      }
    };

    fetchProblems();
  }, [document]);

  const handleAnswerSelect = (problemId, answerIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [problemId]: answerIndex,
    }));
  };

  const handleNext = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentProblem = problems[currentProblemIndex];

  return (
    <div className="max-w-4xl mx-auto">
      {/* 상단 네비게이션 버튼 */}
      <div className="flex justify-center gap-4 mb-8">
        <button className="px-6 py-2.5 bg-[#23232a] text-[#bbbbbb] rounded-lg font-semibold hover:bg-[#346aff] hover:text-white transition-colors">
          오답 노트
        </button>
        <button className="px-6 py-2.5 bg-[#23232a] text-[#bbbbbb] rounded-lg font-semibold hover:bg-[#346aff] hover:text-white transition-colors">
          보충학습
        </button>
        <button className="px-6 py-2.5 bg-[#23232a] text-[#bbbbbb] rounded-lg font-semibold hover:bg-[#346aff] hover:text-white transition-colors">
          다른 문제 풀기
        </button>
      </div>

      {/* 문제 카드 */}
      <div className="bg-[#23232a] rounded-2xl shadow-lg p-8">
        {/* 상단 정보 */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#18181b]">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white">
              {currentProblemIndex + 1} / {problems.length}
            </span>
            <div className="text-sm text-[#bbbbbb] bg-[#18181b] px-3 py-1 rounded-full">
              {Object.keys(answers).length}/{problems.length} 문제 풀이 완료
            </div>
          </div>
          <Timer initialTime={0} className="text-lg font-semibold text-[#346aff]" />
        </div>

        {/* 문제 내용 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6 text-white">
            {currentProblem.question}
          </h2>
          <div className="space-y-4">
            {currentProblem.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-5 rounded-xl cursor-pointer transition-all
                  ${
                    answers[currentProblem.id] === index
                      ? 'bg-[#346aff] text-white'
                      : 'bg-[#18181b] text-[#bbbbbb] hover:bg-[#346aff] hover:text-white'
                  }`}
              >
                <input
                  type="radio"
                  name={`problem-${currentProblem.id}`}
                  checked={answers[currentProblem.id] === index}
                  onChange={() => handleAnswerSelect(currentProblem.id, index)}
                  className="w-5 h-5 mr-4"
                />
                <span className="text-lg">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-[#18181b]">
          <button
            onClick={handlePrevious}
            disabled={currentProblemIndex === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors
              ${
                currentProblemIndex === 0
                  ? 'bg-[#18181b] text-[#bbbbbb] cursor-not-allowed'
                  : 'bg-[#23232a] text-white hover:bg-[#346aff]'
              }`}
          >
            이전 문제
          </button>
          <div className="flex gap-3">
            {currentProblemIndex === problems.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== problems.length}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors
                  ${
                    Object.keys(answers).length !== problems.length
                      ? 'bg-[#18181b] text-[#bbbbbb] cursor-not-allowed'
                      : 'bg-[#346aff] text-white hover:brightness-110'
                  }`}
              >
                답안 제출
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-[#346aff] text-white rounded-lg font-semibold hover:brightness-110 transition-colors"
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

export default ProblemView; 