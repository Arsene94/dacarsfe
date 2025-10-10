import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { createApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { buildFaqJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import type { Faq, FaqCategory } from "@/types/faq";

type FaqEntry = { question: string; answer: string };

const extractPlainText = (value: string): string =>
    value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

type FaqSeoCopy = {
    pageTitle: string;
    pageDescription: string;
    metaTitle: string;
    metaDescription: string;
    items: FaqEntry[];
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

const FAQ_COPY: Record<Locale, FaqSeoCopy> = {
    ro: {
        pageTitle: "Întrebări frecvente DaCars",
        pageDescription: "Răspunsuri clare despre rezervări, garanție și suport pentru clienții DaCars.",
        metaTitle: "Întrebări frecvente DaCars | Suport clienți",
        metaDescription:
            "Găsește rapid răspunsuri despre modificarea rezervărilor, documente, garanții și asistență rutieră DaCars.",
        items: [
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
                    "Factura este generată automat după predare și se trimite pe e-mail. Poți descărca oricând documentul din secțiunea \"Facturi\".",
            },
        ],
    },
    en: {
        pageTitle: "DaCars Frequently Asked Questions",
        pageDescription: "Clear answers about reservations, deposits, and DaCars customer support.",
        metaTitle: "DaCars FAQ | Rental Support Answers",
        metaDescription:
            "Find quick explanations about modifying bookings, required documents, roadside assistance, and payment methods.",
        items: [
            {
                question: "How can I modify the period of an existing reservation?",
                answer:
                    "Sign in to your DaCars account → My Reservations and use \"Edit dates\". Our team confirms the change within two working hours.",
            },
            {
                question: "What documents do I need to present when picking up the car?",
                answer:
                    "Bring your identity card, a valid driving licence, and the bank card used for the deposit.",
            },
            {
                question: "How does the no-deposit guarantee work?",
                answer:
                    "Eligible bookings are covered by the DaCars extended insurance, so no amount is blocked on your card.",
            },
            {
                question: "Can I extend the booking if I already have the car?",
                answer:
                    "Yes, as long as the vehicle is available in the calendar. Extend it from the app or by contacting DaCars support.",
            },
            {
                question: "What is the fuel policy?",
                answer:
                    "Cars are delivered with a full tank and must be returned full. We only charge the missing difference without extra fees.",
            },
            {
                question: "What happens if I’m late returning the car?",
                answer:
                    "The first 60 minutes are free. Afterwards we charge an extra day according to the active rate.",
            },
            {
                question: "Can I add additional drivers?",
                answer:
                    "Yes, up to two extra drivers with no cost. Fill in their details during the booking or from your account.",
            },
            {
                question: "Is roadside assistance included?",
                answer:
                    "Yes, we provide 24/7 roadside assistance across Romania and in the EU countries covered by the contract.",
            },
            {
                question: "What payment options do you accept?",
                answer:
                    "We accept Visa, MasterCard, Apple Pay, and bank transfer for corporate rentals.",
            },
            {
                question: "How can I get a fiscal invoice?",
                answer:
                    "The invoice is generated automatically after drop-off and sent by email. You can download it anytime from the Invoices section.",
            },
        ],
    },
    it: {
        pageTitle: "Domande frequenti DaCars",
        pageDescription: "Risposte chiare su prenotazioni, garanzie e assistenza clienti DaCars.",
        metaTitle: "FAQ DaCars | Supporto noleggi",
        metaDescription:
            "Ottieni risposte rapide su modifiche alle prenotazioni, documenti necessari, assistenza stradale e metodi di pagamento.",
        items: [
            {
                question: "Come posso modificare il periodo di una prenotazione esistente?",
                answer:
                    "Accedi al tuo account DaCars → Le mie prenotazioni e usa \"Modifica date\". Il nostro team conferma la modifica entro due ore lavorative.",
            },
            {
                question: "Quali documenti devo presentare al ritiro dell'auto?",
                answer:
                    "Porta la carta d'identità, una patente valida e la carta bancaria utilizzata per la cauzione.",
            },
            {
                question: "Come funziona la garanzia senza deposito?",
                answer:
                    "Per le prenotazioni idonee, la garanzia è coperta dall'assicurazione estesa DaCars, quindi non blocchiamo alcun importo sulla carta.",
            },
            {
                question: "Posso prolungare la prenotazione se ho già la macchina?",
                answer:
                    "Sì, se il veicolo risulta disponibile nel calendario. Puoi prolungare dall'app o contattando l'assistenza DaCars.",
            },
            {
                question: "Qual è la politica sul carburante?",
                answer:
                    "Le auto vengono consegnate con il pieno e devono essere restituite allo stesso livello. Addebitiamo solo la differenza mancante senza commissioni aggiuntive.",
            },
            {
                question: "Cosa succede se ritardo nella riconsegna dell'auto?",
                answer:
                    "I primi 60 minuti sono gratuiti. Dopo questo intervallo addebitiamo un giorno aggiuntivo secondo la tariffa attiva.",
            },
            {
                question: "Posso aggiungere conducenti aggiuntivi?",
                answer:
                    "Sì, fino a due conducenti extra senza costi. Inserisci i loro dati durante la prenotazione o dal tuo account.",
            },
            {
                question: "L'assistenza stradale è inclusa?",
                answer:
                    "Sì, offriamo assistenza stradale 24/7 in tutta la Romania e nei paesi UE coperti dal contratto.",
            },
            {
                question: "Quali metodi di pagamento accettate?",
                answer:
                    "Accettiamo Visa, MasterCard, Apple Pay e bonifico bancario per le prenotazioni corporate.",
            },
            {
                question: "Come posso ottenere la fattura fiscale?",
                answer:
                    "La fattura viene generata automaticamente dopo la riconsegna e inviata via e-mail. Puoi scaricarla in qualsiasi momento dalla sezione Fatture.",
            },
        ],
    },
    es: {
        pageTitle: "Preguntas frecuentes DaCars",
        pageDescription: "Respuestas claras sobre reservas, garantías y soporte al cliente de DaCars.",
        metaTitle: "Preguntas frecuentes DaCars | Soporte de alquiler",
        metaDescription:
            "Consulta respuestas rápidas sobre modificaciones de reservas, documentos requeridos, asistencia en carretera y métodos de pago.",
        items: [
            {
                question: "¿Cómo puedo modificar el periodo de una reserva existente?",
                answer:
                    "Entra en tu cuenta DaCars → Mis reservas y usa \"Modificar fechas\". Nuestro equipo valida el cambio en un máximo de dos horas laborables.",
            },
            {
                question: "¿Qué documentos debo presentar al recoger el coche?",
                answer:
                    "Presenta tu documento de identidad, un permiso de conducir válido y la tarjeta bancaria utilizada para la garantía.",
            },
            {
                question: "¿Cómo funciona la garantía sin depósito?",
                answer:
                    "En las reservas elegibles, la garantía está cubierta por el seguro ampliado de DaCars y no se bloquea ningún importe en tu tarjeta.",
            },
            {
                question: "¿Puedo ampliar la reserva si ya tengo el coche?",
                answer:
                    "Sí, siempre que el vehículo esté disponible en el calendario. Amplía la reserva desde la app o contactando con soporte DaCars.",
            },
            {
                question: "¿Cuál es la política de combustible?",
                answer:
                    "Los vehículos se entregan con el depósito lleno y deben devolverse igual. Solo cobramos la diferencia faltante sin comisiones extra.",
            },
            {
                question: "¿Qué ocurre si llego tarde a la devolución?",
                answer:
                    "Los primeros 60 minutos son gratuitos. Después se cobra un día adicional según la tarifa vigente.",
            },
            {
                question: "¿Puedo añadir conductores adicionales?",
                answer:
                    "Sí, hasta dos conductores adicionales sin coste. Completa sus datos durante la reserva o desde tu cuenta.",
            },
            {
                question: "¿Incluye asistencia en carretera?",
                answer:
                    "Sí, ofrecemos asistencia en carretera 24/7 en toda Rumanía y en los países de la UE cubiertos en el contrato.",
            },
            {
                question: "¿Qué métodos de pago aceptan?",
                answer:
                    "Aceptamos Visa, MasterCard, Apple Pay y transferencia bancaria para reservas corporativas.",
            },
            {
                question: "¿Cómo puedo obtener la factura fiscal?",
                answer:
                    "La factura se genera automáticamente tras la devolución y se envía por correo electrónico. Puedes descargarla en cualquier momento desde la sección Facturas.",
            },
        ],
    },
    fr: {
        pageTitle: "Questions fréquentes DaCars",
        pageDescription: "Réponses claires sur les réservations, la garantie et le support client DaCars.",
        metaTitle: "FAQ DaCars | Support location",
        metaDescription:
            "Obtenez rapidement des réponses sur la modification des réservations, les documents requis, l'assistance routière et les paiements.",
        items: [
            {
                question: "Comment puis-je modifier la période d'une réservation existante ?",
                answer:
                    "Connectez-vous à votre compte DaCars → Mes réservations et utilisez « Modifier les dates ». Notre équipe valide le changement en moins de deux heures ouvrées.",
            },
            {
                question: "Quels documents dois-je présenter lors du retrait du véhicule ?",
                answer:
                    "Présentez votre pièce d'identité, un permis de conduire valide et la carte bancaire utilisée pour la caution.",
            },
            {
                question: "Comment fonctionne la garantie sans dépôt ?",
                answer:
                    "Pour les réservations éligibles, la garantie est couverte par l'assurance étendue DaCars ; aucun montant n'est bloqué sur votre carte.",
            },
            {
                question: "Puis-je prolonger la réservation si j'ai déjà la voiture ?",
                answer:
                    "Oui, tant que le véhicule est disponible dans le calendrier. Prolongez depuis l'application ou en contactant le support DaCars.",
            },
            {
                question: "Quelle est la politique de carburant ?",
                answer:
                    "Les véhicules sont livrés avec le plein et doivent être restitués au même niveau. Seule la différence manquante est facturée, sans frais supplémentaires.",
            },
            {
                question: "Que se passe-t-il en cas de retard à la restitution ?",
                answer:
                    "Les 60 premières minutes sont gratuites. Au-delà, une journée supplémentaire est facturée selon le tarif en vigueur.",
            },
            {
                question: "Puis-je ajouter des conducteurs supplémentaires ?",
                answer:
                    "Oui, jusqu'à deux conducteurs supplémentaires sans frais. Ajoutez leurs données pendant la réservation ou depuis votre compte.",
            },
            {
                question: "L'assistance routière est-elle incluse ?",
                answer:
                    "Oui, nous offrons une assistance routière 24h/24 et 7j/7 en Roumanie et dans les pays de l'UE couverts par le contrat.",
            },
            {
                question: "Quels moyens de paiement acceptez-vous ?",
                answer:
                    "Nous acceptons Visa, MasterCard, Apple Pay et le virement bancaire pour les réservations corporate.",
            },
            {
                question: "Comment obtenir une facture fiscale ?",
                answer:
                    "La facture est générée automatiquement après la restitution et envoyée par e-mail. Vous pouvez la télécharger à tout moment dans la section Factures.",
            },
        ],
    },
    de: {
        pageTitle: "DaCars Häufig gestellte Fragen",
        pageDescription: "Klare Antworten zu Buchungen, Kaution und dem DaCars Kundenservice.",
        metaTitle: "DaCars FAQ | Unterstützung bei der Vermietung",
        metaDescription:
            "Erhalte schnelle Antworten zu Buchungsänderungen, benötigten Dokumenten, Pannenhilfe und Zahlungsmethoden.",
        items: [
            {
                question: "Wie kann ich den Zeitraum einer bestehenden Buchung ändern?",
                answer:
                    "Melde dich in deinem DaCars-Konto an → Meine Buchungen und nutze \"Daten bearbeiten\". Unser Team bestätigt die Änderung innerhalb von zwei Werktstunden.",
            },
            {
                question: "Welche Dokumente muss ich bei der Fahrzeugübernahme vorzeigen?",
                answer:
                    "Bring deinen Ausweis, einen gültigen Führerschein und die für die Kaution verwendete Bankkarte mit.",
            },
            {
                question: "Wie funktioniert die Kaution ohne Hinterlegung?",
                answer:
                    "Bei berechtigten Buchungen wird die Sicherheit durch die erweiterte DaCars-Versicherung abgedeckt, sodass keine Summe auf deiner Karte blockiert wird.",
            },
            {
                question: "Kann ich die Buchung verlängern, wenn ich das Auto bereits übernommen habe?",
                answer:
                    "Ja, solange das Fahrzeug im Kalender verfügbar ist. Verlängere über die App oder kontaktiere den DaCars-Support.",
            },
            {
                question: "Wie lautet die Tankregelung?",
                answer:
                    "Die Fahrzeuge werden mit vollem Tank übergeben und müssen voll zurückgebracht werden. Wir berechnen nur die fehlende Differenz ohne zusätzliche Gebühren.",
            },
            {
                question: "Was passiert, wenn ich bei der Rückgabe zu spät komme?",
                answer:
                    "Die ersten 60 Minuten sind kostenfrei. Danach berechnen wir einen zusätzlichen Tag gemäß der aktuellen Tarifliste.",
            },
            {
                question: "Kann ich zusätzliche Fahrer hinzufügen?",
                answer:
                    "Ja, bis zu zwei zusätzliche Fahrer ohne Aufpreis. Gib ihre Daten während der Buchung oder in deinem Konto an.",
            },
            {
                question: "Ist Pannenhilfe inkludiert?",
                answer:
                    "Ja, wir bieten rund um die Uhr Pannenhilfe in ganz Rumänien und in den im Vertrag abgedeckten EU-Ländern.",
            },
            {
                question: "Welche Zahlungsmethoden akzeptiert ihr?",
                answer:
                    "Wir akzeptieren Visa, MasterCard, Apple Pay und Banküberweisung für Firmenbuchungen.",
            },
            {
                question: "Wie erhalte ich eine steuerliche Rechnung?",
                answer:
                    "Die Rechnung wird nach der Rückgabe automatisch erstellt und per E-Mail verschickt. Du kannst sie jederzeit im Bereich Rechnungen herunterladen.",
            },
        ],
    },
};

type NormalizedFaq = FaqEntry & { id: string };

type NormalizedFaqCategory = {
    id: string;
    name: string;
    description: string | null;
    order: number;
    faqs: NormalizedFaq[];
};

const parseOrderValue = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
};

const isPublishedStatus = (value: unknown): boolean => {
    if (typeof value !== "string") {
        return false;
    }
    return value.trim().toLowerCase() === "published";
};

const toNormalizedFaq = (faq: Faq): NormalizedFaq | null => {
    if (!faq) {
        return null;
    }

    const question = typeof faq.question === "string" ? faq.question.trim() : "";
    const answer = typeof faq.answer === "string" ? faq.answer.trim() : "";

    if (question.length === 0 || answer.length === 0) {
        return null;
    }

    if (faq.status && !isPublishedStatus(faq.status)) {
        return null;
    }

    const idCandidate =
        typeof faq.id === "number" && Number.isFinite(faq.id)
            ? faq.id.toString()
            : typeof faq.id === "string"
                ? faq.id.trim()
                : "";

    const id = idCandidate.length > 0 ? idCandidate : question;

    return { id, question, answer };
};

const toNormalizedCategory = (category: FaqCategory): NormalizedFaqCategory | null => {
    if (!category) {
        return null;
    }

    if (category.status && !isPublishedStatus(category.status)) {
        return null;
    }

    const name = typeof category.name === "string" ? category.name.trim() : "";
    if (name.length === 0) {
        return null;
    }

    const idCandidate =
        typeof category.id === "number" && Number.isFinite(category.id)
            ? category.id.toString()
            : typeof (category as { id?: string }).id === "string"
                ? ((category as { id?: string }).id ?? "").trim()
                : "";

    const description =
        typeof category.description === "string" && category.description.trim().length > 0
            ? category.description.trim()
            : null;

    const order = parseOrderValue(category.order) ?? Number.MAX_SAFE_INTEGER;

    const faqs = Array.isArray(category.faqs) ? category.faqs : [];
    const normalizedFaqs = faqs
        .map((item) => toNormalizedFaq(item))
        .filter((item): item is NormalizedFaq => item !== null);

    if (normalizedFaqs.length === 0) {
        return null;
    }

    return {
        id: idCandidate.length > 0 ? idCandidate : name,
        name,
        description,
        order,
        faqs: normalizedFaqs,
    };
};

const fetchFaqCategories = async (locale: Locale): Promise<NormalizedFaqCategory[]> => {
    try {
        const client = createApiClient();
        client.setLanguage(locale);
        const response = await client.getFaqCategories({
            language: locale,
            include: "faqs",
            status: "published",
            limit: 100,
        });
        const categories = extractList<FaqCategory>(response);
        return categories
            .map((category, index) => {
                const normalized = toNormalizedCategory(category);
                if (!normalized) {
                    return null;
                }
                return { ...normalized, orderIndex: index };
            })
            .filter(
                (category): category is NormalizedFaqCategory & { orderIndex: number } =>
                    category !== null,
            )
            .sort((a, b) => {
                if (a.order !== b.order) {
                    return a.order - b.order;
                }
                return a.orderIndex - b.orderIndex;
            })
            .map(({ orderIndex: _ignored, ...category }) => category);
    } catch (error) {
        console.error("Nu am putut încărca FAQ-urile", error);
        return [];
    }
};

const buildFallbackCategory = (copy: FaqSeoCopy): NormalizedFaqCategory => ({
    id: "fallback",
    name: copy.pageTitle,
    description: copy.pageDescription,
    order: Number.MAX_SAFE_INTEGER,
    faqs: copy.items.map((item, index) => ({
        id: `fallback-${index}`,
        question: item.question,
        answer: item.answer,
    })),
});

const resolveFaqSeo = async () => {
    const locale = await resolveRequestLocale();
    const copy = FAQ_COPY[locale] ?? FAQ_COPY[FALLBACK_LOCALE];
    return { locale, copy };
};

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = await resolveFaqSeo();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/faq",
        hreflangLocales: HREFLANG_LOCALES,
        locale,
        openGraphTitle: copy.metaTitle,
        twitterTitle: copy.metaTitle,
    });
}

const FaqPage = async () => {
    const { locale, copy } = await resolveFaqSeo();
    const categories = await fetchFaqCategories(locale);
    const categoriesToRender =
        categories.length > 0 ? categories : [buildFallbackCategory(copy)];
    const faqItems =
        categories.length > 0
            ? categories.flatMap((category) =>
                  category.faqs.map((item): FaqEntry => ({
                      question: item.question,
                      answer: item.answer,
                  })),
              )
            : copy.items;
    const faqJsonLd = buildFaqJsonLd(
        faqItems.map((item) => ({
            question: item.question,
            answer: extractPlainText(item.answer) || item.answer,
        })),
    );

    return (
        <main className="mx-auto max-w-4xl px-6 py-16">
            {faqJsonLd && <StructuredData data={faqJsonLd} id="faq-structured-data" />}
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">{copy.pageTitle}</h1>
                <p className="mt-4 text-base text-gray-600">{copy.pageDescription}</p>
            </header>

            <section className="space-y-10" aria-label={copy.pageTitle}>
                {categoriesToRender.map((category) => (
                    <article key={category.id} className="space-y-4">
                        <div className="text-left">
                            <h2 className="text-2xl font-semibold text-gray-900">{category.name}</h2>
                            {category.description && (
                                <p className="mt-2 text-base text-gray-600">{category.description}</p>
                            )}
                        </div>
                        <div className="space-y-4">
                            {category.faqs.map((item, index) => (
                                <details
                                    key={`${category.id}-${item.id}`}
                                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                >
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
                                        <div
                                            className="faq-answer-content"
                                            dangerouslySetInnerHTML={{ __html: item.answer }}
                                        />
                                    </div>
                                </details>
                            ))}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
};

export default FaqPage;
