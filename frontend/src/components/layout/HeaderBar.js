// frontend/src/components/layout/HeaderBar.js
<<<<<<< HEAD
import React from "react";
import { LogIn, UserPlus, Home, FileText, BookOpen, Archive, LogOut, User } from "lucide-react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
=======
import React, { useEffect, useState } from 'react';
import { LogIn, UserPlus, Home, FileText, BookOpen, Archive, LogOut, User, StickyNote } from "lucide-react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { parseJwt } from '../../utils/jwt';
>>>>>>> origin/main

const navItems = [
  { to: "/", label: "홈", icon: <Home className="w-5 h-5" /> },
  { to: "/document-analysis", label: "학습하기", icon: <FileText className="w-5 h-5" /> },
  { to: "/problem-solving", label: "문제풀기", icon: <BookOpen className="w-5 h-5" /> },
  { to: "/archive", label: "보관함", icon: <Archive className="w-5 h-5" /> },
  { to: "/wrong-notes", label: "오답노트", icon: <StickyNote className="w-5 h-5" /> },
];

export default function HeaderBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
<<<<<<< HEAD
=======
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    if (token) {
      const payload = parseJwt(token);
      setUsername(payload?.username || '사용자');
    } else {
      setUsername('');
    }
  }, []);

  // 로그아웃 버튼 클릭 시
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUsername('');
    window.location.reload(); // 새로고침으로 상태 반영
  };
>>>>>>> origin/main

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0f0f0f] border-b border-[#18181b] z-50">
      <div className="w-full px-4 h-16 flex items-center justify-between">
        {/* 로고: 왼쪽 */}
        <div className="flex-shrink-0 flex items-center" style={{ minWidth: 180 }}>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="" className="h-8 w-auto" />
            <span className="ml-2 text-xl font-bold text-white">studywithme</span>
          </Link>
        </div>
        {/* 네비게이션 메뉴: 가운데 */}
        <nav className="flex-1 flex items-center justify-center space-x-8">
          {/* 홈: 아이콘만 */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center px-2 group
              ${isActive ? "text-[#346aff] font-semibold" : "text-[#bbbbbb] hover:text-[#346aff]"}`
            }
            style={{ textDecoration: "none" }}
          >
            <span className="flex items-center gap-1">
              <Home className="w-5 h-5" />
            </span>
            <span
              className={`block h-0.5 mt-1 rounded-full transition-all duration-200
                ${window.location.pathname === "/" ? "w-6 bg-[#346aff]" : "w-0 bg-transparent"}
              `}
            />
          </NavLink>
          {/* 나머지 메뉴: 아이콘+텍스트 */}
          {navItems
            .filter(item => item.label !== "홈")
            .map(item => (
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
                <span
                  className={`block h-0.5 mt-1 rounded-full transition-all duration-200
                    ${window.location.pathname === item.to ? "w-6 bg-[#346aff]" : "w-0 bg-transparent"}
                  `}
                />
              </NavLink>
            ))}
        </nav>
<<<<<<< HEAD
        {/* 로그인/회원가입 or 프로필/로그아웃 버튼 */}
        <div className="flex items-center space-x-4">
          {user ? (
=======
        {/* 로그인/회원가입 or 프로필/로그아웃 버튼: 오른쪽 */}
        <div className="flex items-center justify-end flex-shrink-0 space-x-8 min-w-[220px]">
          {isLoggedIn ? (
>>>>>>> origin/main
            <>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center px-4 py-2 text-[#bbbbbb] hover:text-white transition-colors"
              >
                <User className="w-5 h-5 mr-2" />
<<<<<<< HEAD
                {user.username || '프로필'}
              </button>
              <button
                onClick={logout}
=======
                {username}
              </button>
              <button
                onClick={handleLogout}
>>>>>>> origin/main
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