"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import StatusPage from "@/components/StatusPage";

type GlobalErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

const GlobalError = ({ error, reset }: GlobalErrorProps) => {
    useEffect(() => {
        console.error("A apărut o eroare neașteptată în aplicație", error);
    }, [error]);

    return (
        <StatusPage
            statusLabel="Eroare 500"
            title="Ups! Ceva nu a funcționat corect"
            description="Echipa DaCars a fost notificată și investigăm problema. Îți recomandăm să reîncerci în câteva momente sau să revii la pagina principală."
            icon={<AlertTriangle className="h-10 w-10" aria-hidden="true" />}
            actions={[
                {
                    label: "Reîncearcă",
                    onClick: reset,
                    icon: <RefreshCw className="h-4 w-4" aria-hidden="true" />,
                },
                {
                    href: "/",
                    label: "Mergi la pagina principală",
                    variant: "secondary",
                    icon: <Home className="h-4 w-4" aria-hidden="true" />,
                },
            ]}
        >
            {error.digest ? (
                <p className="text-xs font-mono uppercase tracking-wide text-gray-400">
                    Cod incident: <span>{error.digest}</span>
                </p>
            ) : null}
        </StatusPage>
    );
};

export default GlobalError;
