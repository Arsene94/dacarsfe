"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/AdminSidebar";
import { FORBIDDEN_EVENT } from "@/lib/api";

const PERMISSION_MESSAGE = "Nu ai permisiunea necesară să accesezi această pagină.";

const adminStyles = /* css */ `
.rich-text-editor {
    border-radius: 0.5rem;
    border: 1px solid rgb(209 213 219 / 1);
    background-color: rgb(255 255 255 / 1);
    box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.05);
}

.rich-text-editor .ck.ck-editor {
    border: none !important;
    box-shadow: none !important;
}

.rich-text-editor .ck.ck-toolbar {
    border: none !important;
    border-bottom: 1px solid rgb(209 213 219 / 1) !important;
    background-color: rgb(249 250 251 / 1);
    border-radius: 0.75rem 0.75rem 0 0 !important;
}

.rich-text-editor .ck.ck-editor__main > .ck-editor__editable {
    border: none !important;
    box-shadow: none !important;
    padding: 0.75rem 1rem;
    font-family: var(--font-dm-sans, var(--font-sans));
    color: rgb(55 65 81 / 1);
}

.rich-text-editor .ck.ck-editor__editable:not(.ck-editor__nested-editable).ck-focused {
    border: none !important;
    box-shadow: 0 0 0 2px rgb(20 184 166 / 0.35) !important;
}

.rich-text-editor--faq-answer .ck.ck-editor__editable:not(.ck-editor__nested-editable) {
    min-height: 160px;
}

.rich-text-editor--description .ck.ck-editor__editable:not(.ck-editor__nested-editable) {
    min-height: 120px;
}

.rich-text-editor--content .ck.ck-editor__editable:not(.ck-editor__nested-editable) {
    min-height: 160px;
}
`;

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [permissionError, setPermissionError] = useState<string | null>(null);

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

        return (
            <>
                <style jsx global>{adminStyles}</style>
                {fallback}
            </>
        );
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

    const page = pathname === "/admin/login"
        ? <div className="pt-16 lg:pt-20">{renderContent}</div>
        : (
            <div className="md:flex min-h-screen pt-16 lg:pt-20">
                <AdminSidebar />
                <main className="flex-1 min-w-0">{renderContent}</main>
            </div>
        );

    return (
        <>
            <style jsx global>{adminStyles}</style>
            {page}
        </>
    );
}
