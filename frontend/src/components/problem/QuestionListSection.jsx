import React from "react";

export default function QuestionListSection({ current, onNumberClick }) {
  const problems = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-2 items-center py-2">
      {problems.map((num) => (
        <button
          key={num}
          onClick={() => onNumberClick(num)}
          className={`w-10 h-10 rounded-lg font-bold border border-[#346aff] transition-colors
            ${current === num
              ? "bg-[#346aff] text-white"
              : "bg-white text-[#23232a] hover:bg-[#e6f0ff]"}
          `}
        >
          {num}
        </button>
      ))}
    </div>
  );
}