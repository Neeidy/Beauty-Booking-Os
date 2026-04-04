import type { Metadata } from "next";
import Sidebar from "../../components/admin/Sidebar";

export const metadata: Metadata = {
  title: "Admin — Vienna Glow Studio",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f4f4f2" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}
