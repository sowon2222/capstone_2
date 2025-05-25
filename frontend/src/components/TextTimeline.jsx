import React from 'react';

function BlockTimeline({ sessions }) {
  // 8~18시, 3분 단위 20칸
  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const BLOCKS_PER_HOUR = 20;
  const BLOCK_MINUTES = 3;

  // 시간별 20칸짜리 배열 생성 (각 칸: 'focus', 'break', null)
  const hourBlocks = {};
  hours.forEach(h => {
    hourBlocks[h] = Array(BLOCKS_PER_HOUR).fill(null);
  });

  // 날짜 필터링 제거 - 모든 세션 표시
  const filteredSessions = sessions || [];

  filteredSessions.forEach(s => {
    // 각 세션의 날짜(YYYY-MM-DD)를 추출
    const sessionDateStr = s.start_time.slice(0, 10);
    const start = new Date(s.start_time);
    const end = s.end_time ? new Date(s.end_time) : new Date(s.start_time);
    for (let h = 8; h <= 18; h++) {
      for (let i = 0; i < BLOCKS_PER_HOUR; i++) {
        const blockStart = new Date(`${sessionDateStr}T${String(h).padStart(2, '0')}:${String(i * 3).padStart(2, '0')}:00`);
        const blockEnd = new Date(blockStart);
        blockEnd.setMinutes(blockEnd.getMinutes() + BLOCK_MINUTES);
        // 블록이 세션과 겹치면 색칠
        if (blockEnd > start && blockStart < end) {
          hourBlocks[h][i] = s.is_interrupted ? 'break' : 'focus';
        }
      }
    }
  });

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-2xl p-6 shadow font-mono" style={{ minWidth: 400, background: '#18181b', color: 'white' }}>
        {hours.map(hour => (
          <div key={hour} className="flex items-center mb-2" style={{ minHeight: 24 }}>
            <div style={{ width: 36, textAlign: 'right', marginRight: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
              {hour}시
            </div>
            <div className="flex gap-0">
              {hourBlocks[hour].map((block, i) => (
                <div
                  key={i}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    display: 'inline-block',
                    cursor: 'pointer',
                    border: block === 'focus' ? '1.5px solid #60a5fa' : block === 'break' ? '1.5px solid #f87171' : '1.5px solid #444',
                    background: block === 'focus' ? '#60a5fa' : block === 'break' ? '#f87171' : 'transparent',
                    marginRight: 1,
                    marginBottom: 1,
                  }}
                  title={block === 'focus' ? '집중' : block === 'break' ? '중단' : ''}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* 범례 */}
      <div className="flex gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span style={{ width: 16, height: 16, background: '#60a5fa', borderRadius: 4, display: 'inline-block', border: '1.5px solid #222' }} />
          <span className="text-sm font-medium" style={{ color: 'white' }}>집중</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 16, height: 16, background: '#f87171', borderRadius: 4, display: 'inline-block', border: '1.5px solid #222' }} />
          <span className="text-sm font-medium" style={{ color: 'white' }}>중단</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 16, height: 16, background: 'transparent', borderRadius: 4, display: 'inline-block', border: '1.5px solid #444' }} />
          <span className="text-sm font-medium" style={{ color: 'white' }}>빈칸(3분)</span>
        </div>
      </div>
    </div>
  );
}

export default BlockTimeline; 