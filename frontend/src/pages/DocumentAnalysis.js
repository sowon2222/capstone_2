import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { FaUpload, FaChevronLeft, FaChevronRight, FaFire, FaClock, FaChartLine, FaQuestionCircle } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

// PDF.js 워커 경로를 node_modules에서 직접 지정
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.js`;

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
  const fileInputRef = useRef(null);
  const pageViewStart = useRef(Date.now());
  const analysisStartTime = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [timer, setTimer] = useState(0);
  const timerInterval = useRef(null);

  // 타이머 효과
  useEffect(() => {
    if (!file) return;
    setTimer(pageTimes[selectedPage] || 0);
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [selectedPage, file]);

  // 페이지 이동 시 학습 시간 기록
  useEffect(() => {
    if (!file) return;
    setPageTimes((prev) => ({
      ...prev,
      [selectedPage]: timer,
    }));
    // eslint-disable-next-line
  }, [selectedPage]);

  // 분석 시작 시 시간 기록
  useEffect(() => {
    if (file) {
      analysisStartTime.current = Date.now();
    }
  }, [file]);

  // 학습 시간 저장 함수
  const saveStudyTime = async () => {
    if (!analysisStartTime.current) return;
    const duration = Math.floor((Date.now() - analysisStartTime.current) / 1000); // 초 단위
    const token = localStorage.getItem('token');
    if (duration > 0 && token) {
      await fetch('http://localhost:3000/api/study-time', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ duration })
      });
    }
    analysisStartTime.current = null; // 초기화
  };

  // 진도율 계산
  const progress = Math.round((viewedPages.length / numPages) * 100);

  const onFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const token = localStorage.getItem('token');
      try {
        const uploadRes = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!uploadRes.ok) throw new Error('파일 업로드 실패');

        const { material_id, total_pages } = await uploadRes.json();
        setMaterialId(material_id);
        setNumPages(total_pages); // 서버에서 받은 실제 페이지 수로 세팅

        setFile(selectedFile);
        setCurrentPage(1);
        setSelectedPage(1);
        setAnalysis(null);
        setViewedPages([1]);
        setPageTimes({});
      } catch (err) {
        console.error('Upload error:', err);
        alert('파일 업로드 중 오류가 발생했습니다.');
      }
    } else {
      alert('PDF 파일만 업로드 가능합니다.');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePageSelect = async (pageNumber) => {
    if (!materialId) {
      alert('강의자료가 업로드되지 않았습니다.');
      return;
    }

    // 이전 페이지 학습 시간 저장
    setPageTimes(prev => ({
      ...prev,
      [selectedPage]: timer,
    }));
    stopTimer(); // 타이머 정지

    setSelectedPage(pageNumber);
    setCurrentPage(pageNumber);
    setViewedPages(prev => prev.includes(pageNumber) ? prev : [...prev, pageNumber]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/archive/${materialId}/slide/${pageNumber}/summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('슬라이드 요약을 불러오지 못했습니다.');
      
      const data = await res.json();
      const { slide } = data;

      setAnalysis({
        summary: slide.summary,
        explanation: slide.concept_explanation,
        slide_title: slide.slide_title,
        main_keywords: slide.main_keywords,
        important_sentences: slide.important_sentences,
        image_url: slide.image_url
      });

      setTimer(pageTimes[pageNumber] || 0); // 이전에 학습한 시간 있으면 불러오기, 없으면 0
      startTimer(); // 요약 응답 후 타이머 시작
    } catch (err) {
      console.error('Error:', err);
      alert('슬라이드 요약을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setShowQuizPrompt(true);
    }
  };

  const handleQuizStart = async () => {
    if (!materialId) {
      alert('강의자료가 업로드되지 않았습니다.');
      return;
    }

    await saveStudyTime();
    const token = localStorage.getItem('token');
    
    try {
      // 슬라이드 리스트 불러오기
      const res = await fetch(`http://localhost:3000/slides/material/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('슬라이드 정보를 불러오지 못했습니다.');
      
      const slides = await res.json();
      if (!slides || slides.length === 0) {
        alert('해당 강의자료에 슬라이드가 없습니다.');
        return;
      }

      // 문제풀이 페이지로 슬라이드 리스트 넘기기
      navigate('/problem-solving', { state: { slides, materialId } });
    } catch (err) {
      console.error('Error:', err);
      alert('문제풀기를 시작할 수 없습니다: ' + err.message);
    }
  };

  // 전체 학습 시간(분)
  const totalStudyTime = Math.floor(
    Object.values(pageTimes).reduce((a, b) => a + (b || 0), 0) / 60
  );
  // 현재 페이지 학습 시간(더미)
  const currentPageTime = timer;
  // 문제 출제 여부
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
          setFile({ name: data.title || '자료', fake: true }); // fake file 객체로 업로드 없이 UI 활성화
          setCurrentPage(1);
          setSelectedPage(1);
          setViewedPages([1]);
          setPageTimes({});
        });
    }
  }, [location.state]);

  useEffect(() => {
    if (file && materialId) {
      handlePageSelect(1);
    }
    // eslint-disable-next-line
  }, [file, materialId]);

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

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#18181b]">
      <div className="max-w-7xl mx-auto px-2 py-8">
        {!file ? (
          <div className="flex flex-col items-center justify-center h-[70vh]">
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
        ) : (
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
                      <span>{page}</span>
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
                {analysis && analysis.image_url ? (
                  <img
                    src={`http://localhost:3000${analysis.image_url}`}
                    alt={`슬라이드 ${selectedPage} 이미지`}
                    style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: '12px' }}
                  />
                ) : (
                  <div className="text-[#bbbbbb] text-center w-full h-full flex items-center justify-center">
                    슬라이드 이미지를 불러오는 중이거나, 아직 분석 결과가 없습니다.
                  </div>
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
                  <FaClock className="mr-1" /> {totalStudyTime}분 학습
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-semibold">
                  <FaChartLine className="mr-1" /> 진도율 {progress}%
                </span>
              </div>
              {/* 페이지별 학습 시간 */}
              <div className="mb-2 text-xs text-[#bbbbbb]">이 페이지 학습: {Math.floor(currentPageTime/60)}분 {currentPageTime%60}초</div>
              <h2 className="text-lg font-bold mb-2 text-white">분석 결과</h2>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#346aff] mb-2"></div>
                  <div className="text-[#bbbbbb] mt-2">요약 생성 중...</div>
                </div>
              ) : analysis ? (
                <div className="space-y-3">
                  {analysis.slide_title && (
                    <div>
                      <h3 className="font-semibold mb-1 text-white">제목</h3>
                      <p className="text-[#bbbbbb] text-sm">{analysis.slide_title}</p>
                    </div>
                  )}
                  {analysis.summary && (
                    <div>
                      <h3 className="font-semibold mb-1 text-white">요약</h3>
                      <p className="text-[#bbbbbb] text-sm">{analysis.summary}</p>
                    </div>
                  )}
                  {analysis.explanation && (
                    <div>
                      <h3 className="font-semibold mb-1 text-white">개념 설명</h3>
                      <p className="text-[#bbbbbb] text-sm">{analysis.explanation}</p>
                    </div>
                  )}
                  {analysis.main_keywords && typeof analysis.main_keywords === 'string' && (
                    <div>
                      <h3 className="font-semibold mb-1 text-white">주요 키워드</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.main_keywords.split(',')
                          .filter(keyword => keyword.trim())
                          .map((keyword, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-full text-sm bg-blue-900/30 text-blue-400">
                              {keyword.trim()}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  {analysis.important_sentences && (
                    <div>
                      <h3 className="font-semibold mb-1 text-white">중요 문장</h3>
                      <p className="text-[#bbbbbb] text-sm whitespace-pre-line">{analysis.important_sentences}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#bbbbbb]">페이지를 선택하면 분석 결과가 표시됩니다.</p>
              )}
            </div>
          </div>
        )}

        {file && (
          <div className="fixed left-0 right-0 bottom-0 bg-[#23232a] shadow-lg z-50 py-4">
            <div className="max-w-3xl mx-auto flex items-center justify-between px-6">
              <span className="text-lg text-white font-semibold">
                이 자료를 기반으로 문제를 풀어보시겠습니까?
              </span>
              <button
                onClick={handleQuizStart}
                className="px-8 py-3 bg-[#22c55e] text-white rounded-xl font-bold text-lg shadow-lg hover:bg-[#16a34a] transition"
              >
                기출문제 풀러가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalysis; 