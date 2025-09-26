import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/types/ui";

export type StatusPageAction = {
    label: string;
    icon?: ReactNode;
    variant?: ButtonProps["variant"];
    href?: string;
    onClick?: () => void;
    className?: string;
};

export type StatusPageProps = {
    statusLabel: string;
    title: string;
    description: string;
    icon?: ReactNode;
    actions?: StatusPageAction[];
    children?: ReactNode;
    className?: string;
};

const StatusPage = ({
    statusLabel,
    title,
    description,
    icon,
    actions = [],
    children,
    className,
}: StatusPageProps) => {
    return (
        <section
            className={cn(
                "relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-berkeley/5 via-white to-white px-6 py-20 text-center",
                className,
            )}
        >
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
                {icon ? (
                    <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-berkeley shadow-lg shadow-berkeley/10">
                        {icon}
                    </span>
                ) : null}

                <div className="flex flex-col items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-berkeley/80">
                        {statusLabel}
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">{title}</h1>
                    <p className="max-w-xl text-base text-gray-600 sm:text-lg">{description}</p>
                </div>

                {children ? (
                    <div className="mt-2 flex max-w-xl flex-col gap-3 text-sm text-gray-500 sm:text-base">
                        {children}
                    </div>
                ) : null}

                {actions.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {actions.map((action) => {
                            const key = `${action.label}-${action.href ?? "button"}`;
                            const variant = action.variant ?? "default";
                            const iconNode = action.icon ? (
                                <span className="flex h-5 w-5 items-center justify-center">{action.icon}</span>
                            ) : null;
                            if (action.href) {
                                return (
                                    <Button
                                        key={key}
                                        variant={variant}
                                        className={cn("gap-2", action.className)}
                                        asChild
                                    >
                                        <Link href={action.href} className="inline-flex items-center gap-2">
                                            {iconNode}
                                            <span>{action.label}</span>
                                        </Link>
                                    </Button>
                                );
                            }

                            return (
                                <Button
                                    key={key}
                                    variant={variant}
                                    className={cn("gap-2", action.className)}
                                    onClick={action.onClick}
                                    type="button"
                                >
                                    {iconNode}
                                    <span>{action.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </section>
    );
};

export default StatusPage;
