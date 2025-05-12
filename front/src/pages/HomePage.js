import React, { useRef, useState } from "react";
import { Paperclip, Search } from "lucide-react";
import { Card, CardContent } from "../components/common/Card";

export default function HomePage() {
  const popularQuestions = [
    { id: 1, label: "인기질문#1" },
    { id: 2, label: "인기질문#2" },
    { id: 3, label: "인기질문#3" },
  ];

  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef();

  // 파일 선택 시 처리 함수
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      alert(`업로드된 파일: ${file.name}`);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen py-16 px-4">
      {/* 검색창 */}
      <div className="w-full max-w-2xl mb-16">
        <div className="h-16 bg-[#18181b] rounded-2xl border border-[#23232a] flex items-center shadow-md px-4">
          {/* 클립 아이콘 + 툴팁 */}
          <div
            className="relative flex items-center justify-center w-12 h-12"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-12 h-12 cursor-pointer"
              tabIndex={0}
            >
              <Paperclip className="w-7 h-7 text-[#bbbbbb] -rotate-45" />
              <input
                id="file-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </label>
            {/* 툴팁 */}
            {showTooltip && (
            <div
              className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-10 bg-[#ededed] text-[#23232a] text-sm rounded-xl px-4 py-3 shadow-lg whitespace-nowrap"
              style={{ borderRadius: "16px" }}
            >
              {/* 삼각형 */}
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2"
                style={{
                  width: 20,
                  height: 10,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: "#ededed",
                    transform: "rotate(-45deg)",
                    margin: "0 auto",
                    marginTop: 6,
                    borderRadius: "4px",
                    boxShadow: "0 0 2px #ededed",
                  }}
                />
              </div>
              파일 또는 이미지<br />업로드
            </div>
          )}
          </div>
          {/* 입력창 */}
          <input
            className="flex-1 h-12 bg-transparent border-none pl-2 text-lg text-[#e0e0e0] font-normal outline-none"
            placeholder="질문을 입력하거나 파일을 업로드 하세요"
          />
          {/* 돋보기 아이콘 */}
          <button className="flex items-center justify-center w-12 h-12 bg-[#346aff] rounded-xl ml-2">
            <Search className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
      {/* 인기 질문 */}
      <h2 className="text-2xl font-bold text-white mb-8 text-center">인기 질문</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {popularQuestions.map((question) => (
          <Card
            key={question.id}
            className="bg-[#18181b] border-none hover:bg-[#23232a] transition-colors cursor-pointer shadow-md rounded-2xl"
          >
            <CardContent className="flex items-center justify-center h-40">
              <span className="text-xl text-[#e0e0e0] font-medium">
                {question.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}