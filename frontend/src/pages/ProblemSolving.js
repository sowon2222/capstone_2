import React, { useState, useEffect, useRef } from 'react';
import HeaderBar from '../components/layout/HeaderBar';
import ProblemList from '../components/problem-solving/ProblemList';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaFire, FaClock, FaChartLine, FaArrowLeft } from 'react-icons/fa';
import { parseJwt } from '../utils/jwt';
import './ProblemSolving.css';

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
  const [sessionId, setSessionId] = useState(null);
  const [prevTotalDuration, setPrevTotalDuration] = useState(0); // DB에서 불러온 누적값(초)
  const [sessionTimer, setSessionTimer] = useState(0); // 현재 세션에서 측정된 시간(초)
  const sessionTimerInterval = useRef(null);
  const [weakReviewCount, setWeakReviewCount] = useState(0); // 0~3
  const [isWeakReview, setIsWeakReview] = useState(false);
  const [showWeakReviewButton, setShowWeakReviewButton] = useState(false);

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
      })
      .catch(err => {
        console.error('[archive/list] error:', err);
      });
  }, []);

  // 번호 기반 문제 출제(1회차)
  const fetchFirstRoundProblems = async (materialId) => {
    setProblemsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/quiz/first-round?material_id=${materialId}`);
      const data = await res.json();
      setProblems(data);
    } catch (e) {
      setProblems([]);
    }
    setProblemsLoading(false);
  };

  // 보충학습(오답 번호 기반)
  const fetchReviewRoundProblems = async (materialId, wrongNumbers, solvedQuestionIds) => {
    setProblemsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/quiz/review-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: materialId, wrong_numbers: wrongNumbers, solved_question_ids: solvedQuestionIds })
      });
      const data = await res.json();
      setProblems(data);
    } catch (e) {
      setProblems([]);
    }
    setProblemsLoading(false);
  };

  useEffect(() => {
    if (slides.length > 0 && slides[currentSlideIdx]) {
      fetchFirstRoundProblems(slides[currentSlideIdx].slide_id);
      setAnswers({});
      setShowExplanation({});
    }
    // eslint-disable-next-line
  }, [currentSlideIdx]);

  useEffect(() => {
    if (problems.length > 0) {
      setCurrentSlideIdx(0);
    }
  }, [problems]);

  useEffect(() => {
    if (selectedDocument?.material_id) {
      const startSession = async () => {
        const token = localStorage.getItem('token');
        // [1] 세션 시작(또는 재사용) API 호출
        const res = await fetch('http://localhost:3000/api/study-session/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ materialId: selectedDocument.material_id })
        });
        const data = await res.json();
        setSessionId(data.sessionId);

        // [2] 기존 누적 학습시간 불러오기
        const res2 = await fetch(`http://localhost:3000/api/study-session/${data.sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data2 = await res2.json();
        setPrevTotalDuration(data2.total_duration || 0);

        // [3] 타이머 초기화 및 시작
        if (sessionTimerInterval.current) clearInterval(sessionTimerInterval.current);
        setSessionTimer(0);
        sessionTimerInterval.current = setInterval(() => {
          setSessionTimer(prev => prev + 1);
        }, 1000);
      };
      startSession();
    }
    // 언마운트 시 타이머 정리
    return () => {
      if (sessionTimerInterval.current) clearInterval(sessionTimerInterval.current);
    };
  }, [selectedDocument]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStudyTime();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionTimer, sessionId]);

  useEffect(() => {
    if (showResult && Array.isArray(showResult)) {
      const correctCount = showResult.filter(a => a.is_correct).length;
      const totalCount = showResult.length;
      setShowWeakReviewButton(!isWeakReview && correctCount < totalCount && weakReviewCount < 3);
    }
  }, [showResult, isWeakReview, weakReviewCount]);

  useEffect(() => {
    if (showResult && isWeakReview) {
      setIsWeakReview(false);
    }
  }, [showResult, isWeakReview]);

  // 문제 번호 클릭
  const handleNumberClick = (idx) => setCurrentSlideIdx(idx);

  // 이전/다음 버튼 (문제 개수 기준)
  const handlePrev = () => setCurrentSlideIdx((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setCurrentSlideIdx((prev) => Math.min(prev + 1, problems.length - 1));

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
    // 전체 채점
    const allResults = problems.map((p, idx) => {
      const userAns = answers[idx];
      let userAnsValue = userAns;
      if (p.type === '객관식' || p.type === '참/거짓' || p.type === '참거짓') {
        userAnsValue = p.options[userAns];
      }
      let correctAnswer;
      if (p.type === '객관식' && p.options && typeof p.correct === 'number') {
        correctAnswer = p.options[p.correct];
      } else if (p.type === '주관식') {
        correctAnswer = p.correct;
      } else if (p.type === '참/거짓' || p.type === '참거짓') {
        correctAnswer = p.correct === 0 ? '참' : '거짓';
      } else {
        correctAnswer = p.correct;
      }
      let isCorrect;
      if (p.type === '객관식' || p.type === '참/거짓' || p.type === '참거짓') {
        isCorrect = userAns === p.correct;
      } else if (p.type === '주관식') {
        isCorrect = userAns !== undefined && String(userAns).trim() !== '' && String(userAns).trim() === String(p.correct).trim();
      } else {
        isCorrect = false;
      }
      return {
        question_id: p.id || p.question_id,
        number: p.number,
        question: p.content,
        correct_answer: correctAnswer,
        user_answer: userAnsValue,
        is_correct: isCorrect,
        explanation: p.explanation
      };
    });
    setShowResult(allResults);
    setCurrentView('result');
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

  // 진도율 계산 (문제 개수 기준)
  const progress = problems.length > 0 ? Math.round(((currentSlideIdx + 1) / problems.length) * 100) : 0;

  // 점수 계산
  const correctCount = problems.filter((p, idx) => {
    if (p.type === '객관식' || p.type === '참/거짓') {
      return answers[idx] !== undefined && answers[idx] === p.correct;
    } else if (p.type === '주관식') {
      return answers[idx] !== undefined && String(answers[idx]).trim() === String(p.correct).trim();
    }
    return false;
  }).length;
  const totalCount = problems.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const handleDocumentSelect = async (mat) => {
    console.log('문제 생성 요청 material_id:', mat.material_id);
    setCurrentView('problem');
    setSelectedDocument(mat);
    setAnswers({});
    setShowResult(false);
    setProblemsLoading(true);

    const token = localStorage.getItem('token');
    // 1) DB에서 기존 문제 불러오기
    let questions = await fetch(`http://localhost:8000/quiz/number-questions?material_id=${mat.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json());

    // 2) 만약 DB에 문제 없으면 전체 내용에서 10개 문제 생성
    if (!Array.isArray(questions) || questions.length === 0) {
      const generateRes = await fetch('http://localhost:8000/quiz/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          material_id: mat.material_id
        })
      });

      if (!generateRes.ok) {
        alert('문제 생성에 실패했습니다.');
        setCurrentView('list');
        setProblemsLoading(false);
        return;
      }

      // 생성된 문제 가져오기
      questions = await generateRes.json();
    }

    // 3) questions 처리해서 state에 세팅
    if (!Array.isArray(questions) || questions.length === 0) {
      alert('문제 생성에 실패했습니다.');
      setCurrentView('list');
      setProblemsLoading(false);
      return;
    }

    const processed = questions.map(q => {
      let pq = {
        id: q.question_id,
        explanation: q.explanation,
        difficulty: q.difficulty,
        type: q.type,
        number: q.number,
      };

      if (q.type === '객관식') {
        pq.content = q.content || '';
        pq.options = Array.isArray(q.options) ? q.options : [];
        pq.correct = typeof q.correct === 'number' ? q.correct : -1;
      } else if (q.type === '주관식') {
        pq.content = q.content || '';
        pq.options = ['정답 입력'];
        pq.correct = q.correct || '';
      } else if (q.type === '참/거짓' || q.type === '참거짓') {
        pq.content = q.content || '';
        pq.options = ['참', '거짓'];
        pq.correct = typeof q.correct === 'number' ? q.correct : -1;
      } else {
        pq.content = q.content || '';
        pq.options = [];
        pq.correct = -1;
      }
      return pq;
    });

    if (processed.length === 0) {
      alert('보충학습 문제를 생성할 수 없습니다.');
      return;
    }

    setProblems(processed);
    setProblemsLoading(false);
  };

  // 문제풀이 결과 화면에서 목록으로 돌아가기
  const handleBackToList = async () => {
    await saveStudyTime();
    setCurrentView('list');
    setSelectedDocument(null);
    setCurrentSlideIdx(0);
    setAnswers({});
    setShowResult(false);
    setProblems([]);
    setProblemsLoading(false);
  };

  const saveStudyTime = async () => {
    if (!sessionId) return;
    const token = localStorage.getItem('token');
    if (sessionTimer > 0 && token) {
      await fetch('http://localhost:3000/api/study-time', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ duration: sessionTimer, sessionId })
      });
      setPrevTotalDuration(prev => prev + sessionTimer);
      setSessionTimer(0);
    }
  };

  // 학습 시간 계산
  const totalSeconds = prevTotalDuration + sessionTimer;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const handleStartWeakReview = async () => {
    setIsWeakReview(true);
    setWeakReviewCount(prev => prev + 1);

    // 1. 오답 문제의 "문제 번호"만 숫자 배열로 추출 (NaN 제거)
    const wrongNumbers = showResult
      .filter(r => !r.is_correct)
      .map(r => Number(r.number))
      .filter(n => Number.isFinite(n) && !isNaN(n));
    console.log('wrongNumbers:', wrongNumbers);

    const excludeIds = Array.isArray(problems)
      ? problems.map(p => p.id || p.question_id)
      : [];

    console.log('보충학습 요청 payload', {
      material_id: selectedDocument.material_id,
      wrong_numbers: wrongNumbers,
      solved_question_ids: excludeIds
    });

    const res = await fetch('http://localhost:8000/quiz/review-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material_id: selectedDocument.material_id,
        wrong_numbers: wrongNumbers,
        solved_question_ids: excludeIds
      })
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      setProblems(data);
    } else {
      setProblems([]);
    }
    setAnswers({});
    setShowResult(false);
    setCurrentView('problem');
  };

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

  if (currentView === 'problem') {
    return (
      <div className="min-h-screen bg-[#18181B]">
        <HeaderBar />
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
          {problemsLoading ? (
            <div className="text-white text-center">문제를 불러오는 중입니다...</div>
          ) : problems.length === 0 ? (
            <div className="text-white text-center">문제가 없습니다.</div>
          ) : (
            <div>
              {/* 문제 번호 네비게이션 */}
              <div className="flex justify-center mb-4">
                {problems.map((_, idx) => (
                  <button
                    key={idx}
                    className={`mx-1 px-3 py-1 rounded-full ${idx === currentSlideIdx ? 'bg-[#346aff] text-white' : 'bg-[#23232a] text-[#bbbbbb]'}`}
                    onClick={() => handleNumberClick(idx)}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              {/* 문제 내용 */}
              <div className="bg-[#23232a] rounded-xl p-6 mb-6">
                <div className="text-lg font-bold text-white mb-2">
                  {problems[currentSlideIdx].content}
                </div>
                <div className="mb-4">
                  {problems[currentSlideIdx].type === '주관식' ? (
                    <input
                      type="text"
                      className="block w-full px-4 py-2 mb-2 rounded-lg bg-[#18181B] text-white border border-[#346aff] focus:outline-none"
                      placeholder="정답을 입력하세요"
                      value={answers[currentSlideIdx] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [currentSlideIdx]: e.target.value }))}
                    />
                  ) : (
                    problems[currentSlideIdx].options.map((opt, idx) => (
                      <button
                        key={idx}
                        className={`block w-full text-left px-4 py-2 mb-2 rounded-lg ${answers[currentSlideIdx] === idx ? 'bg-[#346aff] text-white' : 'bg-[#18181B] text-[#bbbbbb]'}`}
                        onClick={() => handleOptionSelect(idx)}
                      >
                        {opt}
                      </button>
                    ))
                  )}
                </div>
                <div className="flex justify-between">
                  <button onClick={handlePrev} disabled={currentSlideIdx === 0} className="px-4 py-2 bg-[#444] text-white rounded-lg">이전</button>
                  <button onClick={handleNext} disabled={currentSlideIdx === problems.length - 1} className="px-4 py-2 bg-[#444] text-white rounded-lg">다음</button>
                </div>
                <div className="mt-4 flex justify-between">
                  <button onClick={handleStop} className="px-4 py-2 bg-[#888] text-white rounded-lg">목록으로</button>
                  <button onClick={handleConfirmYes} className="px-4 py-2 bg-[#346aff] text-white rounded-lg">제출</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'result') {
    const correctCount = showResult.filter(r => r.is_correct).length;
    const totalCount = showResult.length;
    const hasWrong = correctCount < totalCount && weakReviewCount < 3;
    console.log('showResult:', showResult);
    return (
      <div className="min-h-screen bg-[#18181B]">
        <HeaderBar />
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
          <div className="text-white text-center text-2xl font-bold mb-4">
            채점 결과: {correctCount} / {totalCount}
          </div>
          {showResult.map((r, idx) => (
            <div key={idx} className="bg-[#23232a] rounded-xl p-4 mb-4">
              <div className="text-white font-bold mb-2">{idx + 1}. {r.question}</div>
              <div className="mb-1">
                <span className="text-[#bbbbbb]">내 답: </span>
                <span className={r.is_correct ? "text-green-400" : "text-red-400"}>{r.user_answer}</span>
              </div>
              <div className="mb-1">
                <span className="text-[#bbbbbb]">정답: </span>
                <span className="text-blue-400">{r.correct_answer}</span>
              </div>
              <div className="mb-1">
                <span className="text-[#bbbbbb]">해설: </span>
                <span className="text-white">{r.explanation}</span>
              </div>
              <div>
                {r.is_correct ? (
                  <span className="text-green-400 font-bold">정답</span>
                ) : (
                  <span className="text-red-400 font-bold">오답</span>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between mt-6">
            <button onClick={handleBackToList} className="px-4 py-2 bg-[#888] text-white rounded-lg">목록으로</button>
            {hasWrong && (
              <button onClick={handleStartWeakReview} className="px-4 py-2 bg-[#ff6b6b] text-white rounded-lg">
                보충학습 시작 ({weakReviewCount + 1}회차)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
