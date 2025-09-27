import type { JsonLd } from "@/lib/seo/jsonld";

type StructuredDataProps = {
    data: JsonLd | JsonLd[];
    id?: string;
};

const serialize = (data: JsonLd | JsonLd[]): string | null => {
    try {
        return JSON.stringify(data);
    } catch (error) {
        console.error("Nu s-a putut serializa JSON-LD", error);
        return null;
    }
};

const StructuredData = ({ data, id }: StructuredDataProps) => {
    if (!data) {
        return null;
    }

    const payload = serialize(data);

    if (!payload) {
        return null;
    }

    return (
        <script
            id={id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: payload }}
            suppressHydrationWarning
        />
    );
};

export default StructuredData;
