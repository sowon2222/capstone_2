//보관함 목록에서 자료 선택 후 세부 내역 보여주는 페이지

import React, { useState, useEffect } from 'react';
import { parseJwt } from '../../utils/jwt';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const ArchiveDetail = ({ archive, onBack }) => {
  const [slides, setSlides] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [activeTab, setActiveTab] = useState('slides');
  const [isBackHover, setIsBackHover] = useState(false);
  const [selectedPage, setSelectedPage] = useState(1);
  const [attempts, setAttempts] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    // 슬라이드 데이터 가져오기
    fetch(`http://localhost:3000/archive/${archive.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSlides(data.slides || []));

    // 문제 데이터 가져오기
    fetch(`http://localhost:3000/archive/questions/${archive.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setQuestions(data.questions || []));

    // 오답 데이터 가져오기
    fetch(`http://localhost:3000/archive/wrong-answers/${archive.material_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setWrongAnswers(data.wrongAnswers || []));

    // 내 문제풀이 기록 가져오기
    const userId = parseJwt(token)?.user_id;
    if (userId && archive.material_id) {
      fetch(`http://localhost:8000/quiz/my-attempts?user_id=${userId}&material_id=${archive.material_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAttempts(data || []));
    }
  }, [archive.material_id, token]);

  // 탭 목록
  const tabs = [
    { id: 'slides', label: '슬라이드 요약' },
    { id: 'questions', label: '문제 풀이' },
    { id: 'wrong-answers', label: '오답 노트' },
  ];

  // 탭 변경 핸들러
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // 페이지 선택 핸들러
  const handlePageSelect = (pageNumber) => {
    setSelectedPage(pageNumber);
  };

  // 이미지 URL 생성 함수
  const getSlideImageUrl = (materialId, slideNumber) =>
    `http://localhost:3000/uploads/m_${materialId}_s_${slideNumber}.png`;

  // JSON 문자열을 파싱해서 안전하게 객체로 변환
  const parseQuestionContent = (content) => {
    if (!content) return {};
    try {
      if (typeof content === 'object') return content;
      return JSON.parse(content);
    } catch {
      return { question: content };
    }
  };

  // 객관식/옵션 답변 보기 변환 함수
  const getDisplayAnswer = (answer, options) => {
    if (!options || !answer) return answer;
    return options[answer] || answer;
  };

  // 문제 텍스트 안전하게 추출
  const getQuestionText = (parsed, raw) => {
    if (parsed && typeof parsed === 'object' && parsed.question) return parsed.question;
    if (typeof raw === 'string') return raw;
    return '';
  };

  return (
    <div className="min-h-screen bg-[#18181b]">
      <div className="max-w-7xl mx-auto px-2 py-8">
        {/* 상단 제목/업로드일 */}
        <div className="mb-6">
          <div className="text-2xl font-bold text-white mb-1">{archive.title}</div>
          {archive.created_at && (
            <div className="text-sm text-[#bbbbbb]">업로드: {new Date(archive.created_at).toISOString().slice(0, 10)}</div>
          )}
        </div>
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
        {activeTab === 'slides' && (
          <div className="flex gap-6 min-h-[600px]" style={{ height: '70vh' }}>
            {/* 좌측 썸네일 리스트 */}
            <div className="w-1/12 bg-[#23232a] rounded-xl shadow p-4 flex flex-col items-center overflow-y-auto hide-scrollbar">
              {slides.map((slide) => (
                <button
                  key={`${archive.material_id}-${slide.slide_number}`}
                  onClick={() => handlePageSelect(slide.slide_number)}
                  className={`w-full py-2 rounded-lg border transition mb-2 ${
                    selectedPage === slide.slide_number
                      ? 'border-[#346aff] bg-[#18181b] font-bold text-[#346aff]'
                      : 'border-[#23232a] bg-[#23232a] text-[#bbbbbb] hover:bg-[#18181b]'
                  }`}
                >
                  <img
                    src={getSlideImageUrl(archive.material_id, slide.slide_number)}
                    alt={`썸네일 ${slide.slide_number}`}
                    style={{ width: '100%', maxHeight: 60, objectFit: 'contain', borderRadius: 6, marginBottom: 2 }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  {slide.slide_number}
                </button>
              ))}
              <div className="mt-auto w-full flex flex-col gap-2">
                <button
                  onClick={() => handlePageSelect(Math.max(selectedPage - 1, 1))}
                  disabled={selectedPage <= 1}
                  className="w-full py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg disabled:opacity-50"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => handlePageSelect(Math.min(selectedPage + 1, slides.length))}
                  disabled={selectedPage >= slides.length}
                  className="w-full py-2 bg-[#23232a] text-[#bbbbbb] rounded-lg disabled:opacity-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>

            {/* 중앙 이미지 뷰어 */}
            <div className="w-1/2 bg-[#23232a] rounded-xl shadow p-4 flex flex-col items-center overflow-auto">
              <div className="mb-2 text-[#bbbbbb] text-sm">
                페이지 {selectedPage} / {slides.length}
              </div>
              <div className="overflow-auto h-[calc(80vh-80px)] w-full flex justify-center">
                <img
                  src={getSlideImageUrl(archive.material_id, selectedPage)}
                  alt={`슬라이드 ${selectedPage}`}
                  style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: '12px' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 우측 분석 결과 */}
            <div className="w-1/2 bg-[#23232a] rounded-xl shadow p-4 flex flex-col overflow-auto custom-scrollbar">
              {slides.find(s => s.slide_number === selectedPage) && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg font-medium text-white">슬라이드 {selectedPage}</span>
                    {slides.find(s => s.slide_number === selectedPage)?.slide_title && (
                      <span className="text-[#bbbbbb]">- {slides.find(s => s.slide_number === selectedPage)?.slide_title}</span>
                    )}
                  </div>
                  
                  {slides.find(s => s.slide_number === selectedPage)?.summary && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">요약</h4>
                      <p className="text-white whitespace-pre-wrap">{slides.find(s => s.slide_number === selectedPage)?.summary}</p>
                    </div>
                  )}

                  {slides.find(s => s.slide_number === selectedPage)?.concept_explanation && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">개념 설명</h4>
                      <p className="text-white whitespace-pre-wrap">{slides.find(s => s.slide_number === selectedPage)?.concept_explanation}</p>
                    </div>
                  )}

                  {slides.find(s => s.slide_number === selectedPage)?.main_keywords && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">주요 키워드</h4>
                      <div className="flex flex-wrap gap-2">
                        {slides.find(s => s.slide_number === selectedPage)?.main_keywords.split(',').map((keyword, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 text-sm bg-[#346aff]/10 text-[#346aff] rounded-full"
                          >
                            {keyword.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {slides.find(s => s.slide_number === selectedPage)?.important_sentences && (
                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">중요 문장</h4>
                      <p className="text-white whitespace-pre-wrap">{slides.find(s => s.slide_number === selectedPage)?.important_sentences}</p>
                    </div>
                  )}

                  {slides.find(s => s.slide_number === selectedPage)?.image_description && (
                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">이미지 설명</h4>
                      <p className="text-white whitespace-pre-wrap">{slides.find(s => s.slide_number === selectedPage)?.image_description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-6">
            {attempts.length > 0 ? attempts.map((attempt) => {
              const parsed = parseQuestionContent(attempt.question_content || attempt.content || attempt.question);
              const options = parsed.options;
              const displayAnswer = getDisplayAnswer(attempt.correct_answer || parsed.correct_answer, options);
              const displayUserAnswer = getDisplayAnswer(attempt.answer || attempt.user_answer, options);
              const isCorrect = attempt.is_correct;
              const slideNum = attempt.slide_number || attempt.slide;
              return (
                <div key={`${archive.material_id}-attempt-${attempt.attempt_id}`} className="bg-[#232329] rounded-2xl p-6 border border-[#3a3a42] mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    {slideNum && (
                      <span className="px-2 py-1 text-xs rounded-full bg-[#23232a] border border-[#346aff] text-[#346aff]">슬라이드 {slideNum}에서 출제</span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      parsed.type === '객관식' ? 'bg-blue-900/80 text-blue-300' :
                      parsed.type === '주관식' ? 'bg-purple-900/80 text-purple-300' :
                      parsed.type === '참/거짓' ? 'bg-green-900/80 text-green-300' :
                      'bg-orange-900/80 text-orange-300'
                    }`}>
                      {parsed.type || '문제'}
                    </span>
                    {parsed.difficulty && (
                      <span className="text-sm text-[#bbbbbb]">난이도: {parsed.difficulty}</span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${isCorrect ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'}`}>{isCorrect ? '정답' : '오답'}</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">문제</h4>
                      <p className="text-white whitespace-pre-wrap">{parsed.question || ''}</p>
                      {options && typeof options === 'object' && !Array.isArray(options) && (
                        <div>
                          <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">보기</h4>
                          <ul className="ml-4">
                            {Object.entries(options).map(([key, value]) => (
                              <li key={`${archive.material_id}-${attempt.attempt_id}-${key}`} className="text-white">{key}. {value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">내 답변</h4>
                      <p className="text-white whitespace-pre-wrap">{displayUserAnswer}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">정답</h4>
                      <p className="text-white whitespace-pre-wrap">{displayAnswer}</p>
                    </div>
                    {attempt.explanation && (
                      <div>
                        <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">해설</h4>
                        <p className="text-white whitespace-pre-wrap">{attempt.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="text-[#bbbbbb]">문제풀이 기록이 없습니다.</div>
            )}
          </div>
        )}

        {activeTab === 'wrong-answers' && (
          <div className="space-y-6">
            {wrongAnswers.map((wrong) => {
              const parsed = parseQuestionContent(wrong.question_content) || {};
              const options = parsed.options;
              const displayUserAnswer = getDisplayAnswer(wrong.answer, options);
              const displayCorrectAnswer = getDisplayAnswer(wrong.correct_answer, options);
              // 정오 여부
              const isCorrect = wrong.answer === wrong.correct_answer;
              return (
                <div key={`${archive.material_id}-wrong-${wrong.attempt_id}`} className="bg-[#232329] rounded-2xl p-6 border border-[#3a3a42] mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-[#bbbbbb]">
                      {new Date(wrong.attempt_date).toLocaleDateString('ko-KR')}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${isCorrect ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'}`}>
                      {isCorrect ? '정답' : '오답'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">문제</h4>
                      <p className="text-white whitespace-pre-wrap">{getQuestionText(parsed, wrong.question_content)}</p>
                      {options && typeof options === 'object' && !Array.isArray(options) && (
                        <div>
                          <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">보기</h4>
                          <ul className="ml-4">
                            {Object.entries(options).map(([key, value]) => (
                              <li key={`${archive.material_id}-${wrong.attempt_id}-${key}`} className="text-white">{key}. {value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">내 답변</h4>
                      <p className="text-white whitespace-pre-wrap">{displayUserAnswer}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">정답</h4>
                      <p className="text-white whitespace-pre-wrap">{displayCorrectAnswer}</p>
                    </div>

                    {wrong.explanation && (
                      <div>
                        <h4 className="text-sm font-medium text-[#bbbbbb] mb-2">해설</h4>
                        <p className="text-white whitespace-pre-wrap">{wrong.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveDetail; 