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
  const [ranking, setRanking] = useState(null);
  const [feedback, setFeedback] = useState(null);
  
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

  // 랭킹 정보 가져오기
  useEffect(() => {
    if (!token) {
      setRanking(null);
      return;
    }
    fetch('http://localhost:3000/api/ranking', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRanking(data);
      })
      .catch(err => {
        console.error('랭킹 조회 오류:', err);
        setRanking(null);
      });
  }, [token]);

  // 피드백 가져오기
  useEffect(() => {
    if (!token) {
      setFeedback(null);
      return;
    }
    fetch('http://localhost:3000/api/feedback', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setFeedback(data.message);
      })
      .catch(err => {
        console.error('피드백 조회 오류:', err);
        setFeedback(null);
      });
  }, [token]);

  function getTodayStr() {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }

  const today = getTodayStr();
  const todaySessions = focusSessions.filter(s => s.start_time && s.start_time.slice(0, 10) === today);

  return (
    <main className="pt-10 pb-16 px-4 max-w-7xl mx-auto">
      {/* 인사말 */}
      <div className="text-3xl font-bold text-white mb-4 text-left">
        {token && userName && userName !== 'guest' ? `${userName}님, 오늘도 힘내요!` : 'guest님, 오늘도 힘내요!'}
      </div>

      {/* 상단: 잔디그래프 + 오늘 학습시간/랭킹 2단 배치 */}
      <div className="mb-10 w-full flex flex-row gap-8 justify-center items-stretch max-w-7xl mx-auto">
        {/* 왼쪽: 잔디그래프 (넓게) */}
        <div className="flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-[#23232a] via-[#18181b] to-[#23232a] rounded-2xl text-white shadow-lg p-8 w-full transition-transform hover:scale-[1.015] hover:shadow-2xl min-w-[400px]">
          <div className="w-full flex flex-row items-center gap-3 mb-4">
            <span className="text-2xl">🌱</span>
            <span className="font-extrabold text-xl tracking-tight">나의 학습 그래프</span>
          </div>
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
        {/* 오른쪽: 오늘 학습시간 + 랭킹 세로 배치 */}
        <div className="flex-1 flex flex-row gap-6 justify-center min-w-[260px] max-w-md items-stretch">
          <div className="bg-[#18181b] rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center flex-1">
            <div className="text-base text-white mb-2">오늘 학습 시간</div>
            <div className="text-2xl font-extrabold text-white">{todayStudyTime ?? '0초'}</div>
          </div>
          <div className="bg-[#18181b] rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center flex-1">
            <div className="font-bold text-lg text-white">랭킹</div>
            {!token ? (
              <div className="text-[#bbbbbb] text-center mt-2">로그인 후 이용 가능합니다</div>
            ) : ranking ? (
              <div className="text-center mt-2">
                <div className="text-2xl font-extrabold text-white">{ranking.rank}위</div>
                <div className="text-sm text-[#bbbbbb] mt-1">상위 {ranking.percentile}%</div>
                <div className="text-xs text-[#666666] mt-1">전체 {ranking.total_users}명 중</div>
              </div>
            ) : (
              <div className="text-[#bbbbbb] text-center mt-2">랭킹 정보 없음</div>
            )}
          </div>
        </div>
      </div>

      {/* 주요 정보: 집중/중단 타임라인 + 학습중/완료/문제풀이 */}
      <div className="flex flex-row gap-8 mb-10 max-w-7xl mx-auto mt-5">
        {/* 왼쪽: 집중/중단 타임라인 */}
        <div className="flex-1 min-w-[280px] max-w-md">
          <div className="bg-[#18181b] rounded-2xl shadow-lg p-6 h-full flex flex-col">
            <div className="font-semibold text-xl mb-4">집중/중단 타임라인</div>
            <BlockTimeline sessions={focusSessions} date="2025-05-27" />
          </div>
        </div>
        {/* 오른쪽: 학습중/완료/문제풀이 카드 */}
        <div className="flex-[2] mt-[90px]">
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
            {/* 학습중/완료 자료: 한 줄 */}
            <div className="flex flex-row gap-6 w-full">
              <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 flex-1 min-h-[160px] flex flex-col">
                <div className="font-bold text-lg mb-2">학습중 자료</div>
                {!token ? (
                  <div className="text-center text-[#bbbbbb] py-6">로그인 후 이용 가능합니다</div>
                ) : studyingFiles.length === 0 ? (
                  <div className="text-[#bbbbbb] text-center py-6">학습중인 자료가 없습니다.</div>
                ) : (
                  <>
                    <ul className="flex flex-col gap-1">
                      {studyingFiles.slice(0, 3).map(f => (
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
                    {studyingFiles.length > 3 && (
                      <div className="flex justify-end">
                        <span
                          onClick={() => navigate('/document-analysis')}
                          style={{ color: '#e0e0e0', cursor: 'pointer', fontWeight: 500, fontSize: '15px' }}
                          className="mt-2 hover:underline"
                        >
                          + 더보기
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 flex-1 min-h-[160px] flex flex-col">
                <div className="font-bold text-lg mb-2">학습완료 자료</div>
                {!token ? (
                  <div className="text-center text-[#bbbbbb] py-6">로그인 후 이용 가능합니다</div>
                ) : completedFiles.length === 0 ? (
                  <div className="text-[#bbbbbb] text-center py-6">학습완료 자료가 없습니다.</div>
                ) : (
                  <>
                    <ul className="flex flex-col gap-1">
                      {completedFiles.slice(0, 3).map(f => (
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
                    {completedFiles.length > 3 && (
                      <div className="flex justify-end">
                        <span
                          onClick={() => navigate('/document-analysis')}
                          style={{ color: '#e0e0e0', cursor: 'pointer', fontWeight: 500, fontSize: '15px' }}
                          className="mt-2 hover:underline"
                        >
                          + 더보기
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* 문제풀이 카드: 위 두 카드와 정확히 가로 맞춤 */}
            <ReviewCurationCard />
          </div>
        </div>
      </div>

      {/* 피드백 */}
      <div className="w-full bg-gradient-to-r from-[#346aff] to-[#2d5cd9] rounded-xl p-6 text-white text-lg font-semibold shadow text-center mt-8">
        {!token ? (
          "로그인 후 이용 가능합니다"
        ) : feedback ? (
          feedback
        ) : (
          "피드백을 불러오는 중..."
        )}
      </div>
    </main>
  );
}