// FocusDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import 'tailwindcss/tailwind.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { LineChart, XAxis, YAxis, ResponsiveContainer, BarChart, CartesianGrid } from 'recharts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Cell } from 'recharts';
import BlockTimeline from './TextTimeline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function getTodayStr() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function FocusDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const today = getTodayStr();
    fetch(`http://localhost:8000/report/focus-analysis?user_id=1&period_start=${today}&period_end=${today}`)
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data || !data.hourly_focus || data.hourly_focus.length === 0) {
    return <div className="p-8">데이터가 없습니다. 샘플 데이터를 추가해 주세요.</div>;
  }

  // 시간대별 데이터 준비 (최근 7개만)
  const last7 = data.hourly_focus.slice(-7);
  const labels = last7.map(h => `${h.hour}시`);
  const values = last7.map(h => h.focus_minutes);

  // 트렌드 예시: 집중 블록/중단 횟수의 변화(시간대별)
  const trendData = {
    labels,
    datasets: [
      {
        type: 'line',
        label: '집중 시간(분)',
        data: values,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: false,
        tension: 0,
        yAxisID: 'y',
      },
      {
        type: 'bar',
        label: '중단 횟수(예시)',
        data: values.map(v => Math.floor(v / 30)),
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        yAxisID: 'y1',
        barThickness: 24,
        borderRadius: 6
      }
    ]
  };

  const trendOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        categoryPercentage: 0.5,
        barPercentage: 0.7,
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: '집중 시간(분)' },
        position: 'left',
        grid: { display: true },
      },
      y1: {
        beginAtZero: true,
        title: { display: true, text: '중단 횟수' },
        position: 'right',
        grid: { drawOnChartArea: false },
      }
    }
  };

  // 2025-05-27로 강제 필터링
  const targetDate = '2025-05-27';
  const todaySessions = (data?.focus_sessions || []).filter(
    s => s.start_time.slice(0, 10) === targetDate
  );

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">집중 세션 분석 리포트</h2>
      {/* 카드/지표 영역 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-200 rounded-xl p-6 text-center shadow-md border border-blue-300">
          <div className="text-lg font-semibold text-blue-700">집중 블록</div>
          <div className="text-3xl font-extrabold text-blue-900">{data.total_focus_blocks}</div>
        </div>
        <div className="bg-red-200 rounded-xl p-6 text-center shadow-md border border-red-300">
          <div className="text-lg font-semibold text-red-700">중단 횟수</div>
          <div className="text-3xl font-extrabold text-red-900">{data.total_interruptions}</div>
        </div>
        <div className="bg-green-200 rounded-xl p-6 text-center shadow-md border border-green-300">
          <div className="text-lg font-semibold text-green-700">집중도 지수</div>
          <div className="text-3xl font-extrabold text-green-900">{(data.focus_index * 100).toFixed(1)}%</div>
        </div>
      </div>
      {/* 트렌드(라인 차트) 영역 */}
      <div className="bg-white rounded-lg p-6 shadow mb-8">
        <div style={{ width: 900, height: 500, margin: '0 auto' }}>
          <Bar data={trendData} options={{
            ...trendOptions,
            plugins: {
              ...trendOptions.plugins,
              title: {
                display: true,
                text: '시간대별 집중 시간 & 학습 중단 분석',
                align: 'center',
                font: { size: 20, weight: 'bold' },
                padding: { top: 20, bottom: 10 }
              },
              legend: {
                display: true,
                position: 'bottom',
                align: 'center',
                labels: {
                  boxWidth: 20,
                  font: { size: 14 }
                }
              }
            }
          }} />
        </div>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-6">
        <div>
          <FocusSessionDailyChart userId={1} periodStart="2024-06-01" periodEnd="2024-06-30" />
        </div>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 className="font-semibold mb-2 mt-8 text-center">집중/중단 세션 타임라인</h3>
            <BlockTimeline sessions={todaySessions} />
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 16, height: 16, background: '#60a5fa', borderRadius: 4, display: 'inline-block' }} />
                <span style={{ fontSize: 14 }}>집중</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 16, height: 16, background: '#f87171', borderRadius: 4, display: 'inline-block' }} />
                <span style={{ fontSize: 14 }}>중단</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FocusSessionDailyChart({ userId, periodStart, periodEnd }) {
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:8000/report/focus-session-daily?user_id=${userId}&period_start=${periodStart}&period_end=${periodEnd}`)
      .then(res => res.json())
      .then(setDailyData);
  }, [userId, periodStart, periodEnd]);

  // 최근 7개만 보여주기
  const last7 = dailyData.slice(-7);
  const labels = last7.map(d => d.date);
  const values = last7.map(d => d.session_count);

  const data = {
    labels,
    datasets: [
      {
        label: '25분 이상 집중 세션 수',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        barThickness: 24,
        borderRadius: 6,
        stack: '세션',
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        categoryPercentage: 0.5,
        barPercentage: 0.7,
      },
      y: { stacked: true, beginAtZero: true, title: { display: true, text: '세션 수' } }
    },
    barThickness: 16,
    borderRadius: 6
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <div style={{ width: 900, height: 500, margin: '0 auto' }}>
        <Bar
          data={data}
          options={{
            ...options,
            plugins: {
              ...options.plugins,
              title: {
                display: true,
                text: '일별 집중 세션 수',
                align: 'center',
                font: { size: 20, weight: 'bold' },
                padding: { top: 20, bottom: 10 }
              }
            },
            layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
            scales: {
              ...options.scales,
              x: {
                ...options.scales?.x,
                grid: { display: false },
                categoryPercentage: 0.5,
                barPercentage: 0.7,
              }
            }
          }}
        />
      </div>
    </div>
  );
}

function makeTimelineData(sessions) {
  if (!sessions) return [];
  // 시간순 정렬
  const sorted = [...sessions].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const timeline = [];
  sorted.forEach(s => {
    timeline.push({
      time: s.start_time.slice(11, 16), // 'HH:MM'
      state: s.is_interrupted ? '중단' : '집중'
    });
    // 중단 세션이면 end_time도 표시
    if (s.is_interrupted) {
      timeline.push({
        time: s.end_time.slice(11, 16),
        state: '중단'
      });
    }
  });
  return timeline;
}

export default FocusDashboard;