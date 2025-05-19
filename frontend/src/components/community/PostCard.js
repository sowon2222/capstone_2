import React from "react";
import { Heart, Eye } from "lucide-react";

export default function PostCard({ title, author, date, comments, likes, views, isLiked, onLike, onClick }) {
  return (
    <div
      className="bg-[#18181b] hover:bg-[#23232a] transition-colors cursor-pointer shadow-md rounded-2xl p-6 mb-2 border border-[#23232a]"
      onClick={onClick}
    >
      <div className="text-lg font-semibold text-[#e0e0e0] mb-2">{title}</div>
      <div className="flex justify-between items-center">
        <div className="text-sm text-[#9aa2ac] flex gap-2 items-center">
          <span>{author}</span>
          <span>·</span>
          <span>{date}</span>
          <span>·</span>
          <span>💬 {comments}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {views}
          </span>
        </div>
        <button
          className={`flex items-center gap-1 transition-colors ${
            isLiked ? "text-[#346aff]" : "text-[#9aa2ac] hover:text-[#346aff]"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
        >
          <Heart className="w-4 h-4" fill={isLiked ? "#346aff" : "none"} />
          <span>{likes}</span>
        </button>
      </div>
    </div>
  );
} 