import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type FAQItem = {
    question: string;
    answer: ReactNode;
};

type FAQBlockProps = {
    title: string;
    description?: string;
    items: FAQItem[];
    icon?: LucideIcon;
    className?: string;
    itemClassName?: string;
};

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const FAQBlock = ({ title, description, items, icon: Icon, className, itemClassName }: FAQBlockProps) => {
    const sectionSlug = slugify(title);
    const headingId = `${sectionSlug}-heading`;

    return (
        <section aria-labelledby={headingId} className={cn("space-y-6", className)}>
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    {Icon ? (
                        <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-berkeley/10 text-berkeley">
                            <Icon aria-hidden className="h-5 w-5" />
                        </span>
                    ) : null}
                    <div>
                        <h2 id={headingId} className="text-2xl font-semibold text-gray-900">
                            {title}
                        </h2>
                        {description ? <p className="mt-2 text-base text-gray-600">{description}</p> : null}
                    </div>
                </div>
            </div>
            <div className="space-y-5">
                {items.map((item) => (
                    <article
                        key={item.question}
                        className={cn("rounded-xl border border-gray-200 bg-white p-6 shadow-sm", itemClassName)}
                    >
                        <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                        <div className="mt-3 text-base leading-relaxed text-gray-700">{item.answer}</div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default FAQBlock;

