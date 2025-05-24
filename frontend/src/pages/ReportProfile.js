// src/components/ReportProfile.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart2, TrendingUp, Award, Clock, FileText, Layers, Activity, MessageCircle, CheckCircle, AlertCircle } from "lucide-react";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function GoalSetting({ username, onGoalChange }) {
  const [goal, setGoal] = useState({ time: 30, accuracy: 85 });

  useEffect(() => {
    if (!username) return;
    const saved = localStorage.getItem(`goal_${username}`);
    if (saved) setGoal(JSON.parse(saved));
  }, [username]);

  const handleChange = (e) => {
    setGoal({ ...goal, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    localStorage.setItem(`goal_${username}`, JSON.stringify(goal));
    if (onGoalChange) onGoalChange(goal);
    alert("목표가 저장되었습니다!");
  };

  return (
    <div className="mb-6 p-4 bg-[#23232a] rounded-xl flex flex-col gap-3">
      <div className="font-semibold text-[#8abfff] text-lg mb-1">나의 학습 목표 설정</div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <label className="whitespace-nowrap text-base font-medium">학습 시간(분):</label>
          <input
            name="time"
            type="number"
            value={goal.time}
            onChange={handleChange}
            className="w-24 px-3 py-2 rounded bg-[#18181b] text-[#e6e6e6] border border-[#23232a] focus:outline-none focus:ring-2 focus:ring-[#8abfff] transition text-base"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="whitespace-nowrap text-base font-medium">목표 정답률(%):</label>
          <input
            name="accuracy"
            type="number"
            value={goal.accuracy}
            onChange={handleChange}
            className="w-20 px-3 py-2 rounded bg-[#18181b] text-[#e6e6e6] border border-[#23232a] focus:outline-none focus:ring-2 focus:ring-[#8abfff] transition text-base"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-[#8abfff] text-white font-semibold transition hover:bg-[#5a9fff] active:bg-[#346aff] focus:outline-none focus:ring-2 focus:ring-[#8abfff]"
            style={{ minWidth: "64px" }}
          >
            저장
          </button>
        </div>
      </div>
      <div className="text-sm text-[#bbbbbb] mt-1">
        현재 목표: 하루 {goal.time}분, 정답률 {goal.accuracy}%
      </div>
    </div>
  );
}

function ProgressCard({ percent, solved, total }) {
  let percentColor = percent >= 90 ? 'text-[#4ade80]' : percent >= 70 ? 'text-[#facc15]' : 'text-[#f87171]';
  return (
    <div className="bg-[#23232a] rounded-xl p-5 md:p-6 shadow flex flex-col items-center w-full mb-2">
      <div className="flex items-center gap-2 text-lg font-bold mb-2 text-[#8abfff]">
        <TrendingUp className="w-6 h-6" /> 목표 달성률
      </div>
      <span className={`text-3xl md:text-4xl font-extrabold mb-1 ${percentColor}`}>{percent}%</span>
      <div className="w-full h-2 bg-[#18181b] rounded mb-2">
        <div className="h-2 bg-[#8abfff] rounded" style={{ width: `${percent}%` }}></div>
      </div>
      <div className="text-sm text-[#bbbbbb]">{solved}문제 / {total}문제</div>
      <div className="mt-2 text-[#b3e283] font-semibold">오답 {percent}% 해결했어요!</div>
    </div>
  );
}

function WrongConceptsCard({ concepts }) {
  return (
    <div className="bg-[#23232a] rounded-xl p-6 shadow w-full">
      <div className="text-lg font-bold mb-4 text-[#ffb300]">이번 달 가장 많이 틀린 개념</div>
      <ol className="list-decimal ml-5 space-y-1">
        {concepts.map((c, i) => (
          <li key={i} className="flex justify-between">
            <span>{c.name}</span>
            <span className="text-[#ffb3b3]">틀린 문제 수 {c.count}개</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DailyStatusCard({ date, solved, total }) {
  const done = solved === total;
  return (
    <div className={`rounded-xl p-4 flex flex-col items-center shadow w-full ${done ? "bg-[#1a2a1a]" : "bg-[#23232a]"}`}>
      <div className="text-sm text-[#bbbbbb] mb-1">{date}</div>
      <div className="text-[#8abfff]">{solved} / {total}</div>
      {done ? <CheckCircle className="text-[#b3e283] mt-2" /> : <AlertCircle className="text-[#ffb3b3] mt-2" />}
    </div>
  );
}

const ReportProfile = ({ userId }) => {
  const realUserId = userId || 1;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState({ time: 30, accuracy: 85 });
  const [period, setPeriod] = useState('7d'); // '3d', '7d', '30d'

  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/report/summary?user_id=${realUserId}&period=${period}`)
      .then((res) => {
        setReport(res.data);
        if (res.data && res.data.name) {
          const saved = localStorage.getItem(`goal_${res.data.name}`);
          if (saved) setGoal(JSON.parse(saved));
        }
        setLoading(false);
      })
      .catch((err) => {
        alert("리포트 데이터를 불러오지 못했습니다.");
        setLoading(false);
      });
  }, [realUserId, period]);

  let timePercent = 0, accPercent = 0;
  if (report && report.study_time && goal.time) {
    const avgTime = Math.round((report.study_time[period] || 0) / (period === '3d' ? 3 : period === '7d' ? 7 : 30));
    timePercent = Math.min(100, Math.round((avgTime / goal.time) * 100));
  }
  if (report && report.accuracy && goal.accuracy) {
    accPercent = Math.min(100, Math.round((report.accuracy / goal.accuracy) * 100));
  }

  if (loading) return <div className="text-[#bbbbbb] mt-10 ml-6">로딩 중...</div>;
  if (!report) return <div className="text-[#bbbbbb] mt-10 ml-6">리포트 데이터가 없습니다.</div>;

  const getPeriodText = (period) => {
    switch(period) {
      case '3d': return '최근 3일';
      case '7d': return '최근 7일';
      case '30d': return '최근 한달';
      default: return '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-12 p-6 bg-[#18181b] rounded-2xl shadow-lg border border-[#23232a] text-[#e6e6e6]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-[#8abfff]">
          <Award className="w-7 h-7 text-[#8abfff]" />
          {report.name ? `${report.name}님의 학습 리포트` : "나의 학습 리포트"}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setPeriod('3d')} 
            className={`px-4 py-2 rounded ${period === '3d' ? 'bg-[#8abfff] text-white' : 'bg-[#23232a] text-[#bbbbbb]'}`}
          >
            3일
          </button>
          <button 
            onClick={() => setPeriod('7d')} 
            className={`px-4 py-2 rounded ${period === '7d' ? 'bg-[#8abfff] text-white' : 'bg-[#23232a] text-[#bbbbbb]'}`}
          >
            7일
          </button>
          <button 
            onClick={() => setPeriod('30d')} 
            className={`px-4 py-2 rounded ${period === '30d' ? 'bg-[#8abfff] text-white' : 'bg-[#23232a] text-[#bbbbbb]'}`}
          >
            한달
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* 왼쪽: 목표/달성률/AI 피드백 */}
        <div className="flex-1 flex flex-col gap-6 min-w-[320px]">
          <GoalSetting username={report.name || "default"} onGoalChange={setGoal} />
          {/* 목표 달성률 ProgressBar */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-base font-semibold text-[#b3e283]">
                <Clock className="w-5 h-5" /> {getPeriodText(period)} 학습 시간 목표 달성률
              </div>
              <div className="w-full bg-[#1a1a1a] rounded h-4 mt-2">
                <div className="bg-[#b3e283] h-4 rounded" style={{ width: `${timePercent}%` }}></div>
              </div>
              <div className="text-sm text-[#bbbbbb] mt-1">
                {timePercent}% (목표: {goal.time}분/일, 실제: {Math.round((report.study_time[period] || 0) / (period === '3d' ? 3 : period === '7d' ? 7 : 30))}분/일)
              </div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-base font-semibold text-[#8abfff]">
                <TrendingUp className="w-5 h-5" /> {getPeriodText(period)} 정답률 목표 달성률
              </div>
              <div className="w-full bg-[#1a1a1a] rounded h-4 mt-2">
                <div className="bg-[#8abfff] h-4 rounded" style={{ width: `${accPercent}%` }}></div>
              </div>
              <div className="text-sm text-[#bbbbbb] mt-1">
                {accPercent}% (목표: {goal.accuracy}%, 실제: {report.accuracy}%)
              </div>
            </div>
          </div>
          <div className="bg-[#23232a] rounded-xl p-6 mt-2 shadow flex flex-col gap-2">
            <div className="flex items-center gap-2 text-lg font-semibold text-[#8abfff]">
              <Award className="w-5 h-5" /> {getPeriodText(period)} AI 코치 피드백
            </div>
            <div className="mt-2 text-base text-[#e6e6e6]">{report.llm_feedback}</div>
          </div>
        </div>

        {/* 오른쪽: 주요 리포트 카드들 */}
        <div className="flex-1 flex flex-col gap-6 min-w-[320px]">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow col-span-2">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#b3e283]">
                <TrendingUp className="w-5 h-5" /> {getPeriodText(period)} 전체 정답률
              </div>
              <div className="text-3xl font-bold text-[#b3e283]">{report.accuracy}%</div>
              <div className="text-sm text-[#bbbbbb]">상위 {report.percentile.percentile.toFixed(1)}% | 평균 {report.percentile.average.toFixed(1)}% | 표준편차 {report.percentile.stddev.toFixed(1)}%</div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow col-span-2">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#8abfff]">
                <BarChart2 className="w-5 h-5" /> {getPeriodText(period)} 정답률 변화율
              </div>
              <div className="text-2xl font-bold text-[#8abfff]">{report.accuracy_change.change_rate !== null ? report.accuracy_change.change_rate.toFixed(1) + "%" : "데이터 부족"}</div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow col-span-2">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#f7c873]">
                <Layers className="w-5 h-5" /> {getPeriodText(period)} 유형별 정답률
              </div>
              <ul className="flex flex-wrap gap-4 mt-1">
                {report.category_stats.map((cat) => (
                  <li key={cat.question_type} className="bg-[#1a1a1a] rounded-lg px-4 py-2 text-base font-medium text-[#e6e6e6] border border-[#23232a]">
                    {cat.question_type}: <span className="text-[#b3e283]">{cat.accuracy.toFixed(1)}%</span> <span className="text-[#bbbbbb]">(시도 {cat.attempts}회)</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#ffb3b3]">
                <MessageCircle className="w-5 h-5" /> {getPeriodText(period)} 자주 틀리는 키워드
              </div>
              <div className="text-base mt-1">
                {report.weak_keywords.length > 0 ? report.weak_keywords.map((kw) => kw.keyword_name).join(", ") : "없음"}
              </div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#b3e283]">
                <Clock className="w-5 h-5" /> {getPeriodText(period)} 학습 시간
              </div>
              <div className="text-2xl font-bold text-[#b3e283]">{report.study_time[period]}분</div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#8abfff]">
                <FileText className="w-5 h-5" /> {getPeriodText(period)} 강의자료 업로드
              </div>
              <div className="text-2xl font-bold text-[#8abfff]">{report.material_upload[period]}개</div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#f7c873]">
                <Activity className="w-5 h-5" /> {getPeriodText(period)} 학습 진도 변화
              </div>
              <div className="text-2xl font-bold text-[#f7c873]">{report.progress_change[period]}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportProfile;