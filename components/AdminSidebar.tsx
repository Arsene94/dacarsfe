"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types/auth";
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Car,
  Percent,
  FolderTree,
  Sparkles,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Menu,
  X,
  ConciergeBell,
  Mail,
  ScrollText,
  Receipt,
  Wrench,
  Newspaper,
  Settings2,
  Factory,
  Layers,
  Gauge,
  Palette,
  Fuel,
  Languages,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AdminSidebarSubItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  requiredPermissions?: readonly string[];
};

type AdminSidebarItem = {
  name: string;
  icon: LucideIcon;
  href?: string;
  subItems?: readonly AdminSidebarSubItem[];
  requiredPermissions?: readonly string[];
};

const ACTION_TOKENS = new Set([
  "view",
  "index",
  "list",
  "read",
  "show",
  "access",
  "manage",
  "create",
  "store",
  "update",
  "edit",
  "delete",
  "destroy",
  "remove",
  "restore",
  "approve",
  "assign",
  "export",
  "import",
  "sync",
  "generate",
  "download",
  "validate",
  "apply",
  "cancel",
  "confirm",
  "send",
  "publish",
  "unpublish",
  "upload",
  "schedule",
  "resend",
  "reset",
  "toggle",
  "activate",
  "deactivate",
  "close",
  "open",
  "complete",
  "finish",
  "start",
  "duplicate",
  "clone",
  "search",
  "invite",
  "set",
  "grant",
  "revoke",
  "attach",
  "detach",
  "link",
  "unlink",
  "add",
]);

const splitTokens = (value: string): string[] =>
  value
    .split(/[.:/_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const getResourceTokens = (value: string): string[] => {
  const tokens = splitTokens(value);
  if (tokens.length === 0) {
    return tokens;
  }

  const first = tokens[0];
  if (first === "admin" || first === "panel") {
    tokens.shift();
  }

  if (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    if (ACTION_TOKENS.has(last)) {
      tokens.pop();
    }
  }

  return tokens;
};

const resourceTokensMatch = (left: string[], right: string[]): boolean => {
  if (left.length === 0 || right.length === 0) {
    return false;
  }

  const [shorter, longer] =
    left.length <= right.length ? [left, right] : [right, left];

  return shorter.every((token, index) => longer[index] === token);
};

const normalizePermission = (value: string): string => value.trim().toLowerCase();

const permissionMatches = (permission: string, candidate: string): boolean => {
  const normalizedPermission = normalizePermission(permission);
  const normalizedCandidate = normalizePermission(candidate);

  if (!normalizedPermission || !normalizedCandidate) {
    return false;
  }

  if (
    normalizedPermission === "*" ||
    normalizedPermission === "admin" ||
    normalizedPermission === "admin.*"
  ) {
    return true;
  }

  if (normalizedPermission === normalizedCandidate) {
    return true;
  }

  if (normalizedPermission.endsWith(".*")) {
    const prefix = normalizedPermission.slice(0, -2);
    if (
      normalizedCandidate === prefix ||
      normalizedCandidate.startsWith(`${prefix}.`)
    ) {
      return true;
    }
  }

  if (normalizedCandidate.endsWith(".*")) {
    const prefix = normalizedCandidate.slice(0, -2);
    if (
      normalizedPermission === prefix ||
      normalizedPermission.startsWith(`${prefix}.`)
    ) {
      return true;
    }
  }

  const permissionTokens = getResourceTokens(normalizedPermission);
  const candidateTokens = getResourceTokens(normalizedCandidate);

  return resourceTokensMatch(permissionTokens, candidateTokens);
};

const hasAccess = (
  user: User | null,
  requiredPermissions?: readonly string[],
): boolean => {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return Boolean(user);
  }

  if (!user) {
    return false;
  }

  if (user.super_user || user.manage_supers) {
    return true;
  }

  const userPermissions = Array.isArray(user.permissions)
    ? user.permissions
        .map((permission) =>
          typeof permission === "string" ? normalizePermission(permission) : "",
        )
        .filter((permission) => permission.length > 0)
    : [];

  if (userPermissions.length === 0) {
    return false;
  }

  return requiredPermissions.some((candidate) =>
    userPermissions.some((permission) => permissionMatches(permission, candidate)),
  );
};

const resourceVariants = (value: string): string[] => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  const variants = new Set<string>();
  const normalized = trimmed.replace(/\s+/g, "-");
  const forms = [
    normalized,
    normalized.replace(/-/g, "_"),
    normalized.replace(/_/g, "-"),
    normalized.replace(/[-_]/g, ""),
  ];

  forms.forEach((form) => {
    if (!form) {
      return;
    }
    variants.add(form);
    variants.add(`admin.${form}`);
  });

  return Array.from(variants);
};

const buildPermissionList = (
  slug: string,
  extras: readonly string[] = [],
): readonly string[] => {
  const seeds = new Set<string>();
  const register = (value: string) => {
    resourceVariants(value).forEach((variant) => seeds.add(variant));
  };

  register(slug);
  extras.forEach((extra) => register(extra));

  const permissions = new Set<string>();

  seeds.forEach((seed) => {
    permissions.add(seed);
    permissions.add(`${seed}.view`);
    permissions.add(`${seed}.index`);
    permissions.add(`${seed}.list`);
    permissions.add(`${seed}.read`);
    permissions.add(`${seed}.show`);
    permissions.add(`${seed}.access`);
    permissions.add(`${seed}.manage`);
    permissions.add(`${seed}.*`);
  });

  return Array.from(permissions);
};

const filterMenuItems = (
  items: readonly AdminSidebarItem[],
  user: User | null,
): AdminSidebarItem[] =>
  items
    .map((item) => {
      if (item.subItems && item.subItems.length > 0) {
        const allowedSubItems = item.subItems.filter((subItem) =>
          hasAccess(user, subItem.requiredPermissions ?? item.requiredPermissions),
        );

        if (allowedSubItems.length === 0) {
          if (item.href && hasAccess(user, item.requiredPermissions)) {
            const { subItems: _subItems, ...rest } = item;
            return {
              ...rest,
            } satisfies AdminSidebarItem;
          }

          return null;
        }

        return {
          ...item,
          subItems: allowedSubItems,
        } satisfies AdminSidebarItem;
      }

      return hasAccess(user, item.requiredPermissions) ? item : null;
    })
    .filter((item): item is AdminSidebarItem => item !== null);

const menuItems: readonly AdminSidebarItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: BarChart3,
    requiredPermissions: buildPermissionList("dashboard", ["overview", "statistics"]),
  },
  {
      name: "Închirieri",
      icon: Car,
      subItems: [
          {
              name: "Rezervări",
              href: "/admin/bookings",
              icon: Calendar,
              requiredPermissions: buildPermissionList("bookings", ["booking"]),
          },
          {
              name: "Calendar",
              href: "/admin/calendar",
              icon: CalendarDays,
              requiredPermissions: buildPermissionList("bookings-calendar", [
                  "bookings",
                  "booking",
                  "calendar",
              ]),
          },
          {
              name: "Mașini",
              href: "/admin/cars",
              icon: Car,
              requiredPermissions: buildPermissionList("cars", ["car", "vehicles", "fleet"]),
          },
          {
              name: "Categorii",
              href: "/admin/categories",
              icon: FolderTree,
              requiredPermissions: buildPermissionList("categories", [
                  "category",
                  "car-categories",
              ]),
          },
          {
              name: "Dynamic Price",
              href: "/admin/dynamic-prices",
              icon: Percent,
              requiredPermissions: buildPermissionList("dynamic-prices", [
                  "dynamic-price",
                  "dynamic_prices",
                  "prices",
              ]),
          },
          {
              name: "Servicii",
              href: "/admin/services",
              icon: ConciergeBell,
              requiredPermissions: buildPermissionList("services", ["service", "extras"]),
          },
          {
              name: "Wheel of Fortune",
              href: "/admin/wheel-of-fortune",
              icon: Sparkles,
              requiredPermissions: buildPermissionList("wheel-of-fortune", [
                  "wheel",
                  "fortune",
                  "wheeloffortune",
              ]),
          },
      ]
  },
  {
    name: "Atribute Mașini",
    icon: Settings2,
    requiredPermissions: buildPermissionList("car-attributes", [
      "car_attributes",
      "car-makes",
      "car-types",
      "car-transmissions",
      "car-fuels",
      "car-colors",
    ]),
    subItems: [
      {
        name: "Mărci",
        href: "/admin/car-attributes/makes",
        icon: Factory,
        requiredPermissions: buildPermissionList("car-makes", [
          "car_makes",
          "car_make",
          "car-make",
          "makes",
        ]),
      },
      {
        name: "Tipuri",
        href: "/admin/car-attributes/types",
        icon: Layers,
        requiredPermissions: buildPermissionList("car-types", [
          "car_types",
          "car_type",
          "vehicle-types",
          "vehicle_type",
        ]),
      },
      {
        name: "Transmisii",
        href: "/admin/car-attributes/transmissions",
        icon: Gauge,
        requiredPermissions: buildPermissionList("car-transmissions", [
          "car_transmissions",
          "car_transmission",
          "transmissions",
          "transmission",
        ]),
      },
      {
        name: "Combustibili",
        href: "/admin/car-attributes/fuels",
        icon: Fuel,
        requiredPermissions: buildPermissionList("car-fuels", [
          "car_fuels",
          "car_fuel",
          "fuel-types",
          "fuel_type",
          "fuel",
        ]),
      },
      {
        name: "Culori",
        href: "/admin/car-attributes/colors",
        icon: Palette,
        requiredPermissions: buildPermissionList("car-colors", [
          "car_colors",
          "car_color",
          "car-colours",
          "car_colour",
          "colors",
          "colours",
        ]),
      },
    ],
  },
  {
    name: "Cheltuieli flotă",
    href: "/admin/expenses",
    icon: Receipt,
    requiredPermissions: buildPermissionList("expenses", [
      "expense",
      "fleet-expenses",
    ]),
  },
  {
    name: "Service mașini",
    href: "/admin/service-reports",
    icon: Wrench,
    requiredPermissions: buildPermissionList("service-reports", [
      "service_report",
      "service_reports",
      "maintenance",
    ]),
  },
  {
    name: "Mail Branding",
    href: "/admin/mail-branding",
    icon: Mail,
    requiredPermissions: buildPermissionList("mail-branding", ["mailbranding", "mail"]),
  },
  {
    name: "Traduceri site",
    href: "/admin/translations",
    icon: Languages,
    requiredPermissions: buildPermissionList("translations", [
      "translation",
      "translations",
      "i18n",
      "messages",
      "localization",
    ]),
  },
  {
    name: "Utilizatori",
    href: "/admin/users",
    icon: Users,
    requiredPermissions: buildPermissionList("users", ["user", "staff"]),
  },
  {
    name: "Roluri",
    href: "/admin/roles",
    icon: Shield,
    requiredPermissions: buildPermissionList("roles", ["role", "permissions"]),
  },
  {
    name: "Blog",
    icon: Newspaper,
    requiredPermissions: buildPermissionList("blog", [
      "blog-posts",
      "blog-categories",
      "blog-tags",
    ]),
    subItems: [
      {
        name: "Articole",
        href: "/admin/blog",
        icon: Newspaper,
        requiredPermissions: buildPermissionList("blog-posts", ["blog_post"]),
      },
      {
        name: "Categorii",
        href: "/admin/blog/categories",
        icon: Newspaper,
        requiredPermissions: buildPermissionList("blog-categories", ["blog_category"]),
      },
      {
        name: "Etichete",
        href: "/admin/blog/tags",
        icon: Newspaper,
        requiredPermissions: buildPermissionList("blog-tags", ["blog_tag"]),
      },
    ],
  },
  {
    name: "Loguri activitate",
    href: "/admin/activity-logs",
    icon: ScrollText,
    requiredPermissions: buildPermissionList("activity-logs", [
      "activity_logs",
      "activity",
      "logs",
      "log",
    ]),
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const accessibleMenuItems = useMemo(
    () => filterMenuItems(menuItems, user ?? null),
    [user],
  );

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

  useEffect(() => {
    setOpenMenus((previous) => {
      const allowedNames = new Set(
        accessibleMenuItems
          .filter((item) => item.subItems && item.subItems.length > 0)
          .map((item) => item.name),
      );

      const nextEntries = Object.entries(previous).filter(([name]) =>
        allowedNames.has(name),
      );

      if (nextEntries.length === Object.keys(previous).length) {
        return previous;
      }

      return nextEntries.reduce<Record<string, boolean>>((accumulator, [name, value]) => {
        accumulator[name] = value;
        return accumulator;
      }, {});
    });
  }, [accessibleMenuItems]);

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
        {accessibleMenuItems.map((item) => {
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
                        const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => isMobile && setCollapsed(true)}
                          className={`rounded-md px-2 py-2 text-sm transition-colors flex items-center gap-1 ${
                            subActive
                              ? "text-jade"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <SubIcon className="h-5 w-5" />
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

