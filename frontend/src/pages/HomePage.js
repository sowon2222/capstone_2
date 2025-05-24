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
  const [userName, setUserName] = useState('guest');

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

  return (
    <main className="pt-28 pb-16 px-4 max-w-5xl mx-auto">
      {/* 환영 메시지 */}
      <div className="text-3xl font-bold text-white mb-8 text-center">
        {token && userName && userName !== 'guest' ? `${userName}님, 오늘도 힘내세요!` : 'guest님, 오늘도 힘내세요!'}
      </div>
      {/* 오늘의 학습 시간 */}
      <div className="flex justify-center mb-12">
        <div className="bg-[#18181b] rounded-2xl p-8 text-2xl text-white shadow-lg w-full max-w-xl flex flex-col items-center">
          <div className="mb-2 text-lg text-[#bbbbbb] flex items-center gap-2">
            <span>🕒 오늘 학습:</span>
            <span className="font-bold text-white text-2xl">{todayStudyTime ?? '0점'}</span>
          </div>
        </div>
      </div>
      {/* 2단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
        {/* 왼쪽: 학습중인/완료 */}
        <div className="flex flex-col gap-8">
          {/* 학습중인 자료 */}
          <div className="bg-[#18181b] rounded-2xl p-6 text-white shadow-md">
            <div className="font-semibold text-xl mb-4 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <span className="text-2xl">📘</span> 학습중인 자료
              </span>
              <button
                onClick={() => navigate('/document-analysis')}
                className="ml-2 px-4 py-1 rounded-lg bg-[#346aff] text-white text-sm font-semibold hover:bg-[#2554b0] transition"
              >
                + New
              </button>
            </div>
            {!token ? (
              <div className="text-center min-h-20 flex items-center justify-center mt-6">로그인 후 이용 가능합니다</div>
            ) : studyingFiles.length === 0 ? (
              <div className="text-[#bbbbbb] text-center min-h-20 flex items-center justify-center mt-6">학습중인 자료가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
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
          </div>
          {/* 학습완료 자료 */}
          <div className="bg-[#18181b] rounded-2xl p-6 text-white shadow-md">
            <div className="font-semibold text-xl mb-4 flex items-center gap-2">
              <span className="text-2xl">✅</span> 학습완료 자료
            </div>
            {!token ? (
              <div className="text-center min-h-20 flex items-center justify-center mt-6">로그인 후 이용 가능합니다</div>
            ) : completedFiles.length === 0 ? (
              <div className="text-[#bbbbbb] text-center min-h-20 flex items-center justify-center mt-6">학습완료 자료가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
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
        {/* 오른쪽: 잔디그래프+일주일내역 */}
        <div className="flex flex-col gap-8 items-center">
          <div className="bg-[#18181b] rounded-2xl p-6 text-white shadow-md w-full flex flex-col items-center">
            <div className="mb-2 flex flex-col items-center">
              <span className="px-3 py-1 rounded-full bg-[#346aff] text-white text-sm font-bold mb-2">{selectedYear}</span>
              <div className="font-semibold text-xl mb-2">🌱 나의 학습 그래프</div>
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
          {/* 하단 일주일 내역 */}
          <div className="w-full bg-[#23232a] rounded-xl p-4 text-white text-base shadow flex flex-col gap-2 min-h-[100px]">
            <div className="font-semibold mb-2">최근 학습 내역</div>
            {!token ? (
              <div className="text-center text-[#bbbbbb]">로그인 후 이용 가능합니다</div>
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
      {/*학습 리포트 요약 배너 */}
      <div className="bg-gradient-to-r from-[#346aff] to-[#2d5cd9] rounded-xl p-6 text-white text-lg font-semibold shadow text-center mt-12">
        📈 오답률이 높은 자료는 TCP/IP 영역 입니다. "이런 부분을 더 공부하세요!"
      </div>
    </main>
  );
}