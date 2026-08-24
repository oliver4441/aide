import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Sidebar businessName="Beauty Hub Salon" />
      <main className="md:ml-[280px] pt-4 pb-24 md:pb-4">
        <div className="p-4 md:p-10 max-w-[1200px] mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
