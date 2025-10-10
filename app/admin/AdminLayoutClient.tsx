"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { FORBIDDEN_EVENT } from "@/lib/api";

import { ADMIN_RICH_TEXT_STYLE_ID, ADMIN_RICH_TEXT_STYLES } from "./adminStyles";

const PERMISSION_MESSAGE = "Nu ai permisiunea necesară să accesezi această pagină.";

const ensureAdminStyles = () => {
    if (typeof document === "undefined") {
        return;
    }

    if (document.getElementById(ADMIN_RICH_TEXT_STYLE_ID)) {
        return;
    }

    const style = document.createElement("style");
    style.id = ADMIN_RICH_TEXT_STYLE_ID;
    style.textContent = ADMIN_RICH_TEXT_STYLES;
    document.head.appendChild(style);
};

const AdminLayoutClient = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [permissionError, setPermissionError] = useState<string | null>(null);

    useEffect(() => {
        ensureAdminStyles();
    }, []);

    useEffect(() => {
        if (!loading) {
            if (!user && pathname !== "/admin/login") {
                router.replace("/admin/login");
            } else if (user && pathname === "/admin/login") {
                router.replace("/admin");
            }
        }
    }, [user, loading, pathname, router]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handleForbidden = (event: Event) => {
            const { detail } = event as CustomEvent<string | undefined>;
            const message = detail && detail !== "Forbidden" ? detail : PERMISSION_MESSAGE;
            setPermissionError(message);
        };

        window.addEventListener(FORBIDDEN_EVENT, handleForbidden);

        return () => {
            window.removeEventListener(FORBIDDEN_EVENT, handleForbidden);
        };
    }, []);

    useEffect(() => {
        setPermissionError(null);
    }, [pathname]);

    if (!user && pathname !== "/admin/login") {
        const fallback = loading ? <div /> : <div />;
        return fallback;
    }

    const renderContent = permissionError ? (
        <div className="flex w-full items-center justify-center py-16">
            <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-red-800">Acces restricționat</h2>
                <p className="mt-2 text-sm text-red-700">{permissionError}</p>
            </div>
        </div>
    ) : (
        children
    );

    if (pathname === "/admin/login") {
        return <div className="pt-16 lg:pt-20">{renderContent}</div>;
    }

    return (
        <div className="md:flex min-h-screen pt-16 lg:pt-20">
            <AdminSidebar />
            <main className="flex-1 min-w-0">{renderContent}</main>
        </div>
    );
};

export default AdminLayoutClient;
