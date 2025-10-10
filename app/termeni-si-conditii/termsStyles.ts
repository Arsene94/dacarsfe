export const TERMS_CONTENT_CLASSNAME =
    "terms-content space-y-6 text-justify font-dm-sans text-base leading-relaxed text-slate-700";

export const TERMS_CONTENT_STYLE_ID = "terms-content-global-styles";

export const TERMS_CONTENT_STYLES = /* css */ `
.terms-content h1,
.terms-content h2,
.terms-content h3,
.terms-content h4 {
    font-family: var(--font-poppins, var(--font-sans));
    color: #1a3661;
}

.terms-content h1 {
    font-size: 1.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 1.5rem;
}

.terms-content h2 {
    font-size: 1.25rem;
    font-weight: 600;
    text-transform: uppercase;
    margin-top: 1.5rem;
}

.terms-content h3,
.terms-content h4 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-top: 1.25rem;
}

.terms-content p + h2,
.terms-content ul + h2,
.terms-content ol + h2,
.terms-content table + h2 {
    margin-top: 2rem;
}

.terms-content ul,
.terms-content ol {
    margin: 1rem 0 1.5rem 1.5rem;
    padding-left: 1rem;
    display: grid;
    gap: 0.5rem;
}

.terms-content ul {
    list-style: disc;
}

.terms-content ol {
    list-style: decimal;
}

.terms-content li {
    margin-left: 0.5rem;
}

.terms-content a {
    color: #1a3661;
    font-weight: 500;
    text-decoration: underline;
}

.terms-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    background-color: #f1f5f9;
    border-radius: 0.375rem;
    padding: 0.125rem 0.375rem;
    font-size: 0.85em;
}

.terms-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.75rem 0;
    font-size: 0.9375rem;
    overflow: hidden;
    border-radius: 1rem;
}

.terms-content thead th {
    background-color: #f0f5ff;
    color: #1a3661;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.terms-content th,
.terms-content td {
    border: 1px solid rgba(26, 54, 97, 0.12);
    padding: 0.75rem 1rem;
    vertical-align: top;
}

.terms-content tbody tr:nth-child(even) {
    background-color: #f8fbff;
}

@media (max-width: 768px) {
    .terms-content table {
        display: block;
        overflow-x: auto;
        border-radius: 0.75rem;
    }

    .terms-content thead,
    .terms-content tbody,
    .terms-content tr {
        width: 100%;
    }
}
`;
