"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InterlinkTone, InterlinkingCopy, InterlinkingLink } from "@/types/interlinking";
import { useLocaleHref } from "@/lib/i18n/useLocaleHref";

export type { InterlinkTone, InterlinkingCopy, InterlinkingLink } from "@/types/interlinking";

export type InterlinkingSectionProps = {
    copy: InterlinkingCopy;
    className?: string;
};

const toneClassMap: Record<InterlinkTone, string> = {
    primary: "border-berkeley text-berkeley hover:bg-berkeley hover:text-white",
    accent: "border-jade text-jade hover:bg-jade hover:text-white",
    secondary: "border-berkeley/20 text-berkeley hover:border-berkeley hover:bg-berkeley/5",
    outline: "border-gray-200 text-gray-700 hover:bg-gray-100",
};

const InterlinkingSection = ({ copy, className }: InterlinkingSectionProps) => {
    const buildLocaleHref = useLocaleHref();
    const links = Array.isArray(copy.links)
        ? copy.links.filter((item) => item.href?.trim() && item.label?.trim())
        : [];

    if (links.length === 0) {
        return null;
    }

    return (
        <section className={cn("bg-white py-16 h-full min-h-[220px]", className)}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-12 max-w-3xl text-center">
                    <h2 className="text-4xl font-poppins font-bold text-berkeley">
                        {copy.title.main} <span className="text-jade">{copy.title.highlight}</span>
                    </h2>
                    <p className="mt-4 text-lg font-dm-sans text-gray-600">{copy.description}</p>
                </div>

                <nav aria-label={copy.ariaLabel}>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {links.map((link) => {
                            const tone = link.tone ?? "primary";
                            const toneClasses = toneClassMap[tone] ?? toneClassMap.primary;
                            const shouldInvertContent = tone === "primary" || tone === "accent";

                            return (
                                <Link
                                    key={`${link.href}-${link.label}`}
                                    href={buildLocaleHref(link.href ?? "#")}
                                    className={cn(
                                        "group flex h-full min-h-[220px] flex-col justify-between rounded-3xl border bg-white p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                                        toneClasses,
                                    )}
                                    aria-label={link.label}
                                >
                                    <div>
                                        <p
                                            className={cn(
                                                "text-sm font-dm-sans uppercase tracking-wider text-berkeley/70",
                                                shouldInvertContent && "group-hover:text-white",
                                            )}
                                        >
                                            {copy.linkPrefix}
                                        </p>
                                        <h3 className="mt-2 text-xl font-poppins font-semibold">{link.label}</h3>
                                        {link.description && (
                                            <p
                                                className={cn(
                                                    "mt-3 text-sm font-dm-sans text-gray-600",
                                                    shouldInvertContent && "group-hover:text-white",
                                                )}
                                            >
                                                {link.description}
                                            </p>
                                        )}
                                    </div>
                                    <span className="mt-6 inline-flex items-center text-sm font-semibold">
                                        {copy.linkCta}
                                        <ArrowUpRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </section>
    );
};

export default InterlinkingSection;
