//보관함 목록에서 자료 선택 후 세부 내역 보여주는 페이지

import React, { useState, useEffect } from 'react';
import { parseJwt } from '../../utils/jwt';

const ArchiveDetail = ({ archive, onBack }) => {
  const [activeTab, setActiveTab] = useState('document');
  const [selectedPage, setSelectedPage] = useState(1);
  const [isBackHover, setIsBackHover] = useState(false);
  const [slides, setSlides] = useState([]);
  const [problems, setProblems] = useState([]);
  const [wrongNotes, setWrongNotes] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const token = localStorage.getItem('token');
  const userId = parseJwt(token)?.user_id;

  // Fetch slides for 문서분석
  useEffect(() => {
    if (!archive?.id) return;
    fetch(`http://localhost:3000/archive/${archive.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSlides(data.slides || []);
        setTotalPages((data.slides || []).length || 1);
      });
  }, [archive, token]);

  // 슬라이드 요약이 없으면 자동 생성
  useEffect(() => {
    if (!archive?.id || slides.length === 0) return;
    const slide = slides[selectedPage - 1];
    if (!slide) return;
    if (!slide.summary && !loadingSummary) {
      setLoadingSummary(true);
      fetch(`http://localhost:3000/archive/${archive.id}/slide/${slide.slide_number}/summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          // 슬라이드 요약 생성 후 다시 슬라이드 목록 fetch
          return fetch(`http://localhost:3000/archive/${archive.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        })
        .then(res => res.json())
        .then(data => {
          setSlides(data.slides || []);
        })
        .finally(() => setLoadingSummary(false));
    }
  }, [archive, slides, selectedPage, token, loadingSummary]);

  // Fetch 문제풀이 내역
  useEffect(() => {
    if (activeTab !== 'quiz' || !userId || !archive?.id) return;
    fetch(`http://localhost:8000/quiz/my-attempts?user_id=${userId}&material_id=${archive.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setProblems(data || []));
  }, [activeTab, userId, token, archive]);

  // Fetch 오답노트
  useEffect(() => {
    if (activeTab !== 'wrong' || !userId) return;
    fetch(`http://localhost:8000/quiz/wrong-notes?user_id=${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setWrongNotes(data || []));
  }, [activeTab, userId, token]);

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
    setSelectedPage((prev) => Math.min(prev + 1, totalPages));
  };

  // 탭 변경 시 페이지 초기화
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'document') setSelectedPage(1);
  };

  // 객관식 옵션 키를 실제 보기 텍스트로 변환하는 함수
  const getDisplayAnswer = (answer, options, type) => {
    if (!answer) return answer;
    
    // 객관식/참거짓 문제 처리
    if ((type === '객관식' || type === '참/거짓') && options) {
      // 옵션 키가 있는 경우 (A, B, C, D 등)
      if (typeof answer === 'string' && answer.length === 1 && options[answer]) {
        return options[answer];
      }
      // 옵션 값이 직접 들어온 경우 (참/거짓 등)
      if (Object.values(options).includes(answer)) {
        return answer;
      }
    }
    
    // 주관식/빈칸채우기 등은 입력값 그대로 반환
    return answer;
  };

  // 문제 유형에 따른 보기 목록 표시
  const renderOptions = (options, type) => {
    if (!options || type === '주관식') return null;
    
    return (
      <div className="mt-2 space-y-1">
        {Object.entries(options).map(([key, value]) => (
          <div key={key} className="text-sm text-[#bbbbbb]">
            {key}: {value}
          </div>
        ))}
      </div>
    );
  };

  // 날짜 포맷 함수
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className=""> {/* 상단 고정 헤더 높이만큼 여백 확보 */}
      
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
            <div className="mb-2 text-[#bbbbbb] text-sm">페이지 {selectedPage} / {totalPages}</div>
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
                {selectedPage}/{totalPages} 페이지
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-semibold">
                12분 학습
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-semibold">
                진도율 {Math.round((selectedPage / totalPages) * 100)}%
              </span>
            </div>
            <div className="mb-2 text-xs text-[#bbbbbb]">이 페이지 학습: 2분 30초</div>
            <h2 className="text-lg font-bold mb-2 text-white">분석 결과</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-1 text-white">요약</h3>
                {loadingSummary ? (
                  <div className="flex items-center gap-2 text-[#bbbbbb]">
                    <svg className="animate-spin h-5 w-5 text-[#346aff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="#346aff" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    요약 생성 중...
                  </div>
                ) : (
                  <p className="text-[#bbbbbb] text-sm">{slides[selectedPage-1]?.summary || '요약 정보가 없습니다.'}</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-white">상세 설명</h3>
                <p className="text-[#bbbbbb] text-sm">{slides[selectedPage-1]?.original_text || '상세 설명이 없습니다.'}</p>
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
                disabled={selectedPage >= totalPages}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {problems.length === 0 ? (
            <div className="text-center text-[#bbbbbb] py-12">문제풀이 내역이 없습니다.</div>
          ) : (
            problems.map((note, idx) => (
              <div key={note.question_id || idx} className="bg-[#232329] rounded-xl p-6 shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">{note.question}</h3>
                    <span className="text-xs text-blue-400 font-semibold ml-2">
                      문제 유형: {note.type || '알 수 없음'}
                    </span>
                  </div>
                  <span className="text-sm text-[#bbbbbb]">
                    문제풀이 일자: {formatDate(note.lastAttempt || note.attempt_date)}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">정답:</span>{' '}
                      {getDisplayAnswer(note.correct_answer, note.options, note.type)}
                    </p>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">제출한 답:</span>{' '}
                      {getDisplayAnswer(note.user_answer, note.options, note.type)}
                    </p>
                    {renderOptions(note.options, note.type)}
                  </div>
                  <div className="p-4 bg-[#18181B] rounded-lg">
                    <p className="text-[#bbbbbb]">{note.explanation}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">관련 개념</h4>
                    <div className="flex flex-wrap gap-2">
                      {(note.relatedConcepts || note.keywords || []).map((concept, index) => (
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
          {wrongNotes.filter(note => !note.is_correct).length === 0 ? (
            <div className="text-center text-[#bbbbbb] py-12">오답이 없습니다.</div>
          ) : (
            wrongNotes.filter(note => !note.is_correct).map((note, idx) => (
              <div key={note.question_id || idx} className="bg-[#232329] rounded-xl p-6 shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">{note.question}</h3>
                    <span className="text-xs text-blue-400 font-semibold ml-2">
                      문제 유형: {note.type || '알 수 없음'}
                    </span>
                  </div>
                  <span className="text-sm text-[#bbbbbb]">
                    문제풀이 일자: {formatDate(note.attempt_date)}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">정답:</span>{' '}
                      {getDisplayAnswer(note.correct_answer, note.options, note.type)}
                    </p>
                    <p className="text-[#bbbbbb]">
                      <span className="font-medium text-white">제출한 답:</span>{' '}
                      {getDisplayAnswer(note.user_answer, note.options, note.type)}
                    </p>
                    {renderOptions(note.options, note.type)}
                  </div>
                  <div className="p-4 bg-[#18181B] rounded-lg">
                    <p className="text-[#bbbbbb]">{note.explanation}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">관련 개념</h4>
                    <div className="flex flex-wrap gap-2">
                      {(note.relatedConcepts || note.keywords || []).map((concept, index) => (
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