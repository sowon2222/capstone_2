import React, { useRef, useState } from "react";
import { Paperclip, Search } from "lucide-react";
import { Card, CardContent } from "../components/common/Card";
import { useNavigate } from "react-router-dom";
import { useAnalysis } from "../contexts/AnalysisContext";
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

export default function HomePage() {
  const popularQuestions = [
    { id: 1, label: "인기질문#1" },
    { id: 2, label: "인기질문#2" },
    { id: 3, label: "인기질문#3" },
  ];

  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const { setAnalysisResult, setUploadedFile } = useAnalysis();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2025);

  // 파일 선택 시 처리 함수
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("http://localhost:8000/analyze-pdf", {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "서버 오류가 발생했습니다.");
      }
      
      const data = await res.json();
      setAnalysisResult(data);
      setUploadedFile(file);
      navigate('/slide-summary');
    } catch (err) {
      setError(err.message || "분석 중 오류가 발생했습니다.");
      console.error("파일 분석 중 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 예시용 데이터
  const userName = "홍길동"; // 실제 로그인 정보에서 받아오도록
  const todayStudyTime = "1시간 20분";
  const recentFiles = [
    { id: 1, name: "챕터1.pdf", link: "/study/1" },
    { id: 2, name: "챕터2.pdf", link: "/study/2" },
  ];
  const studyingFiles = [
    { id: 3, name: "챕터3.pdf", link: "/study/3" },
  ];
  const completedFiles = [
    { id: 4, name: "챕터4.pdf", link: "/study/4" },
  ];
  const heatmapData2025 = [
    { date: "2025-05-01", count: 2 },
    { date: "2025-05-02", count: 1 },
    // ... 실제 데이터로 대체
  ];
  const heatmapData2024 = [
    // ... 실제 데이터로 대체
  ];
  const weekHistory = [
    { date: "2025-05-01", summary: "챕터1.pdf 30분" },
    { date: "2025-05-02", summary: "챕터2.pdf 50분" },
    // ...최대 7개
  ];

  // 연도별 데이터 선택
  const heatmapData = selectedYear === 2025 ? heatmapData2025 : heatmapData2024;

  return (
    <main className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      {/* 👋 환영 메시지 */}
      <div className="text-2xl font-bold text-white mb-8">
        {userName}님, 오늘도 힘내세요!
      </div>

      {/* 상단 2단 */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12">
        {/* 왼쪽 */}
        <div className="flex-1 flex flex-col gap-6">
          {/* 자료 업로드 버튼 */}
          <button 
            onClick={() => navigate('/document-analysis')}
            className="w-full h-16 bg-[#346aff] text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-[#2d5cd9] transition"
          >
            + 자료 업로드
          </button>
          {/* 오늘의 학습 시간 */}
          <div className="bg-[#18181b] rounded-xl p-6 text-lg text-white shadow">
            🕒 오늘 학습: <span className="font-bold">{todayStudyTime}</span>
          </div>
          {/* 최근 업로드 자료 */}
          <div className="bg-[#18181b] rounded-xl p-6 text-white shadow">
            <div className="font-semibold mb-2">📂 최근 업로드한 자료</div>
            <ul>
              {recentFiles.map(f => (
                <li key={f.id} className="flex justify-between items-center py-1">
                  <span>{f.name}</span>
                  <a href={f.link} className="text-[#346aff] hover:underline">이어하기</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* 오른쪽: 잔디형 그래프 */}
        <div className="flex-1 bg-[#18181b] rounded-xl p-6 shadow flex flex-col items-center">
          {/* 연도 선택 탭 */}
          <div className="flex gap-2 mb-2">
            {[2024, 2025].map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-1 rounded-lg text-sm font-semibold transition-colors
                  ${selectedYear === year ? "bg-[#346aff] text-white" : "bg-[#23232a] text-[#bbbbbb] hover:bg-[#2d5cd9]"}
                `}
              >
                {year}
              </button>
            ))}
          </div>
          <div className="font-semibold text-white mb-4">🌱 나의 학습 그래프</div>
          <CalendarHeatmap
            startDate={new Date(`${selectedYear}-01-01`)}
            endDate={new Date(`${selectedYear}-12-31`)}
            values={heatmapData}
            classForValue={value => {
              if (!value) return 'color-empty';
              if (value.count >= 3) return 'color-github-4';
              if (value.count === 2) return 'color-github-3';
              if (value.count === 1) return 'color-github-2';
              return 'color-github-1';
            }}
            showWeekdayLabels={true}
          />
          {/* 하단 일주일 내역 */}
          <div
            className="w-full mt-4 max-h-32 overflow-y-auto hide-scrollbar bg-[#23232a] rounded-lg p-3 text-white text-sm"
            style={{ minHeight: "80px" }}
          >
            {weekHistory.length === 0 ? (
              <div className="text-[#bbbbbb] text-center">최근 학습 내역이 없습니다.</div>
            ) : (
              <ul>
                {weekHistory.map((item, idx) => (
                  <li key={idx} className="flex justify-between py-1 border-b border-[#23232a] last:border-b-0">
                    <span className="text-[#93c5fd]">{item.date}</span>
                    <span>{item.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 하단 2단 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* 학습중 */}
        <div className="bg-[#18181b] rounded-xl p-6 shadow text-white">
          <div className="font-semibold mb-2">📘 학습중인 자료</div>
          {studyingFiles.length === 0 ? (
            <div className="text-[#bbbbbb]">진행중인 자료가 없습니다.</div>
          ) : (
            studyingFiles.map(f => (
              <div key={f.id} className="flex justify-between items-center py-1">
                <span>{f.name}</span>
                <a href={f.link} className="text-[#346aff] hover:underline">이어하기</a>
              </div>
            ))
          )}
        </div>
        {/* 학습완료 */}
        <div className="bg-[#18181b] rounded-xl p-6 shadow text-white">
          <div className="font-semibold mb-2">✅ 학습완료 자료</div>
          {completedFiles.length === 0 ? (
            <div className="text-[#bbbbbb]">완료된 자료가 없습니다.</div>
          ) : (
            completedFiles.map(f => (
              <div key={f.id} className="flex justify-between items-center py-1">
                <span>{f.name}</span>
                <a href={f.link} className="text-[#346aff] hover:underline">복습하기</a>
              </div>
            ))
          )}
        </div>
      </div>

      {/*학습 리포트 요약 배너 */}
      <div className="bg-gradient-to-r from-[#346aff] to-[#2d5cd9] rounded-xl p-6 text-white text-lg font-semibold shadow text-center">
        📈 오답률이 높은 자료는 TCP/IP 영역 입니다. "이런 부분을 더 공부하세요!"
      </div>
    </main>
  );
}