"use client";

import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";

export function DashboardContentWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarCollapsed();
  const contentMargin = collapsed ? "md:ml-[72px]" : "md:ml-[260px]";

  return (
    <div className={`flex-1 ${contentMargin} pt-2 pb-24 md:pb-6 flex flex-col`}>
      {children}
    </div>
  );
}