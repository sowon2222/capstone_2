import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/common/Card";
import ConceptMap from "../components/concept/ConceptMap";

export default function ConceptMapPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("concept-map");

  return (
    <div className="w-full h-screen flex flex-col bg-[#0f0f0f]">
      {/* 상단 제목/페이지 */}
      <div className="flex justify-between items-center px-12 py-6 flex-shrink-0">
        <div className="text-lg font-bold text-white truncate">강의자료.pdf</div>
      </div>
      {/* 카드 및 컨텐츠 */}
      <div className="flex-1 flex justify-center items-center px-8 pb-8">
        <Card className="w-full h-full bg-[#18181b] rounded-2xl border-none shadow-lg flex flex-col">
          {/* 탭 메뉴 */}
          <div className="h-14 bg-transparent border-b border-[#333] px-10 flex-shrink-0 flex items-center">
            <button
              onClick={() => navigate("/slide-summary")}
              className="text-base px-8 py-2 text-[#bbbbbb] hover:text-white transition-colors"
            >
              설명 보기
            </button>
            <button
              onClick={() => navigate("/problems")}
              className="text-base px-8 py-2 ml-8 text-[#bbbbbb] hover:text-white transition-colors"
            >
              문제 풀기
            </button>
            <button
              className="text-base px-8 py-2 ml-8 border-b-2 border-[#346aff] text-white font-semibold"
            >
              개념 맵
            </button>
          </div>
          
          <CardContent className="flex-1 p-8">
            <div
              className="w-full h-full grid gap-6"
              style={{
                gridTemplateColumns: "2fr 1fr",
                gridTemplateRows: "1fr 1fr",
                height: "100%",
              }}
            >
              {/* 왼쪽 큰 박스 */}
              <div
                className="bg-[#23232a] rounded-lg"
                style={{ gridRow: "1 / span 2", gridColumn: "1 / 2" }}
              ></div>
              {/* 오른쪽 위 박스 */}
              <div
                className="bg-[#23232a] rounded-lg"
                style={{ gridRow: "1 / 2", gridColumn: "2 / 3" }}
              ></div>
              {/* 오른쪽 아래 박스 */}
              <div
                className="bg-[#23232a] rounded-lg"
                style={{ gridRow: "2 / 3", gridColumn: "2 / 3" }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 