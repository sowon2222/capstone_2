import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { FaUpload, FaChevronLeft, FaChevronRight, FaFire, FaClock, FaChartLine, FaQuestionCircle } from 'react-icons/fa';

// PDF.js 워커 경로를 node_modules에서 직접 지정
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.js`;

const DUMMY_TOTAL_PAGES = 10;
const DUMMY_STUDY_TIME = 12; // 분
const DUMMY_PROBLEM_PAGES = [2, 4, 7]; // 문제 출제된 페이지

const DocumentAnalysis = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(DUMMY_TOTAL_PAGES);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [viewedPages, setViewedPages] = useState([1]); // 학습한 페이지
  const [pageTimes, setPageTimes] = useState({}); // 각 페이지별 학습 시간(초)
  const fileInputRef = useRef(null);
  const pageViewStart = useRef(Date.now());

  // 페이지 이동 시 학습 시간 기록
  useEffect(() => {
    if (!file) return;
    const now = Date.now();
    setPageTimes(prev => {
      const prevTime = prev[selectedPage] || 0;
      const elapsed = Math.floor((now - pageViewStart.current) / 1000);
      return { ...prev, [selectedPage]: prevTime + elapsed };
    });
    pageViewStart.current = now;
    // eslint-disable-next-line
  }, [selectedPage]);

  // 진도율 계산
  const progress = Math.round((viewedPages.length / numPages) * 100);

  const onFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setCurrentPage(1);
      setSelectedPage(1);
      setAnalysis(null);
      setViewedPages([1]);
      setPageTimes({});
    } else {
      alert('PDF 파일만 업로드 가능합니다.');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePageSelect = (pageNumber) => {
    setSelectedPage(pageNumber);
    setCurrentPage(pageNumber);
    setViewedPages(prev => prev.includes(pageNumber) ? prev : [...prev, pageNumber]);
    setLoading(true);
    setTimeout(() => {
      setAnalysis({
        summary: `페이지 ${pageNumber}의 요약 내용입니다.`,
        explanation: `페이지 ${pageNumber}의 상세 설명입니다.`
      });
      setLoading(false);
    }, 700);
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setShowQuizPrompt(true);
    }
  };

  const handleQuizStart = () => {
    // TODO: 문제풀기 페이지로 이동
    console.log('문제풀기 시작');
  };

  // 전체 학습 시간(더미)
  const totalStudyTime = DUMMY_STUDY_TIME;
  // 현재 페이지 학습 시간(더미)
  const currentPageTime = pageTimes[selectedPage] || 0;
  // 문제 출제 여부
  const hasProblem = DUMMY_PROBLEM_PAGES.includes(selectedPage);

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
                <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto hide-scrollbar">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageSelect(page)}
                      className={`flex items-center justify-center px-0 py-2 rounded-lg border transition-all w-full
                        ${selectedPage === page ? 'border-[#346aff] bg-[#18181b] font-bold text-[#346aff] shadow' : 'border-[#23232a] bg-[#23232a] text-[#bbbbbb] hover:bg-[#18181b]'}
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

            {/* 중앙 - PDF 뷰어 */}
            <div className="w-1/2 bg-[#23232a] rounded-xl shadow p-4 flex flex-col items-center min-h-[500px] overflow-y-auto">
              <div className="mb-2 text-[#bbbbbb] text-sm">페이지 {selectedPage} / {numPages}</div>
              <div className="overflow-auto h-[calc(80vh-80px)] w-full flex justify-center hide-scrollbar" onScroll={handleScroll}>
                <Document
                  file={file}
                  onLoadSuccess={onDocumentLoadSuccess}
                  className="flex flex-col items-center"
                >
                  <Page
                    pageNumber={selectedPage}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="mb-4"
                  />
                </Document>
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
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#346aff]"></div>
                </div>
              ) : analysis ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold mb-1 text-white">요약</h3>
                    <p className="text-[#bbbbbb] text-sm">{analysis.summary}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-white">상세 설명</h3>
                    <p className="text-[#bbbbbb] text-sm">{analysis.explanation}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[#bbbbbb]">페이지를 선택하면 분석 결과가 표시됩니다.</p>
              )}
              {/* 우측에서도 페이지 이동 */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handlePageSelect(Math.max(selectedPage - 1, 1))}
                  disabled={selectedPage <= 1}
                  className="flex-1 flex items-center justify-center px-2 py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg border border-[#23232a] hover:bg-[#18181b] disabled:opacity-50"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => handlePageSelect(Math.min(selectedPage + 1, numPages))}
                  disabled={selectedPage >= numPages}
                  className="flex-1 flex items-center justify-center px-2 py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg border border-[#23232a] hover:bg-[#18181b] disabled:opacity-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 문제풀기 프롬프트 */}
        {showQuizPrompt && (
          <div className="fixed bottom-0 left-0 right-0 bg-[#23232a] shadow-lg p-4 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <p className="text-lg text-white">이 자료를 기반으로 문제를 풀어보시겠습니까?</p>
              <button
                onClick={handleQuizStart}
                className="px-6 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors font-bold"
              >
                문제풀기 시작
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalysis; 