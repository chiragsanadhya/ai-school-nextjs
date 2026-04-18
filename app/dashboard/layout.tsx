import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f0fdf8]">
      <nav className="w-full border-b border-[#eaeaea] bg-gradient-to-r from-white to-[#f7f7f7] px-8 py-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center text-lg font-semibold text-[#111]">
            <span className="mr-1 text-emerald-500">●</span>
            AI Gurukul
          </span>
          <span className="text-sm text-[#888]">Dashboard</span>
        </div>
      </nav>
      {children}
    </div>
  );
}
