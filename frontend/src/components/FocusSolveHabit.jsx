import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from 'recharts';

// HeatmapTable 컴포넌트 추가
function HeatmapTable({ heatmap }) {
  const types = ['객관식', '주관식', '참거짓', '빈칸 채우기', '전체'];
  const difficulties = ['하', '중', '상'];

  // heatmap 데이터 가공
  const heatmapMap = {};
  heatmap.forEach(item => {
    heatmapMap[`${item.difficulty}_${item.question_type}`] = item.accuracy;
  });

  return (
    <table
      style={{
        fontSize: 16,
        minWidth: 360,
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        marginBottom: 16
      }}
    >
      <thead>
        <tr>
          <th style={{ padding: '6px 8px', minWidth: 40 }}></th>
          {types.map(type => (
            <th key={type} style={{ padding: '6px 8px', minWidth: 60 }}>{type}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {difficulties.map(diff => (
          <tr key={diff}>
            <td style={{ padding: '6px 8px', minWidth: 40, fontWeight: 'bold', background: '#f5faff' }}>{diff}</td>
            {types.map(type => {
              const key = `${diff}_${type}`;
              const value = heatmapMap[key];
              return (
                <td
                  key={type}
                  style={{
                    background: value === undefined ? '#eaf3ff' : '#5ca8ff',
                    color: value === undefined ? '#888' : '#fff',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    padding: '6px 8px',
                    minWidth: 60,
                    height: 32
                  }}
                >
                  {value === undefined
                    ? '-'
                    : `${Math.round(value * 100)}%`}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 히트맵용 유틸
function getColor(value) {
  // value: 0~1, 색상 밝기 조절
  return `rgba(59,130,246,${0.2 + 0.8 * value})`; // 파란색 계열
}

function Heatmap({ data }) {
  // data: [{question_type, difficulty, accuracy}]
  const types = [...new Set(data.map(d => d.question_type))];
  const levels = [...new Set(data.map(d => d.difficulty))];
  return (
    <table
      className="border w-full text-center mb-8"
      style={{ fontSize: 18, minWidth: 400, tableLayout: 'fixed' }}
    >
      <thead>
        <tr>
          <th style={{ padding: '10px 16px' }}></th>
          {types.map(type => (
            <th key={type} style={{ padding: '10px 16px', minWidth: 60 }}>{type}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {levels.map(level => (
          <tr key={level}>
            <td className="font-bold" style={{ padding: '10px 16px', minWidth: 40 }}>{level}</td>
            {types.map(type => {
              const cell = data.find(d => d.question_type === type && d.difficulty === level);
              const value = cell ? cell.accuracy : 0;
              return (
                <td
                  key={type}
                  style={{
                    background: getColor(value),
                    color: value > 0.5 ? 'white' : 'black',
                    fontWeight: 'bold',
                    padding: '10px 16px',
                    minWidth: 60,
                    height: 40
                  }}
                >
                  {cell ? `${Math.round(value * 100)}%` : '-'}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FocusSolveHabit() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/report/solve-habit?user_id=1&period_start=2024-06-01&period_end=2024-06-30')
      .then(res => res.json())
      .then(d => {
        console.log('solve-habit 응답:', d); // 전체 응답 확인
        console.log('sessions:', d.sessions); // sessions 필드만 확인
        setData(d);
      });
  }, []);

  if (!data) return <div>로딩중...</div>;

  // 하, 중, 상 난이도와 모든 유형 조합을 완전히 채우기
  const allLevels = ['하', '중', '상'];
  const allTypes = ['객관식', '주관식', '참거짓', '빈칸 채우기', '전체'];
  let heatmap = [];
  allLevels.forEach(level => {
    allTypes.forEach(type => {
      const found = data.heatmap.find(d => d.difficulty === level && d.question_type === type);
      heatmap.push(
        found
          ? found
          : { question_type: type, difficulty: level, accuracy: undefined }
      );
    });
  });

  // 바 차트용 데이터 (유형별 평균 풀이 시간)
  const barData = data.by_type.map(row => ({
    name: row.question_type,
    avg_time: Math.round(row.avg_time)
  }));

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">문제풀이 습관 분석 리포트</h2>
      {/* 히트맵 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 className="font-semibold mb-2 text-center">유형×난이도별 정확도(히트맵)</h3>
        <HeatmapTable heatmap={heatmap} />
      </div>

      {/* 바 차트 */}
      <div style={{ width: 900, margin: '0 auto' }}>
        <div style={{
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: 20,
          marginBottom: 8,
          marginTop: 32
        }}>
          유형별 평균 풀이 시간(초)
        </div>
        <div style={{ height: 500 }}>
          <BarChart data={barData} width={900} height={500}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="avg_time"
              fill="#3b82f6"
              barSize={24}
              radius={[6, 6, 0, 0]}
              stroke="#2563eb"
              strokeWidth={1}
            />
          </BarChart>
        </div>
      </div>
    </div>
  );
}

export default FocusSolveHabit;

export { HeatmapTable };