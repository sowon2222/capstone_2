import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "./SidebarContext";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#0f0f0f] flex">
        <Sidebar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}