import React, { useState } from "react";
import { Card, CardContent } from "../components/common/Card";
import { Input } from "../components/common/Input";
import { Search, FileText, Map, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "../components/common/Button";

// 더미 데이터 (자료 단위로만 저장)
const initialArchives = [
  {
    id: 1,
    title: "컴퓨터 네트워크와 인터넷.pdf",
    type: "slide",
    date: "2024-03-15",
    details: {
      slides: [
        { idx: 1, title: "슬라이드 1", summary: "네트워크란 무엇인가에 대한 정의와 특징 설명." },
        { idx: 2, title: "슬라이드 2", summary: "TCP/IP 프로토콜 스택의 구조와 각 계층의 역할." },
        { idx: 3, title: "슬라이드 3", summary: "OSI 7계층 모델의 각 계층별 주요 기능." },
      ],
      questions: [
        {
          id: 1,
          question: "TCP와 UDP의 차이점을 설명하시오.",
          answer: "TCP는 연결지향형 프로토콜로 신뢰성 있는 데이터 전송을 보장하며, UDP는 비연결지향형 프로토콜로 빠른 전송을 우선시합니다."
        },
        {
          id: 2,
          question: "OSI 7계층을 순서대로 나열하시오.",
          answer: "물리계층, 데이터링크계층, 네트워크계층, 전송계층, 세션계층, 표현계층, 응용계층"
        }
      ],
      conceptMap: [
        { id: 1, name: "TCP/IP", connections: ["HTTP", "FTP", "SMTP"] },
        { id: 2, name: "HTTP", connections: ["TCP/IP", "웹 서비스"] },
        { id: 3, name: "FTP", connections: ["TCP/IP", "파일 전송"] }
      ]
    }
  },
  {
    id: 2,
    title: "애플리케이션 계층.pdf",
    type: "problem",
    date: "2024-03-14",
    details: {
      slides: [],
      questions: [],
      conceptMap: []
    }
  },
  {
    id: 3,
    title: "무선 및 이동 네트워크.pdf",
    type: "concept",
    date: "2024-03-13",
    details: {
      slides: [{ idx: 1, title: "슬라이드 1", summary: "무선링크와 네트워크의 특징 CDMA" }],
      questions: [],
      conceptMap: []
    }
  }
];

export default function ArchivePage() {
  const [archives, setArchives] = useState(initialArchives);
  const [search, setSearch] = useState("");
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [activeTab, setActiveTab] = useState("slide"); // 'slide' | 'problem' | 'concept'

  // 검색 필터링
  const filteredArchives = archives.filter(
    (archive) =>
      archive.title.includes(search)
  );

  // 자료 타입에 따른 아이콘 반환
  const getTypeIcon = (type) => {
    switch (type) {
      case "slide":
        return <BookOpen className="w-5 h-5 text-[#BBBBBB]" />;
      case "problem":
        return <FileText className="w-5 h-5 text-[#BBBBBB]" />;
      case "concept":
        return <Map className="w-5 h-5 text-[#BBBBBB]" />;
      default:
        return null;
    }
  };

  // 자료 타입에 따른 한글 레이블 반환
  const getTypeLabel = (type) => {
    switch (type) {
      case "slide":
        return "1번 자료";
      case "problem":
        return "2번 자료";
      case "concept":
        return "3번 자료";
      default:
        return "n번 자료";
    }
  };

  // 목록으로 돌아가기
  const handleBackToList = () => {
    setSelectedArchive(null);
    setActiveTab("slide");
  };

  // 상세 페이지 렌더링
  if (selectedArchive) {
    const { details, date, title, type } = selectedArchive;
    return (
      <div className="w-full h-screen flex flex-col bg-[#0f0f0f] overflow-hidden">
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-[#9aa2ac] hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>목록으로 돌아가기</span>
          </button>

          {/* 상단 정보 */}
          <div className="bg-[#18181b] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#2a2f6b4c] rounded-lg">
                {getTypeIcon(type)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 bg-[#346aff] text-white text-sm rounded-full">
                    {getTypeLabel(type)}
                  </span>
                  <span className="text-sm text-[#9aa2ac]">{date}</span>
                </div>
              </div>
            </div>
            {/* 탭 메뉴 */}
            <div className="h-14 border-b border-[#333] flex items-center gap-2">
              <button
                onClick={() => setActiveTab("slide")}
                className={`text-base px-8 py-2 rounded-t-lg ${activeTab === "slide" ? "border-b-2 border-[#346aff] text-white font-semibold" : "text-[#bbbbbb] hover:text-white transition-colors"}`}
              >
                설명보기
              </button>
              <button
                onClick={() => setActiveTab("problem")}
                className={`text-base px-8 py-2 rounded-t-lg ${activeTab === "problem" ? "border-b-2 border-[#346aff] text-white font-semibold" : "text-[#bbbbbb] hover:text-white transition-colors"}`}
              >
                문제풀기
              </button>
              <button
                onClick={() => setActiveTab("concept")}
                className={`text-base px-8 py-2 rounded-t-lg ${activeTab === "concept" ? "border-b-2 border-[#346aff] text-white font-semibold" : "text-[#bbbbbb] hover:text-white transition-colors"}`}
              >
                개념맵
              </button>
            </div>
          </div>

          {/* 탭별 내용 */}
          <div className="bg-[#18181b] rounded-2xl p-6">
            {activeTab === "slide" && (
              <div className="flex flex-col gap-4">
                {details.slides && details.slides.length > 0 ? (
                  details.slides.map((slide) => (
                    <div key={slide.idx} className="bg-[#23232a] rounded-xl p-4">
                      <div className="text-lg font-bold text-white mb-2">{slide.title}</div>
                      <div className="text-[#9aa2ac]">{slide.summary}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#9aa2ac]">슬라이드 요약 내역이 없습니다.</div>
                )}
              </div>
            )}
            {activeTab === "problem" && (
              <div className="flex flex-col gap-4">
                {details.questions && details.questions.length > 0 ? (
                  details.questions.map((q) => (
                    <div key={q.id} className="bg-[#23232a] rounded-xl p-4">
                      <div className="text-lg font-bold text-white mb-2">Q. {q.question}</div>
                      <div className="text-[#9aa2ac]">A. {q.answer}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#9aa2ac]">기출문제 내역이 없습니다.</div>
                )}
              </div>
            )}
            {activeTab === "concept" && (
              <div className="flex flex-col gap-4">
                {details.conceptMap && details.conceptMap.length > 0 ? (
                  details.conceptMap.map((concept) => (
                    <div key={concept.id} className="bg-[#23232a] rounded-xl p-4">
                      <div className="text-lg font-bold text-white mb-2">{concept.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {concept.connections.map((conn, idx) => (
                          <span key={idx} className="px-3 py-1 bg-[#346aff] text-white text-sm rounded-full">{conn}</span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#9aa2ac]">개념맵 내역이 없습니다.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 목록 페이지 렌더링
  return (
    <div className="w-full h-screen flex flex-col bg-[#0f0f0f] overflow-hidden">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">자료 보관함</h2>
        <p className="text-[#9aa2ac] text-center mb-8">
          @@님께서 업로드한 자료들의 슬라이드 요약, 기출문제, 개념맵 결과 내역들입니다.
        </p>

        {/* 검색창 */}
        <div className="flex gap-2 mb-8">
          <Input
            className="bg-[#18181b] text-white border-none"
            placeholder="검색어를 입력하세요"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            className="flex items-center justify-center w-12 h-12 bg-[#346aff] rounded-xl"
          >
            <Search className="w-7 h-7 text-white" />
          </Button>
        </div>

        {/* 자료 목록 */}
        <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-280px)] hide-scrollbar">
          {filteredArchives.length === 0 ? (
            <div className="text-[#9aa2ac] text-center py-12">검색 결과가 없습니다.</div>
          ) : (
            filteredArchives.map((archive) => (
              <Card
                key={archive.id}
                className="bg-[#18181b] hover:bg-[#23232a] transition-colors cursor-pointer shadow-md rounded-2xl border border-[#23232a]"
                onClick={() => {
                  setSelectedArchive(archive);
                  setActiveTab("slide");
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#2a2f6b4c] rounded-lg">
                      {getTypeIcon(archive.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">{archive.title}</h3>
                        <span className="text-sm text-[#9aa2ac]">{archive.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-[#346aff] text-white text-sm rounded-full">
                          {getTypeLabel(archive.type)}
                        </span>
                      </div>
                      <p className="text-[#9aa2ac]">
                        {archive.details.slides?.[0]?.summary || archive.details.questions?.[0]?.question || archive.details.conceptMap?.[0]?.name || ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}