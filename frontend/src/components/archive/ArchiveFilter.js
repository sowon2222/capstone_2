import React from 'react';

const ArchiveFilter = ({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="bg-[#232329] rounded-2xl shadow-sm border border-[#3a3a42] mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* 검색바 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="자료 제목으로 검색"
                className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-[#3a3a42] text-white rounded-xl focus:ring-2 focus:ring-[#346aff] focus:border-[#346aff] placeholder-[#bbbbbb]"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[#bbbbbb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 정렬 옵션 */}
          <div className="flex items-center gap-4">
            <select
              className="form-select text-sm bg-[#18181B] border-[#3a3a42] text-white rounded-xl focus:ring-[#346aff] focus:border-[#346aff]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">날짜순</option>
              <option value="name">이름순</option>
            </select>

            <div className="flex items-center gap-2 bg-[#18181B] rounded-xl p-1">
              <button
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sortOrder === 'desc'
                    ? 'bg-[#346aff] text-white'
                    : 'text-[#bbbbbb] hover:text-white'
                }`}
                onClick={() => setSortOrder('desc')}
              >
                최신순
              </button>
              <button
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sortOrder === 'asc'
                    ? 'bg-[#346aff] text-white'
                    : 'text-[#bbbbbb] hover:text-white'
                }`}
                onClick={() => setSortOrder('asc')}
              >
                오래된순
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveFilter; 