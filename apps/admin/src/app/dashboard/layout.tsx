import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0e0e10] text-[#fefbfe]">
      <Sidebar />
      <main className="flex-1 p-10 overflow-auto relative">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#6bfe9c]/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        {children}
      </main>
    </div>
  );
}
