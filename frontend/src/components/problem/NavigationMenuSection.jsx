import { Button } from "../../components/common/Button";
import { FileText, FolderArchive, Home, Users } from "lucide-react";
import React from "react";

export default function NavigationMenuSection() {
  // Navigation menu items data
  const menuItems = [
    {
      icon: <Home className="w-5 h-5" />,
      label: "홈",
      active: true,
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: "기출 문제",
      active: false,
    },
    {
      icon: <FolderArchive className="w-5 h-5" />,
      label: "자료 보관함",
      active: false,
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "커뮤니티",
      active: false,
    },
  ];

  return (
    <nav className="flex flex-col w-full max-w-[282px] items-center justify-center gap-5 px-6 py-0">
      {menuItems.map((item, index) => (
        <Button
          key={index}
          variant="ghost"
          className={`flex w-full items-center justify-start gap-3 px-3 py-4 rounded-lg ${
            item.active ? "bg-[#2a2f6b4c]" : ""
          }`}
        >
          {item.icon}
          <span
            className={`font-bold text-base whitespace-nowrap leading-6 ${
              item.active ? "text-white" : "text-[#9aa2ac]"
            }`}
            style={{ fontFamily: "'Sora-Bold', Helvetica" }}
          >
            {item.label}
          </span>
        </Button>
      ))}
    </nav>
  );
}
