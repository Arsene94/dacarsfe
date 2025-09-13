"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Rezervări", href: "/admin/bookings", icon: Calendar },
  { name: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { name: "Mașini", href: "/admin/cars", icon: Car },
  {
    name: "Mockup",
    icon: Folder,
    subItems: [
      { name: "Sub Meniu 1", href: "/admin/mockup/sub1" },
      { name: "Sub Meniu 2", href: "/admin/mockup/sub2" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCollapsed(mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      {isMobile && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-20 left-4 z-40 p-2 rounded-md bg-white shadow-md"
          aria-label="Deschide meniul de administrare"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
      )}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
          isMobile
            ? `fixed top-16 left-0 h-[calc(100vh-4rem)] z-50 w-64 transform ${
                collapsed
                  ? "-translate-x-full pointer-events-none"
                  : "translate-x-0 shadow-lg"
              }`
            : collapsed
            ? "w-20"
            : "w-64"
        }`}
      >
      <div className="h-16 flex items-center justify-between px-4">
        {!collapsed && (
          <span className="text-lg font-semibold text-berkeley">Admin</span>
        )}
        <button
          onClick={() => {
            if (isMobile) setCollapsed(true);
            else setCollapsed(!collapsed);
          }}
          className="p-2 rounded-md hover:bg-gray-100"
          aria-label={
            isMobile
              ? "Închide meniul"
              : collapsed
              ? "Extinde meniul"
              : "Restrânge meniul"
          }
        >
          {isMobile ? (
            <X className="h-5 w-5 text-gray-700" />
          ) : collapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-700" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          )}
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = item.href
            ? pathname === item.href
            : item.subItems?.some((sub) => pathname === sub.href);

          if (item.subItems) {
            const isOpen = openMenus[item.name];
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`flex w-full items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-jade/10 text-jade"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {!collapsed && (
                    <>
                      <span className="ml-3 flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>
                {isOpen && !collapsed && (
                  <div className="mt-1 space-y-1 pl-9">
                    {item.subItems.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => isMobile && setCollapsed(true)}
                          className={`block rounded-md px-2 py-2 text-sm transition-colors ${
                            subActive
                              ? "text-jade"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => isMobile && setCollapsed(true)}
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
    </>
  );
}

