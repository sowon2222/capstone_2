//보관함 목록에서 자료 선택 후 세부 내역 보여주는 페이지

import React, { useState } from 'react';

// 임시 PDF 및 문제 데이터 (실제 연동 시 API/DB에서 받아옴)
const mockProblems = [
  {
    id: 1,
    question: 'OSI 7계층에서 전송 계층의 주요 역할은?',
    correctAnswer: '데이터의 신뢰성 있는 전송',
    userAnswer: '데이터의 신뢰성 있는 전송',
    explanation: '전송 계층은 데이터의 신뢰성 있는 전송을 담당합니다. TCP 프로토콜이 이 계층에서 동작합니다.',
    relatedConcepts: ['네트워크', '프로토콜', 'OSI 7계층'],
    lastAttempt: '2024-06-01'
  },
  {
    id: 2,
    question: 'TCP/IP 프로토콜 스택에서 IP 프로토콜이 속한 계층은?',
    correctAnswer: '인터넷 계층',
    userAnswer: '응용 계층',
    explanation: 'IP 프로토콜은 인터넷 계층에 속합니다. 이 계층은 데이터의 라우팅과 패킷 전달을 담당합니다.',
    relatedConcepts: ['네트워크', '프로토콜', 'TCP/IP'],
    lastAttempt: '2024-06-01'
  },
];

const TOTAL_PAGES = 10; // 임시 전체 페이지 수

const ArchiveDetail = ({ archive, onBack }) => {
  const [activeTab, setActiveTab] = useState('document');
  const [selectedPage, setSelectedPage] = useState(1);
  const [isBackHover, setIsBackHover] = useState(false);

  // 오답만 필터
  const wrongProblems = mockProblems.filter(p => p.userAnswer !== p.correctAnswer);

  // 탭 목록
  const tabs = [
    { id: 'document', label: '문서분석' },
    { id: 'quiz', label: '문제풀이 내역' },
    { id: 'wrong', label: '오답노트' },
  ];

  // 페이지 이동 핸들러
  const handlePrevPage = () => {
    setSelectedPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setSelectedPage((prev) => Math.min(prev + 1, TOTAL_PAGES));
  };

  // 탭 변경 시 페이지 초기화
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'document') setSelectedPage(1);
  };

  return (
    <div className> {/* 상단 고정 헤더 높이만큼 여백 확보 */}
      
      {/* 탭 메뉴 + 아이콘 */}
      <div className="border-b border-[#23232a] mb-8 flex items-center gap-2">
        {onBack && (
          <button
            aria-label="보관함 목록으로 이동"
            onClick={onBack}
            onMouseEnter={() => setIsBackHover(true)}
            onMouseLeave={() => setIsBackHover(false)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#232329] transition relative group"
            tabIndex={0}
            style={{ zIndex: 10 }}
          >
            <svg className="w-6 h-6 text-[#bbbbbb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span
              className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 text-sm text-[#bbbbbb] bg-[#232329] px-3 py-1 rounded-lg shadow transition-opacity duration-200 pointer-events-none select-none ${
                isBackHover ? 'opacity-80' : 'opacity-0'
              }`}
              style={{ minWidth: '120px', zIndex: 20 }}
            >
              보관함목록
            </span>
          </button>
        )}
        <div className="flex gap-8 ml-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`py-4 px-1 text-base font-semibold border-b-2 -mb-px transition-all duration-150
                ${activeTab === tab.id
                  ? 'border-[#346aff] text-[#346aff]'
                  : 'border-transparent text-[#bbbbbb] hover:text-white hover:border-[#23232a]'}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭별 컨텐츠 */}
      {activeTab === 'document' && (
        <div className="flex gap-8">
          {/* 좌측: PDF 뷰어 */}
          <div className="w-1/2 bg-[#23232a] rounded-xl shadow p-4 flex flex-col items-center">
            <div className="mb-2 text-[#bbbbbb] text-sm">페이지 {selectedPage} / {TOTAL_PAGES}</div>
            <div className="w-full flex justify-center hide-scrollbar">
              <div className="w-full h-96 bg-[#18181B] rounded-lg flex items-center justify-center text-[#bbbbbb]">
                PDF 미리보기 영역 (페이지 {selectedPage})
              </div>
            </div>
          </div>
          {/* 우측: 분석 결과 및 학습 정보 */}
          <div className="w-1/2 bg-[#23232a] rounded-xl shadow p-4 flex flex-col">
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-900/30 text-orange-400 text-xs font-semibold">
                {selectedPage}/{TOTAL_PAGES} 페이지
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-semibold">
                12분 학습
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-semibold">
                진도율 {Math.round((selectedPage / TOTAL_PAGES) * 100)}%
              </span>
            </div>
            <div className="mb-2 text-xs text-[#bbbbbb]">이 페이지 학습: 2분 30초</div>
            <h2 className="text-lg font-bold mb-2 text-white">분석 결과</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-1 text-white">요약</h3>
                <p className="text-[#bbbbbb] text-sm">문서 분석 요약 내용이 여기에 표시됩니다.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-white">상세 설명</h3>
                <p className="text-[#bbbbbb] text-sm">문서 분석 상세 설명이 여기에 표시됩니다.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                className="flex-1 flex items-center justify-center px-2 py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg border border-[#23232a] hover:bg-[#18181b] disabled:opacity-50"
                onClick={handlePrevPage}
                disabled={selectedPage <= 1}
              >
                이전
              </button>
              <button
                className="flex-1 flex items-center justify-center px-2 py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg border border-[#23232a] hover:bg-[#18181b] disabled:opacity-50"
                onClick={handleNextPage}
                disabled={selectedPage >= TOTAL_PAGES}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {mockProblems.length === 0 ? (
            <div className="text-center text-[#bbbbbb] py-12">문제풀이 내역이 없습니다.</div>
          ) : (
            mockProblems.map((note) => (
              <div key={note.id} className="bg-[#232329] rounded-xl p-6 shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-white">{note.question}</h3>
                  <span className="text-sm text-[#bbbbbb]">
                    문제풀이 일자: {note.lastAttempt}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#bbbbbb]"><span className="font-medium text-white">정답:</span> {note.correctAnswer}</p>
                    <p className="text-[#bbbbbb]"><span className="font-medium text-white">제출한 답:</span> {note.userAnswer}</p>
                  </div>
                  <div className="p-4 bg-[#18181B] rounded-lg">
                    <p className="text-[#bbbbbb]">{note.explanation}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">관련 개념</h4>
                    <div className="flex flex-wrap gap-2">
                      {(note.relatedConcepts || []).map((concept, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-900/60 text-blue-200 rounded-full text-sm"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'wrong' && (
        <div className="space-y-6">
          {wrongProblems.length === 0 ? (
            <div className="text-center text-[#bbbbbb] py-12">오답이 없습니다.</div>
          ) : (
            wrongProblems.map((note) => (
              <div key={note.id} className="bg-[#232329] rounded-xl p-6 shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-white">{note.question}</h3>
                  <span className="text-sm text-[#bbbbbb]">
                    문제풀이 일자: {note.lastAttempt}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#bbbbbb]"><span className="font-medium text-white">정답:</span> {note.correctAnswer}</p>
                    <p className="text-[#bbbbbb]"><span className="font-medium text-white">제출한 답:</span> {note.userAnswer}</p>
                  </div>
                  <div className="p-4 bg-[#18181B] rounded-lg">
                    <p className="text-[#bbbbbb]">{note.explanation}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">관련 개념</h4>
                    <div className="flex flex-wrap gap-2">
                      {(note.relatedConcepts || []).map((concept, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-900/60 text-blue-200 rounded-full text-sm"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ArchiveDetail; 