import { useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, Archive, Users, PlusCircle } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../common/Button";

const menuItems = [
  { label: "홈", icon: <Home />, path: "/" },
  { label: "기출 문제", icon: <FileText />, path: "/problems" },
  { label: "자료 보관함", icon: <Archive />, path: "/archive" },
  { label: "커뮤니티", icon: <Users />, path: "/community" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, toggleSidebar } = useSidebar();
  const { isAuthenticated, logout } = useAuth();

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
    } else {
      navigate("/login");
    }
  };

  const handleNewChat = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // 현재 홈 화면인 경우 새로고침
    if (location.pathname === "/") {
      window.location.reload();
    } else {
      // 다른 페이지인 경우 홈으로 이동
      navigate("/");
    }
  };

  return (
    <aside
      className={`min-h-screen bg-[#18181b] rounded-3xl flex flex-col p-6 transition-all duration-300 ${
        collapsed ? "w-[72px] items-center p-3" : "w-64"
      }`}
    >
      {/* 토글 버튼 */}
      <button
        className={`mb-4 flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#23232a] transition-colors ${collapsed ? "ml-0" : "ml-auto"}`}
        onClick={toggleSidebar}
        aria-label="사이드바 토글"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          {collapsed ? (
            <path d="M7 5L13 10L7 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M13 5L7 10L13 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>

      {/* 로고 */}
      <div
        className={`mb-8 flex items-center h-16 cursor-pointer justify-center ${collapsed ? "w-full" : ""}`}
        onClick={() => navigate("/")}
      >
        <img
          src={collapsed ? "/site_logo_s.png" : "/site_logo_n.png"}
          alt="Netiva"
          className={collapsed ? "h-16 w-26" : "h-full"}
        />
      </div>

      {/* New chat 버튼 */}
      <button
        onClick={handleNewChat}
        className={`h-12 bg-[#346aff] rounded-lg text-white font-medium mb-8 flex items-center justify-center gap-3 transition-all duration-200 hover:bg-[#2a55cc] ${
          collapsed ? "w-12 p-0 justify-center" : "w-full px-4"
        }`}
      >
        <PlusCircle className="w-5 h-5" />
        {!collapsed && "New chat"}
      </button>

      {/* 메뉴 */}
      <nav className="flex flex-col gap-2 w-full">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-3 rounded-lg transition-colors w-full ${
              collapsed ? "justify-center px-0 py-3" : "px-4 py-3 justify-start"
            }
              ${location.pathname === item.path
                ? "bg-[#2a2f6b4c] text-white font-semibold"
                : "text-[#9aa2ac] hover:bg-[#2a2f6b4c]"}
            `}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* 하단 로그인/로그아웃 */}
      <div className="mt-auto">
        <hr className={`my-6 border-[#333] w-full ${collapsed ? "hidden" : "block"}`} />
        <Button
          onClick={handleAuthClick}
          className={`border text-white rounded-lg transition-colors ${
            collapsed
              ? "w-12 h-12 border-white hover:bg-white hover:text-[#18181b] mb-2"
              : "w-full h-12 border-white hover:bg-white hover:text-[#18181b]"
          }`}
        >
          {collapsed ? (
            <Users className="w-5 h-5 mx-auto" />
          ) : (
            isAuthenticated ? "로그아웃" : "로그인 / 회원가입"
          )}
        </Button>
      </div>
    </aside>
  );
}