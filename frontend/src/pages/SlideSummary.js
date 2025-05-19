import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/common/Card";
import { Document, Page, pdfjs } from "react-pdf";
import ConceptMap from "../components/concept/ConceptMap";
import { useAnalysis } from "../contexts/AnalysisContext";

// pdfjs worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default function SlideSummary() {
  const { analysisResult, uploadedFile } = useAnalysis();
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [activeTab, setActiveTab] = useState("explanation");
  const navigate = useNavigate();

  const onFileChange = (e) => {
    // 파일 교체 시 Context에 반영 필요 (여기선 생략)
  };
  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const fileName = uploadedFile ? uploadedFile.name : "강의자료.pdf";

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white text-lg">
        분석된 파일이 없습니다. 홈에서 파일을 업로드 해주세요.
      </div>
    );
  }

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
              onClick={() => setActiveTab("problem")}
              className={`text-base px-8 py-2 ml-8 ${
                activeTab === "problem"
                  ? "border-b-2 border-[#346aff] text-white font-semibold"
                  : "text-[#bbbbbb] hover:text-white transition-colors"
              }`}
            >
              문제 풀기
            </button>
            <button
              onClick={() => setActiveTab("concept-map")}
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
                  {uploadedFile ? (
                    <div className="flex flex-col items-center w-full h-full">
                      <div className="overflow-auto flex-1 flex items-center justify-center w-full">
                        <Document
                          file={uploadedFile}
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
                  ) : (
                    <div className="text-[#bbbbbb] text-base text-center px-4">
                      PDF 미리보기를 불러올 수 없습니다.
                    </div>
                  )}
                </div>
                {/* 설명 영역 */}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-[#23232a] rounded-xl shadow h-full">
                  <div className="text-[#bbbbbb] text-base text-center px-4">
                    {/* 실제 설명 결과를 여기에 렌더링 */}
                    {analysisResult.subtopics
                      ? Object.entries(analysisResult.subtopics).map(([topic, keywords]) => (
                          <div key={topic} className="mb-4">
                            <div className="font-bold text-white mb-1">{topic}</div>
                            <div className="text-[#bbbbbb] text-sm">{keywords.join(", ")}</div>
                          </div>
                        ))
                      : "자료에 대한 설명이 없습니다."}
                  </div>
                </div>
              </div>
            )}
            {activeTab === "problem" && (
              <div className="flex flex-col items-center justify-center h-full text-white text-lg">
                {/* 기출문제 결과가 있다면 여기에 렌더링 */}
                기출문제 결과가 없습니다.
              </div>
            )}
            {activeTab === "concept-map" && (
              <div className="h-full">
                <ConceptMap
                  nodes={analysisResult.nodes}
                  edges={analysisResult.edges}
                  freqTable={analysisResult.freq_table}
                  mainTitle={analysisResult.main_title}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}