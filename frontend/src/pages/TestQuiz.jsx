import { Button } from "../components/common/Button";
import { Card, CardContent } from "../components/common/Card";
import { Input } from "../components/common/Input";
import { Separator } from "../components/common/Separator";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from "../components/common/Tabs";
  import { Archive, Code, FileText, Home, Plus, Users } from "lucide-react";
  import React from "react";
  
  export default function TestQuiz() {
    // Navigation items data
    const navItems = [
      { icon: <Home className="w-5 h-5" />, label: "홈", active: true },
      {
        icon: <FileText className="w-5 h-5" />,
        label: "기출 문제",
        active: false,
      },
      {
        icon: <Archive className="w-5 h-5" />,
        label: "자료 보관함",
        active: false,
      },
      { icon: <Users className="w-5 h-5" />, label: "커뮤니티", active: false },
    ];
  
    return (
      <div className="bg-[#0f0f0f] flex flex-row justify-center w-full min-h-screen">
        <div className="bg-[#0f0f0f] w-full max-w-[1440px] h-[1024px] relative">
          {/* Sidebar */}
          <div className="absolute w-72 h-[996px] top-0 left-[18px]">
            <div className="absolute w-[270px] h-[969px] top-[27px] left-3 bg-[#1a1a1a] rounded-[39px] flex flex-col items-center">
              {/* Logo */}
              <div className="w-[234px] h-52 relative">
                <img
                  src=""
                  alt="Lecture Lab Logo"
                  className="w-full h-full object-cover"
                />
              </div>
  
              {/* New Chat Button */}
              <Button className="w-60 h-[54px] mt-2 bg-[#346aff] rounded-lg flex items-center justify-center gap-3">
                <Plus className="w-4 h-4" />
                <span className="font-h300 font-[number:var(--h300-font-weight)] text-white text-[length:var(--h300-font-size)] tracking-[var(--h300-letter-spacing)] leading-[var(--h300-line-height)]">
                  New chat
                </span>
              </Button>
  
              {/* Navigation Menu */}
              <div className="flex flex-col w-full items-center justify-center gap-5 px-6 py-0 mt-10">
                {navItems.map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className={`flex w-60 items-center gap-3 px-3 py-4 justify-start ${
                      item.active ? "bg-[#2a2f6b4c]" : ""
                    }`}
                  >
                    {item.icon}
                    <div
                      className={`font-bold text-base whitespace-nowrap tracking-[0] leading-6 ${
                        item.active ? "text-white" : "text-[#9aa2ac]"
                      }`}
                    >
                      {item.label}
                    </div>
                  </Button>
                ))}
              </div>
  
              {/* Separator */}
              <div className="mt-auto mb-6 w-[250px]">
                <Separator className="bg-white" />
              </div>
  
              {/* Login/Signup Button */}
              <Button
                variant="outline"
                className="w-60 h-[52px] mb-8 border-white text-white rounded-xl"
              >
                로그인 / 회원가입
              </Button>
            </div>
          </div>
  
          {/* Page Counter */}
          <div className="inline-flex items-center gap-2.5 p-2.5 absolute top-[43px] right-[50px]">
            <div className="inline-flex items-center justify-center gap-2.5 p-2.5 relative">
              <div className="relative w-fit mt-[-1.00px] [font-family:'Souliyo_Unicode-Regular',Helvetica] font-normal text-[#9aa2ac] text-2xl whitespace-nowrap tracking-[0] leading-6">
                1/20
              </div>
            </div>
            <Code className="w-6 h-6 text-[#9aa2ac]" />
          </div>
  
          {/* Main Content */}
          <div className="absolute left-[348px] top-[51px]">
            {/* Title Input */}
            <Input
              className="w-[284px] h-[52px] px-6 py-4 bg-[#1a1a1a] rounded-lg text-white text-2xl [font-family:'Souliyo_Unicode-Regular',Helvetica]"
              placeholder="슬라이드 제목"
              defaultValue="슬라이드 제목"
            />
  
            {/* Content Card */}
            <Card className="w-[1044px] h-[856px] mt-[37px] bg-[#1a1a1a] rounded-lg border-none">
              <CardContent className="p-0">
                {/* Tabs */}
                <Tabs defaultValue="explanation" className="w-full">
                  <TabsList className="w-full h-[81px] bg-transparent justify-start px-[57px] border-b border-[#333]">
                    <TabsTrigger
                      value="explanation"
                      className="text-2xl [font-family:'Souliyo_Unicode-Regular',Helvetica] data-[state=active]:border-b-2 data-[state=active]:border-[#346aff] rounded-none"
                    >
                      설명 보기
                    </TabsTrigger>
                    <TabsTrigger
                      value="problem"
                      className="text-2xl [font-family:'Souliyo_Unicode-Regular',Helvetica] ml-[106px]"
                    >
                      문제 풀기
                    </TabsTrigger>
                  </TabsList>
  
                  <TabsContent
                    value="explanation"
                    className="mt-[52px] flex space-x-[41px] px-[45px]"
                  >
                    {/* Left Panel */}
                    <div className="w-[455px] h-[682px] bg-[#1e1e1e] flex flex-col items-center justify-center">
                      <div className="text-[#bbbbbb] text-xl [font-family:'Souliyo_Unicode-Regular',Helvetica]">
                        업로드 자료
                      </div>
                    </div>
  
                    {/* Right Panel */}
                    <div className="w-[455px] h-[682px] bg-[#1e1e1e] flex flex-col items-center justify-center">
                      <div className="text-[#bbbbbb] text-xl [font-family:'Souliyo_Unicode-Regular',Helvetica]">
                        자료에 대한 설명
                      </div>
                    </div>
                  </TabsContent>
  
                  <TabsContent value="problem">
                    {/* Problem solving content would go here */}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  