import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/common/Card";
import { Document, Page, pdfjs } from "react-pdf";
import ConceptMap from "../components/concept/ConceptMap";

// pdfjs worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default function SlideSummary() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [activeTab, setActiveTab] = useState("explanation"); // 'explanation' | 'problem' | 'concept-map'
  const navigate = useNavigate();

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
    setPageNumber(1);
  };
  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const fileName = file ? file.name : "강의자료.pdf";

  return (
    <div className="w-full h-screen flex flex-col bg-[#0f0f0f]">
      {/* 상단 제목/페이지 */}
      <div className="flex justify-between items-center px-12 py-6 flex-shrink-0">
        <div className="text-lg font-bold text-white truncate">{fileName}</div>
        <div className="text-base text-[#9aa2ac] font-normal">
          {pageNumber}/{numPages || "?"}
        </div>
      </div>
      {/* 카드 및 컨텐츠 */}
      <div className="flex-1 flex justify-center items-center px-8 pb-8">
        <Card className="w-full h-full bg-[#18181b] rounded-2xl border-none shadow-lg flex flex-col">
          {/* 탭 메뉴 */}
          <div className="h-14 bg-transparent border-b border-[#333] px-10 flex-shrink-0 flex items-center">
            <button
              onClick={() => setActiveTab("explanation")}
              className={`text-base px-8 py-2 ${
                activeTab === "explanation"
                  ? "border-b-2 border-[#346aff] text-white font-semibold"
                  : "text-[#bbbbbb] hover:text-white transition-colors"
              }`}
            >
              설명 보기
            </button>
            <button
              onClick={() => navigate("/problems")}
              className={`text-base px-8 py-2 ml-8 ${
                activeTab === "problem"
                  ? "border-b-2 border-[#346aff] text-white font-semibold"
                  : "text-[#bbbbbb] hover:text-white transition-colors"
              }`}
            >
              문제 풀기
            </button>
            <button
              onClick={() => navigate("/concept-map")}
              className={`text-base px-8 py-2 ml-8 ${
                activeTab === "concept-map"
                  ? "border-b-2 border-[#346aff] text-white font-semibold"
                  : "text-[#bbbbbb] hover:text-white transition-colors"
              }`}
            >
              개념 맵
            </button>
          </div>
          
          <CardContent className="flex-1 p-8">
            {activeTab === "explanation" && (
              <div className="flex gap-8 h-full">
                {/* PDF 미리보기 */}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-[#23232a] rounded-xl shadow h-full">
                  {!file ? (
                    <label className="text-[#bbbbbb] text-base cursor-pointer flex flex-col items-center justify-center h-full w-full">
                      <span>업로드 자료</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={onFileChange}
                        className="hidden"
                      />
                      <span className="mt-2 text-xs text-[#666]">(PDF 파일을 업로드하세요)</span>
                    </label>
                  ) : (
                    <div className="flex flex-col items-center w-full h-full">
                      <div className="overflow-auto flex-1 flex items-center justify-center w-full">
                        <Document
                          file={file}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading="PDF 불러오는 중..."
                        >
                          <Page pageNumber={pageNumber} width={300} />
                        </Document>
                      </div>
                      <div className="flex gap-4 mt-4">
                        <button
                          onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                          disabled={pageNumber <= 1}
                          className="px-3 py-1 bg-[#346aff] text-white rounded disabled:opacity-50"
                        >
                          이전
                        </button>
                        <button
                          onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
                          disabled={pageNumber >= numPages}
                          className="px-3 py-1 bg-[#346aff] text-white rounded disabled:opacity-50"
                        >
                          다음
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* 설명 영역 */}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-[#23232a] rounded-xl shadow h-full">
                  <div className="text-[#bbbbbb] text-base text-center px-4">
                    {file
                      ? "여기에 자료에 대한 설명이 출력됩니다. (백엔드 연동 전)"
                      : "자료에 대한 설명"}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "concept-map" && (
              <div className="h-full">
                <ConceptMap />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}