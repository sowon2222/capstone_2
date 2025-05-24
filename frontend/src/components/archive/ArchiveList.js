import React, { useMemo, useEffect, useState } from 'react';

const ArchiveList = ({ sortBy, sortOrder, onSelectArchive, searchQuery }) => {
  // 실제 데이터베이스에서 가져오기
  const [archives, setArchives] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('http://localhost:3000/archive/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setArchives(data.materials || []));
  }, [token]);

  const getTypeColor = (type) => {
    switch (type) {
      case 'quiz':
        return 'bg-orange-900/80 text-orange-300';
      case 'document':
        return 'bg-blue-900/80 text-blue-300';
      default:
        return 'bg-[#3a3a42] text-[#bbbbbb]';
    }
  };

  // 검색어에 따른 필터링
  const filteredArchives = useMemo(() => {
    if (!searchQuery) return archives;
    return archives.filter(archive => 
      (archive.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [archives, searchQuery]);

  // 정렬 적용
  const sortedArchives = useMemo(() => {
    return [...filteredArchives].sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      } else {
        return sortOrder === 'desc'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      }
    });
  }, [filteredArchives, sortBy, sortOrder]);

  if (searchQuery && sortedArchives.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-[#bbbbbb] mb-2">검색 결과가 없습니다</div>
        <div className="text-sm text-[#bbbbbb]">
          다른 검색어를 입력해보세요
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedArchives.map((archive) => (
        <div
          key={archive.material_id || archive.id}
          className="bg-[#232329] rounded-2xl border border-[#3a3a42] hover:border-[#346aff] hover:shadow-lg transition-all cursor-pointer"
          onClick={() => onSelectArchive(archive)}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📚</div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-medium text-white truncate">
                  {archive.title}
                </h3>
                <div className="flex gap-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-900/80 text-blue-300">
                    문서분석
                  </span>
                  {archive.tag && archive.tag !== '문서분석' && (
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(archive.type)}`}>
                      {archive.tag}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-[#bbbbbb]">
                <span>{archive.date ? new Date(archive.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''}</span>
                {archive.completed && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    학습 완료
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArchiveList; 