import React, { useState } from "react";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { Send, Heart, Eye } from "lucide-react";

export default function PostModal({
  open,
  mode = "view", // 'write' | 'view'
  post,
  comments = [],
  onSubmit,
  onClose,
  onCommentSubmit,
  onLike,
  isLiked,
}) {
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [comment, setComment] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-[#18181b] rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative">
        <button
          className="absolute top-4 right-4 text-[#9aa2ac] hover:text-white text-xl"
          onClick={onClose}
        >
          ×
        </button>
        {mode === "write" ? (
          <>
            <h2 className="text-xl font-bold text-white mb-6">게시글 작성</h2>
            <Input
              className="mb-4 bg-[#23232a] text-white border-none"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="w-full h-40 p-3 rounded bg-[#23232a] text-white border-none mb-6 focus:outline-none"
              placeholder="내용을 입력하세요"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <Button
              className="bg-[#346aff] text-white w-full"
              onClick={() => {
                if (title && content) onSubmit({ title, content });
              }}
            >
              등록
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-[#9aa2ac] flex items-center gap-2">
                <span>{post.author}</span>
                <span>·</span>
                <span>{post.date}</span>
                <span>·</span>
                <span>💬 {post.comments}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {post?.views || 0}
                </span>
              </div>
              <button
                className={`flex items-center gap-1 transition-colors ${
                  isLiked ? "text-[#346aff]" : "text-[#9aa2ac] hover:text-[#346aff]"
                }`}
                onClick={onLike}
              >
                <Heart className="w-4 h-4" fill={isLiked ? "#346aff" : "none"} />
                <span>{post?.likes || 0}</span>
              </button>
            </div>
            <div className="bg-[#23232a] rounded p-4 text-[#e0e0e0] mb-6 min-h-[80px] whitespace-pre-line">
              {post.content}
            </div>
            <div className="mb-2 text-white font-semibold">댓글</div>
            <div className="flex flex-col gap-2 mb-4 max-h-32 overflow-y-auto">
              {comments.length === 0 && (
                <div className="text-[#9aa2ac]">아직 댓글이 없습니다.</div>
              )}
              {comments.map((c, i) => (
                <div key={i} className="bg-[#18181b] rounded p-2 text-[#e0e0e0] border border-[#23232a]">
                  <span className="font-medium text-[#346aff]">{c.author}</span> <span className="text-xs text-[#9aa2ac]">{c.date}</span>
                  <div>{c.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                className="bg-[#23232a] text-white border-none"
                placeholder="댓글을 입력하세요"
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && comment) {
                    onCommentSubmit(comment);
                    setComment("");
                  }
                }}
              />
              <Button
                className="bg-[#346aff] text-white"
                onClick={() => {
                  if (comment) {
                    onCommentSubmit(comment);
                    setComment("");
                  }
                }}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 