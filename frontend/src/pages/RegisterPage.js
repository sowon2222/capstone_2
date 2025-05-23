import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card, CardContent } from "../components/common/Card";
import { Input } from "../components/common/Input";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/authService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    id: "",
    password: "",
    name: "",
    email: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authService.register(
        formData.id,
        formData.password,
        formData.name,
        formData.email
      );
      await login(formData.id, formData.password);
      navigate("/");
    } catch (error) {
      setError(error.message || "회원가입 중 오류가 발생했습니다.");
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
            {/* Register Header */}
            <div className="w-full px-8 mt-8">
              <h2 className="text-2xl font-bold text-[#FFFFFF]">회원가입</h2>
              <p className="mt-2 text-base text-[#BBBBBB]">
                새로운 계정을 만들어보세요
              </p>
            </div>

            {/* 회원가입 폼 */}
            <form onSubmit={handleSubmit} className="w-full px-8 mt-4 space-y-3">
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <Input
                name="id"
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#e6e6e6] text-[#4e4e4e] text-base"
                placeholder="아이디"
                value={formData.id}
                onChange={handleChange}
                disabled={isLoading}
              />
              <Input
                name="password"
                type="password"
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#e6e6e6] text-[#4e4e4e] text-base"
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              <Input
                name="name"
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#e6e6e6] text-[#4e4e4e] text-base"
                placeholder="이름"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
              />
              <Input
                name="email"
                type="email"
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#e6e6e6] text-[#4e4e4e] text-base"
                placeholder="이메일"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />

              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-[#4e4e4e] text-sm">이미 계정이 있으신가요?</span>
                <span
                  onClick={() => navigate("/login")}
                  className="text-[#346aff] cursor-pointer text-sm"
                >
                  로그인하기
                </span>
              </div>

              <Button 
                type="submit"
                className="w-full h-[45px] mt-3 bg-[#346aff] hover:bg-[#2a55cc] text-white text-base rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? "회원가입 중..." : "회원가입"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
