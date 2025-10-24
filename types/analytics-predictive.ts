export type PredictiveForecastPoint = {
    id: number | string;
    month: string;
    category: string;
    predicted_demand: number;
    confidence_level: string | null;
    analysis_factors: string[];
};

export type PredictiveRecommendationLink = {
    href: string;
    label: string;
};

export type PredictiveRecommendationItem = {
    title: string;
    details: string[];
    link: PredictiveRecommendationLink | null;
};

export type PredictiveRecommendations = {
    buy: PredictiveRecommendationItem[];
    sell: PredictiveRecommendationItem[];
};

export type PredictiveContext = {
    summary: string | null;
    opportunities: string[];
    risks: string[];
    actions: string[];
};

export type PredictiveForecastApi = {
    id?: number | string | null;
    month?: string | null;
    period?: string | null;
    label?: string | null;
    category?: string | null;
    segment?: string | null;
    type?: string | null;
    predicted_demand?: number | string | null;
    predictedDemand?: number | string | null;
    demand?: number | string | null;
    value?: number | string | null;
    score?: number | string | null;
    confidence_level?: string | null;
    confidenceLevel?: string | null;
    confidence?: string | null;
    confidenceScore?: string | null;
    analysis_factors?: unknown;
    analysisFactors?: unknown;
    analysis?: unknown;
    drivers?: unknown;
    factors?: unknown;
    rationale?: unknown;
};

export type PredictiveRecommendationsApi = {
    buy?: unknown;
    sell?: unknown;
    cumpara?: unknown;
    vinde?: unknown;
    recommendations?: unknown;
    recomandari?: unknown;
    actions?: unknown;
    sugestii?: unknown;
    suggestions?: unknown;
    fleet?: unknown;
    data?: unknown;
    items?: unknown;
    list?: unknown;
};

export type PredictiveForecastResponse =
    | PredictiveForecastApi[]
    | PredictiveRecommendationsApi
    | Record<string, unknown>
    | null
    | undefined;

export type PredictiveRecommendationsResponse =
    | PredictiveRecommendationsApi
    | PredictiveForecastApi[]
    | Record<string, unknown>
    | null
    | undefined;

export type PredictiveContextApi = {
    summary?: unknown;
    rezumat?: unknown;
    overview?: unknown;
    context?: unknown;
    opportunities?: unknown;
    oportunitati?: unknown;
    growth?: unknown;
    riscuri?: unknown;
    risks?: unknown;
    threats?: unknown;
    actions?: unknown;
    actiuni?: unknown;
    recommendations?: unknown;
    recomandari?: unknown;
    next_steps?: unknown;
};

export type PredictiveContextResponse =
    | PredictiveContextApi
    | PredictiveContextApi[]
    | Record<string, unknown>
    | null
    | undefined;
