export const stripTitleTags = (html?: string | null): string => {
    if (typeof html !== "string") {
        return "";
    }

    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
};
