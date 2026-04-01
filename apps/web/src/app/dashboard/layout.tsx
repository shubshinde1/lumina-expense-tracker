import BottomNav from "@/components/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen pb-20 bg-background text-foreground flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
