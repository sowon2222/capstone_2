import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { FaUpload, FaChevronLeft, FaChevronRight, FaFire, FaClock, FaChartLine, FaQuestionCircle, FaSearch } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/ProblemSolving.css';
import { parseJwt } from '../utils/jwt';

const DocumentAnalysis = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0); // 초기값 0
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [viewedPages, setViewedPages] = useState([1]); // 학습한 페이지
  const [pageTimes, setPageTimes] = useState({}); // 각 페이지별 학습 시간(초)
  const [materialId, setMaterialId] = useState(null); // material_id 저장용 state 추가
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState('list');
  const [archives, setArchives] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [slideAnalyses, setSlideAnalyses] = useState({});
  const fileInputRef = useRef(null);
  const [pendingPageSelect, setPendingPageSelect] = useState(null);
  const pollingRef = useRef(null);
  const timerInterval = useRef(null);
  const [isRequestingSummary, setIsRequestingSummary] = useState(false);
  const analysisStartTime = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const [prevTotalDuration, setPrevTotalDuration] = useState(0); // DB에서 불러온 누적값(초)
  const [sessionTimer, setSessionTimer] = useState(0); // 현재 세션에서 측정된 시간(초)
  const sessionTimerInterval = useRef(null);
  const interruptionStartRef = useRef(null);
  const [ocrText, setOcrText] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  const imageRetryCount = useRef(0);
  const maxRetries = 3;

  const navigate = useNavigate();
  const location = useLocation();
  const stateMaterialId = location.state?.materialId;

  // --- 1) 강의자료 리스트 불러오기 ---
  useEffect(() => {
    if (mode !== 'list') return;
    const token = localStorage.getItem('token');
    setLoading(true);
    fetch('http://localhost:3000/archive/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setArchives(data.materials || []))
      .finally(() => setLoading(false));
  }, [mode]);

  const filteredArchives = archives.filter(a =>
    (a.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 2) PDF Blob fetch (이어하기/복원용) ---
  const fetchPdfFile = async (mid) => {
    const res = await fetch(`http://localhost:3000/uploads/${mid}.pdf`);
    if (!res.ok) throw new Error('PDF 파일을 불러오지 못했습니다.');
    return await res.blob();
  };

  // --- 3) 이어하기 핸들러 ---
  const handleContinue = async (archive) => {
    if (Math.round(archive.progress) === 100) {
      return navigate(`/archive/${archive.material_id}`);
    }
    setMode('analysis');
    setMaterialId(archive.material_id);
    setNumPages(archive.page || 1);
    setViewedPages([1]);
    setPageTimes({});
    setCurrentPage(1);
    setSelectedPage(1);

    try {
      const pdfBlob = await fetchPdfFile(archive.material_id);
      setFile(pdfBlob);
    } catch {
      alert('PDF 파일을 불러오지 못했습니다.');
      setFile(null);
    }

    // 서버에서 슬라이드 분석 결과 불러와 저장
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/archive/${archive.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const analyses = {};
    (data.slides || []).forEach(sl => {
      analyses[sl.slide_number] = sl;
    });
    setSlideAnalyses(analyses);
    setPendingPageSelect(1);
    analysisStartTime.current = new Date().toISOString();
  };

  // --- 4) +New 클릭 ---
  const handleNew = () => {
    setMode('upload');
    setFile(null);
    setMaterialId(null);
    setNumPages(0);
    setViewedPages([1]);
    setPageTimes({});
    setCurrentPage(1);
    setSelectedPage(1);
    setAnalysis(null);
    analysisStartTime.current = new Date().toISOString();
  };

  // 타이머 관리 함수들
  const startTimer = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  // 페이지 변경 시 타이머 관리
  useEffect(() => {
    if (!file) return;
    setTimer(pageTimes[selectedPage] || 0);
    startTimer();
    return () => {
      setPageTimes(prev => ({
        ...prev,
        [selectedPage]: timer
      }));
    };
  }, [selectedPage, file]);

  // =========================
  // [학습시간 누적] 세션 시작 및 타이머 초기화
  // =========================
  useEffect(() => {
    if (materialId) {
      const startSession = async () => {
        const token = localStorage.getItem('token');
        // [1] 세션 시작(또는 재사용) API 호출
        const res = await fetch('http://localhost:3000/api/study-session/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ materialId })
        });
        const data = await res.json();
        setSessionId(data.sessionId); // 세션ID 저장

        // [2] 기존 누적 학습시간 불러오기
        const res2 = await fetch(`http://localhost:3000/api/study-session/${data.sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data2 = await res2.json();
        setPrevTotalDuration(data2.total_duration || 0); // DB 누적값 세팅

        // [3] 타이머 초기화 및 시작
        if (sessionTimerInterval.current) clearInterval(sessionTimerInterval.current);
        setSessionTimer(0);
        sessionTimerInterval.current = setInterval(() => {
          setSessionTimer(prev => prev + 1); // 1초마다 증가
        }, 1000);
      };
      startSession();
    }
    // 언마운트 시 타이머 정리
    return () => {
      if (sessionTimerInterval.current) clearInterval(sessionTimerInterval.current);
    };
  }, [materialId]);

  useEffect(() => {
    if (!sessionId) return;
    if (sessionTimerInterval.current) clearInterval(sessionTimerInterval.current);
    sessionTimerInterval.current = setInterval(() => {
      setSessionTimer(prev => prev + 1); // 1초마다 증가
    }, 1000);
    return () => {
      if (sessionTimerInterval.current) clearInterval(sessionTimerInterval.current);
    };
  }, [sessionId]);

  const saveStudyTime = async () => {
    if (!sessionId) return;
    const token = localStorage.getItem('token');
    if (sessionTimer > 0 && token) {
      // [4] 현재 세션에서 측정된 시간 DB에 저장
      await fetch('http://localhost:3000/api/study-time', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ duration: sessionTimer, sessionId })
      });
      setPrevTotalDuration(prev => prev + sessionTimer); // 프론트 누적값도 갱신
      setSessionTimer(0); // 타이머 리셋
    }
  };

  // =========================
  // [학습시간 누적] 누적 학습시간 계산 및 표시
  // =========================
  const totalSeconds = prevTotalDuration + sessionTimer; // DB+프론트 합산
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // --- 6) 페이지 선택 & 분석 ---
  const handlePageSelect = async (pageNumber) => {
    if (!materialId) return;
    const token = localStorage.getItem('token');
    setIsRequestingSummary(true);
    setLoading(true);
    try {
      // 1. 요약 요청
      const res = await fetch(`http://localhost:3000/archive/${materialId}/slide/${pageNumber}/summary`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('요약 요청 실패');
      const data = await res.json();
      
      // 2. 결과 처리
      setAnalysis(data.slide);
      setSlideAnalyses(prev => ({ ...prev, [pageNumber]: data.slide }));
      setIsRequestingSummary(false);
      setLoading(false);
    } catch (e) {
      setIsRequestingSummary(false);
      setLoading(false);
      alert(e.message);
    }
  };

  // --- 7) 학습 화면 → 목록으로 돌아가기 ---
  const handleBackToList = () => {
    saveStudyTime(); // 세션 시간 저장
    setMode('list');
    setFile(null);
    setMaterialId(null);
    setNumPages(0);
    setCurrentPage(1);
    setSelectedPage(1);
    setAnalysis(null);
    setViewedPages([1]);
    setPageTimes({});
    setSessionId(null);
    setSessionTimer(0);
    setPrevTotalDuration(0);
  };

  // --- 8) PDF 업로드 핸들러 ---
  const onFileChange = async e => {
    const f = e.target.files[0];
    if (!f || f.type !== 'application/pdf') {
      return alert('PDF 파일만 업로드 가능합니다.');
    }
    const formData = new FormData();
    formData.append('pdf', f);
    const token = localStorage.getItem('token');
    
    try {
      setLoading(true);
      const uploadRes = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!uploadRes.ok) throw new Error();
      const { material_id, total_pages } = await uploadRes.json();
      setMaterialId(material_id);
      setNumPages(total_pages);
      setFile(f);
      setCurrentPage(1);
      setSelectedPage(1);
      setViewedPages([1]);
      setPageTimes({});
      setAnalysis(null);
      setSlideAnalyses({});
      setMode('analysis'); // analysis 모드로만 전환, 요약 요청은 하지 않음
      setLoading(false);
    } catch {
      setLoading(false);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  // 전체 학습 시간(분)
  const totalStudyTime = Math.floor(
    Object.values(pageTimes).reduce((a, b) => a + (b || 0), 0) / 60
  );
  const currentPageTime = timer;
  const hasProblem = false; // 더미 데이터 제거

  // 이어하기: materialId가 state로 넘어오면 기존 자료 이어서 불러오기
  useEffect(() => {
    const stateMaterialId = location.state?.materialId;
    if (stateMaterialId) {
      setMaterialId(stateMaterialId);
      // 서버에서 자료 정보(페이지 수 등) 불러오기
      const token = localStorage.getItem('token');
      fetch(`http://localhost:3000/archive/${stateMaterialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setNumPages(data.slides?.length || 1);
          setFile({ name: data.title || '자료', fake: true });
          setCurrentPage(1);
          setSelectedPage(1);
          setViewedPages([1]);
          setPageTimes({});
        });
    }
  }, [location.state]);

  useEffect(() => {
    if (file && materialId && numPages > 0) {
      // 첫 페이지 요약이 이미 있으면 다시 요청하지 않도록 방어
      if (!slideAnalyses[1]) {
        handlePageSelect(1);
      }
    }
  }, [file, materialId, numPages]);

  const removeLabel = text =>
    text?.replace(/^슬라이드 전체요약:\s*/,'').replace(/^이미지 설명:\s*/,'');

  const progress = Math.round((viewedPages.length / numPages) * 100);

  const getSlideImageUrl = (materialId, slideNumber) =>
    `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/uploads/m_${materialId}_s_${slideNumber}.png`;

  const handleGoToArchiveDetail = () => {
    if (materialId) {
      navigate(`/archive/${materialId}`);
    }
  };

  const handleQuizStart = () => {
    if (materialId) {
      navigate(`/quiz/${materialId}`);
    }
  };

  // 집중 세션 저장 함수 (항상 is_interrupted: false)
  const saveFocusSession = async ({ user_id, start_time, end_time, duration }) => {
    const token = localStorage.getItem('token');
    await fetch('http://localhost:8000/report/focus-session-create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id,
        start_time,
        end_time,
        duration,
        is_interrupted: false // 무조건 집중 세션
      })
    });
  };

  // 페이지 언로드 시 시간 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStudyTime();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionTimer, sessionId]);

  function toKstMysqlDatetime(date = new Date()) {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 19).replace('T', ' ');
  }

  // Move saveInterruptionSession before useEffect and wrap in useCallback
  const saveInterruptionSession = useCallback(async (start, end) => {
    const token = localStorage.getItem('token');
    const payload = parseJwt(token);
    const user_id = payload?.user_id;
    await fetch('http://localhost:8000/report/focus-session-create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id,
        start_time: toKstMysqlDatetime(start),
        end_time: toKstMysqlDatetime(end),
        duration: Math.floor((end - start) / 1000),
        is_interrupted: true
      })
    });
  }, []); // Empty dependency array since it only uses stable values

  // Now the useEffect can safely use saveInterruptionSession
  useEffect(() => {
    if (mode !== 'analysis') return;
    const prevPathRef = { current: location.pathname };
    const unlisten = () => {
      if (mode === 'analysis' && interruptionStartRef.current) {
        const interruptionEnd = new Date();
        saveInterruptionSession(interruptionStartRef.current, interruptionEnd);
        interruptionStartRef.current = null;
      }
    };
    return () => {
      if (mode === 'analysis' && interruptionStartRef.current) {
        const interruptionEnd = new Date();
        saveInterruptionSession(interruptionStartRef.current, interruptionEnd);
        interruptionStartRef.current = null;
      }
    };
  }, [location, mode, saveInterruptionSession]);

  // 기존 visibilitychange 핸들러에서 interruptionStart를 ref로 변경
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        interruptionStartRef.current = new Date();
      } else if (document.visibilityState === 'visible' && interruptionStartRef.current) {
        const interruptionEnd = new Date();
        saveInterruptionSession(interruptionStartRef.current, interruptionEnd);
        interruptionStartRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 페이지 변경 시 이미지 로딩 상태 초기화
  useEffect(() => {
    setImageLoading(false);
    setImageError(false);
    setShouldLoadImage(false);
    imageRetryCount.current = 0;
  }, [selectedPage]);

  // 요약이 생성되면 이미지 로드 시작
  useEffect(() => {
    if (analysis && !shouldLoadImage) {
      setShouldLoadImage(true);
      setImageLoading(true);
    }
  }, [analysis]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    imageRetryCount.current = 0;
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    
    if (imageRetryCount.current < maxRetries) {
      imageRetryCount.current += 1;
      setTimeout(() => {
        setImageLoading(true);
        setImageError(false);
      }, 1000 * imageRetryCount.current);
    }
  };

  if (mode === 'list') {
    return (
      <div className="min-h-screen bg-[#18181b]">
        <div className="max-w-4xl mx-auto px-2 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-md relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="강의자료 제목 검색"
                className="w-full pl-10 pr-4 py-2 bg-[#23232a] border border-[#3a3a42] text-white rounded-xl focus:ring-2 focus:ring-[#346aff] focus:border-[#346aff] placeholder-[#bbbbbb]"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-[#bbbbbb]" />
              </div>
            </div>
            <button
              onClick={handleNew}
              className="ml-4 px-6 py-2 bg-[#346aff] text-white rounded-xl font-bold text-lg shadow hover:bg-[#2554b0] transition"
            >
              + New
            </button>
          </div>
          {loading ? (
            <div className="text-center text-[#bbbbbb] py-12">불러오는 중...</div>
          ) : filteredArchives.length === 0 ? (
            <div className="text-center text-[#bbbbbb] py-12">
              자료가 없습니다. PDF 파일을 업로드해 주세요!
            </div>
          ) : (
            filteredArchives.map(archive => (
              <div
                key={archive.material_id}
                className="bg-[#23232a] rounded-2xl border border-[#3a3a42] flex items-center justify-between px-6 py-5 hover:border-[#346aff] transition-all mb-4"
              >
                <div>
                  <div className="text-lg font-semibold text-white">
                    {archive.title}
                  </div>
                  <div className="text-sm text-[#bbbbbb]">
                    총 {archive.page}p · 진도율 {Math.round(archive.progress)}%
                  </div>
                  {archive.created_at && (
                    <div className="text-xs text-[#888888] mt-1">
                      업로드: {new Date(archive.created_at).toISOString().slice(0, 10)}
                    </div>
                  )}
                </div>
                {Math.round(archive.progress) >= 100 ? (
                  <button
                    onClick={() => navigate(`/archive/${archive.material_id}`)}
                    className="px-5 py-2 rounded-lg font-semibold text-base transition bg-[#6366f1] text-white hover:bg-[#4338ca]"
                  >
                    학습 완료!
                  </button>
                ) : (
                  <button
                    onClick={() => handleContinue(archive)}
                    className="px-5 py-2 rounded-lg font-semibold text-base transition bg-[#22c55e] text-white hover:bg-[#16a34a]"
                  >
                    이어하기
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  } else if (mode === 'upload') {
    // 업로드 화면 (X 버튼 없음)
    return (
      <div className="min-h-screen bg-[#18181b]">
        <div className="max-w-7xl mx-auto px-2 py-8 flex flex-col items-center justify-center h-[70vh]">
          <button
            onClick={() => fileInputRef.current.click()}
            className="flex items-center px-8 py-4 bg-[#346aff] text-white rounded-2xl text-lg font-bold shadow-lg hover:bg-[#2d5cd9] transition"
          >
            <FaUpload className="mr-2" /> PDF 파일 업로드
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept=".pdf"
            className="hidden"
          />
        </div>
      </div>
    );
  } else if (mode === 'analysis') {
    return (
      <div className="min-h-screen bg-[#18181b]">
        <div className="max-w-7xl mx-auto px-2 py-8">
          <div className="relative flex items-center mb-4 min-h-[48px]">
            {/* 왼쪽: 강의자료 제목 */}
            <div className="text-xl font-bold text-white">
              {archives.find(a => a.material_id === materialId)?.title || "강의자료"}
            </div>
            {/* 오른쪽: 돌아가기 버튼 */}
            <button
              onClick={handleBackToList}
              className="absolute right-0 top-0 px-6 py-2 bg-[#2d2d32] hover:bg-[#44444a] text-white rounded-xl shadow transition border-none font-semibold text-base"
              style={{ minWidth: 110, minHeight: 40 }}
              aria-label="학습중단"
            >
              돌아가기
            </button>
          </div>
          <div className="flex gap-6 min-h-[600px]" style={{height: '70vh'}}>
            {/* 좌측 영역 - 썸네일/페이지 리스트 */}
            <div className="w-1/12 bg-[#23232a] rounded-xl shadow p-4 flex flex-col items-center min-w-[60px] min-h-[500px] overflow-y-auto hide-scrollbar">
              <div className="mb-4 w-full">
                <div className="flex flex-col gap-2 max-h-[calc(70vh-100px)] overflow-y-auto custom-scrollbar">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => !loading && handlePageSelect(page)}
                      disabled={loading}
                      className={`flex items-center justify-center px-0 py-2 rounded-lg border transition-all w-full
                        ${selectedPage === page ? 'border-[#346aff] bg-[#18181b] font-bold text-[#346aff] shadow' : 'border-[#23232a] bg-[#23232a] text-[#bbbbbb] hover:bg-[#18181b]'}
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <span>[{page}]</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-2 w-full">
                <button
                  onClick={() => handlePageSelect(Math.max(selectedPage - 1, 1))}
                  disabled={selectedPage <= 1}
                  className="w-full flex items-center justify-center px-4 py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg border border-[#23232a] hover:bg-[#18181b] disabled:opacity-50"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => handlePageSelect(Math.min(selectedPage + 1, numPages))}
                  disabled={selectedPage >= numPages}
                  className="w-full flex items-center justify-center px-4 py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg border border-[#23232a] hover:bg-[#18181b] disabled:opacity-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
            {/* 중앙 - 슬라이드 이미지 뷰어 */}
            <div className="w-1/2 bg-[#23232a] rounded-xl shadow p-4 flex flex-col items-center min-h-[500px] overflow-y-auto">
              <div className="mb-2 text-[#bbbbbb] text-sm">페이지 {selectedPage} / {numPages}</div>
              <div className="overflow-auto h-[calc(80vh-80px)] w-full flex justify-center hide-scrollbar">
                {file && (
                  <>
                    {!analysis && (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-[#bbbbbb]">요약 생성 중...</div>
                      </div>
                    )}
                    {analysis && shouldLoadImage && (
                      <>
                        {imageLoading && (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#346aff] mb-2"></div>
                            <div className="text-[#bbbbbb]">이미지 로딩 중...</div>
                          </div>
                        )}
                        {imageError && imageRetryCount.current >= maxRetries && (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-[#bbbbbb] mb-2">이미지를 불러올 수 없습니다.</div>
                            <button 
                              onClick={() => {
                                setImageLoading(true);
                                setImageError(false);
                                imageRetryCount.current = 0;
                              }}
                              className="px-4 py-2 bg-[#346aff] text-white rounded-lg hover:bg-[#2554b0]"
                            >
                              다시 시도
                            </button>
                          </div>
                        )}
                        <img
                          key={`${materialId}_${selectedPage}_${imageRetryCount.current}`}
                          src={getSlideImageUrl(materialId, selectedPage)}
                          alt={`슬라이드 ${selectedPage} 이미지`}
                          style={{ 
                            width: '100%', 
                            maxHeight: 500, 
                            objectFit: 'contain',
                            display: imageLoading || imageError ? 'none' : 'block'
                          }}
                          onLoad={handleImageLoad}
                          onError={handleImageError}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* 우측 영역 - 분석 결과 및 학습 정보 */}
            <div className="w-1/2 bg-[#23232a] rounded-xl shadow p-4 flex flex-col min-h-[500px] overflow-y-auto">
              {/* Badge 영역 */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-900/30 text-orange-400 text-xs font-semibold">
                  <FaFire className="mr-1" /> {selectedPage}/{numPages} 페이지
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-semibold">
                  <FaClock className="mr-1" /> {minutes}분 {seconds}초 학습
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-semibold">
                  <FaChartLine className="mr-1" /> 진도율 {progress}%
                </span>
              </div>
              {/* 페이지별 학습 시간 */}
              
              <h2 className="text-lg font-bold mb-2 text-white">분석 결과</h2>
              {isRequestingSummary ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#346aff] mb-2"></div>
                  <div className="text-[#bbbbbb] mt-2">요약 요청 중...</div>
                </div>
              ) : loading && !analysis ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#346aff] mb-2"></div>
                  <div className="text-[#bbbbbb] mt-2">요약 생성 중...</div>
                </div>
              ) : analysis ? (
                <div className="space-y-3">
                  {/* 제목 */}
                  <div>
                    <h3 className="font-semibold mb-1 text-white">제목</h3>
                    <p className="text-[#bbbbbb] text-sm">{analysis.slide_title?.trim() ? analysis.slide_title.replace(/^슬라이드 제목\\(소주제\\):?\\s*/i, '') : '분석 결과 없음'}</p>
                  </div>
                  {/* 요약 */}
                  <div>
                    <h3 className="font-semibold mb-1 text-white">요약</h3>
                    <p className="text-[#bbbbbb] text-sm">{analysis.summary?.trim() ? analysis.summary : '요약 생성 실패'}</p>
                  </div>
                  {/* 개념 설명 */}
                  <div>
                    <h3 className="font-semibold mb-1 text-white">개념 설명</h3>
                    <p className="text-[#bbbbbb] text-sm">{analysis.concept_explanation?.trim() ? analysis.concept_explanation.replace(/^개념 설명:?\\s*/i, '') : '개념 설명 없음'}</p>
                  </div>
                  {/* 주요 키워드 */}
                  <div>
                    <h3 className="font-semibold mb-1 text-white">주요 키워드</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.main_keywords?.trim() ? analysis.main_keywords.replace(/^주요 키워드:?\\s*/i, '').split(',').filter(keyword => keyword.trim()).map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-full text-sm bg-blue-900/30 text-blue-400">{keyword.trim()}</span>
                      )) : <span className="text-[#bbbbbb]">키워드 없음</span>}
                    </div>
                  </div>
                  {/* 중요 문장 */}
                  <div>
                    <h3 className="font-semibold mb-1 text-white">중요 문장</h3>
                    <p className="text-[#bbbbbb] text-sm whitespace-pre-line">{analysis.important_sentences?.trim() ? analysis.important_sentences.replace(/^중요한 문장:?\\s*/i, '') : '중요 문장 없음'}</p>
                  </div>
                  {/* 이미지 설명 */}
                  <div>
                    <h3 className="font-semibold mb-1 text-white">이미지 설명</h3>
                    <p className="text-[#bbbbbb] text-sm">{analysis.image_description?.trim() ? analysis.image_description : '이미지 설명 없음'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[#bbbbbb]">페이지를 선택하면 분석 결과가 표시됩니다.</p>
              )}
            </div>
          </div>
          {mode === 'analysis' && (
            <div style={{ position: 'fixed', right: 40, bottom: 40, zIndex: 100 }}>
              <button
                onClick={async () => {
                  await saveStudyTime();
                  const token = localStorage.getItem('token');
                  const payload = parseJwt(token);
                  const user_id = payload?.user_id;
                  const end_time = toKstMysqlDatetime(new Date());
                  const start_time = analysisStartTime.current
                    ? toKstMysqlDatetime(new Date(analysisStartTime.current))
                    : end_time;
                  await saveFocusSession({
                    user_id,
                    start_time,
                    end_time,
                    duration: sessionTimer
                  });
                  // 강의자료 정보 찾아서 넘기기
                  const mat = archives.find(a => a.material_id === materialId);
                  if (mat) {
                    navigate('/problem-solving', { state: { mat } });
                  } else {
                    navigate('/problem-solving', { state: { materialId } });
                  }
                }}
                className="px-8 py-3 bg-[#22c55e] text-white rounded-xl font-bold text-lg shadow-lg hover:bg-[#16a34a] transition"
              >
                문제풀이 시작
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default DocumentAnalysis; 