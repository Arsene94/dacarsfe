export type PredictiveForecastPoint = {
    id: number | string;
    month: string;
    category: string;
    predicted_demand: number;
};

export type PredictiveRecommendations = {
    buy: string[];
    sell: string[];
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
