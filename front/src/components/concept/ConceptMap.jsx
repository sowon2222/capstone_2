import React, { useCallback } from 'react';

export default function ConceptMap({ concepts = [] }) {
  // 샘플 데이터 구조
  const sampleData = {
    nodes: [
      { id: 'concept1', name: '주요 개념 1' },
      { id: 'concept2', name: '주요 개념 2' },
      { id: 'concept3', name: '주요 개념 3' },
    ],
    links: [
      { source: 'concept1', target: 'concept2' },
      { source: 'concept2', target: 'concept3' },
    ]
  };

  return (
    <div className="w-full h-full bg-[#23232a] rounded-xl p-6">
      <div className="text-white text-lg font-semibold mb-4">개념 맵</div>
      <div className="w-full h-[calc(100%-3rem)] bg-[#1a1a1a] rounded-lg p-4">
        {/* 여기에 react-force-graph가 추가될 예정 */}
        <div className="text-[#bbbbbb] text-center">
          개념 맵이 여기에 표시됩니다.
        </div>
      </div>
    </div>
  );
} 