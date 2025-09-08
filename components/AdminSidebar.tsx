"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Rezervări", href: "/admin/rezervari", icon: Calendar },
  { name: "Mașini", href: "/admin/masini", icon: Car },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4">
        {!collapsed && (
          <span className="text-lg font-semibold text-berkeley">Admin</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-gray-100"
          aria-label={collapsed ? "Extinde meniul" : "Restrânge meniul"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-700" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          )}
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-jade/10 text-jade"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

