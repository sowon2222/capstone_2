//답안 채점 결과 표시 컴포넌트
//문제 풀이 결과 채점, 틀린 문제 목록 제공
//보충학습 버튼 포함
import React, { useState, useEffect } from 'react';

const AnswerCheck = ({ onWrongAnswers, onAdditionalPractice }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState({});

  useEffect(() => {
    // TODO: API 호출하여 답안 채점 결과 가져오기
    const fetchResults = async () => {
      try {
        // 임시 데이터
        const mockResults = [
          {
            id: 1,
            question: 'OSI 7계층에서 전송 계층의 주요 역할은?',
            options: [
              '데이터의 전송 경로 설정',
              '데이터의 신뢰성 있는 전송',
              '데이터의 암호화',
              '데이터의 압축',
            ],
            userAnswer: 1,
            correctAnswer: 1,
            explanation: '전송 계층은 데이터의 신뢰성 있는 전송을 담당합니다. TCP 프로토콜이 이 계층에서 동작합니다.',
            isCorrect: true,
          },
          {
            id: 2,
            question: 'TCP/IP 프로토콜 스택에서 IP 프로토콜이 속한 계층은?',
            options: [
              '인터넷 계층',
              '인터넷 계층',
              '인터넷 계층',
              '인터넷 계층',
            ],
            userAnswer: 1,
            correctAnswer: 2,
            explanation: 'IP 프로토콜은 인터넷 계층에 속합니다. 이 계층은 데이터의 라우팅과 패킷 전달을 담당합니다.',
            isCorrect: false,
          },
        ];
        setResults(mockResults);
        setLoading(false);

        // 틀린 문제 목록 전달
        const wrongAnswers = mockResults.filter((result) => !result.isCorrect);
        onWrongAnswers(wrongAnswers);
      } catch (error) {
        console.error('답안 채점 결과를 불러오는데 실패했습니다:', error);
        setLoading(false);
      }
    };

    fetchResults();
  }, [onWrongAnswers]);

  const toggleExplanation = (problemId) => {
    setShowExplanation((prev) => ({
      ...prev,
      [problemId]: !prev[problemId],
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const correctCount = results.filter((result) => result.isCorrect).length;
  const totalCount = results.length;
  const score = Math.round((correctCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">채점 결과</h2>
        <div className="flex items-center justify-between mb-6">
          <div className="text-4xl font-bold text-blue-600">{score}점</div>
          <div className="text-gray-600">
            정답: {correctCount} / {totalCount}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.id}
            className={`bg-white border rounded-lg p-6 ${
              result.isCorrect ? 'border-green-500' : 'border-red-500'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium">{result.question}</h3>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  result.isCorrect
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {result.isCorrect ? '정답' : '오답'}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-medium">정답:</span>{' '}
                {result.options[result.correctAnswer]}
              </p>
              {!result.isCorrect && (
                <p className="text-gray-600">
                  <span className="font-medium">제출한 답:</span>{' '}
                  {result.options[result.userAnswer]}
                </p>
              )}
            </div>
            <button
              onClick={() => toggleExplanation(result.id)}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              {showExplanation[result.id] ? '해설 숨기기' : '해설 보기'}
            </button>
            {showExplanation[result.id] && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{result.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={onAdditionalPractice}
          className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          보충학습 시작하기
        </button>
      </div>
    </div>
  );
};

export default AnswerCheck; 