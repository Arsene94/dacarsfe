"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== "/admin/login") {
        router.replace("/admin/login");
      } else if (user && pathname === "/admin/login") {
        router.replace("/admin");
      }
    }
  }, [user, loading, pathname, router]);

  if (!user && pathname !== "/admin/login") {
    return loading ? <div /> : <div />;
  }

  if (pathname === "/admin/login") {
    return <div className="pt-16 lg:pt-20">{children}</div>;
  }

  return (
    <div className="md:flex min-h-screen pt-16 lg:pt-20">
      <AdminSidebar />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
