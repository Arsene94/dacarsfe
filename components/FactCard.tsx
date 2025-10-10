import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FactCardProps = {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children?: ReactNode;
    className?: string;
};

const FactCard = ({ title, description, icon: Icon, children, className }: FactCardProps) => {
    return (
        <article
            className={cn(
                "flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
                className,
            )}
        >
            <div className="flex items-start gap-3">
                {Icon ? (
                    <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-berkeley/10 text-berkeley">
                        <Icon aria-hidden className="h-5 w-5" />
                    </span>
                ) : null}
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            {description ? <p className="text-base leading-relaxed text-gray-700">{description}</p> : null}
            {children ? (
                <div className="space-y-3 text-base leading-relaxed text-gray-700">{children}</div>
            ) : null}
        </article>
    );
};

export default FactCard;

