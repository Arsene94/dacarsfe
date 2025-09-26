import type { Metadata } from "next";
import { CalendarClock, Home, Mail } from "lucide-react";
import StatusPage from "@/components/StatusPage";
import { fetchMaintenanceSettings } from "@/lib/maintenance";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";

const description =
    "Efectuăm lucrări de mentenanță programată pentru a-ți oferi o experiență mai rapidă și mai sigură. Serviciul va fi din nou disponibil în scurt timp.";

export const metadata: Metadata = {
    ...buildMetadata({
        title: "Platforma DaCars este în mentenanță",
        description,
        path: "/maintenance",
        noIndex: true,
    }),
    robots: {
        index: false,
        follow: false,
    },
};

const formatResumeLabel = (value: string | null | undefined): string | null => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("ro-RO", {
        dateStyle: "long",
        timeStyle: "short",
    }).format(parsed);
};

const MaintenancePage = async () => {
    const settings = await fetchMaintenanceSettings();
    const heroDescription = settings?.message ?? description;
    const resumeLabel = formatResumeLabel(settings?.resume_at ?? null);

    return (
        <StatusPage
            statusLabel="Mentenanță programată"
            title="Revenim imediat"
            description={heroDescription}
            icon={<CalendarClock className="h-10 w-10" aria-hidden="true" />}
            actions={[
                {
                    href: "/contact",
                    label: "Trimite-ne un mesaj",
                    icon: <Mail className="h-4 w-4" aria-hidden="true" />,
                },
                {
                    href: "/",
                    label: "Verifică din nou",
                    variant: "secondary",
                    icon: <Home className="h-4 w-4" aria-hidden="true" />,
                },
            ]}
        >
            <p>
                Între timp ne poți contacta la
                {" "}
                <a className="font-semibold text-berkeley" href={`tel:${siteMetadata.contact.phone}`}>
                    {siteMetadata.contact.phone}
                </a>
                {" "}
                sau pe email la
                {" "}
                <a className="font-semibold text-berkeley" href={`mailto:${siteMetadata.contact.email}`}>
                    {siteMetadata.contact.email}
                </a>
                .
            </p>
            {resumeLabel ? (
                <p>
                    Revenim online în jurul datei {resumeLabel}. Îți mulțumim pentru răbdare și înțelegere!
                </p>
            ) : (
                <p>Programul estimat de finalizare va fi comunicat cât mai curând posibil.</p>
            )}
            <p className="text-xs text-gray-400">
                Dacă ai o rezervare urgentă, te rugăm să ne suni pentru asistență imediată.
            </p>
        </StatusPage>
    );
};

export default MaintenancePage;
