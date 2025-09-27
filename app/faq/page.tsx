import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { buildFaqJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";

const FAQ_ITEMS = [
    {
        question: "Cum pot modifica perioada unei rezervări existente?",
        answer:
            "Accesează contul DaCars > Rezervările mele și folosește opțiunea \"Modifică datele\". Echipa noastră validează modificarea în maximum 2 ore lucrătoare.",
    },
    {
        question: "Ce documente trebuie să prezint la ridicarea mașinii?",
        answer:
            "Este nevoie de actul de identitate, permisul de conducere valabil și cardul bancar folosit la garanție.",
    },
    {
        question: "Cum funcționează garanția fără depozit?",
        answer:
            "Pentru rezervările eligibile, garanția este acoperită de asigurarea extinsă DaCars și nu se blochează nicio sumă pe card.",
    },
    {
        question: "Pot prelungi rezervarea dacă mașina este deja închiriată?",
        answer:
            "Da, atât timp cât vehiculul este disponibil în calendar. Prelungirea se face din aplicație sau prin contact cu suportul DaCars.",
    },
    {
        question: "Care este politica pentru combustibil?",
        answer:
            "Mașinile se livrează cu rezervor plin și trebuie returnate la fel. Taxăm doar diferența lipsă fără comisioane suplimentare.",
    },
    {
        question: "Ce se întâmplă dacă întârzii la predarea mașinii?",
        answer:
            "Primele 60 de minute sunt tolerate gratuit. După acest interval se taxează o zi suplimentară conform tarifarului activ.",
    },
    {
        question: "Pot adăuga șoferi suplimentari?",
        answer:
            "Da, până la doi șoferi suplimentari fără cost. Completează datele lor în timpul rezervării sau din contul tău.",
    },
    {
        question: "Asistența rutieră este inclusă?",
        answer:
            "Da, oferim asistență rutieră 24/7 în toată România și în țările UE acoperite în contract.",
    },
    {
        question: "Ce opțiuni de plată acceptați?",
        answer:
            "Acceptăm carduri Visa, MasterCard, Apple Pay și transfer bancar pentru rezervările corporate.",
    },
    {
        question: "Cum pot obține factură fiscală?",
        answer:
            "Factura este generată automat după predare și se trimite pe e-mail. Poți descărca oricând documentul din secțiunea „Facturi”.",
    },
];

const PAGE_TITLE = "Întrebări frecvente DaCars";
const PAGE_DESCRIPTION = "Răspunsuri clare despre rezervări, garanție și suport pentru clienții DaCars.";

export const generateMetadata = (): Metadata =>
    buildMetadata({
        title: `${PAGE_TITLE} | DaCars`,
        description: PAGE_DESCRIPTION,
        path: "/faq",
    });

const FaqPage = () => {
    const faqJsonLd = buildFaqJsonLd(FAQ_ITEMS);

    return (
        <main className="mx-auto max-w-4xl px-6 py-16">
            {faqJsonLd && <StructuredData data={faqJsonLd} id="faq-structured-data" />}
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">{PAGE_TITLE}</h1>
                <p className="mt-4 text-base text-gray-600">{PAGE_DESCRIPTION}</p>
            </header>

            <section className="space-y-4" aria-label="Întrebări și răspunsuri frecvente">
                {FAQ_ITEMS.map((item, index) => (
                    <details key={item.question} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <summary className="cursor-pointer text-lg font-medium text-gray-900">
                            <span className="flex items-center justify-between">
                                <span>
                                    {index + 1}. {item.question}
                                </span>
                                <span aria-hidden="true" className="text-berkeley">
                                    +
                                </span>
                            </span>
                        </summary>
                        <div className="mt-3 text-base text-gray-700">
                            <p>{item.answer}</p>
                        </div>
                    </details>
                ))}
            </section>
        </main>
    );
};

export default FaqPage;
