import React, { useState, useEffect } from 'react';
import HeaderBar from '../components/layout/HeaderBar';
import ProblemList from '../components/problem-solving/ProblemList';
import { useNavigate } from 'react-router-dom';
import { FaFire, FaClock, FaChartLine, FaArrowLeft } from 'react-icons/fa';

export default function ProblemSolving() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('list');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState({});
  const [lectureMaterials, setLectureMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:3000/archive/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setLectureMaterials(data.materials || []);
        setLoading(false);
      });
  }, []);

  // 문제풀이 시작
  const handleDocumentSelect = async (mat) => {
    setSelectedDocument(mat);
    setCurrentView('problem');
    setCurrentProblem(0);
    setAnswers({});
    setShowResult(false);
    setProblemsLoading(true);

    const token = localStorage.getItem('token');
    try {
      // 1. 슬라이드 정보 가져오기
      const slideRes = await fetch(`http://localhost:3000/slides/material/${mat.material_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!slideRes.ok) throw new Error('슬라이드 정보를 불러오지 못했습니다.');
      const slideData = await slideRes.json();
      if (!slideData || slideData.length === 0) throw new Error('해당 강의자료에 슬라이드가 없습니다.');
      const slide = slideData[0]; // 첫 번째 슬라이드 사용

      // 2. 해당 슬라이드의 키워드 리스트 가져오기
      const keywordRes = await fetch(`http://localhost:3000/slides/${slide.slide_id}/keywords`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!keywordRes.ok) throw new Error('키워드 정보를 불러오지 못했습니다.');
      const keywordData = await keywordRes.json();
      if (!keywordData || keywordData.length === 0) throw new Error('해당 슬라이드에 연결된 키워드가 없습니다.');
      const keywordId = keywordData[0].keyword_id; // 첫 번째 키워드 사용

      // 3. 문제 생성 API 호출
      const generateRes = await fetch('http://localhost:8000/quiz/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slide_id: slide.slide_id,
          keyword_id: keywordId,
          slide_title: slide.slide_title,
          concept_explanation: slide.concept_explanation,
          image_description: slide.image_description || null,
          keywords: slide.main_keywords ? slide.main_keywords.split(',') : [],
          important_sentences: slide.important_sentences ? slide.important_sentences.split('\n') : [],
          slide_summary: slide.summary
        })
      });

      if (!generateRes.ok) throw new Error('문제 생성에 실패했습니다.');
      const generatedQuestion = await generateRes.json();

      setProblems([{
        id: generatedQuestion.question_id,
        question: generatedQuestion.question,
        options: Object.values(generatedQuestion.options),
        correct: Object.keys(generatedQuestion.options).indexOf(generatedQuestion.correct_answer),
        explanation: generatedQuestion.explanation,
        difficulty: generatedQuestion.difficulty,
        tags: generatedQuestion.tags
      }]);

    } catch (err) {
      console.error('Error:', err);
      alert('문제를 생성하는 중 오류가 발생했습니다.\\n' + err.message);
      setProblems([]);
    }
    setProblemsLoading(false);
  };

  // 문제 번호 클릭
  const handleNumberClick = (idx) => setCurrentProblem(idx);

  // 이전/다음 버튼
  const handlePrev = () => setCurrentProblem((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setCurrentProblem((prev) => Math.min(prev + 1, problems.length - 1));

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

  // 오답노트 관련 임시 데이터 제거
  const wrongNotes = problems
    .map((p, idx) => ({
      id: p.id,
      question: p.question,
      correctAnswer: typeof p.correct === 'number' ? p.options[p.correct] : p.correct,
      userAnswer: answers[idx] !== undefined ? p.options[answers[idx]] : '미제출',
      explanation: p.explanation
    }))
    .filter((item) => item.userAnswer !== item.correctAnswer);

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
  const progress = Math.round(((currentProblem + 1) / problems.length) * 100);

  // 점수 계산
  const correctCount = problems.filter((p, idx) => answers[idx] === p.correct).length;
  const totalCount = problems.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  // 본 문제풀이 ... 결과 화면(showResult) ...점수, 정답/오답 해설, 오답 노트 보기, 보충학습 하기 포함함
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#18181B]">
        <div
          className="text-2xl text-white font-bold cursor-pointer hover:underline"
          onClick={() => navigate('/login', { state: { from: '/problem-solving' } })}
        >
          로그인 후 이용하실 수 있습니다.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-white text-center mt-20">로딩 중...</div>;
  }

  if (currentView === 'list') {
    return (
      <div className="min-h-screen bg-[#18181B]">
        <HeaderBar />
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
          {lectureMaterials.length === 0 ? (
            <div className="text-white text-center">업로드된 강의자료가 없습니다.</div>
          ) : (
            lectureMaterials.map((mat) => (
              <div key={mat.material_id} className="bg-[#23232a] rounded-xl p-6 mb-6 flex justify-between items-center">
                <div>
                  <div className="text-lg font-bold text-white">{mat.title}</div>
                  <div className="text-[#bbbbbb] text-sm">페이지 수: {mat.page} | 진도율: {mat.progress}%</div>
                </div>
                <button
                  className="px-6 py-2 bg-[#346aff] text-white rounded-lg font-bold hover:bg-[#2554b0] transition"
                  onClick={() => handleDocumentSelect(mat)}
                >
                  문제풀이 시작
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 문제 데이터 로딩 중
  if (problemsLoading) {
    return <div className="text-white text-center mt-20">문제 데이터를 불러오는 중...</div>;
  }

  // 강의자료 선택 후, 문제 데이터가 없을 때
  if (problems.length === 0) {
    return <div className="text-white text-center mt-20">문제가 없습니다.</div>;
  }

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
            {problems.map((p, idx) => (
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
            <FaFire className="mr-1" /> {currentProblem + 1}/{problems.length} 페이지
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
            {problems.map((_, idx) => (
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
          {problems.map((_, idx) => (
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
          <div className="text-2xl font-bold text-white mb-8">{problems[currentProblem].question}</div>
          
          {/* 난이도 표시 */}
          <div className="mb-4">
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-900/60 text-blue-300">
              난이도: {problems[currentProblem].difficulty}
            </span>
          </div>

          {/* 보기 */}
          <div className="flex flex-col gap-6">
            {problems[currentProblem].options.map((opt, oidx) => (
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

          {/* 태그 표시 */}
          {problems[currentProblem].tags && problems[currentProblem].tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {problems[currentProblem].tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 rounded-full text-sm bg-gray-700 text-gray-300">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 이전/다음 버튼 */}
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
            {currentProblem === problems.length - 1 ? (
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