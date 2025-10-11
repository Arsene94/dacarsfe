export type InterlinkTone = "primary" | "secondary" | "accent" | "outline";

export type InterlinkingLink = {
    href: string;
    label: string;
    description?: string;
    tone?: InterlinkTone;
};

export type InterlinkingCopy = {
    title: { main: string; highlight: string };
    description: string;
    ariaLabel: string;
    linkPrefix: string;
    linkCta: string;
    links: InterlinkingLink[];
};
