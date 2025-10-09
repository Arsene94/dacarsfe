import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/meta";

const TERMS_HTML = readFileSync(join(process.cwd(), "docs/terms-si-conditii.html"), "utf8");

export const metadata: Metadata = buildMetadata({
    title: "Termeni și Condiții închiriere auto | DaCars",
    description:
        "Condiții generale contractuale pentru închirierea autovehiculelor DaCars: obligații, garanții, asigurări și modalități de plată.",
    path: "/termeni-si-conditii",
    locale: "ro",
});

const TermsAndConditionsPage = () => {
    return (
        <main className="bg-slate-50 py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-center text-3xl md:text-4xl font-poppins font-bold uppercase text-berkeley tracking-wide">
                    Condiții generale contractuale pentru închiriere autovehicule
                </h1>
                <section className="mt-10 rounded-3xl bg-white p-6 sm:p-10 shadow-xl ring-1 ring-berkeley/5">
                    <div
                        className="terms-content space-y-6 text-justify font-dm-sans text-base leading-relaxed text-slate-700"
                        dangerouslySetInnerHTML={{ __html: TERMS_HTML }}
                    />
                </section>
            </div>
        </main>
    );
};

export default TermsAndConditionsPage;
