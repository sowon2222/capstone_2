import HeaderBar from "./HeaderBar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="bg-[#18181b] min-h-screen w-full">
      <HeaderBar />
      <main className="pt-16 w-full min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}