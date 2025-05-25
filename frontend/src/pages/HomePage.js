import React, { useState, useEffect } from "react";
import { Paperclip, Search } from "lucide-react";
import { Card, CardContent } from "../components/common/Card";
import { useNavigate } from "react-router-dom";
import { parseJwt } from '../utils/jwt'; // 토큰 파싱 유틸
import { fetchWithAuth } from '../utils/fetchWithAuth';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import ReviewCurationCard from '../components/ReviewCurationCard';
import BlockTimeline from '../components/TextTimeline';

export default function HomePage() {
  const [todayStudyTime, setTodayStudyTime] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [studyingFiles, setStudyingFiles] = useState([]);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [weekHistory, setWeekHistory] = useState([]);
  const [selectedYear] = useState(new Date().getFullYear());
  const [userName, setUserName] = useState('guest');
  const [focusSessions, setFocusSessions] = useState([]);
  const [ranking, setRanking] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // 사용자 이름 파싱
  useEffect(() => {
    if (!token) {
      setUserName('guest');
      return;
    }
    const payload = parseJwt(token);
    setUserName(payload?.username || 'guest');
  }, [token]);

  // 오늘 학습 시간
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
        const mats = data.materials || [];
        setRecentFiles(mats.slice(0, 3));
        setStudyingFiles(mats.filter(m => Number(m.progress) < 100));
        setCompletedFiles(mats.filter(m => Number(m.progress) === 100));
        setWeekHistory(mats.slice(0, 7).map(m => ({
          date: new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
          summary: `${m.title} ${m.page}p`
        })));
      })
      .catch(() => {
        setRecentFiles([]);
        setStudyingFiles([]);
        setCompletedFiles([]);
        setWeekHistory([]);
      });
  }, [token, navigate]);

  // 잔디그래프 데이터
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

  // 집중/중단 타임라인 (원본 필드명 그대로)
  useEffect(() => {
    if (!token) {
      setFocusSessions([]);
      return;
    }

    const { user_id: userId } = parseJwt(token);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);

    fetch(
      `http://localhost:8000/report/focus-timeline?user_id=${userId}` +
      `&period_start=${periodStart}&period_end=${periodEnd}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => res.json())
      .then(data => {
        // data 배열의 { start_time, end_time, duration, is_interrupted }
        setFocusSessions(data || []);
      })
      .catch(err => {
        console.error('focus-timeline fetch error:', err);
        setFocusSessions([]);
      });
  }, [token]);

  // 랭킹
  useEffect(() => {
    if (!token) return;

    fetch('http://localhost:3000/api/ranking', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setRanking(data))
      .catch(err => console.error('랭킹 조회 오류:', err));
  }, [token]);

  // 피드백
  useEffect(() => {
    if (!token) return;

    fetch('http://localhost:3000/api/feedback', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setFeedback(data))
      .catch(err => console.error('피드백 조회 오류:', err));
  }, [token]);

  return (
    <main className="pt-10 pb-16 px-4 max-w-7xl mx-auto">
      {/* 인사말 */}
      <div className="text-3xl font-bold text-white mb-4 text-left">
        {token && userName !== 'guest'
          ? `${userName}님, 오늘도 힘내요!`
          : 'guest님, 오늘도 힘내요!'}
      </div>

      {/* 잔디그래프 */}
      <div className="mb-10 w-full">
        <div className="bg-[#18181b] rounded-2xl p-6 text-white shadow-md w-full flex flex-col items-center max-w-3xl mx-auto">
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
          <div className="bg-[#18181b] rounded-2xl shadow-lg p-6">
            <ReviewCurationCard />
          </div>
          <div className="flex flex-row gap-6">
            {/* 학습중 자료 */}
            <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 flex-1">
              <div className="font-bold text-lg mb-2">학습중 자료</div>
              {!token ? (
                <div className="text-center text-[#bbbbbb] py-6">
                  로그인 후 이용 가능합니다
                </div>
              ) : studyingFiles.length === 0 ? (
                <div className="text-[#bbbbbb] text-center py-6">
                  학습중인 자료가 없습니다.
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {studyingFiles.map(f => (
                    <li
                      key={f.material_id}
                      className="flex justify-between items-center py-1 border-b border-[#23232a] last:border-b-0"
                    >
                      <span className="truncate max-w-xs">{f.title}</span>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          navigate('/document-analysis', {
                            state: { materialId: f.material_id }
                          });
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
              >
                + New
              </button>
            </div>
            {/* 학습완료 자료 */}
            <div className="bg-[#23232a] rounded-2xl shadow-lg p-6 flex-1">
              <div className="font-bold text-lg mb-2">학습완료 자료</div>
              {!token ? (
                <div className="text-center text-[#bbbbbb] py-6">
                  로그인 후 이용 가능합니다
                </div>
              ) : completedFiles.length === 0 ? (
                <div className="text-[#bbbbbb] text-center py-6">
                  학습완료 자료가 없습니다.
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {completedFiles.map(f => (
                    <li
                      key={f.material_id}
                      className="flex justify-between items-center py-1 border-b border-[#23232a] last:border-b-0"
                    >
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

      {/* 오늘 학습/랭킹 */}
      <div className="flex flex-row gap-8 mb-10">
        <div className="bg-[#18181b] rounded-2xl shadow-lg p-6 flex-1 flex flex-col items-center justify-center">
          <div className="text-lg text-white mb-2">오늘 학습 시간</div>
          <div className="text-4xl font-extrabold text-white">
            {todayStudyTime ?? '0초'}
          </div>
        </div>
        <div className="bg-[#18181b] rounded-2xl shadow-lg p-6 flex-1 flex flex-col items-center justify-center">
          <div className="font-bold text-2xl text-white mb-4">랭킹</div>
          {!token ? (
            <div className="text-[#bbbbbb]">로그인 후 이용 가능합니다</div>
          ) : !ranking ? (
            <div className="text-[#bbbbbb]">랭킹 정보를 불러오는 중...</div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-[#346aff] mb-2">
                {ranking.rank}위
              </div>
              <div className="text-sm text-[#bbbbbb]">
                상위 {ranking.percentile}%
              </div>
              <div className="text-sm text-[#bbbbbb] mt-2">
                총 {ranking.total_users}명 중
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 피드백 */}
      {feedback && (
        <div className="w-full bg-gradient-to-r from-[#346aff] to-[#2d5cd9] rounded-xl p-6 text-white text-lg font-semibold shadow text-center mt-8">
          {feedback.message}
        </div>
      )}
    </main>
  );
}
