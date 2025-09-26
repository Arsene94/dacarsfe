import type { Metadata } from "next";
import { CalendarClock, Home, Mail } from "lucide-react";
import StatusPage from "@/components/StatusPage";
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

const MaintenancePage = () => {
    return (
        <StatusPage
            statusLabel="Mentenanță programată"
            title="Revenim imediat"
            description={description}
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
            <p>
                Programul estimat de finalizare este astăzi, ora 23:00. Îți mulțumim pentru răbdare!
            </p>
            <p className="text-xs text-gray-400">
                Dacă ai o rezervare urgentă, te rugăm să ne suni pentru asistență imediată.
            </p>
        </StatusPage>
    );
};

export default MaintenancePage;
