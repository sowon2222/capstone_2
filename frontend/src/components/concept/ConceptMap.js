import React, { useState } from "react";
import NetworkGraph from "./NetworkGraph";
import FreqTable from "./FreqTable";

function ConceptMap() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [freqTable, setFreqTable] = useState([]);
  const [mainTitle, setMainTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 유효성 검사
    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB 제한
      setError("파일 크기는 10MB를 초과할 수 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("http://localhost:8000/analyze-pdf", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("서버 오류");
      const data = await res.json();
      setNodes(data.nodes);
      setEdges(data.edges);
      setFreqTable(data.freq_table);
      setMainTitle(data.main_title);
    } catch (err) {
      setError(err.message || "분석 중 오류가 발생했습니다.");
      setNodes([]);
      setEdges([]);
      setFreqTable([]);
      setMainTitle("");
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#0f0f0f]">
      {/* 상단 제목/페이지 */}
      <div className="flex justify-between items-center px-12 py-6 flex-shrink-0">
        <div className="text-lg font-bold text-white truncate">{mainTitle || "강의자료.pdf"}</div>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="px-4 py-2 bg-[#346aff] text-white rounded-lg cursor-pointer hover:bg-[#2a5ad8] transition-colors"
          >
            PDF 파일 선택
          </label>
        </div>
      </div>

      {error && (
        <div className="mx-12 mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 카드 및 컨텐츠 */}
      <div className="flex-1 flex justify-center items-center px-8 pb-8">
        <div className="w-full h-full bg-[#18181b] rounded-2xl border-none shadow-lg flex flex-col">
          {/* 탭 메뉴 (기능은 1개지만 외형만 보여줌) */}
          <div className="h-14 bg-transparent border-b border-[#333] px-10 flex-shrink-0 flex items-center">
            <button
              className="text-base px-8 py-2 ml-8 border-b-2 border-[#346aff] text-white font-semibold cursor-default"
            >
              개념 맵
            </button>
          </div>
          <div className="flex-1 p-8">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#346aff]"></div>
                <span className="ml-4 text-white text-lg">분석 중...</span>
              </div>
            ) : (
              <div
                className="w-full h-full grid gap-6"
                style={{
                  gridTemplateColumns: "2fr 1fr",
                  gridTemplateRows: "1fr",
                  height: "100%",
                }}
              >
                {/* 왼쪽 - 개념맵 */}
                <div className="bg-[#23232a] rounded-lg p-4 flex flex-col justify-center items-center">
                  <NetworkGraph nodes={nodes} edges={edges} />
                </div>
                {/* 오른쪽 - 개념어 빈도표 */}
                <div className="bg-[#23232a] rounded-lg p-4 flex flex-col">
                  <h3 className="text-white mb-4">개념어 빈도표</h3>
                  <FreqTable freqTable={freqTable} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConceptMap;