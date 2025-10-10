import type { ReactNode } from "react";

import AdminGlobalStyles from "./AdminGlobalStyles";
import AdminLayoutClient from "./AdminLayoutClient";

const AdminLayout = ({ children }: { children: ReactNode }) => {
    return (
        <>
            <AdminGlobalStyles />
            <AdminLayoutClient>{children}</AdminLayoutClient>
        </>
    );
};

export default AdminLayout;
