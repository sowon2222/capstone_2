// frontend/src/components/layout/HeaderBar.js
import React from "react";
import { LogIn, UserPlus, Home, FileText, BookOpen, Archive, LogOut, User } from "lucide-react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { to: "/", label: "홈", icon: <Home className="w-5 h-5" /> },
  { to: "/document-analysis", label: "문서 분석", icon: <FileText className="w-5 h-5" /> },
  { to: "/problem-solving", label: "문제풀기", icon: <BookOpen className="w-5 h-5" /> },
  { to: "/archive", label: "보관함", icon: <Archive className="w-5 h-5" /> },
];

export default function HeaderBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0f0f0f] border-b border-[#18181b] z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="" className="h-8 w-auto" />
          <span className="ml-2 text-xl font-bold text-white">studywithme</span>
        </Link>
        {/* 네비게이션 메뉴 */}
        <nav className="flex items-center space-x-8">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex flex-col items-center px-2 group
                ${isActive ? "text-[#346aff] font-semibold" : "text-[#bbbbbb] hover:text-[#346aff]"}`
              }
              style={{ textDecoration: "none" }}
            >
              <span className="flex items-center gap-1">
                {item.icon}
                <span className="ml-1">{item.label}</span>
              </span>
              {/* 밑줄 */}
              <span
                className={`block h-0.5 mt-1 rounded-full transition-all duration-200
                  ${window.location.pathname === item.to ? "w-6 bg-[#346aff]" : "w-0 bg-transparent"}
                `}
              />
            </NavLink>
          ))}
        </nav>
        {/* 로그인/회원가입 or 프로필/로그아웃 버튼 */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center px-4 py-2 text-[#bbbbbb] hover:text-white transition-colors"
              >
                <User className="w-5 h-5 mr-2" />
                {user.username || '프로필'}
              </button>
              <button
                onClick={logout}
                className="flex items-center px-4 py-2 bg-[#222] text-white rounded-lg hover:bg-[#444] transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => navigate('/login')}
                className="flex items-center px-4 py-2 text-[#bbbbbb] hover:text-white transition-colors"
              >
                <LogIn className="w-5 h-5 mr-2" />
                로그인
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="flex items-center px-4 py-2 bg-[#346aff] text-white rounded-lg hover:bg-[#2d5cd9] transition-colors"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                회원가입
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}