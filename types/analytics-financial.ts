export type FinancialSummary = {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    ROI: number;
};

export type FinancialSummaryApi = {
    total_revenue?: number | string | null;
    total_expenses?: number | string | null;
    net_profit?: number | string | null;
    ROI?: number | string | null;
    roi?: number | string | null;
};

export type FinancialCategory = {
    id: number | string;
    name: string;
    revenue: number;
    profit: number;
};

export type FinancialCarRanking = {
    id: number | string;
    name: string;
    revenue: number;
    profit: number;
    roi: number;
};

export type FinancialCategoryApi = {
    id?: number | string | null;
    category_id?: number | string | null;
    category?: string | null;
    name?: string | null;
    label?: string | null;
    revenue?: number | string | null;
    total_revenue?: number | string | null;
    net_revenue?: number | string | null;
    profit?: number | string | null;
    total_profit?: number | string | null;
    net_profit?: number | string | null;
    total_expenses?: number | string | null;
    ROI?: number | string | null;
    roi?: number | string | null;
    car_count?: number | string | null;
};

export type FinancialCarApi = {
    id?: number | string | null;
    car_id?: number | string | null;
    vehicle_id?: number | string | null;
    uuid?: string | null;
    category_id?: number | string | null;
    name?: string | null;
    car_name?: string | null;
    model?: string | null;
    plate?: string | null;
    revenue?: number | string | null;
    profit?: number | string | null;
    total_revenue?: number | string | null;
    total_profit?: number | string | null;
    net_profit?: number | string | null;
    net_revenue?: number | string | null;
    roi?: number | string | null;
    ROI?: number | string | null;
    margin?: number | string | null;
};

export type FinancialCategoriesResponse = {
    categories?: (FinancialCategoryApi | null)[] | null;
    category_breakdown?: (FinancialCategoryApi | null)[] | null;
    breakdown?: (FinancialCategoryApi | null)[] | null;
    items?: (FinancialCategoryApi | null)[] | null;
    data?: (FinancialCategoryApi | null)[] | null;
    cars?: (FinancialCarApi | null)[] | null;
    top_cars?: (FinancialCarApi | null)[] | null;
    vehicles?: (FinancialCarApi | null)[] | null;
    rankings?: (FinancialCarApi | null)[] | null;
};
