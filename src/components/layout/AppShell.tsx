import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 md:ml-56 md:p-6 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
