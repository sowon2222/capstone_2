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
    console.log('[useEffect] token:', token);
    fetch('http://localhost:3000/archive/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        console.log('[archive/list] response:', data);
        setLectureMaterials(data.materials || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[archive/list] error:', err);
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

  const generateProblemForSlide = async (slide) => {
    setProblemsLoading(true);
    setLoading(true);
    console.log('[generateProblemForSlide] slide:', slide);
    try {
      // 1. 키워드 불러오기
      const token = localStorage.getItem('token');
      const keywordRes = await fetch(`http://localhost:3000/slides/${slide.slide_id}/keywords`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const keywordData = await keywordRes.json();
      console.log('[keywords] response:', keywordData);
      const keywordId = keywordData[0]?.keyword_id;
      
      // 2. 문제 생성
      const body = {
        slide_id: slide.slide_id,
        keyword_id: keywordId,
        slide_title: slide.slide_title,
        concept_explanation: slide.concept_explanation,
        image_description: slide.image_description || null,
        keywords: slide.main_keywords ? slide.main_keywords.split(',') : [],
        important_sentences: slide.important_sentences ? slide.important_sentences.split('\n') : [],
        slide_summary: slide.summary
      };
      console.log('[quiz/generate] request body:', body);

      const generateRes = await fetch('http://localhost:8000/quiz/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!generateRes.ok) {
        const errText = await generateRes.text();
        console.error('[quiz/generate] error response:', errText);
        throw new Error('문제 생성에 실패했습니다.');
      }

      let gen = await generateRes.json();
      // 1. 배열인지 단일 객체인지 검사
      const questionsArray = Array.isArray(gen) ? gen : [gen];
      // 2. 문제별로 가공
      const processedQuestions = questionsArray.map(generatedQuestion => {
        let processedQuestion = {
          id: generatedQuestion.question_id,
          content: generatedQuestion.content,
          explanation: generatedQuestion.explanation,
          difficulty: generatedQuestion.difficulty,
          tags: generatedQuestion.tags || [],
          type: generatedQuestion.type
        };
        if (generatedQuestion.type === '객관식') {
          if (Array.isArray(generatedQuestion.options)) {
            processedQuestion.options = generatedQuestion.options;
          } else if (generatedQuestion.options && typeof generatedQuestion.options === 'object') {
            processedQuestion.options = Object.values(generatedQuestion.options);
          } else {
            processedQuestion.options = []; // 또는 ['옵션 없음'] 등 기본값
          }
          processedQuestion.correct = typeof generatedQuestion.correct === 'number'
            ? generatedQuestion.correct
            : (generatedQuestion.options && typeof generatedQuestion.options === 'object')
              ? Object.keys(generatedQuestion.options).indexOf(generatedQuestion.correct)
              : -1;
        } else if (generatedQuestion.type === '주관식') {
          processedQuestion.options = ['정답 입력'];
          processedQuestion.correct = generatedQuestion.correct;
        } else if (generatedQuestion.type === '참/거짓' || generatedQuestion.type === '참거짓') {
          processedQuestion.options = ['참', '거짓'];
          processedQuestion.correct = generatedQuestion.correct === '참' ? 0 : 1;
        }
        return processedQuestion;
      });
      setProblems(processedQuestions);
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
    setShowConfirm(false);
    // 마지막 문제면 결과, 아니면 다음 문제로 이동
    if (currentSlideIdx === problems.length - 1) {
      // 마지막 문제 제출
      const token = localStorage.getItem('token');
      const payload = parseJwt(token);
      const userId = payload?.user_id;
      const problem = problems[currentSlideIdx];
      const userAnswer = answers[currentSlideIdx];
      let answerValue = userAnswer;
      if (problem.options && typeof problem.correct === 'number') {
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
          question_id: problem.question_id || problem.id,
          user_answer: answerValue
        })
      });
      // 모든 문제 결과를 showResult에 세팅
      const allResults = problems.map((p, idx) => {
        const userAns = answers[idx];
        let userAnsValue = userAns;
        if (p.options && typeof p.correct === 'number') {
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
          question: p.content,
          correct_answer: correctAnswer,
          user_answer: userAnsValue,
          is_correct: isCorrect,
          explanation: p.explanation
        };
      });
      setShowResult(allResults);
    } else {
      // 현재 문제 제출
      const token = localStorage.getItem('token');
      const payload = parseJwt(token);
      const userId = payload?.user_id;
      const problem = problems[currentSlideIdx];
      const userAnswer = answers[currentSlideIdx];
      let answerValue = userAnswer;
      if (problem.options && typeof problem.correct === 'number') {
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
          question_id: problem.question_id || problem.id,
          user_answer: answerValue
        })
      });
      setCurrentSlideIdx((prev) => Math.min(prev + 1, problems.length - 1));
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
    setCurrentView('problem');
    setSelectedDocument(mat);
    setAnswers({});
    setShowResult(false);
    setProblemsLoading(true);

    const token = localStorage.getItem('token');
    // 1) DB에서 기존 문제 불러오기
    let questions = await fetch(`http://localhost:8000/quiz/material-questions?material_id=${mat.material_id}`, {
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
        tags: q.tags || [],
        type: q.type,
      };

      if (q.type === '객관식') {
        // content가 undefined/null이거나, options/question이 없으면 빈 문제로 처리
        if (!q.content || !Array.isArray(q.options) || !q.content) {
          pq.content = '';
          pq.options = [];
          pq.correct = -1;
        } else {
          pq.content = q.content;
          pq.options = q.options;
          pq.correct = typeof q.correct === 'number' ? q.correct : -1;
        }
      } else if (q.type === '주관식') {
        pq.content = q.content;
        pq.options = ['정답 입력'];
        pq.correct = q.answer;
      } else if (q.type === '참/거짓' || q.type === '참거짓') {
        pq.content = q.content;
        pq.options = ['참', '거짓'];
        pq.correct = q.answer === '참' ? 0 : 1;
      } else {
        pq.content = q.content;
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

  const handleStartWeakReview = () => {
    setIsWeakReview(true);
    handleWeakReview();
  };

  const handleWeakReview = async () => {
    // 1. 오답 문제의 키워드 추출
    const wrongProblems = showResult.filter(a => !a.is_correct);
    let weakKeywords = [];
    wrongProblems.forEach(p => {
      if (Array.isArray(p.tags)) {
        weakKeywords.push(...p.tags);
      }
    });
    weakKeywords = [...new Set(weakKeywords)].filter(Boolean);

    // 2. 이미 출제된 문제 ID 모으기
    let excludeIds = [];
    if (problems && Array.isArray(problems)) {
      excludeIds = excludeIds.concat(problems.map(p => p.id || p.question_id));
    }
    if (window.weakReviewHistory && Array.isArray(window.weakReviewHistory)) {
      excludeIds = excludeIds.concat(window.weakReviewHistory.flat());
    }
    window.weakReviewHistory = window.weakReviewHistory || [];
    window.weakReviewHistory.push(problems.map(p => p.id || p.question_id));

    // 3. 현재 학습 중인 PDF/슬라이드 ID
    const materialId = selectedDocument?.material_id;

    // 4. 백엔드에 요청
    const token = localStorage.getItem('token');
    const payload = parseJwt(token);
    const userId = payload?.user_id;

    try {
      const res = await fetch('http://localhost:8000/quiz/weak-generate-by-keywords', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          keywords: weakKeywords,
          top_n: 10,
          exclude_question_ids: excludeIds.filter(Boolean),
          material_id: materialId
        })
      });
      
      if (!res.ok) {
        throw new Error('보충학습 문제 생성에 실패했습니다.');
      }

      const newQuestions = await res.json();
      
      if (!Array.isArray(newQuestions)) {
        console.error('Invalid response format:', newQuestions);
        alert('보충학습 문제 생성에 실패했습니다.');
        return;
      }

      // 3. 문제 데이터 가공 후 setProblems로 세팅, 문제풀이 화면으로 이동
      const processed = newQuestions.map(q => {
        let content = q.content;
        let options = q.options;
        let correct = q.correct;
        let correct_answer = q.correct_answer;
        let difficulty = q.difficulty;

        // content가 JSON 문자열이면 파싱
        if (typeof content === 'string') {
          try {
            const parsed = JSON.parse(content);
            content = parsed.question || content;
            options = parsed.options
              ? Array.isArray(parsed.options)
                ? parsed.options
                : Object.values(parsed.options)
              : [];
            correct_answer = parsed.correct_answer || correct_answer;
            correct = typeof parsed.correct === 'number'
              ? parsed.correct
              : (parsed.options && typeof parsed.options === 'object' && parsed.correct_answer)
                ? Object.keys(parsed.options).indexOf(parsed.correct_answer)
                : -1;
            difficulty = parsed.difficulty || difficulty;
          } catch {
            // 파싱 실패 시 원본 사용
            options = [];
          }
        } else if (options && typeof options === 'object' && !Array.isArray(options)) {
          options = Object.values(options);
        }

        let pq = {
          id: q.question_id,
          explanation: q.explanation,
          difficulty: difficulty || '', // 반드시 세팅
          tags: q.tags || [],
          type: q.type,
          content: content || q.question,
          options: options || [],
        };

        if (q.type === '객관식') {
          pq.correct = typeof correct === 'number'
            ? correct
            : (options && correct_answer)
              ? options.findIndex(opt => opt === correct_answer)
              : -1;
        } else if (q.type === '주관식') {
          pq.options = ['정답 입력'];
          pq.correct = q.answer || correct_answer;
        } else if (q.type === '참/거짓' || q.type === '참거짓') {
          pq.options = ['참', '거짓'];
          pq.correct = (q.answer || correct_answer) === '참' ? 0 : 1;
        } else {
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
      setAnswers({});
      setShowResult(false);
      setCurrentSlideIdx(0);
      setCurrentView('problem');
      setWeakReviewCount(prev => prev + 1);
    } catch (error) {
      console.error('Error in handleWeakReview:', error);
      alert('보충학습 문제 생성 중 오류가 발생했습니다.');
    }
  };

  const handleEndWeakReview = () => {
    setIsWeakReview(false);
    setShowWeakReviewButton(false);
    setCurrentView('list');
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
                {/* 문제 다 푼 강의자료 표시 */}
                {Math.round(mat.progress) === 100 ? (
                  <span className="px-5 py-2 bg-green-700 text-white rounded-lg font-bold text-base">다 풀었어요!</span>
                ) : (
                  <button
                    className="px-6 py-2 bg-[#346aff] text-white rounded-lg font-bold hover:bg-[#2554b0] transition"
                    onClick={() => handleDocumentSelect(mat)}
                  >
                    문제풀이 시작
                  </button>
                )}
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
  if (problems.length === 0 || !problems[currentSlideIdx]) {
    return <div className="text-white text-center mt-20">문제가 없습니다.</div>;
  }
  const currentProblem = problems[currentSlideIdx];

  console.log('[problems]', problems);
  console.log('[currentSlideIdx]', currentSlideIdx);
  console.log('[current problem]', currentProblem);

  if (showResult && Array.isArray(showResult)) {
    // 결과 화면: 내가 푼 문제 이력
    const correctCount = showResult.filter(a => a.is_correct).length;
    const totalCount = showResult.length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#18181B] flex flex-col items-center py-16">
        <HeaderBar />
        <div className="flex flex-col items-center py-16">
          {/* 점수 */}
          <div className="bg-[#232329] rounded-2xl p-8 mb-8 w-full max-w-2xl shadow">
            <div className="text-2xl font-bold text-[#556BF5] mb-4">
              정답: {correctCount} / {totalCount} &nbsp;|&nbsp; 정답률: {score}%
            </div>
          </div>
          {/* 정답/오답 해설 */}
          <div className="w-full max-w-2xl space-y-6 mb-8">
            {showResult.map((a, idx) => (
              <div
                key={a.question_id ? `${a.question_id}-${idx}` : `idx-${idx}`}
                className={`rounded-xl p-6 bg-[#232329] border-2 ${a.is_correct ? 'border-green-500' : 'border-red-500'}`}
              >
                <div className="mb-2 text-white font-semibold">{a.question}</div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white">
                    <b>정답:</b> {a.correct_answer}
                    <br /><b>제출한 답:</b> {a.user_answer}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold
                    ${a.is_correct ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}
                  `}>
                    {a.is_correct ? '정답' : '오답'}
                  </span>
                </div>
                <div className="mt-2 p-4 bg-[#18181B] rounded-lg text-[#bbbbbb] overflow-auto custom-scrollbar max-h-40">
                  {a.explanation}
                </div>
              </div>
            ))}
          </div>
          {/* 돌아가기 버튼 */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleBackToList}
              className="text-white text-2xl font-bold px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition border-none shadow"
              style={{ background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}
              aria-label="돌아가기"
            >
              X
            </button>
          </div>
          {/* 하단 버튼 영역 */}
          <div className="flex flex-col items-center gap-4 mt-12">
            {/* 보충학습하기 버튼: showWeakReviewButton 상태에 따라 노출 */}
            {showWeakReviewButton && (
              <button
                className="px-8 py-3 bg-[#346aff] text-white rounded-lg font-bold hover:bg-[#2554b0] transition text-lg"
                onClick={handleStartWeakReview}
              >
                보충학습 {weakReviewCount + 1}회차 시작
              </button>
            )}
            {/* 보충학습 그만하기 버튼: 항상 노출 */}
            <button
              className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition text-lg"
              onClick={handleEndWeakReview}
            >
              보충학습 그만하기
            </button>
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
            <FaFire className="mr-1" /> {currentSlideIdx + 1}/{problems.length} 문제
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-900/80 text-blue-300 text-sm font-semibold">
            <FaClock className="mr-1" /> {minutes}분 {seconds}초 학습
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-900/80 text-green-300 text-sm font-semibold">
            <FaChartLine className="mr-1" /> 진도율 {progress}%
          </span>
        </div>
      </div>
      {/* 문제 카드 + 네비게이션 */}
      <div className="flex flex-row gap-8 w-full max-w-4xl mx-auto">
        <div className="w-16" />
        <div className="flex-1 rounded-3xl shadow-2xl p-10 flex flex-col relative min-h-[400px] bg-[#232329]">
          <div className="absolute top-4 right-8 text-lg text-[#bbbbbb] font-semibold">
            {currentSlideIdx + 1} / {problems.length} 문제
          </div>
          {/* 문제 내부, 상단에 추가 */}
          <div className="flex items-center mb-6">
            <span className={`px-6 py-2 rounded-2xl font-bold text-base shadow-lg tracking-wide
              ${isWeakReview ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
              {isWeakReview ? `보충학습 ${weakReviewCount}회차` : '문제풀이'}
            </span>
          </div>
          {/* 문제 내용 */}
          <div className="text-2xl font-bold text-white mb-8 break-words whitespace-pre-line">
            {currentProblem?.content || '문제 데이터 없음'}
          </div>
          {/* 난이도 표시 */}
          <div className="mb-4">
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-900/60 text-blue-300">
              난이도: {currentProblem?.difficulty || ''}
            </span>
          </div>
          {/* 문제 유형별 보기 */}
          <div className="flex flex-col gap-6">
            {(() => {
              if (!currentProblem) return null;
              if (Array.isArray(currentProblem.options) && typeof currentProblem.correct === 'number') {
                // 객관식
                return currentProblem.options.map((opt, oidx) => (
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
              } else if (currentProblem.type === '주관식') {
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
              } else if (currentProblem.type === '참/거짓' || currentProblem.type === '참거짓') {
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
            {currentSlideIdx === problems.length - 1 ? (
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
