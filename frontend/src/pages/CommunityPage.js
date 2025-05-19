import React, { useState } from "react";
import PostCard from "../components/community/PostCard";
import PostModal from "../components/community/PostModal";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Search } from "lucide-react";

// 초기 더미 데이터
const initialPosts = [
  {
    id: 1,
    title: "TCP와 UDP 차이점이 궁금해요",
    content: "TCP와 UDP의 차이점이 궁금합니다! 예시와 함께 설명해주실 분 계신가요?",
    author: "홍길동",
    date: "2024-06-01",
    comments: 3,
    likes: 5,
    views: 10,
    viewedBy: ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8", "user9", "user10"],
    likedBy: ["user1", "user2", "user3", "user4", "user5"],
    commentList: [
      { author: "진소원", date: "2024-06-01", text: "TCP는 연결지향, UDP는 비연결지향입니다!" },
      { author: "강윤수", date: "2024-06-01", text: "속도 차이도 있어요." },
      { author: "관리자", date: "2024-06-01", text: "좋은 질문입니다." },
    ],
  },
  {
    id: 2,
    title: "중간고사 대비 정리자료 공유",
    content: "제가 정리한 네트워크 중간고사 대비 자료 공유합니다!",
    author: "강윤수",
    date: "2024-06-02",
    comments: 1,
    likes: 8,
    views: 15,
    viewedBy: ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8", "user9", "user10", "user11", "user12", "user13", "user14", "user15"],
    likedBy: ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8"],
    commentList: [
      { author: "홍길동", date: "2024-06-02", text: "자료 감사합니다!" },
    ],
  },
  {
    id: 3,
    title: "과제 2번 풀이 같이 해요",
    content: "과제 2번 너무 어렵네요... 같이 고민해보실 분?",
    author: "진소원",
    date: "2024-06-03",
    comments: 0,
    likes: 2,
    views: 5,
    viewedBy: ["user1", "user2", "user3", "user4", "user5"],
    likedBy: ["user1", "user2"],
    commentList: [],
  },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ open: false, mode: "view", postId: null });
  // 현재 로그인한 사용자 ID (임시로 'currentUser' 사용)
  const currentUserId = "currentUser";

  // 검색 필터링
  const filteredPosts = posts.filter(
    (p) =>
      p.title.includes(search) ||
      p.content.includes(search) ||
      p.author.includes(search)
  );

  // 글 상세 열기
  const openPost = (id) => {
    // 조회수 증가 (사용자당 1회)
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === id && !p.viewedBy?.includes(currentUserId)) {
          return {
            ...p,
            views: p.views + 1,
            viewedBy: [...(p.viewedBy || []), currentUserId],
          };
        }
        return p;
      })
    );
    setModal({ open: true, mode: "view", postId: id });
  };

  // 글쓰기 열기
  const openWrite = () => setModal({ open: true, mode: "write", postId: null });
  // 모달 닫기
  const closeModal = () => setModal({ open: false, mode: "view", postId: null });

  // 글 등록
  const handleWrite = ({ title, content }) => {
    const newPost = {
      id: posts.length + 1,
      title,
      content,
      author: "익명",
      date: new Date().toISOString().slice(0, 10),
      comments: 0,
      likes: 0,
      views: 0,
      viewedBy: [],
      likedBy: [],
      commentList: [],
    };
    setPosts([newPost, ...posts]);
    closeModal();
  };

  // 좋아요 토글
  const handleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = p.likedBy?.includes(currentUserId);
          return {
            ...p,
            likes: isLiked ? p.likes - 1 : p.likes + 1,
            likedBy: isLiked
              ? p.likedBy.filter(id => id !== currentUserId)
              : [...(p.likedBy || []), currentUserId],
          };
        }
        return p;
      })
    );
  };

  // 댓글 등록
  const handleComment = (text) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === modal.postId
          ? {
              ...p,
              comments: p.comments + 1,
              commentList: [
                ...p.commentList,
                {
                  author: "익명",
                  date: new Date().toISOString().slice(0, 10),
                  text,
                },
              ],
            }
          : p
      )
    );
  };

  // 현재 모달에 보여줄 글
  const currentPost = posts.find((p) => p.id === modal.postId);

  return (
    <div className="flex flex-col items-center w-full h-screen py-12 px-4 bg-[#0f0f0f] overflow-y-hidden">
      <div className="w-full max-w-2xl mb-10">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">네트워크 커뮤니티</h2>
        <p className="text-[#9aa2ac] text-center mb-8">
          소프트웨어학과 네트워크 수업을 듣는 학생들의 자유로운 소통 공간입니다.<br />
          질문, 정보, 꿀팁, 고민 등 무엇이든 편하게 나눠보세요!
        </p>
        <div className="flex gap-2 mb-6">
          <Input
            className="bg-[#18181b] text-white border-none"
            placeholder="검색어를 입력하세요"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                // 실시간 필터링이므로 별도 동작 없음
              }
            }}
          />
          <Button
            className="flex items-center justify-center w-12 h-12 bg-[#346aff] rounded-xl ml-2"
            onClick={() => {/* 실시간 필터링이므로 별도 동작 없음 */}}
          >
            <Search className="w-7 h-7 text-white" />
          </Button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px] hide-scrollbar">
          {filteredPosts.length === 0 && (
            <div className="text-[#9aa2ac] text-center py-12">검색 결과가 없습니다.</div>
          )}
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              title={post.title}
              author={post.author}
              date={post.date}
              comments={post.comments}
              likes={post.likes}
              views={post.views}
              isLiked={post.likedBy?.includes(currentUserId)}
              onLike={() => handleLike(post.id)}
              onClick={() => openPost(post.id)}
            />
          ))}
        </div>
      </div>
      {/* 글쓰기/상세 모달 */}
      <PostModal
        open={modal.open}
        mode={modal.mode}
        post={modal.mode === "view" ? currentPost : null}
        comments={modal.mode === "view" ? currentPost?.commentList || [] : []}
        onSubmit={handleWrite}
        onClose={closeModal}
        onCommentSubmit={handleComment}
        onLike={() => handleLike(modal.postId)}
        isLiked={currentPost?.likedBy?.includes(currentUserId)}
      />
      {/* 오른쪽 하단 floating 글쓰기 버튼 */}
      <Button
        className="fixed bottom-8 right-8 bg-[#346aff] text-white rounded-lg px-6 py-3 text-lg shadow-lg z-50"
        onClick={openWrite}
      >
        게시글 작성
      </Button>
    </div>
  );
}