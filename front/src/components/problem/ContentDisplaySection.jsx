import React, { useRef, useEffect } from "react";

const problems = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `문제 ${i + 1}`,
  options: ["①", "②", "③", "④"],
}));

export default function ContentDisplaySection({ current, setCurrent }) {
  const itemRefs = useRef([]);
  const containerRef = useRef();
  const isScrollingRef = useRef(false);

  // 스크롤 시 현재 문제 자동 동기화
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      
      const container = containerRef.current;
      const containerTop = container.getBoundingClientRect().top;
      let closestIdx = 0;
      let minDiff = Infinity;
      itemRefs.current.forEach((el, idx) => {
        if (el) {
          const diff = Math.abs(el.getBoundingClientRect().top - containerTop);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        }
      });
  
      // 스크롤이 맨 아래에 도달했는지 체크
      const isAtBottom =
        Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 2;
  
      if (isAtBottom) {
        if (current !== itemRefs.current.length) setCurrent(itemRefs.current.length);
      } else if (current !== closestIdx + 1) {
        setCurrent(closestIdx + 1);
      }
    };
  
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [current, setCurrent]);

  // current가 바뀌면 해당 문제로 스크롤
  useEffect(() => {
    if (itemRefs.current[current - 1]) {
      isScrollingRef.current = true;
      itemRefs.current[current - 1].scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500); // 스크롤 애니메이션이 완료될 때까지 대기
    }
  }, [current]);

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6"
      ref={containerRef}
    >
      {problems.map((p, idx) => (
        <div
          key={p.id}
          ref={el => (itemRefs.current[idx] = el)}
          className="bg-[#23243a] rounded-xl p-6 flex flex-col gap-4"
        >
          <div className="text-white font-semibold mb-2">{p.question}</div>
          <div className="flex flex-col gap-2">
            {p.options.map((opt, oidx) => (
              <label key={oidx} className="flex items-center gap-2 text-[#bbbbbb]">
                <input
                  type="radio"
                  name={`problem-${p.id}`}
                  className="accent-[#346aff]"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      {/* 제출하기 버튼 */}
      <div className="flex justify-end mt-8">
        <button className="bg-[#346aff] text-white px-8 py-3 rounded-lg font-semibold shadow hover:bg-[#2554b0] transition">
          제출하기
        </button>
      </div>
    </div>
  );
}