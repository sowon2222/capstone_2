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
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [problemSession, setProblemSession] = useState(null);
  const [problemProgress, setProblemProgress] = useState(null);

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
      let res = await fetch(`http://localhost:8000/quiz/first-round?material_id=${materialId}`);
      let data = await res.json();
      // 문제가 없으면 자동 생성 API 호출
      if (!data || data.length === 0) {
        await fetch('http://localhost:8000/quiz/generate-bulk-number', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ material_id: materialId })
        });
        // 생성 후 다시 문제 불러오기
        res = await fetch(`http://localhost:8000/quiz/first-round?material_id=${materialId}`);
        data = await res.json();
      }
      setProblems(data);
      console.log('problems:', data);
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
      console.log('보충학습 problems:', data);
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
        const res = await fetch('http://localhost:3000/api/problem-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ materialId: Number(selectedDocument.material_id) })
        });
        const data = await res.json();
        setSessionId(data.sessionId);

        // [2] 기존 누적 학습시간 불러오기
        const res2 = await fetch(`http://localhost:3000/api/problem-session/${data.sessionId}`, {
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
    if (!problemSession || !problemSession.session_id) {
      alert('문제풀이 세션이 정상적으로 생성되지 않았습니다. 새로고침 후 다시 시도해 주세요.');
      return;
    }
    // 전체 채점
    const allResults = problems.map((p, idx) => {
      const userAns = answers[idx];
      let userAnsValue = userAns;
      let correctAnswer = p.correct_answer || p.correct || '';
      let isCorrect = false;

      if (typeof userAns === 'string' && typeof correctAnswer === 'string') {
        isCorrect = userAns.trim() === correctAnswer.trim();
      } else if (typeof userAns === 'number' && typeof correctAnswer === 'number') {
        isCorrect = userAns === correctAnswer;
      } else {
        isCorrect = userAns == correctAnswer;
      }

      return {
        question_id: p.id || p.question_id,
        number: p.number,
        question: p.question || p.content,
        correct_answer: correctAnswer,
        user_answer: userAnsValue,
        is_correct: isCorrect,
        explanation: p.explanation || ''
      };
    });

    // 세션 업데이트
    // if (problemSession) {
    //   allResults.forEach(result => {
    //     updateProblemSession(result.question_id, result.is_correct);
    //   });
    // }

    const correctCount = allResults.filter(r => r.is_correct).length;
    const score = correctCount * 10; // 10문제 기준

    // 점수 저장
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3000/api/problem-session/${problemSession.session_id}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ score })
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
    if (p.type === '객관식' || p.type === '참거짓') {
      return answers[idx] !== undefined && answers[idx] === p.correct;
    } else if (p.type === '주관식') {
      return answers[idx] !== undefined && String(answers[idx]).trim() === String(p.correct).trim();
    }
    return false;
  }).length;
  const totalCount = problems.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  // 문제 출제 useEffect (selectedDocument, problemSession이 모두 준비됐을 때만 동작)
  useEffect(() => {
    if (!selectedDocument || !problemSession) return;
    setProblemsLoading(true);
    if (problemSession.current_round === 1) {
      fetchFirstRoundProblems(selectedDocument.material_id);
    } else {
      // 보충학습: 오답 정보는 showResult에서만 추출
      const wrongNumbers = showResult
        ? showResult.filter(r => !r.is_correct).map(r => Number(r.number)).filter(n => Number.isFinite(n) && !isNaN(n))
        : [];
      const solvedIds = showResult
        ? showResult.map(r => r.question_id)
        : [];
      fetchReviewRoundProblems(selectedDocument.material_id, wrongNumbers, solvedIds);
    }
    setProblemsLoading(false);
  }, [selectedDocument, problemSession]);

  // 문제풀이 세션 초기화/불러오기
  const initializeProblemSession = async (materialId) => {
    const token = localStorage.getItem('token');
    try {
      // 1. 기존 세션 확인
      const res = await fetch(`http://localhost:3000/api/problem-session/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 404) {
        // 404면 세션이 없으니 POST로 생성
        await fetch('http://localhost:3000/api/problem-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ materialId: Number(materialId) })
        });
      }
      // 생성/조회 후 세션 정보 다시 GET
      const res2 = await fetch(`http://localhost:3000/api/problem-session/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data2 = await res2.json();
      setProblemSession(data2.session);
      setProblemProgress(data2.progress);
    } catch (error) {
      console.error('세션 초기화 실패:', error);
      setProblemSession(null);
    }
  };

  // 문제풀이 목록 UI 수정
  const renderProblemList = () => {
    return lectureMaterials.map((mat) => {
      // 라운드별 점수 하나씩만 추출 (본문제풀이/보충1/2/3)
      const uniqueScores = [1,2,3,4].map(round =>
        mat.scores.find(s => s.round === round)
      ).filter(Boolean);

      // 뱃지 텍스트
      const roundLabel = uniqueScores.length > 0
        ? (uniqueScores[uniqueScores.length-1].round === 1
            ? '본문제풀이'
            : `보충학습 ${uniqueScores[uniqueScores.length-1].round-1}회차`)
        : '본문제풀이';

      return (
        <div key={mat.material_id} className="bg-[#23232a] rounded-2xl shadow-lg p-7 mb-8 transition-transform hover:scale-[1.015] hover:shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-[#23232a]/60 hover:border-[#346aff]/40">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-lg md:text-xl font-extrabold text-white truncate max-w-[300px]">{mat.title}</span>
              {(() => {
                const lastRound = uniqueScores.length > 0 ? uniqueScores[uniqueScores.length-1].round : 1;
                const badgeClass = lastRound === 1 ? 'bg-green-900/40 text-green-200' : 'bg-orange-900/40 text-orange-200';
                return (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>{roundLabel}</span>
                );
              })()}
            </div>
            {/* 점수 뱃지 개선: 본문제풀이/보충학습 각각 한 줄씩 */}
            <div className="flex flex-col gap-1 mt-1 mb-2">
              {/* 본문제풀이 점수 */}
              <div className="flex flex-row gap-3 mb-2">
                {uniqueScores.filter(s => s.round === 1).map((score, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-semibold shadow-sm bg-[#444] text-[#eee]"
                  >
                    본문제풀이 : {score.score}점
                  </span>
                ))}
              </div>
              {/* 보충학습 점수 (1~3회차) */}
              <div className="flex flex-row gap-3">
                {uniqueScores.filter(s => s.round > 1).map((score, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-semibold shadow-sm bg-[#444] text-[#eee]"
                  >
                    보충{score.round-1}회 : {score.score}점
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center">
            {uniqueScores.length >= 4 ? (
              <button
                className="px-7 py-3 bg-[#888]/70 text-white rounded-xl font-bold cursor-not-allowed text-base shadow-md"
                disabled
              >
                문제풀이 완료
              </button>
            ) : (
              <button
                className="px-7 py-3 bg-[#346aff] text-white rounded-xl font-bold hover:bg-[#2554b0] transition text-base shadow-md"
                onClick={() => handleDocumentSelect(mat)}
                disabled={uniqueScores.length >= 4}
              >
                {uniqueScores.length > 0 && uniqueScores.length < 4 ? `보충학습 ${uniqueScores.length}회차 시작` : '문제풀이 시작'}
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  // 문제풀이 세션 업데이트
  const updateProblemSession = async (questionId, isCorrect) => {
    if (!problemSession) return;
    // null 값이면 요청하지 않음
    if (questionId == null || isCorrect == null) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3000/api/problem-session/${problemSession.session_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId,
          isCorrect,
          currentRound: weakReviewCount + 1
        })
      });
    } catch (error) {
      console.error('세션 업데이트 실패:', error);
    }
  };

  // 뱃지 표시 개선 (문제풀이/보충학습)
  const getRoundLabel = (session) => {
    if (!session) return '';
    if (session.current_round === 1) return '본문제풀이';
    return `보충학습 ${session.current_round - 1}회차`;
  };

  // handleDocumentSelect는 세션만 초기화
  const handleDocumentSelect = async (mat) => {
    setCurrentView('problem');
    setSelectedDocument(mat);
    setAnswers({});
    setShowResult(false);
    setProblemsLoading(true);
    await initializeProblemSession(Number(mat.material_id));
    // 문제 출제는 useEffect에서!
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
    if (!problemSession) return;
    const token = localStorage.getItem('token');
    // 오답 정보 추출
    const wrongNumbers = showResult
      ? showResult.filter(r => !r.is_correct).map(r => Number(r.number)).filter(n => Number.isFinite(n) && !isNaN(n))
      : [];
    const solvedIds = showResult
      ? showResult.map(r => r.question_id)
      : [];
    // current_round 증가
    await fetch(`http://localhost:3000/api/problem-session/${problemSession.session_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentRound: problemSession.current_round + 1 })
    });
    // 세션 정보 다시 불러오기
    const res = await fetch(`http://localhost:3000/api/problem-session/${selectedDocument.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProblemSession(data.session);
    // 보충학습 문제 출제
    await fetchReviewRoundProblems(selectedDocument.material_id, wrongNumbers, solvedIds);
    setAnswers({});
    setShowResult(false);
    setCurrentView('problem');
  };

  useEffect(() => {
    // 타이머 업데이트
    const timer = setInterval(() => {
      setSessionTimer(prev => {
        const newTime = prev + 1;
        setDisplayMinutes(Math.floor(newTime / 60));
        setDisplaySeconds(newTime % 60);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getLastRound = (mat) => {
    if (mat.scores && mat.scores.length > 0) {
      return mat.scores[mat.scores.length - 1].round;
    }
    return 1;
  };

  const roundLabel = (mat) => {
    const lastRound = getLastRound(mat);
    return lastRound > 1 ? `보충학습 ${lastRound - 1}회차` : '본문제풀이';
  };

  if (currentView === 'list') {
    return (
      <div className="min-h-screen bg-[#18181B]">
        <HeaderBar />
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
          {renderProblemList()}
        </div>
      </div>
    );
  }

  if (currentView === 'problem') {
    if (problemsLoading) {
      return (
        <div className="min-h-screen bg-[#18181B] flex items-center justify-center">
          <div className="text-white text-center">문제를 불러오는 중입니다...</div>
        </div>
      );
    }

    if (!problems || problems.length === 0 || !problems[currentSlideIdx]) {
      return (
        <div className="min-h-screen bg-[#18181B] flex items-center justify-center">
          <div className="text-white text-center">문제가 없습니다.</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#18181B] flex flex-col" style={{overflowY: 'hidden'}}>
        <HeaderBar />
        <div className="flex-1 flex items-start justify-center w-full" style={{paddingTop: 80}}>
          {/* 문제 번호 + 문제 카드 묶음 */}
          <div className="flex flex-row items-start justify-center">
            {/* 네비 + 뒤로가기 */}
            <div className="flex flex-col items-center min-w-[60px] mr-6">
              <button
                onClick={handleStop}
                className="mb-4 w-9 h-9 flex items-center justify-center rounded-lg bg-[#23232a] text-[#bbbbbb] hover:bg-[#346aff] hover:text-white transition shadow"
                title="목록으로"
                style={{fontSize: '1.2rem'}}
              >
                <FaArrowLeft />
              </button>
              {problems.map((_, idx) => (
                <button
                  key={idx}
                  className={`mb-2 w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-lg flex items-center justify-center font-bold text-base transition
                    ${idx === currentSlideIdx
                      ? 'bg-[#346aff] text-white shadow-lg scale-110'
                      : 'bg-[#23232a]/70 text-[#bbbbbb] hover:bg-[#346aff] hover:text-white'}`}
                  onClick={() => handleNumberClick(idx)}
                  style={{fontSize: '1.1rem'}}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            {/* 문제 카드 */}
            <div className="relative w-full max-w-2xl bg-[#23232a] rounded-2xl shadow-2xl px-8 py-10 flex flex-col justify-between ml-[90px]" style={{margin: '0 auto', minHeight: 420, marginTop: 0}}>
              {/* 뱃지 그룹: 카드 오른쪽 상단에 고정 */}
              <div className="absolute top-6 right-8 flex flex-row gap-2 flex-wrap items-center z-10">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-900/30 text-orange-400 text-xs font-semibold">
                  <FaFire className="mr-1" /> {currentSlideIdx + 1}/{problems.length} 문제
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-semibold">
                  <FaClock className="mr-1" /> {displayMinutes}분 {displaySeconds}초 학습
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-semibold">
                  <FaChartLine className="mr-1" /> {getRoundLabel(problemSession)}
                </span>
              </div>
              {/* 상단: 난이도(왼쪽) */}
              <div className="flex flex-col w-full">
                <div className="mb-2">
                  {problems[currentSlideIdx].difficulty && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#23232a] text-[#3b82f6] text-sm font-semibold">
                      난이도: {problems[currentSlideIdx].difficulty}
                    </span>
                  )}
                </div>
                {/* 질문 */}
                <div className="text-xl font-extrabold text-white mb-8" style={{lineHeight: 1.6}}>
                  {problems[currentSlideIdx].content}
                </div>
              </div>
              {/* 선택지/입력 */}
              <div className="mb-10">
                {problems[currentSlideIdx].type === '주관식' ? (
                  <input
                    type="text"
                    className="block w-full px-5 py-3 rounded-lg bg-[#18181B] text-white border border-[#346aff] focus:outline-none focus:ring-2 focus:ring-[#346aff] text-base"
                    placeholder="정답을 입력하세요"
                    value={answers[currentSlideIdx] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [currentSlideIdx]: e.target.value }))}
                    style={{lineHeight: 1.5}}
                  />
                ) : (
                  problems[currentSlideIdx] && problems[currentSlideIdx].options && Array.isArray(problems[currentSlideIdx].options) && problems[currentSlideIdx].options.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`block w-full text-left px-5 py-3 mb-3 rounded-lg text-base font-medium transition flex items-center
                        ${answers[currentSlideIdx] === idx
                          ? 'bg-[#346aff] text-white shadow scale-[1.03]'
                          : 'bg-[#18181B] text-[#bbbbbb] hover:bg-[#346aff]/80 hover:text-white'}`}
                      onClick={() => handleOptionSelect(idx)}
                      style={{lineHeight: 1.5, transition: 'all 0.15s'}}
                    >
                      <span className="mr-3 font-bold" style={{minWidth: 24, display: 'inline-block'}}>{`${idx + 1}.`}</span>
                      <span>{opt}</span>
                    </button>
                  ))
                )}
              </div>
              {/* 버튼 */}
              <div className="flex justify-end gap-3 mt-6" style={{marginTop: 24}}>
                <button onClick={handlePrev} disabled={currentSlideIdx === 0}
                  className="px-5 py-2 rounded-lg bg-[#23232a] text-[#bbbbbb] border border-[#444] hover:bg-[#444] hover:text-white transition disabled:opacity-50">이전</button>
                <button onClick={handleNext} disabled={currentSlideIdx === problems.length - 1}
                  className="px-5 py-2 rounded-lg bg-[#23232a] text-[#bbbbbb] border border-[#444] hover:bg-[#444] hover:text-white transition disabled:opacity-50">다음</button>
                <button onClick={handleConfirmYes}
                  className="px-5 py-2 rounded-lg bg-[#1e90ff] hover:bg-[#346aff] text-white font-bold shadow-lg transition scale-105">제출</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'result') {
    const correctCount = showResult.filter(r => r.is_correct).length;
    const totalCount = showResult.length;
    const hasWrong = correctCount < totalCount && problemSession && problemSession.current_round < 4;
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
            {hasWrong && problemSession && (
              <button onClick={handleStartWeakReview} className="px-4 py-2 bg-[#ff6b6b] text-white rounded-lg">
                {`보충학습 시작 (${problemSession.current_round}회차)`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
