//학습 완료된 강의자료 목록 표시 컴포넌트
//문제풀이 시작 버튼 포함
import React, { useState, useEffect } from 'react';

const ProblemList = ({ onDocumentSelect }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API 호출하여 학습 완료된 강의자료 목록 가져오기
    const fetchDocuments = async () => {
      try {
        // 임시 데이터
        const mockDocuments = [
          {
            id: 1,
            title: '네트워크 기초 강의',
            uploadDate: '2024-03-15',
            learningTime: '2시간 30분',
          },
          {
            id: 2,
            title: '운영체제 개념 정리',
            uploadDate: '2024-03-14',
            learningTime: '1시간 45분',
          },
        ];
        setDocuments(mockDocuments);
        setLoading(false);
      } catch (error) {
        console.error('강의자료 목록을 불러오는데 실패했습니다:', error);
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#346aff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">문제풀이를 진행할 강의자료를 선택하세요.</h2>
      {documents.length === 0 ? (
        <p className="text-[#bbbbbb] text-center py-8">
          학습 완료된 강의자료가 없습니다.
        </p>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#23232a] border border-[#23232a] rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:border-[#bbbbbb] hover:scale-[1.025]"
              onClick={() => onDocumentSelect(doc)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-[#bbbbbb] mt-1">
                    업로드일: {doc.uploadDate}
                  </p>
                </div>
                <div className="text-sm text-[#bbbbbb]">
                  학습시간: {doc.learningTime}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="px-4 py-2 bg-[#346aff] text-white rounded-md hover:bg-[#2554b0] transition-colors font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentSelect(doc);
                  }}
                >
                  문제풀이 시작
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemList; 