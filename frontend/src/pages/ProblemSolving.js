import React, { useState, useEffect } from 'react';
import HeaderBar from '../components/layout/HeaderBar';
import ProblemList from '../components/problem-solving/ProblemList';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaFire, FaClock, FaChartLine, FaArrowLeft } from 'react-icons/fa';
import { parseJwt } from '../utils/jwt';

export default function ProblemSolving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState('list');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState({});
  const [lectureMaterials, setLectureMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [studyStats, setStudyStats] = useState(null);
  const [wrongNotes, setWrongNotes] = useState([]);
  const [slides, setSlides] = useState(location.state?.slides || []);

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

  useEffect(() => {
    if (!slides.length) return;
    // 첫 슬라이드 문제 생성
    generateProblemForSlide(slides[0]);
  }, [slides]);

  useEffect(() => {
    if (slides.length > 0 && slides[currentSlideIdx]) {
      generateProblemForSlide(slides[currentSlideIdx]);
      setAnswers({});
      setShowExplanation({});
    }
    // eslint-disable-next-line
  }, [currentSlideIdx]);

  const generateProblemForSlide = async (slide) => {
    setProblemsLoading(true);
    setLoading(true);
    try {
      // 1. 키워드 불러오기
      const token = localStorage.getItem('token');
      const keywordRes = await fetch(`http://localhost:3000/slides/${slide.slide_id}/keywords`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const keywordData = await keywordRes.json();
      const keywordId = keywordData[0]?.keyword_id;
      
      // 2. 문제 생성
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

      if (!generateRes.ok) {
        throw new Error('문제 생성에 실패했습니다.');
      }

      const generatedQuestion = await generateRes.json();
      
      // 문제 타입에 따른 처리
      let processedQuestion = {
        id: generatedQuestion.question_id,
        question: generatedQuestion.question,
        explanation: generatedQuestion.explanation,
        difficulty: generatedQuestion.difficulty,
        tags: generatedQuestion.tags || [],
        type: generatedQuestion.type
      };

      if (generatedQuestion.type === '객관식') {
        processedQuestion.options = Object.values(generatedQuestion.options);
        processedQuestion.correct = Object.keys(generatedQuestion.options).indexOf(generatedQuestion.correct_answer);
      } else if (generatedQuestion.type === '주관식') {
        processedQuestion.options = ['정답 입력'];
        processedQuestion.correct = generatedQuestion.correct_answer;
      } else if (generatedQuestion.type === '참/거짓') {
        processedQuestion.options = ['참', '거짓'];
        processedQuestion.correct = generatedQuestion.correct_answer === '참' ? 0 : 1;
      }

      setProblems([processedQuestion]);
    } catch (error) {
      console.error('Error generating problem:', error);
      alert('문제 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setProblemsLoading(false);
    }
  };

  // 문제 번호 클릭
  const handleNumberClick = (idx) => setCurrentSlideIdx(idx);

  // 이전/다음 버튼
  const handlePrev = () => setCurrentSlideIdx((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setCurrentSlideIdx((prev) => Math.min(prev + 1, slides.length - 1));

  // 보기 선택
  const handleOptionSelect = (idx) => {
    setAnswers((prev) => ({ ...prev, [currentSlideIdx]: idx }));
  };

  // 제출/중단 버튼
  const handleSubmit = () => {
    setShowConfirm(true);
  };

  // 문제풀이 중단(목록으로 이동)
  const handleStop = () => {
    setCurrentView('list');
    setSelectedDocument(null);
    setCurrentSlideIdx(0);
    setAnswers({});
    setShowResult(false);
  };

  // 제출 확인 모달
  const handleConfirmYes = async () => {
    setShowConfirm(false);
    // 마지막 문제면 결과, 아니면 다음 문제로 이동
    if (currentSlideIdx === slides.length - 1) {
      // 문제 제출 API 호출
      const token = localStorage.getItem('token');
      const payload = parseJwt(token);
      const userId = payload?.user_id;
      const problem = problems[0]; // 현재 문제
      const userAnswer = answers[currentSlideIdx];
      let answerValue = userAnswer;
      if (problem.type === '객관식' || problem.type === '참/거짓') {
        answerValue = problem.options[userAnswer];
      }
      await fetch('http://localhost:8000/quiz/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          question_id: problem.id,
          user_answer: answerValue
        })
      });
      setShowResult(true);
    } else {
      setCurrentSlideIdx((prev) => Math.min(prev + 1, slides.length - 1));
    }
  };
  const handleConfirmNo = () => setShowConfirm(false);

  // 결과 화면에서 새로운 문제 풀기 등
  const handleShowHistory = async () => {
    setShowHistory(true);
    const token = localStorage.getItem('token');
    // 오늘의 학습량
    const statsRes = await fetch('http://localhost:3000/api/study-intensity/today', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stats = await statsRes.json();
    setStudyStats(stats);
    // 오답노트
    const payload = parseJwt(token);
    const userId = payload?.user_id;
    if (userId) {
      const notesRes = await fetch(`http://localhost:8000/quiz/wrong-notes?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const notes = await notesRes.json();
      setWrongNotes(notes);
    }
  };

  const handleRestart = async () => {
    setShowResult(false);
    setCurrentView('problem');
    setAnswers({});
    setShowExplanation({});
    setProblems([]);
    setProblemsLoading(true);
    // materialId로 slides 새로 요청
    const token = localStorage.getItem('token');
    if (!selectedDocument || !selectedDocument.material_id) {
      // 예외: 선택된 문서가 없으면 목록으로 이동
      setCurrentView('list');
      setProblemsLoading(false);
      return;
    }
    const res = await fetch(`http://localhost:3000/slides/material/${selectedDocument.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const slidesData = await res.json();
    setSlides(slidesData || []);
    setCurrentSlideIdx(0);
    // 첫 슬라이드에 대해 새로운 문제 생성 (useEffect에서 자동 호출되므로 여기서 호출하지 않음)
    setProblemsLoading(false);
  };

  // 진도율 계산
  const progress = Math.round(((currentSlideIdx + 1) / slides.length) * 100);

  // 점수 계산
  const correctCount = problems.filter((p, idx) => answers[idx] === p.correct).length;
  const totalCount = problems.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const handleDocumentSelect = async (mat) => {
    setCurrentView('problem');
    setSelectedDocument(mat);
    setCurrentSlideIdx(0);
    setAnswers({});
    setShowResult(false);

    // 1. 슬라이드 목록 불러오기
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/slides/material/${mat.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const slidesData = await res.json();
    setSlides(slidesData || []);
    // 2. 첫 슬라이드에 대해 새로운 문제 생성 (useEffect에서 자동 호출되므로 여기서 호출하지 않음)
  };

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
    return (
      <div className="text-white text-center mt-20 flex flex-col items-center gap-4">
        <svg className="animate-spin h-10 w-10 text-[#346aff] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <div>문제를 생성하고 있습니다...</div>
      </div>
    );
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
          {/* 새로운 문제 풀기 버튼만 남김 */}
          <div className="flex gap-4 mb-8">
            <button className="px-6 py-3 bg-[#346aff] text-white rounded-lg font-semibold hover:bg-[#2554b0] transition" onClick={handleRestart}>새로운 문제 풀기</button>
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
                    정답: {p.type === '주관식' ? p.correct : p.options[p.correct]}
                    {answers[idx] === p.correct || answers[idx] === undefined ? null : <><br/>제출한 답: {p.type === '주관식' ? answers[idx] : p.options[answers[idx]]}</>}
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
            <FaFire className="mr-1" /> {currentSlideIdx + 1}/{slides.length} 페이지
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
      <div className="flex flex-row gap-8 w-full max-w-4xl mx-auto">
        {/* 왼쪽: 슬라이드 네비게이션 */}
        <div className="w-16 bg-[#18181b] rounded-2xl shadow flex flex-col items-center py-6 gap-2 min-h-[400px] max-h-[70vh] overflow-y-auto hide-scrollbar">
          {slides.map((slide, idx) => (
            <button
              key={slide.slide_id}
              onClick={() => setCurrentSlideIdx(idx)}
              className={
                `w-10 h-10 flex items-center justify-center rounded-full font-bold text-base border-2 transition-all duration-150 ` +
                (currentSlideIdx === idx
                  ? 'bg-[#346aff] text-white border-[#346aff] shadow-lg scale-110'
                  : 'bg-[#232329] text-[#bbbbbb] border-[#23232a] hover:bg-[#2a2a32] hover:text-[#346aff] hover:border-[#346aff]')
              }
            >
              {slide.slide_number}
            </button>
          ))}
        </div>
        {/* 문제 카드 */}
        <div className="flex-1 bg-[#232329] rounded-3xl shadow-2xl p-10 flex flex-col relative min-h-[400px]">
          {problemsLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <svg className="animate-spin h-10 w-10 text-[#346aff] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <div className="text-[#bbbbbb] text-lg">문제를 생성하고 있습니다...</div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-white mb-8 break-words whitespace-pre-line">
                {problems[0]?.question}
              </div>
              {/* 난이도 표시 */}
              <div className="mb-4">
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-900/60 text-blue-300">
                  난이도: {problems[0]?.difficulty || ''}
                </span>
              </div>
              {/* 문제 유형별 보기 */}
              <div className="flex flex-col gap-6">
                {(() => {
                  const problem = problems[0];
                  if (!problem) return null;
                  if (problem.options && problem.options.length > 1 && problem.type === '객관식') {
                    // 객관식
                    return problem.options.map((opt, oidx) => (
                      <label key={oidx} className={`flex items-center gap-4 bg-[#2a2a32] rounded-lg px-4 py-5 cursor-pointer text-lg font-medium transition-all duration-150
                        ${answers[currentSlideIdx] === oidx ? 'border-2 border-[#346aff] text-[#346aff] bg-[#2d2d35] scale-[1.03]' : 'border border-[#3a3a42] text-white hover:bg-[#2d2d35]'}
                      `}>
                        <input
                          type="radio"
                          name={`problem-${currentSlideIdx}`}
                          className="accent-[#346aff] w-6 h-6 transition-transform duration-150"
                          checked={answers[currentSlideIdx] === oidx}
                          onChange={() => handleOptionSelect(oidx)}
                        />
                        <span className="break-words whitespace-pre-line">{opt}</span>
                      </label>
                    ));
                  } else if (problem.type === '주관식') {
                    // 주관식
                    return (
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-[#346aff] text-lg bg-[#f3f4f6] text-black"
                        placeholder="정답을 입력하세요"
                        value={answers[currentSlideIdx] || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [currentSlideIdx]: e.target.value }))}
                      />
                    );
                  } else if (problem.type === '참/거짓') {
                    // 참/거짓
                    return (
                      <div className="flex gap-4">
                        {['참', '거짓'].map((opt, oidx) => (
                          <button
                            key={opt}
                            className={`px-6 py-3 rounded-lg font-semibold text-lg transition
                              ${answers[currentSlideIdx] === oidx
                                ? 'bg-[#346aff] text-white'
                                : 'bg-[#23232a] text-[#bbbbbb] border border-[#3a3a42] hover:bg-[#2d2d35]'}
                            `}
                            onClick={() => handleOptionSelect(oidx)}
                          >
                            <span className="break-words whitespace-pre-line">{opt}</span>
                          </button>
                        ))}
                      </div>
                    );
                  } else {
                    // 기타(예: 빈칸채우기 등)
                    return <div className="text-[#bbbbbb]">지원하지 않는 문제 유형입니다.</div>;
                  }
                })()}
              </div>
              {/* 태그 표시 */}
              {slides[currentSlideIdx]?.tags && slides[currentSlideIdx]?.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {slides[currentSlideIdx].tags.map((tag, idx) => (
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
                  disabled={currentSlideIdx === 0}
                  className={`px-8 py-3 rounded-lg font-semibold text-base transition
                    ${currentSlideIdx === 0 ? 'bg-[#3a3a42] text-[#bbbbbb] cursor-not-allowed' : 'bg-[#346aff] text-white hover:bg-[#2554b0]'}
                  `}
                >
                  이전 문제
                </button>
                {currentSlideIdx === slides.length - 1 ? (
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
            </>
          )}
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