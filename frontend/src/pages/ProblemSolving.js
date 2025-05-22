import React, { useState } from 'react';
import HeaderBar from '../components/layout/HeaderBar';
import ProblemList from '../components/problem-solving/ProblemList';
import { useNavigate } from 'react-router-dom';
import { FaFire, FaClock, FaChartLine, FaArrowLeft } from 'react-icons/fa';

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
    correct: 1,
    explanation: '전송 계층은 데이터의 신뢰성 있는 전송을 담당합니다. TCP 프로토콜이 이 계층에서 동작합니다.'
  },
  {
    id: 2,
    question: 'TCP/IP 프로토콜 스택에서 IP 프로토콜이 속한 계층은?',
    options: ['응용 계층', '전송 계층', '인터넷 계층', '네트워크 접근 계층'],
    correct: 2,
    explanation: 'IP 프로토콜은 인터넷 계층에 속합니다. 이 계층은 데이터의 라우팅과 패킷 전달을 담당합니다.'
  },
  // ...더 추가 가능
];

export default function ProblemSolving() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('list');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState({});

  // 문제풀이 시작
  const handleDocumentSelect = (doc) => {
    setSelectedDocument(doc);
    setCurrentView('problem');
    setCurrentProblem(0);
    setAnswers({});
    setShowResult(false);
  };

  // 문제 번호 클릭
  const handleNumberClick = (idx) => setCurrentProblem(idx);

  // 이전/다음 버튼
  const handlePrev = () => setCurrentProblem((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setCurrentProblem((prev) => Math.min(prev + 1, mockProblems.length - 1));

  // 보기 선택
  const handleOptionSelect = (idx) => {
    setAnswers((prev) => ({ ...prev, [currentProblem]: idx }));
  };

  // 제출/중단 버튼
  const handleSubmit = () => setShowConfirm(true);
  const handleStop = () => {
    setCurrentView('list');
    setSelectedDocument(null);
    setCurrentProblem(0);
    setAnswers({});
    setShowResult(false);
  };

  // 제출 확인 모달
  const handleConfirmYes = () => {
    setShowConfirm(false);
    setShowResult(true);
  };
  const handleConfirmNo = () => setShowConfirm(false);

  // 결과 화면에서 새로운 문제 풀기 등
  const handleRestart = () => {
    setShowResult(false);
    setCurrentView('list');
    setSelectedDocument(null);
    setCurrentProblem(0);
    setAnswers({});
    setShowExplanation({});
  };

  // 점수 계산
  const correctCount = mockProblems.filter((p, idx) => answers[idx] === p.correct).length;
  const totalCount = mockProblems.length;
  const score = Math.round((correctCount / totalCount) * 100);

  // 오답노트용 데이터
  const wrongNotes = mockProblems
    .map((p, idx) => ({
      id: p.id,
      question: p.question,
      correctAnswer: p.options[p.correct],
      userAnswer: answers[idx] !== undefined ? p.options[answers[idx]] : '미제출',
      explanation: p.explanation,
      relatedConcepts: ['네트워크', '프로토콜', 'OSI 7계층'], // 임시 데이터
      lastAttempt: new Date().toLocaleDateString()
    }))
    .filter((item) => item.userAnswer !== item.correctAnswer);

  // 오답노트와 보충학습 핸들러 추가
  const handleWrongAnswerNote = () => {
    // 오답노트 데이터를 localStorage에 저장
    localStorage.setItem('wrongAnswers', JSON.stringify(wrongNotes));
    navigate('/wrong-answers');
  };

  const handleAdditionalPractice = () => {
    // 보충학습 데이터를 localStorage에 저장
    localStorage.setItem('wrongAnswers', JSON.stringify(wrongNotes));
    navigate('/additional-practice');
  };

  // 진도율 계산
  const progress = Math.round(((currentProblem + 1) / mockProblems.length) * 100);

  if (currentView === 'list') {
    return (
      <div className="min-h-screen bg-[#18181B]">
        <HeaderBar />
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
          <ProblemList onDocumentSelect={handleDocumentSelect} />
        </div>
      </div>
    );
  }

  // 본 문제풀이 ... 결과 화면(showResult) ...점수, 정답/오답 해설, 오답 노트 보기, 보충학습 하기 포함함
  if (showResult) {
    return (
      <div className="min-h-screen bg-[#18181B]">
        <HeaderBar />
        <div className="flex flex-col items-center py-16">
          {/* 점수 */}
          <div className="bg-[#232329] rounded-2xl p-8 mb-8 w-full max-w-2xl shadow">
            <div className="text-4xl font-bold text-[#556BF5] mb-4">{score}점</div>
            <div className="flex justify-between mb-4">
              <span className="text-[#bbbbbb]">정답: {correctCount} / {totalCount}</span>
            </div>
          </div>
          {/* 정답/오답 해설 */}
          <div className="w-full max-w-2xl space-y-6 mb-8">
            {mockProblems.map((p, idx) => (
              <div
                key={p.id}
                className={`rounded-xl p-6 bg-[#232329] border-2 ${answers[idx] === p.correct ? 'border-green-500' : 'border-red-500'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white">
                    정답: {p.options[p.correct]}
                    {!p.options[answers[idx]] || answers[idx] === p.correct ? null : <><br/>제출한 답: {p.options[answers[idx]]}</>}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold
                    ${answers[idx] === p.correct
                      ? 'bg-green-900/60 text-green-300'
                      : 'bg-red-900/60 text-red-300'}
                  `}>
                    {answers[idx] === p.correct ? '정답' : '오답'}
                  </span>
                </div>
                <button
                  className="text-[#556BF5] font-semibold mt-2"
                  onClick={() => setShowExplanation((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                >
                  {showExplanation[idx] ? '해설 숨기기' : '해설 보기'}
                </button>
                {showExplanation[idx] && (
                  <div className="mt-4 p-4 bg-[#18181B] rounded-lg text-[#bbbbbb]">
                    {p.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* 하단 버튼 */}
          <div className="flex gap-4 mt-8">
            <button className="px-6 py-3 bg-[#346aff] text-white rounded-lg font-semibold hover:bg-[#2554b0] transition" onClick={handleRestart}>새로운 문제 풀기</button>
            <button className="px-6 py-3 bg-[#346aff] text-white rounded-lg font-semibold hover:bg-[#2554b0] transition" onClick={handleWrongAnswerNote}>오답 노트 보기</button>
            <button className="px-6 py-3 bg-[#346aff] text-white rounded-lg font-semibold hover:bg-[#2554b0] transition" onClick={handleAdditionalPractice}>보충학습 하기</button>
          </div>
        </div>
      </div>
    );
  }

  /*문제풀이 화면 - 카드형 문제제*/  
  return (
    <div className="min-h-screen bg-[#18181B] flex flex-col items-center py-16">
      {/* 상단: 중단(목록으로) 버튼 + 뱃지 */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-8 px-2">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-transparent text-[#bbbbbb] rounded-xl font-semibold hover:bg-[#232329] border border-[#3a3a42] transition"
          onClick={handleStop}
        >
          <FaArrowLeft className="text-lg" /> 목록으로
        </button>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-900/80 text-orange-300 text-sm font-semibold">
            <FaFire className="mr-1" /> {currentProblem + 1}/{mockProblems.length} 페이지
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-900/80 text-blue-300 text-sm font-semibold">
            <FaClock className="mr-1" /> 12분 학습
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-900/80 text-green-300 text-sm font-semibold">
            <FaChartLine className="mr-1" /> 진도율 {progress}%
          </span>
        </div>
      </div>
      {/* 문제 카드 + 네비게이션 */}
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl">
        {/* 왼쪽: 네비게이션 (md 이상에서만) */}
        <div className="hidden md:flex flex-col items-center gap-4 pt-2">
          <div className="flex flex-col gap-2">
            {mockProblems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleNumberClick(idx)}
                className={`w-12 h-12 rounded-xl font-bold border text-lg transition-all duration-150
                  ${currentProblem === idx
                    ? 'bg-[#346aff] text-white border-[#346aff] shadow-lg scale-105'
                    : 'bg-[#232329] text-[#bbbbbb] border-[#3a3a42] hover:bg-[#2a2a32] hover:shadow-[0_0_0_2px_#346aff]'}
                `}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
        {/* 모바일: 네비게이션 카드 위에 */}
        <div className="flex md:hidden flex-row justify-center gap-2 mb-4">
          {mockProblems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleNumberClick(idx)}
              className={`w-10 h-10 rounded-xl font-bold border text-base transition-all duration-150
                ${currentProblem === idx
                  ? 'bg-[#346aff] text-white border-[#346aff] shadow-lg scale-105'
                  : 'bg-[#232329] text-[#bbbbbb] border-[#3a3a42] hover:bg-[#2a2a32] hover:shadow-[0_0_0_2px_#346aff]'}
              `}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        {/* 문제 카드 */}
        <div className="bg-[#232329] rounded-3xl shadow-2xl p-10 w-full flex flex-col relative">
          <div className="text-2xl font-bold text-white mb-8">{mockProblems[currentProblem].question}</div>
          <div className="flex flex-col gap-6">
            {mockProblems[currentProblem].options.map((opt, oidx) => (
              <label key={oidx} className={`flex items-center gap-4 bg-[#2a2a32] rounded-lg px-4 py-5 cursor-pointer text-lg font-medium transition-all duration-150
                ${answers[currentProblem] === oidx ? 'border-2 border-[#346aff] text-[#346aff] bg-[#2d2d35] scale-[1.03]' : 'border border-[#3a3a42] text-white hover:bg-[#2d2d35]'}
              `}>
                <input
                  type="radio"
                  name={`problem-${currentProblem}`}
                  className="accent-[#346aff] w-6 h-6 transition-transform duration-150"
                  checked={answers[currentProblem] === oidx}
                  onChange={() => handleOptionSelect(oidx)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {/* 카드 내부: 이전/다음(또는 제출) 버튼만 */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrev}
              disabled={currentProblem === 0}
              className={`px-8 py-3 rounded-lg font-semibold text-base transition
                ${currentProblem === 0 ? 'bg-[#3a3a42] text-[#bbbbbb] cursor-not-allowed' : 'bg-[#346aff] text-white hover:bg-[#2554b0]'}
              `}
            >
              이전 문제
            </button>
            {currentProblem === mockProblems.length - 1 ? (
              <button
                className="px-8 py-3 bg-[#346aff] text-white rounded-lg font-semibold hover:bg-[#2554b0] transition"
                onClick={handleSubmit}
              >
                제출 하기
              </button>
            ) : (
              <button
                className="px-8 py-3 rounded-lg font-semibold text-base transition bg-[#346aff] text-white hover:bg-[#2554b0]"
                onClick={handleNext}
              >
                다음 문제
              </button>
            )}
          </div>
        </div>
      </div>
      {/* 제출 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-[#232329] rounded-xl p-8 shadow-lg flex flex-col items-center min-w-[320px]">
            <div className="text-lg font-bold mb-6 text-white">정말 제출하시겠습니까?</div>
            <div className="flex gap-4">
              <button
                className="px-6 py-2 bg-[#346aff] text-white rounded-lg font-semibold hover:bg-[#2554b0] transition"
                onClick={handleConfirmYes}
              >
                예
              </button>
              <button
                className="px-6 py-2 bg-[#3a3a42] text-white rounded-lg font-semibold hover:bg-[#232329] transition"
                onClick={handleConfirmNo}
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 