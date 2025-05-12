import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card, CardContent } from "../components/common/Card";
import { Input } from "../components/common/Input";
import { Separator } from "../components/common/Separator";
import { FcGoogle } from "react-icons/fc";
import { SiKakaotalk, SiNaver } from "react-icons/si";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        alert("회원가입 성공: " + data.username);
        navigate("/login");
      } else {
        alert("회원가입 실패: " + data.detail);
      }
    } catch (error) {
      console.error("에러: ", error);
      alert("서버 요청 실패");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <div className="pt-2 flex justify-center">
        <img
          src="/site_logo_n.png"
          alt="Netiva"
          className="h-16"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[480px] bg-[#1a1a1a] rounded-lg shadow border-none">
          <CardContent className="p-0 flex flex-col items-center">
            <div className="w-full px-8 mt-8">
              <h2 className="text-2xl font-bold text-[#FFFFFF]">회원가입</h2>
              <p className="mt-2 text-base text-[#BBBBBB]">
                회원가입 후 로그인 가능합니다
              </p>
            </div>

            <div className="w-full px-8 mt-4 space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#8abfff] text-[#4e4e4e] text-base"
                placeholder="id"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[50px] px-4 py-3 bg-white rounded-[10px] border border-[#e6e6e6] text-[#4e4e4e] text-base"
                placeholder="Password"
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
                onClick={handleRegister}
                className="w-full h-[45px] mt-3 bg-[#346aff] hover:bg-[#2a55cc] text-white text-base rounded-lg"
              >
                Sign up
              </Button>
            </div>

            <div className="w-full px-8 mt-4">
              <div className="flex items-center">
                <span className="text-[#4e4e4e] text-sm whitespace-nowrap">
                  Or continue with
                </span>
                <Separator className="flex-grow ml-4 bg-[#4e4e4e]" />
              </div>
            </div>

            <div className="w-full px-8 mt-4 space-y-3 mb-3">
              {[FcGoogle, SiKakaotalk, SiNaver].map((Icon, idx) => (
                <Button key={idx} className="w-full h-[45px] bg-white rounded text-[#4e4e4e] text-sm justify-start px-4 border-none">
                  <div className="flex items-center">
                    <span className="mr-4">{<Icon className="w-6 h-6" />}</span>
                    <span>소셜 계정으로 시작하기</span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
