// src/components/ReportProfile.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart2, TrendingUp, Award, Clock, FileText, Layers, Activity, MessageCircle, CheckCircle, AlertCircle } from "lucide-react";
import { Pie, Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  BarElement,
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
            <span>{c.keyword_name}</span>
            <span className="text-[#ffb3b3]">틀린 문제 수 {c.wrong_count}개</span>
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

function getPercent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

// 기간별 라벨 생성 함수
const getLineChartLabels = (period) => {
  if (period === "3d") return ["엊그제", "어제", "오늘"];
  if (period === "7d") return Array.from({ length: 7 }, (_, i) => `${7 - i}일 전`).concat("오늘");
  if (period === "30d") return ["1주", "2주", "3주", "4주", "오늘"];
  return [];
};

const ReportProfile = ({ userId }) => {
  const realUserId = userId || localStorage.getItem("user_id");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState({ time: 30, accuracy: 85 });
  const [period, setPeriod] = useState('7d'); // '3d', '7d', '30d'

  useEffect(() => {
    if (!realUserId) {
      alert("로그인이 필요합니다.");
      window.location.href = "/login"; // 로그인 페이지로 이동
      return;
    }
    axios
      .get(`http://localhost:8000/api/report/summary?user_id=${realUserId}&period=${period}`)
      .then((res) => {
        setReport(res.data);
        // byTypeData 실제 값 확인용 로그
        console.log('byTypeData API 응답:', res.data.by_type);
        if (res.data && res.data.name) {
          const saved = localStorage.getItem(`goal_${res.data.name}`);
          if (saved) setGoal(JSON.parse(saved));
        }
        setLoading(false);
      })
      .catch((err) => {
        alert("사용자의 프로필 리포트 데이터를 불러오지 못했습니다.");
        setLoading(false);
      });
  }, [realUserId, period]);

  if (loading) return <div className="text-[#bbbbbb] mt-10 ml-6">프로필 리포트를 로딩중입니다. 잠시만 기다려주세요.</div>;
  if (!report) return <div className="text-[#bbbbbb] mt-10 ml-6">리포트 데이터가 없습니다.</div>;

  // 안전하게 값 추출
  const studyTime = report.study_time?.[period] ?? 0;
  const materialUpload = report.material_upload?.[period] ?? 0;
  const periodAccuracy = report.period_accuracy?.[period] ?? { accuracy: 0, total: 0, correct: 0 };
  const byTypeData = Array.isArray(report.by_type) ? report.by_type : [];
  const difficultyStats = report.difficulty_stats ?? [];
  // NaN/undefined/빈 값 필터링
  const filteredByTypeData = byTypeData.filter(
    d => typeof d.avg_time === 'number' && !isNaN(d.avg_time) && d.question_type
  );
  const filteredDifficultyStats = difficultyStats.filter(
    d => typeof d.accuracy === 'number' && !isNaN(d.accuracy) && d.difficulty
  );
  let timePercent = 0, accPercent = 0;
  if (report && report.study_time && goal.time) {
    const avgTime = Math.round(studyTime / (period === '3d' ? 3 : period === '7d' ? 7 : 30));
    timePercent = Math.min(100, Math.round((avgTime / goal.time) * 100));
  }
  if (report && report.accuracy && goal.accuracy) {
    accPercent = Math.min(100, Math.round((report.accuracy / goal.accuracy) * 100));
  }

  const actualAccuracy = periodAccuracy.accuracy;
  const totalProblems = periodAccuracy.total;
  const correctProblems = periodAccuracy.correct;
  const percent = goal.accuracy ? Math.round((actualAccuracy / goal.accuracy) * 100) : 0;

  const statusData = report.learning_status || {};
  const totalStatus = 
    (statusData["학습 완료"] || 0) + 
    (statusData["학습 진행 중"] || 0) + 
    (statusData["미참여"] || 0);

  const donutData = {
    labels: ["학습 완료", "학습 진행 중", "미참여"],
    datasets: [
      {
        data: [
          statusData["학습 완료"] || 0,
          statusData["학습 진행 중"] || 0,
          statusData["미참여"] || 0,
        ],
        backgroundColor: ["#4285F4", "#34A853", "#BBBBBB"],
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label;
            const value = context.parsed;
            const percent = getPercent(value, totalStatus);
            return `${label}: ${value}개 (${percent}%)`;
          }
        }
      }
    },
    cutout: "70%",
  };

  // 데이터 준비
  const lineLabels = getLineChartLabels(period);
  const lineDataArr = report.completion_rate_trend?.[period] || [];
  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: "성취완료율(%)",
        data: lineDataArr,
        fill: true,
        borderColor: "#8abfff",
        backgroundColor: "rgba(138,191,255,0.15)",
        tension: 0.3,
        pointBackgroundColor: "#8abfff",
        pointBorderColor: "#fff",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20, color: "#bbbbbb", callback: v => `${v}%` },
        grid: { color: "#23232a" },
      },
      x: {
        ticks: { color: "#bbbbbb" },
        grid: { color: "#23232a" },
      },
    },
  };

  const getPeriodText = (period) => {
    switch(period) {
      case '3d': return '최근 3일';
      case '7d': return '최근 7일';
      case '30d': return '최근 한달';
      default: return '';
    }
  };

  const periodLabels = ['3일', '7일', '한달'];
  const labels = Array.isArray(report.study_time_by_tab_period) ? report.study_time_by_tab_period.map(d => d.label) : [];
  const studyTabData = Array.isArray(report.study_time_by_tab_period) ? report.study_time_by_tab_period.map(d => d.study) : [];
  const solveTabData = Array.isArray(report.study_time_by_tab_period) ? report.study_time_by_tab_period.map(d => d.solve) : [];

  const barData = {
    labels,
    datasets: [
      {
        label: '학습하기 탭',
        data: studyTabData,
        backgroundColor: '#60a5fa',
        borderRadius: 8,
      },
      {
        label: '문제풀기 탭',
        data: solveTabData,
        backgroundColor: '#4ade80',
        borderRadius: 8,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}분`,
        },
      },
    },
    scales: {
      x: { stacked: false },
      y: {
        beginAtZero: true,
        title: { display: true, text: '학습 시간(분)' },
        ticks: { stepSize: 50 },
      },
    },
  };

  // 유형별 평균 풀이 시간(초) x축 라벨 고정
  const fixedTypes = ['객관식', '주관식', '참거짓', '빈칸채우기'];
  const byTypeDataMap = Object.fromEntries(filteredByTypeData.map(d => [d.question_type, d.avg_time]));
  const fixedByTypeData = fixedTypes.map(type => ({
    question_type: type,
    avg_time: byTypeDataMap[type] ?? 0
  }));

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
          {/* 1. 기간별 학습 시간 막대그래프 (숨김 처리) */}
          <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
            <div className="flex items-center gap-2 text-base font-semibold text-[#b3e283]">
              <Clock className="w-5 h-5" /> 기간별 학습 시간
            </div>
            <div className="w-full h-64 mt-2">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
          {/* 2. 유형별 평균 풀이 시간 그래프 (왼쪽으로 이동) */}
          <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
            <div className="flex items-center gap-2 text-base font-semibold text-[#8abfff]">
              <BarChart2 className="w-5 h-5" /> {getPeriodText(period)} 유형별 평균 풀이 시간(초)
            </div>
            <div className="w-full h-64 mt-2">
              {filteredByTypeData.length === 0 ? (
                <div className="text-[#bbbbbb] text-center mt-10">데이터 없음</div>
              ) : (
                <Bar
                  data={{
                    labels: fixedByTypeData.map(d => d.question_type),
                    datasets: [
                      {
                        label: '평균 풀이 시간(초)',
                        data: fixedByTypeData.map(d => d.avg_time),
                        backgroundColor: '#60a5fa',
                        borderRadius: 8,
                        barPercentage: 0.4,
                        categoryPercentage: 0.6,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { stacked: false },
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: '평균 풀이 시간(초)' },
                        ticks: { stepSize: 10 },
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
          {/* 3. 정답률 목표 달성률 박스 */}
          <div className="bg-[#23232a] rounded-xl p-6 flex flex-col items-center shadow w-full">
            <div className="text-base font-semibold text-[#8abfff] mb-2">
              <span className="text-[#b3e283]">정답률 목표 달성률</span>
            </div>
            <div className="text-3xl font-extrabold mb-1 text-[#8abfff]">
              {percent}%
            </div>
            <div className="w-full h-4 bg-[#1a1a1a] rounded mb-2">
              <div
                className="h-4 bg-gradient-to-r from-[#8abfff] to-[#b3e283] rounded"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            {/* <div className="text-lg font-bold text-[#8abfff] mt-2">
              {correctProblems}문제 / {totalProblems}문제
            </div> */}
            <div className="text-sm text-[#bbbbbb] mt-1">
              실제: {actualAccuracy.toFixed(1)}%&nbsp;&nbsp;|&nbsp;&nbsp;목표: {goal.accuracy}%
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
              <div className="text-sm text-[#bbbbbb]">
                상위 {report.percentile?.percentile?.toFixed(1) ?? "-"}% | 
                평균 {report.percentile?.average?.toFixed(1) ?? "-"}% | 
                표준편차 {report.percentile?.stddev?.toFixed(1) ?? "-"}%
              </div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow col-span-2">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#b3e283]">
                <BarChart2 className="w-5 h-5" /> {getPeriodText(period)} 학습 상태
              </div>
              <div className="flex flex-row items-center justify-center gap-8">
                {/* 도넛차트 */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <Doughnut data={donutData} options={donutOptions} />
                  {/* 중앙 숫자/퍼센트 */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-[#4285F4]">
                      {statusData["학습 완료"] || 0}개
                    </span>
                    <span className="text-base text-[#bbbbbb]">학습 완료</span>
                  </div>
                </div>
                {/* 범례 */}
                <div className="flex flex-col gap-3 ml-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-full" style={{ background: "#4285F4" }}></span>
                    <span className="text-base text-[#e6e6e6] font-semibold">학습 완료</span>
                    <span className="ml-2 text-[#4285F4] font-bold">
                      {statusData["학습 완료"] || 0}개
                    </span>
                    <span className="ml-1 text-[#bbbbbb]">
                      ({getPercent(statusData["학습 완료"] || 0, totalStatus)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-full" style={{ background: "#34A853" }}></span>
                    <span className="text-base text-[#e6e6e6] font-semibold">진행중</span>
                    <span className="ml-2 text-[#34A853] font-bold">
                      {statusData["학습 진행 중"] || 0}개
                    </span>
                    <span className="ml-1 text-[#bbbbbb]">
                      ({getPercent(statusData["학습 진행 중"] || 0, totalStatus)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-full" style={{ background: "#BBBBBB" }}></span>
                    <span className="text-base text-[#e6e6e6] font-semibold">미참여</span>
                    <span className="ml-2 text-[#BBBBBB] font-bold">
                      {statusData["미참여"] || 0}개
                    </span>
                    <span className="ml-1 text-[#bbbbbb]">
                      ({getPercent(statusData["미참여"] || 0, totalStatus)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              {/* 유형별 정답률 카드 */}
              <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 text-lg font-semibold text-[#f7c873]">
                  <Layers className="w-5 h-5" /> {getPeriodText(period)} 유형별 정답률
                </div>
                <ul className="flex flex-wrap gap-4 mt-1">
                  {(report.category_stats || []).map((cat) => (
                    <li key={cat.question_type} className="bg-[#1a1a1a] rounded-lg px-4 py-2 text-base font-medium text-[#e6e6e6] border border-[#23232a]">
                      {cat.question_type}: <span className="text-[#b3e283]">{cat.accuracy.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* 난이도별 정답률 카드 */}
              <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 text-lg font-semibold text-[#8abfff]">
                  <BarChart2 className="w-5 h-5" /> {getPeriodText(period)} 난이도별 정답률
                </div>
                <ul className="flex flex-wrap gap-4 mt-1">
                  {filteredDifficultyStats.map((diff) => (
                    <li key={diff.difficulty} className="bg-[#1a1a1a] rounded-lg px-4 py-2 text-base font-medium text-[#e6e6e6] border border-[#23232a]">
                      {diff.difficulty}: <span className="text-[#b3e283]">{diff.accuracy.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-6 shadow w-full col-span-2">
              <div className="text-lg font-bold mb-4 flex items-center gap-2 text-[#f7c873]">
                <AlertCircle className="text-[#f7c873]" /> 이번 달 가장 많이 틀린 개념
              </div>
              <ol className="space-y-2">
                {(report.weak_keywords || []).slice(0, 3).map((kw, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#f7c873] text-[#23232a] font-bold text-base">
                        {i + 1}
                      </span>
                      <span className="text-base text-[#e6e6e6] font-medium">{kw.keyword_name}</span>
                    </div>
                    <div className="flex-1 border-dotted border-b-2 border-[#444] mx-3"></div>
                    <span className="text-[#ff6b6b] font-bold text-base">틀린 문제 수 {kw.wrong_count}개</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#b3e283]">
                <Clock className="w-5 h-5" /> {getPeriodText(period)} 학습 시간
              </div>
              <div className="text-2xl font-bold text-[#b3e283]">{studyTime}분</div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#8abfff]">
                <FileText className="w-5 h-5" /> {getPeriodText(period)} 강의자료 업로드
              </div>
              <div className="text-2xl font-bold text-[#8abfff]">{materialUpload}개</div>
            </div>
            <div className="bg-[#23232a] rounded-xl p-4 flex flex-col gap-2 shadow col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-lg font-semibold text-[#f7c873]">
                  <Activity className="w-5 h-5 text-[#f7c873]" /> 성취완료율 변화
                </div>
                <span className="text-sm text-[#bbbbbb]">{getPeriodText(period)}</span>
              </div>
              <div className="w-full h-48">
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportProfile;