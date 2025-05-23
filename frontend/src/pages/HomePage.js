import React, { useRef, useState, useEffect } from "react";
import { Paperclip, Search } from "lucide-react";
import { Card, CardContent } from "../components/common/Card";
import { useNavigate } from "react-router-dom";
import { useAnalysis } from "../contexts/AnalysisContext";
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { parseJwt } from '../utils/jwt'; // 토큰 파싱 유틸
import { fetchWithAuth } from '../utils/fetchWithAuth';

export default function HomePage() {
  const [todayStudyTime, setTodayStudyTime] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [studyingFiles, setStudyingFiles] = useState([]);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [weekHistory, setWeekHistory] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    const payload = parseJwt(token);
    setUserName(payload?.username || '');
  }, [token]);

  // 오늘의 학습 시간
  useEffect(() => {
    if (!token) return setTodayStudyTime(null);
    fetch('http://localhost:3000/api/study-intensity/today', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTodayStudyTime(data.intensity_score ? `${data.intensity_score}점` : '0점');
      })
      .catch(() => setTodayStudyTime('0점'));
  }, [token]);

  // 강의자료 목록
  useEffect(() => {
    if (!token) {
      setRecentFiles([]);
      setStudyingFiles([]);
      setCompletedFiles([]);
      setWeekHistory([]);
      return;
    }
    fetchWithAuth('http://localhost:3000/archive/list', {}, navigate)
      .then(res => res.json())
      .then(data => {
        setRecentFiles((data?.materials || []).slice(0, 3));
        setStudyingFiles((data?.materials || []).filter(m => m.progress < 100));
        setCompletedFiles((data?.materials || []).filter(m => m.progress === 100));
        setWeekHistory((data?.materials || []).slice(0, 7).map(m => ({
          date: new Date().toISOString().slice(0, 10),
          summary: `${m.title} ${m.page}p`
        })));
      })
      .catch(err => {
        setRecentFiles([]);
        setStudyingFiles([]);
        setCompletedFiles([]);
        setWeekHistory([]);
      });
  }, [token]);

  // 잔디 그래프 데이터
  useEffect(() => {
    if (!token) {
      setHeatmapData([]);
      return;
    }
    fetch('http://localhost:3000/api/study-intensity/month', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setHeatmapData((data.data || []).map(d => ({
          date: d.study_date,
          count: d.intensity_score
        })));
      });
  }, [token, selectedYear]);

  return (
    <main className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      {/* 👋 환영 메시지 */}
      <div className="text-2xl font-bold text-white mb-8">
        {token && userName ? `${userName}님, 오늘도 힘내세요!` : '오늘도 힘내세요!'}
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
            {!token ? (
              <div className="text-center">로그인 후 이용 가능합니다</div>
            ) : todayStudyTime === null ? (
              <div className="text-center">로딩 중...</div>
            ) : (
              <>🕒 오늘 학습: <span className="font-bold">{todayStudyTime}</span></>
            )}
          </div>
          {/* 최근 업로드 자료 */}
          <div className="bg-[#18181b] rounded-xl p-6 text-white shadow">
            <div className="font-semibold mb-2">📂 최근 업로드한 자료</div>
            {!token ? (
              <div className="text-center">로그인 후 이용 가능합니다</div>
            ) : recentFiles.length === 0 ? (
              <li className="text-[#bbbbbb]">자료가 없습니다.</li>
            ) : (
              <ul>
                {recentFiles.map(f => (
                  <li key={f.material_id} className="flex justify-between items-center py-1">
                    <span>{f.title}</span>
                    <a href="#" className="text-[#346aff] hover:underline">이어하기</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* 오른쪽: 잔디형 그래프 */}
        <div className="flex-1 bg-[#18181b] rounded-xl p-6 shadow flex flex-col items-center">
          {/* 연도 선택 탭 */}
          <div className="flex gap-2 mb-2">
            {[selectedYear].map(year => (
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
          {!token ? (
            <div className="text-center text-white">로그인 후 이용 가능합니다</div>
          ) : (
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
          )}
          {/* 하단 일주일 내역 */}
          <div
            className="w-full mt-4 max-h-32 overflow-y-auto hide-scrollbar bg-[#23232a] rounded-lg p-3 text-white text-sm"
            style={{ minHeight: "80px" }}
          >
            {!token ? (
              <div className="text-center">로그인 후 이용 가능합니다</div>
            ) : weekHistory.length === 0 ? (
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
          {!token ? (
            <div className="text-center">로그인 후 이용 가능합니다</div>
          ) : studyingFiles.length === 0 ? (
            <div className="text-[#bbbbbb]">진행중인 자료가 없습니다.</div>
          ) : (
            studyingFiles.map(f => (
              <div key={f.material_id} className="flex justify-between items-center py-1">
                <span>{f.title}</span>
                <a href="#" className="text-[#346aff] hover:underline">이어하기</a>
              </div>
            ))
          )}
        </div>
        {/* 학습완료 */}
        <div className="bg-[#18181b] rounded-xl p-6 shadow text-white">
          <div className="font-semibold mb-2">✅ 학습완료 자료</div>
          {!token ? (
            <div className="text-center">로그인 후 이용 가능합니다</div>
          ) : completedFiles.length === 0 ? (
            <div className="text-[#bbbbbb]">완료된 자료가 없습니다.</div>
          ) : (
            completedFiles.map(f => (
              <div key={f.material_id} className="flex justify-between items-center py-1">
                <span>{f.title}</span>
                <a href="#" className="text-[#346aff] hover:underline">복습하기</a>
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