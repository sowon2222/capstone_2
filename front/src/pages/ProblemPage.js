import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionListSection from "../components/problem/QuestionListSection";
import ContentDisplaySection from "../components/problem/ContentDisplaySection";

export default function ProblemPage() {
  // 1. 문제 번호 상태 선언
  const [current, setCurrent] = useState(1);
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen flex flex-col bg-[#0f0f0f]">
      {/* 상단 제목/페이지 */}
      <div className="flex justify-between items-center px-12 py-6 flex-shrink-0">
        <div className="text-lg font-bold text-white truncate">강의자료.pdf</div>
        <div className="text-base text-[#9aa2ac] font-normal">{current}/10</div>
      </div>
      {/* 카드 및 탭 */}
      <div className="flex-1 min-h-0 flex justify-center items-center px-8 pb-8">
        <div className="w-full h-full bg-[#18181b] rounded-2xl border-none shadow-lg flex flex-col">
          {/* 탭 메뉴 */}
          <div className="h-14 bg-transparent border-b border-[#333] px-10 flex-shrink-0 flex items-center">
            <button 
              onClick={() => navigate("/slide-summary")}
              className="text-base px-8 py-2 text-[#bbbbbb] hover:text-white transition-colors"
            >
              설명 보기
            </button>
            <button className="text-base px-8 py-2 ml-8 border-b-2 border-[#346aff] text-white font-semibold">
              문제 풀기
            </button>
            <button
              onClick={() => navigate("/concept-map")}
              className="text-base px-8 py-2 ml-8 text-[#bbbbbb] hover:text-white transition-colors"
            >
              개념 맵
            </button>
          </div>
          {/* 2. 상태와 set함수를 props로 전달 */}
          <div className="flex-1 min-h-0 flex flex-row gap-8 px-10 py-8">
            <QuestionListSection current={current} onNumberClick={setCurrent} />
            <ContentDisplaySection current={current} setCurrent={setCurrent} />
          </div>
        </div>
      </div>
    </div>
  );
}