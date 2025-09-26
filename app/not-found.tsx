import { Compass, Home, Phone } from "lucide-react";
import StatusPage from "@/components/StatusPage";

const NotFoundPage = () => {
    return (
        <StatusPage
            statusLabel="Cod 404"
            title="Pagina pe care o cauți nu există"
            description="Verifică linkul sau revino la pagina principală pentru a explora ofertele DaCars. Suntem aici să te ajutăm să găsești mașina potrivită."
            icon={<Compass className="h-10 w-10" aria-hidden="true" />}
            actions={[
                {
                    href: "/",
                    label: "Înapoi la pagina principală",
                    icon: <Home className="h-4 w-4" aria-hidden="true" />,
                },
                {
                    href: "/contact",
                    label: "Contactează echipa DaCars",
                    variant: "secondary",
                    icon: <Phone className="h-4 w-4" aria-hidden="true" />,
                },
            ]}
        />
    );
};

export default NotFoundPage;
