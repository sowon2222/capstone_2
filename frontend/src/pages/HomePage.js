import React, { useRef, useState, useEffect } from "react";
import { Paperclip, Search } from "lucide-react";
import { Card, CardContent } from "../components/common/Card";
import { useNavigate } from "react-router-dom";
import { useAnalysis } from "../contexts/AnalysisContext";
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { parseJwt } from '../utils/jwt'; // 토큰 파싱 유틸
import { fetchWithAuth } from '../utils/fetchWithAuth';
import ReviewCurationCard from '../components/ReviewCurationCard';
import BlockTimeline from '../components/TextTimeline';

export default function HomePage() {
  const [todayStudyTime, setTodayStudyTime] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [studyingFiles, setStudyingFiles] = useState([]);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [weekHistory, setWeekHistory] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('guest');
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [focusSessions, setFocusSessions] = useState([]);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setUserName('guest');
      return;
    }
    const payload = parseJwt(token);
    setUserName(payload?.username || 'guest');
  }, [token]);

  // 오늘의 학습 시간(누적)
  useEffect(() => {
    if (!token) return setTodayStudyTime(null);
    fetch('http://localhost:3000/api/study-time/total', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const totalSec = data.total_time || 0;
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        let timeStr = '';
        if (hours > 0) timeStr += `${hours}시간 `;
        if (minutes > 0) timeStr += `${minutes}분 `;
        if (seconds > 0 || timeStr === '') timeStr += `${seconds}초`;
        setTodayStudyTime(timeStr.trim());
      })
      .catch(() => setTodayStudyTime('0초'));
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
        setStudyingFiles((data?.materials || []).filter(m => Number(m.progress) < 100));
        setCompletedFiles((data?.materials || []).filter(m => Number(m.progress) === 100));
        setWeekHistory((data?.materials || []).slice(0, 7).map(m => ({
          date: new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
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

  useEffect(() => {
    if (!token) {
      console.log('토큰 없음, focus-timeline fetch 실행 안함');
      setFocusSessions([]);
      return;
    }
    console.log('focus-timeline useEffect 실행');
    const payload = parseJwt(token);
    const userId = payload?.user_id;
    // 이번 달 1일부터 오늘까지
    const periodStart = '2025-05-01';
    const periodEnd = '2025-05-31';
    console.log('focus-timeline fetch 실행');
    fetch(`http://localhost:8000/report/focus-timeline?user_id=${userId}&period_start=${periodStart}&period_end=${periodEnd}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        console.log('focus-timeline raw response:', res);
        return res.json();
      })
      .then(data => {
        console.log('focus-timeline parsed data:', data);
        setFocusSessions(data || []);
      })
      .catch((err) => {
        console.error('focus-timeline fetch error:', err);
        setFocusSessions([]);
      });
  }, [token]);

  useEffect(() => {
    console.log('focusSessions:', focusSessions);
  }, [focusSessions]);

  return (
    <main className="pt-10 pb-16 px-4 max-w-7xl mx-auto">
      {/* 인사말 */}
      <div className="text-3xl font-bold text-white mb-4 text-left">
        {token && userName && userName !== 'guest' ? `${userName}님, 오늘도 힘내요!` : 'guest님, 오늘도 힘내요!'}
      </div>

      {/* 잔디그래프 */}
      <div className="mb-10 w-full">
        <div className="bg-[#18181b] rounded-2xl p-6 text-white shadow-md w-full flex flex-col items-center max-w-3xl mx-auto">
          <div className="w-full max-w-3xl mx-auto">
            <div className="font-semibold text-xl mb-4 text-center">🌱 나의 학습 그래프</div>
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
          </div>
        </div>
      </div>

      {/* 중앙 2단 그리드 */}
      <div className="flex flex-row gap-8 mb-10">
        {/* 왼쪽: 집중/중단 타임라인 */}
        <div className="flex-1 min-w-[280px] max-w-sm">
          <div className="bg-[#18181b] rounded-2xl shadow-lg p-6 h-full flex flex-col">
            <div className="font-semibold text-xl mb-4">집중/중단 타임라인</div>
            <BlockTimeline sessions={focusSessions} />
          </div>
        </div>
        {/* 오른쪽: 큐레이션 + 학습중/완료 */}
        <div className="flex-[2] flex flex-col gap-6">
          {/* 큐레이션 */}
          <div className="bg-[#18181b] rounded-2xl shadow-lg p-6">
            <ReviewCurationCard />
          </div>
          {/* 학습중/완료 2단 그리드 */}
          <div className="flex flex-row gap-6">
            {/* 학습중 자료 */}
            <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 flex-1">
              <div className="font-bold text-lg mb-2">학습중 자료</div>
              {!token ? (
                <div className="text-center text-[#bbbbbb] py-6">로그인 후 이용 가능합니다</div>
              ) : studyingFiles.length === 0 ? (
                <div className="text-[#bbbbbb] text-center py-6">학습중인 자료가 없습니다.</div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {studyingFiles.map(f => (
                    <li key={f.material_id} className="flex justify-between items-center py-1 border-b border-[#23232a] last:border-b-0">
                      <span className="truncate max-w-xs">{f.title}</span>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          navigate('/document-analysis', { state: { materialId: f.material_id } });
                        }}
                        className="text-[#346aff] hover:underline"
                      >
                        이어하기
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => {
                  if (!token) {
                    setShowLoginAlert(true);
                    setTimeout(() => setShowLoginAlert(false), 2000);
                    return;
                  }
                  navigate('/document-analysis');
                }}
                className="mt-2 self-end px-3 py-1 bg-[#346aff] text-white rounded-lg text-sm font-bold hover:bg-[#2554b0] transition"
                style={{ outline: 'none', border: 'none' }}
              >
                + New
              </button>
            </div>
            {/* 학습완료 자료 */}
            <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 flex-1">
              <div className="font-bold text-lg mb-2">학습완료 자료</div>
              {!token ? (
                <div className="text-center text-[#bbbbbb] py-6">로그인 후 이용 가능합니다</div>
              ) : completedFiles.length === 0 ? (
                <div className="text-[#bbbbbb] text-center py-6">학습완료 자료가 없습니다.</div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {completedFiles.map(f => (
                    <li key={f.material_id} className="flex justify-between items-center py-1 border-b border-[#23232a] last:border-b-0">
                      <span className="truncate max-w-xs">{f.title}</span>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          navigate(`/archive/${f.material_id}`);
                        }}
                        className="text-[#346aff] hover:underline"
                      >
                        복습하기
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 오늘학습/랭킹 2단 */}
      <div className="flex flex-row gap-8 mb-10">
        <div className="bg-[#18181b] rounded-2xl shadow-lg p-6 flex-1 flex flex-col items-center justify-center">
          <div className="text-lg text-white mb-2">오늘 학습 시간</div>
          <div className="text-4xl font-extrabold text-white">{todayStudyTime ?? '0초'}</div>
        </div>
        <div className="bg-[#18181b] rounded-2xl shadow-lg p-6 flex-1 flex flex-col items-center justify-center">
          <div className="font-bold text-2xl text-white">랭킹</div>
        </div>
      </div>

      {/* 피드백 */}
      <div className="w-full bg-gradient-to-r from-[#346aff] to-[#2d5cd9] rounded-xl p-6 text-white text-lg font-semibold shadow text-center mt-8">
        📈 오답률이 높은 자료는 TCP/IP 영역 입니다. "이런 부분을 더 공부하세요!"
      </div>
    </main>
  );
}