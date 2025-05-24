import React, { useState } from 'react';
import ArchiveList from '../components/archive/ArchiveList';
import ArchiveFilter from '../components/archive/ArchiveFilter';
import ArchiveDetail from '../components/archive/ArchiveDetail';

const ArchivePage = () => {
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleArchiveSelect = (archive) => {
    setSelectedArchive({ ...archive, id: archive.material_id });
    setShowDetail(true);
  };

  const handleBackToList = () => {
    setShowDetail(false);
    setTimeout(() => {
      setSelectedArchive(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#18181B]">
      {/* 목록 화면 */}
      {!showDetail && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">보관함</h1>
          <ArchiveFilter 
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <ArchiveList 
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSelectArchive={handleArchiveSelect}
            searchQuery={searchQuery}
          />
        </div>
      )}

      {/* 상세 화면 */}
      {showDetail && selectedArchive && (
        <div className="w-full bg-[#18181B]">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-[#232329] border-b border-[#3a3a42]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white whitespace-nowrap">
                    {selectedArchive.title}
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#bbbbbb]">
                    {new Date(selectedArchive.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                  </span>
                  {selectedArchive.completed && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-900/80 text-green-300 rounded-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      학습 완료
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* 컨텐츠 */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <ArchiveDetail archive={selectedArchive} onBack={handleBackToList} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
