import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card, CardContent } from "../components/common/Card";
import { Input } from "../components/common/Input";
import { useAuth } from "../contexts/AuthContext";
import { authService } from '../services/authService'; // 또는 '../../services/authService' 경로 맞추기

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authService.login(id, password);
      await login(result);
      navigate("/");
    } catch (error) {
      setError(error.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* 로고 */}
      <div className="pt-2 flex justify-center">
        <img src="/site_logo_n.png" alt="Netiva" className="h-16" onClick={() => navigate("/")} style={{ cursor: 'pointer' }} />
      </div>
      {/* 중앙 정렬 영역 */}
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[480px] bg-[#1a1a1a] rounded-lg shadow border-none">
          <CardContent className="p-0 flex flex-col items-center">
            {/* Login Header */}
            <div className="w-full px-8 mt-8">
              <h2 className="text-2xl font-bold text-[#FFFFFF]">로그인</h2>
              <p className="mt-2 text-base text-[#BBBBBB]">
                회원가입 후 로그인 가능합니다
              </p>
            </div>

            {/* 로그인 폼 */}
            <form onSubmit={handleLogin} className="w-full px-8 mt-4 space-y-3">
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <Input
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#8abfff] text-[#4e4e4e] text-base"
                placeholder="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={isLoading}
              />
              <Input
                type="password"
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#e6e6e6] text-[#4e4e4e] text-base"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-[#4e4e4e] text-sm">계정이 없으신가요?</span>
                <span
                  onClick={() => navigate("/register")}
                  className="text-[#346aff] cursor-pointer text-sm"
                >
                  가입하기
                </span>
              </div>
              <Button 
                type="submit"
                className="w-full h-[45px] mt-3 bg-[#346aff] hover:bg-[#2a55cc] text-white text-base rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "Log in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
