import { extractItem, extractList } from "@/lib/apiResponse";
import { mapCarSearchFilters } from "@/lib/mapFilters";
import { toQuery } from "@/lib/qs";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import type { WidgetActivityResponse } from "@/types/activity";
import type {
    ActivityRecord,
    ActivityListParams,
    ActivityPayload,
    ActivityUpdatePayload,
    ActivityWeeklySummary,
    ActivityWeeklySummaryDispatchPayload,
    ActivityWeeklySummaryDispatchResponse,
    ActivityWeeklySummaryParams,
    ActivityMarkPaidPayload,
    ActivityMarkPaidResponse,
} from "@/types/activity-tracking";
import type { ActivityLog, ActivityLogListParams } from "@/types/activity-log";
import { ensureUser } from "@/types/auth";
import type {
    AdminLoginPayload,
    AdminRegisterPayload,
    AuthResponse,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    User,
} from "@/types/auth";
import type {
    AdminBookingResource,
    AdminExpiringCarDocumentsParams,
    AdminExpiringDocumentCar,
    BookingContractResponse,
    CategoryPrice,
    CategoryPriceCalendar,
    CustomerPhoneSearchResult,
    DynamicPrice,
} from "@/types/admin";
import type {
    ApiItemResult,
    ApiListResult,
    ApiMessageResponse,
    ApiDeleteResponse,
    LookupRecord,
    UnknownRecord,
} from "@/types/api";
import type {
    ApiCar,
    CarAvailabilityResponse,
    CarCategory,
    CarFilterParams,
    CarSearchUiPayload,
    CarSyncCategoriesPayload,
    CarSyncColorsPayload,
    CarTranslation,
} from "@/types/car";
import type {
    CarCashflowListParams,
    CarCashflowPayload,
    CarCashflowRecord,
} from "@/types/car-cashflow";
import type {
    BlogCategory,
    BlogCategoryListParams,
    BlogCategoryPayload,
    BlogCategoryTranslation,
    BlogCategoryTranslationPayload,
    BlogPost,
    BlogPostListParams,
    BlogPostPayload,
    BlogPostTranslation,
    BlogPostTranslationPayload,
    BlogTag,
    BlogTagListParams,
    BlogTagPayload,
} from "@/types/blog";
import type {
    Coupon,
    CouponListParams,
    CouponPayload,
    CouponQuickValidationParams,
    CouponQuickValidationResponse,
} from "@/types/coupon";
import type { Expense, ExpenseListParams, ExpensePayload } from "@/types/expense";
import type {
    Faq,
    FaqCategory,
    FaqCategoryListParams,
    FaqCategoryPayload,
    FaqCategoryTranslation,
    FaqCategoryTranslationPayload,
    FaqListParams,
    FaqPayload,
    FaqTranslation,
    FaqTranslationPayload,
} from "@/types/faq";
import type {
    MailBrandingResponse,
    MailBrandingUpdatePayload,
    MailTemplateAttachmentsResponse,
    MailTemplateDetailResponse,
    MailTemplateUpdatePayload,
    MailTemplatesResponse,
} from "@/types/mail";
import type {
    AvailabilityCheckPayload,
    AvailabilityCheckResponse,
    DiscountValidationPayload,
    DiscountValidationResponse,
    QuotePricePayload,
    QuotePriceResponse,
    ReservationPayload,
    Service,
    ServiceListParams,
    ServicePayload,
    ServiceTranslation,
} from "@/types/reservation";
import type { Role } from "@/types/roles";
import type { Offer, OfferListParams, OfferPayload } from "@/types/offer";
import type {
    Customer,
    CustomerAuthResponse,
    CustomerForgotPasswordPayload,
    CustomerLoginPayload,
    CustomerProfileResponse,
    CustomerRegisterPayload,
    CustomerResetPasswordPayload,
    CustomerVerifyPayload,
} from "@/types/customer";
import type {
    ServiceReport,
    ServiceReportListParams,
    ServiceReportPayload,
} from "@/types/service-report";
import type { Tax, TaxListParams, TaxPayload, TaxTranslation } from "@/types/tax";
import type {
    AdminBookingsTodayMetrics,
    AdminBookingsTodayParams,
    AdminBookingsTotalMetrics,
    AdminBookingsTotalParams,
    AdminCarsTotalMetrics,
    AdminCarsTotalParams,
} from "@/types/metrics";
import type {
    AdminReportAnnualParams,
    AdminReportAnnualResponse,
    AdminReportMonthlyParams,
    AdminReportMonthlyResponse,
    AdminReportOverviewParams,
    AdminReportOverviewResponse,
    AdminReportQuarterlyParams,
    AdminReportQuarterlyResponse,
    AdminReportWeeklyParams,
    AdminReportWeeklyResponse,
} from "@/types/reports";
import type {
    WheelOfFortunePeriod,
    WheelOfFortunePrizePayload,
    WheelOfFortunePrizeWinner,
    WheelPrize,
} from "@/types/wheel";

type CategoryPriceCalendarPayload = Omit<
    CategoryPriceCalendar,
    "id" | "created_at" | "updated_at"
>;

type DynamicPricePayload = Pick<
    DynamicPrice,
    "start_from" | "end_to" | "enabled" | "percentages"
>;

type UserPayload = {
    first_name?: string;
    last_name?: string;
    email?: string;
    username?: string;
    password?: string;
    roles?: string[];
    super_user?: boolean;
    manage_supers?: boolean;
    avatar?: number | string | null;
} & Record<string, unknown>;

type RolePayload = {
    slug?: string;
    name?: string;
    description?: string | null;
    is_default?: number | boolean;
    permissions?: string[];
} & Record<string, unknown>;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const FORBIDDEN_EVENT = "dacars:api:forbidden";
const FORBIDDEN_MESSAGE = "Forbidden";

type ApiError = Error & { status?: number };

const sanitizePayload = <T extends object>(payload: T): Partial<T> => {
    const cleaned: Partial<T> = {};
    (Object.entries(payload) as [keyof T, T[keyof T]][]).forEach(([key, value]) => {
        if (typeof value !== "undefined") {
            cleaned[key] = value;
        }
    });
    return cleaned;
};

const resolveIncludeParam = (include?: string | readonly string[]): string | null => {
    if (!include) {
        return null;
    }

    if (Array.isArray(include)) {
        const normalized = include
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((value) => value.length > 0);

        if (normalized.length === 0) {
            return null;
        }

        return Array.from(new Set(normalized)).join(",");
    }

    if (typeof include === "string") {
        const trimmed = include.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    return null;
};

const appendOptionalLanguage = (basePath: string, language?: string | null): string => {
    if (typeof language !== "string") {
        return basePath;
    }

    const trimmed = language.trim();
    if (trimmed.length === 0) {
        return basePath;
    }

    return `${basePath}/${encodeURIComponent(trimmed)}`;
};

export class ApiClient {
    private baseURL: string;
    private token: string | null = null;
    private language: string | null = DEFAULT_LOCALE;

    constructor(baseURL: string) {
        this.baseURL = baseURL;

        // Get token from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
        }
    }

    setLanguage(language: string | null) {
        if (typeof language === 'string') {
            const trimmed = language.trim();
            if (trimmed.length > 0) {
                this.language = trimmed;
                return;
            }
        }
        this.language = DEFAULT_LOCALE;
    }

    getLanguage(): string | null {
        return this.language;
    }

    private resolveLanguage(language?: string | null): string | null {
        if (typeof language === 'string') {
            const trimmed = language.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }

        if (typeof this.language === 'string') {
            const trimmed = this.language.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }

        return null;
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
    }

    removeToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token_expires_at');
        }
    }

    private notifyForbidden(message?: string) {
        if (typeof window === 'undefined') {
            return;
        }

        const detail =
            typeof message === 'string' && message.trim().length > 0
                ? message
                : FORBIDDEN_MESSAGE;

        window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT, { detail }));
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const isFormData =
            typeof FormData !== 'undefined' && options.body instanceof FormData;

        const headers: Record<string, string> = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
            'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        };

        const applyHeaders = (source?: HeadersInit) => {
            if (!source) return;
            if (source instanceof Headers) {
                source.forEach((value, key) => {
                    headers[key] = value;
                });
                return;
            }
            if (Array.isArray(source)) {
                source.forEach(([key, value]) => {
                    headers[key] = value;
                });
                return;
            }
            Object.entries(source).forEach(([key, value]) => {
                if (typeof value !== 'undefined') {
                    headers[key] = String(value);
                }
            });
        };

        applyHeaders(options.headers);

        const config: RequestInit = {
            ...options,
            credentials: options.credentials ?? 'omit',
            headers,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                let errorData: unknown = null;

                try {
                    const errorContentType = response.headers.get('content-type');
                    if (errorContentType?.includes('application/json')) {
                        errorData = await response.json();
                        if (
                            typeof errorData === 'object' &&
                            errorData !== null &&
                            'message' in errorData &&
                            typeof (errorData as { message: unknown }).message === 'string'
                        ) {
                            const normalizedMessage = (errorData as { message: string }).message.trim();
                            if (normalizedMessage.length > 0) {
                                errorMessage = normalizedMessage;
                                (errorData as { message: string }).message = normalizedMessage;
                            }
                        }
                    } else {
                        errorMessage = response.statusText || errorMessage;
                    }
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }

                if (
                    response.status === 403 &&
                    ((typeof errorData === 'object' && errorData !== null && 'message' in errorData && (errorData as { message?: unknown }).message === FORBIDDEN_MESSAGE) ||
                        errorMessage === FORBIDDEN_MESSAGE)
                ) {
                    this.notifyForbidden(errorMessage);
                }

                const apiError: ApiError = new Error(errorMessage);
                apiError.status = response.status;
                throw apiError;
            }

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json();
            }
            if (contentType?.includes('application/pdf')) {
                return await response.blob() as T;
            }
            return {} as T;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getCars(params: {
        limit?: number;
        page?: number;
        perPage?: number;
        search?: string;
        start_date?: string;
        end_date?: string;
        language?: string;
    } = {}): Promise<ApiListResult<ApiCar>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value.toString());
            }
        });
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/cars`, this.resolveLanguage(language));
        return this.request<ApiListResult<ApiCar>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getHomePageCars(params: {
        limit?: number;
        page?: number;
        perPage?: number;
        language?: string;
        status?: string;
    } = {}): Promise<ApiListResult<ApiCar>> {
        const { language, ...filters } = params || {};
        const searchParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value.toString());
            }
        });

        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/cars`, this.resolveLanguage(language));
        return this.request<ApiListResult<ApiCar>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );

    }

    async getCarsByDateCriteria(
        uiPayload: CarSearchUiPayload,
        language?: string,
    ): Promise<ApiListResult<ApiCar>> {
        const mapped: CarFilterParams = mapCarSearchFilters(uiPayload);
        const query = toQuery(mapped);
        const basePath = appendOptionalLanguage(`/cars`, this.resolveLanguage(language));
        return this.request<ApiListResult<ApiCar>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getCar(
        id: number | string,
        params: (CarFilterParams & { include?: string | readonly string[]; language?: string }) = {},
    ): Promise<ApiItemResult<ApiCar>> {
        const { language, include, ...filters } = params;
        const query = toQuery(filters);
        const searchParams = new URLSearchParams(query);
        const includeValue = resolveIncludeParam(include);
        if (includeValue) {
            searchParams.set('include', includeValue);
        }
        const finalQuery = searchParams.toString();
        const basePath = appendOptionalLanguage(`/cars/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<ApiCar>>(
            finalQuery.length > 0 ? `${basePath}?${finalQuery}` : basePath,
        );
    }

    async getCarAvailability(
        id: number | string,
        params: (CarFilterParams & { language?: string }) = {},
    ): Promise<CarAvailabilityResponse> {
        const { language, ...filters } = params;
        const query = toQuery(filters);
        const basePath = appendOptionalLanguage(`/cars/${id}/availability`, this.resolveLanguage(language));
        return this.request<CarAvailabilityResponse>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async createCar(payload: Record<string, unknown> | FormData): Promise<ApiItemResult<UnknownRecord>> {
        if (typeof FormData !== 'undefined' && payload instanceof FormData) {
            return this.request<ApiItemResult<UnknownRecord>>(`/cars`, {
                method: 'POST',
                body: payload,
            });
        }

        const cleanPayload = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
        return this.request<ApiItemResult<UnknownRecord>>(`/cars`, {
            method: 'POST',
            body: JSON.stringify(cleanPayload),
        });
    }

    async updateCar(id: number, payload: Record<string, unknown> | FormData): Promise<ApiItemResult<UnknownRecord>> {
        if (typeof FormData !== 'undefined' && payload instanceof FormData) {
            return this.request<ApiItemResult<UnknownRecord>>(`/cars/${id}`, {
                method: 'PUT',
                body: payload,
            });
        }

        const cleanPayload = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
        return this.request<ApiItemResult<UnknownRecord>>(`/cars/${id}`, {
            method: 'PUT',
            body: JSON.stringify(cleanPayload),
        });
    }

    async deleteCar(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/cars/${id}`, {
            method: 'DELETE',
        });
    }

    async syncCarCategories(
        id: number | string,
        payload: CarSyncCategoriesPayload,
    ): Promise<UnknownRecord> {
        const body = sanitizePayload(payload);
        return this.request<UnknownRecord>(`/cars/${id}/sync-categories`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async syncCarColors(id: number | string, payload: CarSyncColorsPayload): Promise<UnknownRecord> {
        const body = sanitizePayload(payload);
        return this.request<UnknownRecord>(`/cars/${id}/sync-colors`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async getCarTranslations(id: number | string): Promise<CarTranslation[]> {
        const response = await this.request<CarTranslation[] | ApiListResult<CarTranslation>>(
            `/cars/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<CarTranslation>(response);
    }

    async upsertCarTranslation(
        id: number | string,
        lang: string,
        payload: Partial<CarTranslation>,
    ): Promise<CarTranslation> {
        const { lang_code: _ignored, ...rest } = payload;
        const body = sanitizePayload(rest);
        const language = encodeURIComponent(lang.trim());
        return this.request<CarTranslation>(`/cars/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/cars/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getCarMakes(params: {
        search?: string;
        limit?: number;
        language?: string;
    } = {}): Promise<ApiListResult<LookupRecord>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.append('search', filters.search);
        if (filters.limit) searchParams.append('limit', filters.limit.toString());
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/car-makes`, this.resolveLanguage(language));
        return this.request<ApiListResult<LookupRecord>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getCarMake(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<LookupRecord>> {
        const basePath = appendOptionalLanguage(`/car-makes/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<LookupRecord>>(basePath);
    }

    async createCarMake(payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-makes`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateCarMake(id: number | string, payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-makes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarMake(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/car-makes/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarMakeTranslations(id: number | string): Promise<UnknownRecord[]> {
        const response = await this.request<UnknownRecord[] | ApiListResult<UnknownRecord>>(
            `/car-makes/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<UnknownRecord>(response);
    }

    async upsertCarMakeTranslation(
        id: number | string,
        lang: string,
        payload: Record<string, unknown>,
    ): Promise<UnknownRecord> {
        const body = sanitizePayload(payload);
        const language = encodeURIComponent(lang.trim());
        return this.request<UnknownRecord>(`/car-makes/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarMakeTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/car-makes/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getCarTypes(params: {
        search?: string;
        limit?: number;
        language?: string;
    } = {}): Promise<ApiListResult<LookupRecord>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.append('search', filters.search);
        if (filters.limit) searchParams.append('limit', filters.limit.toString());
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/car-types`, this.resolveLanguage(language));
        return this.request<ApiListResult<LookupRecord>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getCarType(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<LookupRecord>> {
        const basePath = appendOptionalLanguage(`/car-types/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<LookupRecord>>(basePath);
    }

    async createCarType(payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-types`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateCarType(id: number | string, payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-types/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarType(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/car-types/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarTypeTranslations(id: number | string): Promise<UnknownRecord[]> {
        const response = await this.request<UnknownRecord[] | ApiListResult<UnknownRecord>>(
            `/car-types/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<UnknownRecord>(response);
    }

    async upsertCarTypeTranslation(
        id: number | string,
        lang: string,
        payload: Record<string, unknown>,
    ): Promise<UnknownRecord> {
        const body = sanitizePayload(payload);
        const language = encodeURIComponent(lang.trim());
        return this.request<UnknownRecord>(`/car-types/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarTypeTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/car-types/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getCarTransmissions(params: {
        search?: string;
        limit?: number;
        language?: string;
    } = {}): Promise<ApiListResult<LookupRecord>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.append('search', filters.search);
        if (filters.limit) searchParams.append('limit', filters.limit.toString());
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/car-transmissions`, this.resolveLanguage(language));
        return this.request<ApiListResult<LookupRecord>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getCarTransmission(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<LookupRecord>> {
        const basePath = appendOptionalLanguage(`/car-transmissions/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<LookupRecord>>(basePath);
    }

    async createCarTransmission(payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-transmissions`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateCarTransmission(id: number | string, payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-transmissions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarTransmission(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/car-transmissions/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarTransmissionTranslations(id: number | string): Promise<UnknownRecord[]> {
        const response = await this.request<UnknownRecord[] | ApiListResult<UnknownRecord>>(
            `/car-transmissions/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<UnknownRecord>(response);
    }

    async upsertCarTransmissionTranslation(
        id: number | string,
        lang: string,
        payload: Record<string, unknown>,
    ): Promise<UnknownRecord> {
        const body = sanitizePayload(payload);
        const language = encodeURIComponent(lang.trim());
        return this.request<UnknownRecord>(`/car-transmissions/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarTransmissionTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/car-transmissions/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getCarFuels(params: {
        search?: string;
        limit?: number;
        language?: string;
    } = {}): Promise<ApiListResult<LookupRecord>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.append('search', filters.search);
        if (filters.limit) searchParams.append('limit', filters.limit.toString());
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/car-fuels`, this.resolveLanguage(language));
        return this.request<ApiListResult<LookupRecord>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getCarFuel(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<LookupRecord>> {
        const basePath = appendOptionalLanguage(`/car-fuels/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<LookupRecord>>(basePath);
    }

    async createCarFuel(payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-fuels`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateCarFuel(id: number | string, payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-fuels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarFuel(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/car-fuels/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarFuelTranslations(id: number | string): Promise<UnknownRecord[]> {
        const response = await this.request<UnknownRecord[] | ApiListResult<UnknownRecord>>(
            `/car-fuels/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<UnknownRecord>(response);
    }

    async upsertCarFuelTranslation(
        id: number | string,
        lang: string,
        payload: Record<string, unknown>,
    ): Promise<UnknownRecord> {
        const body = sanitizePayload(payload);
        const language = encodeURIComponent(lang.trim());
        return this.request<UnknownRecord>(`/car-fuels/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarFuelTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/car-fuels/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getCarCategories(params: {
        search?: string;
        limit?: number;
        language?: string;
    } = {}): Promise<ApiListResult<CarCategory>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.append('search', filters.search);
        if (filters.limit || filters.limit === 0) {
            searchParams.append('limit', (filters.limit ?? 0).toString());
        } else {
            searchParams.append('limit', '100');
        }
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/car-categories`, this.resolveLanguage(language));
        return this.request<ApiListResult<CarCategory>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getCarCategory(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<CarCategory>> {
        const basePath = appendOptionalLanguage(`/car-categories/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<CarCategory>>(basePath);
    }

    async getCarColors(params: {
        search?: string;
        limit?: number;
        language?: string;
    } = {}): Promise<ApiListResult<LookupRecord>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.append('search', filters.search);
        if (filters.limit) searchParams.append('limit', filters.limit.toString());
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/car-colors`, this.resolveLanguage(language));
        return this.request<ApiListResult<LookupRecord>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getCarColor(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<LookupRecord>> {
        const basePath = appendOptionalLanguage(`/car-colors/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<LookupRecord>>(basePath);
    }

    async createCarColor(payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-colors`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateCarColor(id: number | string, payload: Record<string, unknown>): Promise<ApiItemResult<LookupRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<LookupRecord>>(`/car-colors/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarColor(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/car-colors/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarColorTranslations(id: number | string): Promise<UnknownRecord[]> {
        const response = await this.request<UnknownRecord[] | ApiListResult<UnknownRecord>>(
            `/car-colors/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<UnknownRecord>(response);
    }

    async upsertCarColorTranslation(
        id: number | string,
        lang: string,
        payload: Record<string, unknown>,
    ): Promise<UnknownRecord> {
        const body = sanitizePayload(payload);
        const language = encodeURIComponent(lang.trim());
        return this.request<UnknownRecord>(`/car-colors/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarColorTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/car-colors/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getUsers(
        params: {
            search?: string;
            page?: number;
            perPage?: number;
            limit?: number;
            roles?: string | string[];
            includeRoles?: boolean;
            sort?: string;
        } = {},
    ): Promise<ApiListResult<User>> {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.perPage) searchParams.append('per_page', params.perPage.toString());
        if (typeof params.limit !== 'undefined') {
            searchParams.append('limit', params.limit.toString());
        }
        if (params.roles) {
            const values = Array.isArray(params.roles)
                ? params.roles
                : [params.roles];
            const key = Array.isArray(params.roles) ? 'roles[]' : 'roles';
            values
                .filter((role): role is string => typeof role === 'string' && role.length > 0)
                .forEach((role) => {
                    searchParams.append(key, role);
                });
        }
        if (params.includeRoles) {
            searchParams.append('include', 'roles');
        }
        if (params.sort) {
            searchParams.append('sort', params.sort);
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<User>>(
            `/users${query ? `?${query}` : ''}`,
        );
    }

    async getUser(
        id: number | string,
        params: { includeRoles?: boolean } = {},
    ): Promise<ApiItemResult<User>> {
        const searchParams = new URLSearchParams();
        if (params.includeRoles) {
            searchParams.append('include', 'roles');
        }
        const query = searchParams.toString();
        return this.request<ApiItemResult<User>>(
            `/users/${id}${query ? `?${query}` : ''}`,
        );
    }

    async createUser(payload: UserPayload): Promise<ApiItemResult<User>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<User>>(`/users`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateUser(id: number | string, payload: UserPayload): Promise<ApiItemResult<User>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<User>>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async makeUserSuper(id: number | string): Promise<ApiMessageResponse> {
        return this.request<ApiMessageResponse>(`/users/${id}/super`, {
            method: 'POST',
        });
    }

    async removeUserSuper(id: number | string): Promise<ApiMessageResponse> {
        return this.request<ApiMessageResponse>(`/users/${id}/super`, {
            method: 'DELETE',
        });
    }

    async deleteUser(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/users/${id}`, {
            method: 'DELETE',
        });
    }

    async getActivityLogs(
        params: ActivityLogListParams = {},
    ): Promise<ApiListResult<ActivityLog>> {
        const searchParams = new URLSearchParams();
        if (typeof params.page === 'number' && Number.isFinite(params.page) && params.page > 0) {
            searchParams.append('page', params.page.toString());
        }
        if (
            typeof params.perPage === 'number' &&
            Number.isFinite(params.perPage) &&
            params.perPage > 0
        ) {
            searchParams.append('per_page', params.perPage.toString());
        }
        if (params.search && params.search.trim().length > 0) {
            searchParams.append('search', params.search.trim());
        }
        if (params.userId !== null && typeof params.userId !== 'undefined' && params.userId !== '') {
            searchParams.append('user_id', String(params.userId));
        }
        if (params.action && params.action.trim().length > 0) {
            searchParams.append('action', params.action.trim());
        }
        if (params.from && params.from.trim().length > 0) {
            searchParams.append('from', params.from.trim());
        }
        if (params.to && params.to.trim().length > 0) {
            searchParams.append('to', params.to.trim());
        }
        if (params.sort === 'oldest') {
            searchParams.append('sort', 'oldest');
        } else if (params.sort === 'latest') {
            searchParams.append('sort', 'latest');
        }

        const query = searchParams.toString();
        return this.request<ApiListResult<ActivityLog>>(
            `/activity-logs${query ? `?${query}` : ''}`,
        );
    }

    async getRoles(
        params: {
            page?: number;
            perPage?: number;
            includePermissions?: boolean;
        } = {},
    ): Promise<ApiListResult<Role>> {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.perPage) searchParams.append('per_page', params.perPage.toString());
        if (params.includePermissions) {
            searchParams.append('include', 'permissions');
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<Role>>(
            `/roles${query ? `?${query}` : ''}`,
        );
    }

    async getRole(
        id: number | string,
        params: { includePermissions?: boolean } = {},
    ): Promise<ApiItemResult<Role>> {
        const searchParams = new URLSearchParams();
        if (params.includePermissions) {
            searchParams.append('include', 'permissions');
        }
        const query = searchParams.toString();
        return this.request<ApiItemResult<Role>>(
            `/roles/${id}${query ? `?${query}` : ''}`,
        );
    }

    async createRole(payload: RolePayload): Promise<ApiItemResult<Role>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Role>>(`/roles`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateRole(id: number | string, payload: RolePayload): Promise<ApiItemResult<Role>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Role>>(`/roles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteRole(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/roles/${id}`, {
            method: 'DELETE',
        });
    }

    async getPermissionGroups(): Promise<unknown> {
        return this.request<unknown>(`/permissions/grouped`);
    }

    async getCarForBooking(
        params: CarSearchUiPayload & { car_id: number | string },
        language?: string,
    ): Promise<CarAvailabilityResponse> {
        const mapped = mapCarSearchFilters(params);
        const query = toQuery(mapped);
        const basePath = appendOptionalLanguage(
            `/cars/${params.car_id}/info-for-booking`,
            this.resolveLanguage(language),
        );
        const suffix = query ? `?${query}` : "";
        return this.request<CarAvailabilityResponse>(`${basePath}${suffix}`);
    }

    async getServices(
        params: (ServiceListParams & { language?: string }) = {},
    ): Promise<ApiListResult<Service>> {
        const { language, ...rest } = params;
        const filters = rest as ServiceListParams;
        const searchParams = new URLSearchParams();
        if (typeof filters.page === 'number' && Number.isFinite(filters.page)) {
            searchParams.append('page', filters.page.toString());
        }
        const perPageCandidate =
            typeof filters.perPage === 'number' && Number.isFinite(filters.perPage)
                ? filters.perPage
                : typeof (filters as { per_page?: number }).per_page === 'number'
                    ? (filters as { per_page: number }).per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
            searchParams.append('limit', filters.limit.toString());
        }
        if (typeof filters.status === 'string' && filters.status.trim().length > 0) {
            searchParams.append('status', filters.status.trim());
        }
        if (typeof filters.name_like === 'string' && filters.name_like.trim().length > 0) {
            searchParams.append('name_like', filters.name_like.trim());
        }
        if (typeof filters.include === 'string' && filters.include.trim().length > 0) {
            searchParams.append('include', filters.include.trim());
        }
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/services`, this.resolveLanguage(language));
        return this.request<ApiListResult<Service>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getService(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<Service>> {
        const basePath = appendOptionalLanguage(`/services/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<Service>>(basePath);
    }

    async createService(payload: ServicePayload): Promise<ApiItemResult<Service>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Service>>(`/services`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateService(id: number | string, payload: ServicePayload): Promise<ApiItemResult<Service>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Service>>(`/services/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteService(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/services/${id}`, {
            method: 'DELETE',
        });
    }

    async getServiceTranslations(id: number | string): Promise<ServiceTranslation[]> {
        const response = await this.request<ServiceTranslation[] | ApiListResult<ServiceTranslation>>(
            `/services/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<ServiceTranslation>(response);
    }

    async upsertServiceTranslation(
        id: number | string,
        lang: string,
        payload: Partial<ServiceTranslation>,
    ): Promise<ServiceTranslation> {
        const { lang_code: _ignored, ...rest } = payload;
        const body = sanitizePayload(rest);
        const language = encodeURIComponent(lang.trim());
        return this.request<ServiceTranslation>(`/services/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteServiceTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/services/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getFaqCategories(
        params: (FaqCategoryListParams & { language?: string }) = {},
    ): Promise<ApiListResult<FaqCategory>> {
        const { language, include, ...filters } = params;
        const searchParams = new URLSearchParams();

        if (typeof filters.page === 'number' && Number.isFinite(filters.page)) {
            searchParams.append('page', filters.page.toString());
        }

        const perPageCandidate =
            typeof filters.perPage === 'number' && Number.isFinite(filters.perPage)
                ? filters.perPage
                : typeof filters.per_page === 'number' && Number.isFinite(filters.per_page)
                    ? filters.per_page
                    : undefined;

        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }

        if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
            searchParams.append('limit', filters.limit.toString());
        }

        if (typeof filters.status === 'string' && filters.status.trim().length > 0) {
            searchParams.append('status', filters.status.trim());
        }

        if (typeof filters.order === 'string' && filters.order.trim().length > 0) {
            searchParams.append('order', filters.order.trim());
        }

        if (typeof filters.name_like === 'string' && filters.name_like.trim().length > 0) {
            searchParams.append('name_like', filters.name_like.trim());
        }

        const includeParam = resolveIncludeParam(include);
        if (includeParam) {
            searchParams.append('include', includeParam);
        }

        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/faq-categories`, this.resolveLanguage(language));
        return this.request<ApiListResult<FaqCategory>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getFaqCategory(
        id: number | string,
        params: { include?: string | readonly string[]; language?: string } = {},
    ): Promise<ApiItemResult<FaqCategory>> {
        const { include, language } = params;
        const includeParam = resolveIncludeParam(include);
        const suffix = includeParam ? `?include=${includeParam}` : '';
        const basePath = appendOptionalLanguage(`/faq-categories/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<FaqCategory>>(`${basePath}${suffix}`);
    }

    async createFaqCategory(payload: FaqCategoryPayload): Promise<ApiItemResult<FaqCategory>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<FaqCategory>>(`/faq-categories`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateFaqCategory(
        id: number | string,
        payload: FaqCategoryPayload,
    ): Promise<ApiItemResult<FaqCategory>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<FaqCategory>>(`/faq-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteFaqCategory(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/faq-categories/${id}`, {
            method: 'DELETE',
        });
    }

    async getFaqCategoryTranslations(id: number | string): Promise<FaqCategoryTranslation[]> {
        const response = await this.request<
            FaqCategoryTranslation[] | ApiListResult<FaqCategoryTranslation>
        >(`/faq-categories/${id}/translations`);
        return Array.isArray(response) ? response : extractList<FaqCategoryTranslation>(response);
    }

    async upsertFaqCategoryTranslation(
        id: number | string,
        lang: string,
        payload: FaqCategoryTranslationPayload,
    ): Promise<ApiItemResult<FaqCategoryTranslation>> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a salva traducerea categoriei.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<FaqCategoryTranslation>>(
            `/faq-categories/${id}/translations/${encodedLang}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
            },
        );
    }

    async deleteFaqCategoryTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a șterge traducerea categoriei.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        return this.request<ApiDeleteResponse>(`/faq-categories/${id}/translations/${encodedLang}`, {
            method: 'DELETE',
        });
    }

    async getFaqs(
        params: (FaqListParams & { language?: string }) = {},
    ): Promise<ApiListResult<Faq>> {
        const { language, include, ...filters } = params;
        const searchParams = new URLSearchParams();

        if (typeof filters.page === 'number' && Number.isFinite(filters.page)) {
            searchParams.append('page', filters.page.toString());
        }

        const perPageCandidate =
            typeof filters.perPage === 'number' && Number.isFinite(filters.perPage)
                ? filters.perPage
                : typeof filters.per_page === 'number' && Number.isFinite(filters.per_page)
                    ? filters.per_page
                    : undefined;

        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }

        if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
            searchParams.append('limit', filters.limit.toString());
        }

        if (typeof filters.status === 'string' && filters.status.trim().length > 0) {
            searchParams.append('status', filters.status.trim());
        }

        if (typeof filters.category_id !== 'undefined' && filters.category_id !== null) {
            const categoryId =
                typeof filters.category_id === 'number' && Number.isFinite(filters.category_id)
                    ? filters.category_id
                    : Number(filters.category_id);

            if (Number.isFinite(categoryId)) {
                searchParams.append('category_id', categoryId.toString());
            }
        }

        if (typeof filters.question_like === 'string' && filters.question_like.trim().length > 0) {
            searchParams.append('question_like', filters.question_like.trim());
        }

        const includeParam = resolveIncludeParam(include);
        if (includeParam) {
            searchParams.append('include', includeParam);
        }

        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/faqs`, this.resolveLanguage(language));
        return this.request<ApiListResult<Faq>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getFaq(
        id: number | string,
        params: { include?: string | readonly string[]; language?: string } = {},
    ): Promise<ApiItemResult<Faq>> {
        const { include, language } = params;
        const includeParam = resolveIncludeParam(include);
        const suffix = includeParam ? `?include=${includeParam}` : '';
        const basePath = appendOptionalLanguage(`/faqs/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<Faq>>(`${basePath}${suffix}`);
    }

    async createFaq(payload: FaqPayload): Promise<ApiItemResult<Faq>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Faq>>(`/faqs`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateFaq(id: number | string, payload: FaqPayload): Promise<ApiItemResult<Faq>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Faq>>(`/faqs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteFaq(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/faqs/${id}`, {
            method: 'DELETE',
        });
    }

    async getFaqTranslations(id: number | string): Promise<FaqTranslation[]> {
        const response = await this.request<FaqTranslation[] | ApiListResult<FaqTranslation>>(
            `/faqs/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<FaqTranslation>(response);
    }

    async upsertFaqTranslation(
        id: number | string,
        lang: string,
        payload: FaqTranslationPayload,
    ): Promise<ApiItemResult<FaqTranslation>> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a salva traducerea FAQ.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<FaqTranslation>>(`/faqs/${id}/translations/${encodedLang}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteFaqTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a șterge traducerea FAQ.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        return this.request<ApiDeleteResponse>(`/faqs/${id}/translations/${encodedLang}`, {
            method: 'DELETE',
        });
    }

    async getOffers(params: OfferListParams = {}): Promise<ApiListResult<Offer>> {
        const { language, include, ...rest } = params;
        const searchParams = new URLSearchParams();

        if (typeof rest.page === 'number' && Number.isFinite(rest.page)) {
            searchParams.append('page', rest.page.toString());
        }

        const perPageCandidate =
            typeof rest.perPage === 'number' && Number.isFinite(rest.perPage)
                ? rest.perPage
                : typeof (rest as { per_page?: number }).per_page === 'number' &&
                        Number.isFinite((rest as { per_page?: number }).per_page)
                    ? (rest as { per_page: number }).per_page
                    : undefined;
        if (typeof perPageCandidate === 'number') {
            searchParams.append('per_page', perPageCandidate.toString());
        }

        if (typeof rest.limit === 'number' && Number.isFinite(rest.limit)) {
            searchParams.append('limit', rest.limit.toString());
        }

        if (typeof rest.status === 'string' && rest.status.trim().length > 0) {
            searchParams.append('status', rest.status.trim());
        }

        if (typeof rest.search === 'string' && rest.search.trim().length > 0) {
            searchParams.append('search', rest.search.trim());
        }

        if (typeof rest.audience === 'string' && rest.audience.trim().length > 0) {
            searchParams.append('audience', rest.audience.trim());
        }

        if (typeof rest.sort === 'string' && rest.sort.trim().length > 0) {
            searchParams.append('sort', rest.sort.trim());
        }

        const includeParam = resolveIncludeParam(include ?? (rest as { include?: string | readonly string[] }).include);
        if (includeParam) {
            searchParams.append('include', includeParam);
        }

        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/offers`, this.resolveLanguage(language));
        return this.request<ApiListResult<Offer>>(query ? `${basePath}?${query}` : basePath);
    }

    async getOffer(id: number | string, language?: string): Promise<ApiItemResult<Offer>> {
        const basePath = appendOptionalLanguage(`/offers/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<Offer>>(basePath);
    }

    async createOffer(payload: OfferPayload): Promise<ApiItemResult<Offer>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Offer>>(`/offers`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateOffer(id: number | string, payload: OfferPayload): Promise<ApiItemResult<Offer>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Offer>>(`/offers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteOffer(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/offers/${id}`, {
            method: 'DELETE',
        });
    }

    async getExpenses(params: ExpenseListParams = {}): Promise<ApiListResult<Expense>> {
        const searchParams = new URLSearchParams();
        if (typeof params.page === 'number' && Number.isFinite(params.page)) {
            searchParams.append('page', params.page.toString());
        }
        const perPageCandidate =
            typeof params.perPage === 'number' && Number.isFinite(params.perPage)
                ? params.perPage
                : typeof params.per_page === 'number' && Number.isFinite(params.per_page)
                    ? params.per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
            searchParams.append('limit', params.limit.toString());
        }
        if (typeof params.type === 'string' && params.type.trim().length > 0) {
            searchParams.append('type', params.type.trim());
        }
        const carId = params.car_id;
        if (typeof carId === 'number' && Number.isFinite(carId)) {
            searchParams.append('car_id', carId.toString());
        } else if (typeof carId === 'string' && carId.trim().length > 0) {
            searchParams.append('car_id', carId.trim());
        }
        const recurring = params.is_recurring;
        if (typeof recurring === 'boolean') {
            searchParams.append('is_recurring', recurring ? '1' : '0');
        } else if (typeof recurring === 'number' && Number.isFinite(recurring)) {
            searchParams.append('is_recurring', recurring.toString());
        } else if (typeof recurring === 'string' && recurring.trim().length > 0) {
            searchParams.append('is_recurring', recurring.trim());
        }
        const includeValue = resolveIncludeParam(params.include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<Expense>>(`/expenses${query ? `?${query}` : ''}`);
    }

    async getExpense(
        id: number | string,
        params: { include?: string | readonly string[] } = {},
    ): Promise<ApiItemResult<Expense>> {
        const searchParams = new URLSearchParams();
        const includeValue = resolveIncludeParam(params.include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        const query = searchParams.toString();
        return this.request<ApiItemResult<Expense>>(`/expenses/${id}${query ? `?${query}` : ''}`);
    }

    async createExpense(payload: ExpensePayload): Promise<ApiItemResult<Expense>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Expense>>(`/expenses`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateExpense(
        id: number | string,
        payload: ExpensePayload,
    ): Promise<ApiItemResult<Expense>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Expense>>(`/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteExpense(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/expenses/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarCashflows(
        params: CarCashflowListParams = {},
    ): Promise<ApiListResult<CarCashflowRecord>> {
        const query = toQuery(params);
        return this.request<ApiListResult<CarCashflowRecord>>(
            query ? `/car-cashflows?${query}` : `/car-cashflows`,
        );
    }

    async getCarCashflow(
        id: number | string,
        params: { include?: string | readonly string[] } = {},
    ): Promise<ApiItemResult<CarCashflowRecord>> {
        const includeValue = resolveIncludeParam(params.include);
        const query = includeValue ? `?include=${encodeURIComponent(includeValue)}` : '';
        return this.request<ApiItemResult<CarCashflowRecord>>(`/car-cashflows/${id}${query}`);
    }

    async createCarCashflow(
        payload: CarCashflowPayload,
    ): Promise<ApiItemResult<CarCashflowRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<CarCashflowRecord>>(`/car-cashflows`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateCarCashflow(
        id: number | string,
        payload: CarCashflowPayload,
    ): Promise<ApiItemResult<CarCashflowRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<CarCashflowRecord>>(`/car-cashflows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCarCashflow(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/car-cashflows/${id}`, {
            method: 'DELETE',
        });
    }

    async getServiceReports(
        params: ServiceReportListParams = {},
    ): Promise<ApiListResult<ServiceReport>> {
        const searchParams = new URLSearchParams();
        if (typeof params.page === 'number' && Number.isFinite(params.page)) {
            searchParams.append('page', params.page.toString());
        }
        const perPageCandidate =
            typeof params.perPage === 'number' && Number.isFinite(params.perPage)
                ? params.perPage
                : typeof params.per_page === 'number' && Number.isFinite(params.per_page)
                    ? params.per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
            searchParams.append('limit', params.limit.toString());
        }
        const carId = params.car_id;
        if (typeof carId === 'number' && Number.isFinite(carId)) {
            searchParams.append('car_id', carId.toString());
        } else if (typeof carId === 'string' && carId.trim().length > 0) {
            searchParams.append('car_id', carId.trim());
        }
        if (typeof params.mechanic_name === 'string' && params.mechanic_name.trim().length > 0) {
            searchParams.append('mechanic_name', params.mechanic_name.trim());
        }
        const includeValue = resolveIncludeParam(params.include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<ServiceReport>>(
            `/service-reports${query ? `?${query}` : ''}`,
        );
    }

    async getServiceReport(
        id: number | string,
        params: { include?: string | readonly string[] } = {},
    ): Promise<ApiItemResult<ServiceReport>> {
        const searchParams = new URLSearchParams();
        const includeValue = resolveIncludeParam(params.include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        const query = searchParams.toString();
        return this.request<ApiItemResult<ServiceReport>>(
            `/service-reports/${id}${query ? `?${query}` : ''}`,
        );
    }

    async createServiceReport(
        payload: ServiceReportPayload,
    ): Promise<ApiItemResult<ServiceReport>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<ServiceReport>>(`/service-reports`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateServiceReport(
        id: number | string,
        payload: ServiceReportPayload,
    ): Promise<ApiItemResult<ServiceReport>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<ServiceReport>>(`/service-reports/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteServiceReport(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/service-reports/${id}`, {
            method: 'DELETE',
        });
    }

    async getTaxes(
        params: (TaxListParams & { language?: string }) = {},
    ): Promise<ApiListResult<Tax>> {
        const { language, ...rest } = params;
        const filters = rest as TaxListParams;
        const searchParams = new URLSearchParams();
        if (typeof filters.page === 'number' && Number.isFinite(filters.page)) {
            searchParams.append('page', filters.page.toString());
        }
        const perPageCandidate =
            typeof filters.perPage === 'number' && Number.isFinite(filters.perPage)
                ? filters.perPage
                : typeof (filters as { per_page?: number }).per_page === 'number'
                    ? (filters as { per_page: number }).per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
            searchParams.append('limit', filters.limit.toString());
        }
        if (typeof filters.status === 'string' && filters.status.trim().length > 0) {
            searchParams.append('status', filters.status.trim());
        }
        if (typeof filters.name_like === 'string' && filters.name_like.trim().length > 0) {
            searchParams.append('name_like', filters.name_like.trim());
        }
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/taxes`, this.resolveLanguage(language));
        return this.request<ApiListResult<Tax>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getTax(
        id: number | string,
        language?: string,
    ): Promise<ApiItemResult<Tax>> {
        const basePath = appendOptionalLanguage(`/taxes/${id}`, this.resolveLanguage(language));
        return this.request<ApiItemResult<Tax>>(basePath);
    }

    async createTax(payload: TaxPayload): Promise<ApiItemResult<Tax>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Tax>>(`/taxes`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateTax(id: number | string, payload: TaxPayload): Promise<ApiItemResult<Tax>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Tax>>(`/taxes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteTax(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/taxes/${id}`, {
            method: 'DELETE',
        });
    }

    async getTaxTranslations(id: number | string): Promise<TaxTranslation[]> {
        const response = await this.request<TaxTranslation[] | ApiListResult<TaxTranslation>>(
            `/taxes/${id}/translations`,
        );
        return Array.isArray(response) ? response : extractList<TaxTranslation>(response);
    }

    async upsertTaxTranslation(
        id: number | string,
        lang: string,
        payload: Partial<TaxTranslation>,
    ): Promise<TaxTranslation> {
        const { lang_code: _ignored, ...rest } = payload;
        const body = sanitizePayload(rest);
        const language = encodeURIComponent(lang.trim());
        return this.request<TaxTranslation>(`/taxes/${id}/translations/${language}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteTaxTranslation(id: number | string, lang: string): Promise<ApiDeleteResponse> {
        const language = encodeURIComponent(lang.trim());
        return this.request<ApiDeleteResponse>(`/taxes/${id}/translations/${language}`, {
            method: 'DELETE',
        });
    }

    async getCoupons(params: CouponListParams = {}): Promise<ApiListResult<Coupon>> {
        const searchParams = new URLSearchParams();
        if (typeof params.page === 'number' && Number.isFinite(params.page)) {
            searchParams.append('page', params.page.toString());
        }
        const perPageCandidate =
            typeof params.perPage === 'number' && Number.isFinite(params.perPage)
                ? params.perPage
                : typeof (params as { per_page?: number }).per_page === 'number'
                    ? (params as { per_page: number }).per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
            searchParams.append('limit', params.limit.toString());
        }
        if (typeof params.search === 'string' && params.search.trim().length > 0) {
            searchParams.append('search', params.search.trim());
        }
        if (typeof params.code_like === 'string' && params.code_like.trim().length > 0) {
            searchParams.append('code_like', params.code_like.trim());
        }
        if (typeof params.type === 'string' && params.type.trim().length > 0) {
            searchParams.append('type', params.type.trim());
        }
        if (typeof params.is_unlimited !== 'undefined') {
            searchParams.append('is_unlimited', String(params.is_unlimited));
        }
        if (typeof params.is_unlimited_expires !== 'undefined') {
            searchParams.append('is_unlimited_expires', String(params.is_unlimited_expires));
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<Coupon>>(`/coupons${query ? `?${query}` : ''}`);
    }

    async getCoupon(id: number | string): Promise<ApiItemResult<Coupon>> {
        return this.request<ApiItemResult<Coupon>>(`/coupons/${id}`);
    }

    async createCoupon(payload: CouponPayload): Promise<ApiItemResult<Coupon>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Coupon>>(`/coupons`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateCoupon(id: number | string, payload: CouponPayload): Promise<ApiItemResult<Coupon>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<Coupon>>(`/coupons/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteCoupon(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/coupons/${id}`, {
            method: 'DELETE',
        });
    }

    async validateCouponQuick(params: CouponQuickValidationParams): Promise<CouponQuickValidationResponse> {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (typeof value === 'undefined' || value === null) {
                return;
            }
            searchParams.append(key, String(value));
        });
        const query = searchParams.toString();
        return this.request<CouponQuickValidationResponse>(
            `/coupons/validate${query ? `?${query}` : ''}`,
        );
    }

    async validateDiscountCode(params: DiscountValidationPayload): Promise<DiscountValidationResponse> {
        return this.request<DiscountValidationResponse>(`/coupons/validate`, {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }

    async checkCarAvailability(params: AvailabilityCheckPayload): Promise<AvailabilityCheckResponse> {
        return this.request<AvailabilityCheckResponse>(`/bookings/availability/check`, {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async createAdminBooking(payload: ReservationPayload | Record<string, unknown>): Promise<ApiItemResult<UnknownRecord>> {
        return this.request<ApiItemResult<UnknownRecord>>(`/admin/bookings`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`
            },
        });
    }

    async createBooking(payload: ReservationPayload | Record<string, unknown>): Promise<ApiItemResult<UnknownRecord>> {
        return this.request<ApiItemResult<UnknownRecord>>(`/bookings`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateBooking(id: number | string, payload: Record<string, unknown>): Promise<ApiItemResult<UnknownRecord>> {
        return this.request<ApiItemResult<UnknownRecord>>(`/bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`
            },
            cache: 'no-cache',
        });
    }

    async generateContract(payload: Record<string, unknown>, id?: number | string): Promise<ApiItemResult<BookingContractResponse> | Blob> {
        let path = '/bookings/contract';
        if (typeof id === 'number' && Number.isFinite(id)) {
            path = `${path}/${id}`;
        } else if (typeof id === 'string') {
            const trimmed = id.trim();
            if (trimmed.length > 0) {
                path = `${path}/${trimmed}`;
            }
        }

        return this.request<ApiItemResult<BookingContractResponse> | Blob>(path, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/pdf',
                Authorization: `Bearer ${this.token}`
            },
            cache: 'no-cache',
        });
    }

    async storeAndGenerateContract(payload: Record<string, unknown>): Promise<ApiItemResult<BookingContractResponse> | Blob> {
        return this.request<ApiItemResult<BookingContractResponse> | Blob>(`/bookings/store-contract`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/pdf',
                Authorization: `Bearer ${this.token}`
            },
            cache: 'no-cache',
        });
    }

    async updateBookingDate(
        id: number | string,
        params: { arrivalDate: string | undefined; arrivalTime: string | undefined; returnDate: string | undefined; returnTime: string | undefined },
    ): Promise<ApiItemResult<UnknownRecord>> {
        return this.request<ApiItemResult<UnknownRecord>>(`/bookings/${id}/update-date`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`
            },
            cache: 'no-cache',
            body: JSON.stringify(params),
        })
    }
    async getBookingInfo(
        id: number | string,
        params: { include?: string | readonly string[] } = {},
    ): Promise<ApiItemResult<AdminBookingResource>> {
        const includeValue = resolveIncludeParam(params.include);
        if (!includeValue) {
            return this.request<ApiItemResult<AdminBookingResource>>(`/bookings/${id}`);
        }
        const query = new URLSearchParams({ include: includeValue }).toString();
        return this.request<ApiItemResult<AdminBookingResource>>(`/bookings/${id}?${query}`);
    }

    async getBookings(params: {
        page?: number;
        perPage?: number;
        per_page?: number;
        search?: string;
        status?: string;
        customer_id?: number | string;
        car_id?: number | string;
        start_date?: string;
        end_date?: string;
        from?: string;
        to?: string;
        limit?: number;
        include?: string | readonly string[];
    } = {}): Promise<ApiListResult<AdminBookingResource>> {
        const searchParams = new URLSearchParams();
        const includeValue = resolveIncludeParam(params.include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        if (typeof params.page === 'number' && Number.isFinite(params.page)) {
            searchParams.append('page', params.page.toString());
        }
        const perPageCandidate =
            typeof params.perPage === 'number' && Number.isFinite(params.perPage)
                ? params.perPage
                : typeof params.per_page === 'number' && Number.isFinite(params.per_page)
                    ? params.per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
            searchParams.append('limit', params.limit.toString());
        }
        if (typeof params.search === 'string' && params.search.trim().length > 0) {
            searchParams.append('search', params.search.trim());
        }
        if (typeof params.status === 'string' && params.status.trim().length > 0) {
            searchParams.append('status', params.status.trim());
        }
        if (typeof params.customer_id !== 'undefined' && params.customer_id !== null) {
            searchParams.append('customer_id', String(params.customer_id));
        }
        if (typeof params.car_id !== 'undefined' && params.car_id !== null) {
            searchParams.append('car_id', String(params.car_id));
        }
        if (typeof params.start_date === 'string' && params.start_date.length > 0) {
            searchParams.append('start_date', params.start_date);
        }
        if (typeof params.end_date === 'string' && params.end_date.length > 0) {
            searchParams.append('end_date', params.end_date);
        }
        if (typeof params.from === 'string' && params.from.length > 0) {
            searchParams.append('from', params.from);
        }
        if (typeof params.to === 'string' && params.to.length > 0) {
            searchParams.append('to', params.to);
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<AdminBookingResource>>(
            `/bookings${query ? `?${query}` : ''}`,
        );
    }

    async deleteBooking(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/bookings/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`
            },
        });
    }

    async quotePrice(payload: QuotePricePayload): Promise<QuotePriceResponse> {
        return this.request<QuotePriceResponse>(`/bookings/quote`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }

    async getCustomers(params: { search?: string; limit?: number } = {}): Promise<ApiListResult<UnknownRecord>> {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<ApiListResult<UnknownRecord>>(
            `/customers${query ? `?${query}` : ''}`,
        );
    }

    async searchCustomersByPhone(phone: string): Promise<ApiListResult<CustomerPhoneSearchResult>> {
        return this.request<ApiListResult<CustomerPhoneSearchResult>>(`/customers/get/byphone`, {
            method: 'POST',
            body: JSON.stringify({ phone }),
        });
    }

    async getBlogCategories(
        params: BlogCategoryListParams = {},
    ): Promise<ApiListResult<BlogCategory>> {
        const searchParams = new URLSearchParams();
        if (typeof params.page === 'number' && Number.isFinite(params.page)) {
            searchParams.append('page', params.page.toString());
        }
        const perPageCandidate =
            typeof params.perPage === 'number' && Number.isFinite(params.perPage)
                ? params.perPage
                : typeof params.per_page === 'number' && Number.isFinite(params.per_page)
                    ? params.per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
            searchParams.append('limit', params.limit.toString());
        }
        const nameCandidate =
            typeof params.name === 'string' && params.name.trim().length > 0
                ? params.name.trim()
                : typeof params.search === 'string' && params.search.trim().length > 0
                    ? params.search.trim()
                    : null;
        if (nameCandidate) {
            searchParams.append('name', nameCandidate);
        }
        if (typeof params.slug === 'string' && params.slug.trim().length > 0) {
            searchParams.append('slug', params.slug.trim());
        }
        if (typeof params.sort === 'string' && params.sort.trim().length > 0) {
            searchParams.append('sort', params.sort.trim());
        }
        if (typeof params.fields === 'string' && params.fields.trim().length > 0) {
            searchParams.append('fields', params.fields.trim());
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<BlogCategory>>(`/blog-categories${query ? `?${query}` : ''}`);
    }

    async getBlogCategory(id: number | string): Promise<ApiItemResult<BlogCategory>> {
        return this.request<ApiItemResult<BlogCategory>>(`/blog-categories/${id}`);
    }

    async createBlogCategory(payload: BlogCategoryPayload): Promise<ApiItemResult<BlogCategory>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogCategory>>(`/blog-categories`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateBlogCategory(id: number | string, payload: BlogCategoryPayload): Promise<ApiItemResult<BlogCategory>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogCategory>>(`/blog-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteBlogCategory(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/blog-categories/${id}`, {
            method: 'DELETE',
        });
    }

    async getBlogCategoryTranslations(
        id: number | string,
    ): Promise<BlogCategoryTranslation[]> {
        const response = await this.request<
            BlogCategoryTranslation[] | ApiListResult<BlogCategoryTranslation>
        >(`/blog-categories/${id}/translations`);
        return Array.isArray(response)
            ? response
            : extractList<BlogCategoryTranslation>(response);
    }

    async upsertBlogCategoryTranslation(
        id: number | string,
        lang: string,
        payload: BlogCategoryTranslationPayload,
    ): Promise<ApiItemResult<BlogCategoryTranslation>> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a salva traducerea categoriei.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogCategoryTranslation>>(
            `/blog-categories/${id}/translations/${encodedLang}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
            },
        );
    }

    async deleteBlogCategoryTranslation(
        id: number | string,
        lang: string,
    ): Promise<ApiDeleteResponse> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a șterge traducerea categoriei.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        return this.request<ApiDeleteResponse>(
            `/blog-categories/${id}/translations/${encodedLang}`,
            {
                method: 'DELETE',
            },
        );
    }

    async getBlogTags(
        params: BlogTagListParams = {},
    ): Promise<ApiListResult<BlogTag>> {
        const searchParams = new URLSearchParams();
        if (typeof params.page === 'number' && Number.isFinite(params.page)) {
            searchParams.append('page', params.page.toString());
        }
        const perPageCandidate =
            typeof params.perPage === 'number' && Number.isFinite(params.perPage)
                ? params.perPage
                : typeof params.per_page === 'number' && Number.isFinite(params.per_page)
                    ? params.per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
            searchParams.append('limit', params.limit.toString());
        }
        const nameCandidate =
            typeof params.name === 'string' && params.name.trim().length > 0
                ? params.name.trim()
                : typeof params.search === 'string' && params.search.trim().length > 0
                    ? params.search.trim()
                    : null;
        if (nameCandidate) {
            searchParams.append('name', nameCandidate);
        }
        if (typeof params.slug === 'string' && params.slug.trim().length > 0) {
            searchParams.append('slug', params.slug.trim());
        }
        if (typeof params.sort === 'string' && params.sort.trim().length > 0) {
            searchParams.append('sort', params.sort.trim());
        }
        if (typeof params.fields === 'string' && params.fields.trim().length > 0) {
            searchParams.append('fields', params.fields.trim());
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<BlogTag>>(`/blog-tags${query ? `?${query}` : ''}`);
    }

    async getBlogTag(id: number | string): Promise<ApiItemResult<BlogTag>> {
        return this.request<ApiItemResult<BlogTag>>(`/blog-tags/${id}`);
    }

    async createBlogTag(payload: BlogTagPayload): Promise<ApiItemResult<BlogTag>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogTag>>(`/blog-tags`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateBlogTag(id: number | string, payload: BlogTagPayload): Promise<ApiItemResult<BlogTag>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogTag>>(`/blog-tags/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteBlogTag(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/blog-tags/${id}`, {
            method: 'DELETE',
        });
    }

    async getBlogPosts(
        params: (BlogPostListParams & { language?: string }) = {},
    ): Promise<ApiListResult<BlogPost>> {
        const { include, language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (typeof filters.page === 'number' && Number.isFinite(filters.page)) {
            searchParams.append('page', filters.page.toString());
        }
        const perPageCandidate =
            typeof filters.perPage === 'number' && Number.isFinite(filters.perPage)
                ? filters.perPage
                : typeof filters.per_page === 'number' && Number.isFinite(filters.per_page)
                    ? filters.per_page
                    : undefined;
        if (typeof perPageCandidate === 'number' && Number.isFinite(perPageCandidate)) {
            searchParams.append('per_page', perPageCandidate.toString());
        }
        if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
            searchParams.append('limit', filters.limit.toString());
        }
        if (
            typeof filters.category_id !== 'undefined' &&
            filters.category_id !== null &&
            String(filters.category_id).length > 0
        ) {
            searchParams.append('category_id', String(filters.category_id));
        }
        if (
            typeof filters.author_id !== 'undefined' &&
            filters.author_id !== null &&
            String(filters.author_id).trim().length > 0
        ) {
            searchParams.append('author_id', String(filters.author_id));
        }
        if (typeof filters.status === 'string' && filters.status.trim().length > 0) {
            searchParams.append('status', filters.status.trim());
        }
        if (typeof filters.slug === 'string' && filters.slug.trim().length > 0) {
            searchParams.append('slug', filters.slug.trim());
        }
        const titleCandidate =
            typeof filters.title === 'string' && filters.title.trim().length > 0
                ? filters.title.trim()
                : typeof filters.search === 'string' && filters.search.trim().length > 0
                    ? filters.search.trim()
                    : null;
        if (titleCandidate) {
            searchParams.append('title', titleCandidate);
        }
        if (typeof filters.sort === 'string' && filters.sort.trim().length > 0) {
            searchParams.append('sort', filters.sort.trim());
        }
        if (typeof filters.fields === 'string' && filters.fields.trim().length > 0) {
            searchParams.append('fields', filters.fields.trim());
        }
        const includeValue = resolveIncludeParam(include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/blog-posts`, this.resolveLanguage(language));
        return this.request<ApiListResult<BlogPost>>(query ? `${basePath}?${query}` : basePath);
    }

    async getBlogPost(
        id: number | string,
        params: { language?: string } = {},
    ): Promise<ApiItemResult<BlogPost>> {
        const basePath = appendOptionalLanguage(`/blog-posts/${id}`, this.resolveLanguage(params.language));
        return this.request<ApiItemResult<BlogPost>>(basePath);
    }

    async createBlogPost(payload: BlogPostPayload | FormData): Promise<ApiItemResult<BlogPost>> {
        if (typeof FormData !== 'undefined' && payload instanceof FormData) {
            return this.request<ApiItemResult<BlogPost>>(`/blog-posts`, {
                method: 'POST',
                body: payload,
            });
        }

        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogPost>>(`/blog-posts`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateBlogPost(
        id: number | string,
        payload: BlogPostPayload | FormData,
    ): Promise<ApiItemResult<BlogPost>> {
        if (typeof FormData !== 'undefined' && payload instanceof FormData) {
            return this.request<ApiItemResult<BlogPost>>(`/blog-posts/${id}`, {
                method: 'PUT',
                body: payload,
            });
        }

        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogPost>>(`/blog-posts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteBlogPost(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/blog-posts/${id}`, {
            method: 'DELETE',
        });
    }

    async getBlogPostTranslations(id: number | string): Promise<BlogPostTranslation[]> {
        const response = await this.request<
            BlogPostTranslation[] | ApiListResult<BlogPostTranslation>
        >(`/blog-posts/${id}/translations`);
        return Array.isArray(response)
            ? response
            : extractList<BlogPostTranslation>(response);
    }

    async upsertBlogPostTranslation(
        id: number | string,
        lang: string,
        payload: BlogPostTranslationPayload,
    ): Promise<ApiItemResult<BlogPostTranslation>> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a salva traducerea articolului.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<BlogPostTranslation>>(
            `/blog-posts/${id}/translations/${encodedLang}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
            },
        );
    }

    async deleteBlogPostTranslation(
        id: number | string,
        lang: string,
    ): Promise<ApiDeleteResponse> {
        const normalizedLang = typeof lang === 'string' ? lang.trim() : '';
        if (!normalizedLang) {
            throw new Error('Codul de limbă este necesar pentru a șterge traducerea articolului.');
        }

        const encodedLang = encodeURIComponent(normalizedLang);
        return this.request<ApiDeleteResponse>(`/blog-posts/${id}/translations/${encodedLang}`, {
            method: 'DELETE',
        });
    }

    async getWheelOfFortunePeriods(
        params: {
            page?: number;
            per_page?: number;
            limit?: number;
            active?: number | boolean;
            is_active?: number | boolean;
            with?: string | readonly string[];
            include?: string | readonly string[];
            signal?: AbortSignal;
        } = {},
    ): Promise<ApiListResult<WheelOfFortunePeriod>> {
        const { signal, ...queryParams } = params;
        const searchParams = new URLSearchParams();
        if (queryParams.page) searchParams.append('page', queryParams.page.toString());
        if (queryParams.per_page) searchParams.append('per_page', queryParams.per_page.toString());
        if (queryParams.limit) searchParams.append('limit', queryParams.limit.toString());
        const appendBooleanParam = (key: string, value: number | boolean) => {
            const normalized = typeof value === 'boolean'
                ? value ? '1' : '0'
                : value.toString();
            searchParams.append(key, normalized);
        };
        if (typeof queryParams.active !== 'undefined') {
            appendBooleanParam('active', queryParams.active);
        }
        if (typeof queryParams.is_active !== 'undefined') {
            appendBooleanParam('is_active', queryParams.is_active);
        }
        const withValue = resolveIncludeParam(queryParams.with);
        if (withValue) {
            searchParams.append('with', withValue);
        }
        const includeValue = resolveIncludeParam(queryParams.include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<WheelOfFortunePeriod>>(
            `/wheel-of-fortune-periods${query ? `?${query}` : ''}`,
        );
    }

    async createWheelOfFortunePeriod(payload: {
        name: string;
        start_at?: string | null;
        end_at?: string | null;
        starts_at?: string | null;
        ends_at?: string | null;
        active?: boolean;
        is_active?: boolean;
        description?: string | null;
        active_months?: number[] | null;
    }): Promise<ApiItemResult<WheelOfFortunePeriod>> {
        const normalizeActiveMonths = (value: number[] | null | undefined) => {
            if (!Array.isArray(value)) {
                return undefined;
            }
            const unique = Array.from(
                new Set(
                    value
                        .map((entry) => Number(entry))
                        .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 12),
                ),
            );
            if (unique.length === 0) {
                return [];
            }
            return unique.sort((a, b) => a - b);
        };
        const body = sanitizePayload({
            ...payload,
            starts_at: payload.starts_at ?? payload.start_at,
            ends_at: payload.ends_at ?? payload.end_at,
            ...(typeof payload.active === 'boolean'
                ? { active: payload.active }
                : {}),
            ...(typeof payload.is_active === 'boolean'
                ? { is_active: payload.is_active }
                : {}),
            active_months: normalizeActiveMonths(payload.active_months ?? null),
        });
        return this.request<ApiItemResult<WheelOfFortunePeriod>>(`/wheel-of-fortune-periods`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateWheelOfFortunePeriod(
        id: number,
        payload: {
            name?: string;
            start_at?: string | null;
            end_at?: string | null;
            starts_at?: string | null;
            ends_at?: string | null;
            active?: boolean;
            is_active?: boolean;
            description?: string | null;
            active_months?: number[] | null;
        },
    ): Promise<ApiItemResult<WheelOfFortunePeriod>> {
        const normalizeActiveMonths = (value: number[] | null | undefined) => {
            if (!Array.isArray(value)) {
                return undefined;
            }
            const unique = Array.from(
                new Set(
                    value
                        .map((entry) => Number(entry))
                        .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 12),
                ),
            );
            if (unique.length === 0) {
                return [];
            }
            return unique.sort((a, b) => a - b);
        };
        const body = sanitizePayload({
            ...payload,
            starts_at: payload.starts_at ?? payload.start_at,
            ends_at: payload.ends_at ?? payload.end_at,
            ...(typeof payload.active === 'boolean'
                ? { active: payload.active }
                : {}),
            ...(typeof payload.is_active === 'boolean'
                ? { is_active: payload.is_active }
                : {}),
            active_months: normalizeActiveMonths(payload.active_months ?? null),
        });
        return this.request<ApiItemResult<WheelOfFortunePeriod>>(`/wheel-of-fortune-periods/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteWheelOfFortunePeriod(id: number): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/wheel-of-fortune-periods/${id}`, {
            method: 'DELETE',
        });
    }

    async getWheelOfFortunes(params: {
        period_id?: number;
        page?: number;
        per_page?: number;
        limit?: number;
        is_active?: boolean;
        language?: string;
        include?: string | readonly string[];
    } = {}): Promise<ApiListResult<WheelPrize>> {
        const { language, ...filters } = params;
        const searchParams = new URLSearchParams();
        if (filters.page) searchParams.append('page', filters.page.toString());
        if (filters.per_page) searchParams.append('per_page', filters.per_page.toString());
        if (filters.limit) searchParams.append('limit', filters.limit.toString());
        if (typeof filters.period_id !== 'undefined') {
            searchParams.append('period_id', filters.period_id.toString());
        }
        if (typeof filters.is_active !== 'undefined') {
            const value = filters.is_active ? '1' : '0';
            searchParams.append('is_active', value);
        }
        const includeValue = resolveIncludeParam(filters.include);
        if (includeValue) {
            searchParams.append('include', includeValue);
        }
        const query = searchParams.toString();
        const basePath = appendOptionalLanguage(`/wheel-of-fortunes`, this.resolveLanguage(language));
        return this.request<ApiListResult<WheelPrize>>(
            query.length > 0 ? `${basePath}?${query}` : basePath,
        );
    }

    async getWheelOfFortune(
        id: number | string,
        params: { include?: string | readonly string[]; language?: string } = {},
    ): Promise<ApiItemResult<WheelPrize>> {
        const { language, include } = params;
        const basePath = appendOptionalLanguage(`/wheel-of-fortunes/${id}`, this.resolveLanguage(language));
        const includeValue = resolveIncludeParam(include);
        if (!includeValue) {
            return this.request<ApiItemResult<WheelPrize>>(basePath);
        }
        const query = new URLSearchParams({ include: includeValue }).toString();
        return this.request<ApiItemResult<WheelPrize>>(`${basePath}?${query}`);
    }

    async createWheelOfFortune(payload: {
        period_id: number;
        title: string;
        description?: string | null;
        amount?: number | null;
        color: string;
        probability: number;
        type: string;
    }): Promise<ApiItemResult<WheelPrize>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<WheelPrize>>(`/wheel-of-fortunes`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateWheelOfFortune(
        id: number,
        payload: {
            period_id?: number;
            title?: string;
            description?: string | null;
            amount?: number | null;
            color?: string;
            probability?: number;
            type?: string;
        },
    ): Promise<ApiItemResult<WheelPrize>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<WheelPrize>>(`/wheel-of-fortunes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteWheelOfFortune(id: number): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/wheel-of-fortunes/${id}`, {
            method: 'DELETE',
        });
    }

    async createWheelOfFortunePrize(payload: WheelOfFortunePrizePayload): Promise<ApiItemResult<UnknownRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<UnknownRecord>>(`/wheel-of-fortune-prizes`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async getWheelOfFortunePrizes(params: {
        page?: number;
        per_page?: number;
        limit?: number;
        wheel_of_fortune_id?: number;
        period_id?: number;
    } = {}): Promise<ApiListResult<WheelOfFortunePrizeWinner>> {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (typeof params.wheel_of_fortune_id !== 'undefined') {
            searchParams.append('wheel_of_fortune_id', params.wheel_of_fortune_id.toString());
        }
        if (typeof params.period_id !== 'undefined') {
            searchParams.append('period_id', params.period_id.toString());
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<WheelOfFortunePrizeWinner>>(
            `/wheel-of-fortune-prizes${query ? `?${query}` : ''}`,
        );
    }

    async getMailBrandingSettings() {
        return this.request<MailBrandingResponse>(`/mail-branding-settings`);
    }

    async updateMailBrandingSettings(payload: MailBrandingUpdatePayload) {
        return this.request<MailBrandingResponse>(`/mail-branding-settings`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async getMailTemplates() {
        return this.request<MailTemplatesResponse>(`/mail-templates`);
    }

    async getMailTemplateDetail(templateKey: string) {
        const key = encodeURIComponent(templateKey.trim());
        return this.request<MailTemplateDetailResponse>(`/mail-templates/${key}`);
    }

    async updateMailTemplate(templateKey: string, payload: MailTemplateUpdatePayload) {
        const key = encodeURIComponent(templateKey.trim());
        return this.request<MailTemplateDetailResponse>(`/mail-templates/${key}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async uploadMailTemplateAttachment(
        templateKey: string,
        file: File | Blob,
        options?: { withDeposit?: boolean | null },
    ) {
        const key = encodeURIComponent(templateKey.trim());
        const formData = new FormData();
        const fileName =
            'name' in file && typeof file.name === 'string' && file.name.length > 0
                ? file.name
                : 'attachment';
        formData.append('file', file, fileName);
        const depositFlag = options?.withDeposit;
        if (depositFlag === true) {
            formData.append('with_deposit', '1');
        } else if (depositFlag === false) {
            formData.append('with_deposit', '0');
        }
        return this.request<MailTemplateAttachmentsResponse>(`/mail-templates/${key}/attachments`, {
            method: 'POST',
            body: formData,
        });
    }

    async deleteMailTemplateAttachment(templateKey: string, attachmentUuid: string) {
        const key = encodeURIComponent(templateKey.trim());
        const attachment = encodeURIComponent(attachmentUuid.trim());
        return this.request<MailTemplateAttachmentsResponse>(`/mail-templates/${key}/attachments/${attachment}`, {
            method: 'DELETE',
        });
    }

    // Authentication helpers

    async login(payload: AdminLoginPayload): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>(`/auth/login`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (response?.token) {
            this.setToken(response.token);
        }
        const user = ensureUser(response?.user);
        return {
            ...response,
            user,
        };
    }

    async register(payload: AdminRegisterPayload): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>(`/auth/register`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (response?.token) {
            this.setToken(response.token);
        }
        const user = ensureUser(response?.user);
        return {
            ...response,
            user,
        };
    }

    async requestPasswordReset(
        payload: ForgotPasswordPayload,
        options: { public?: boolean } = {},
    ): Promise<ApiMessageResponse> {
        const endpoint = options.public ? `/password/forgot` : `/auth/password/forgot`;
        return this.request<ApiMessageResponse>(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async resetPassword(
        payload: ResetPasswordPayload,
        options: { public?: boolean } = {},
    ): Promise<ApiMessageResponse> {
        const endpoint = options.public ? `/password/reset` : `/auth/password/reset`;
        const response = await this.request<ApiMessageResponse>(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        this.removeToken();
        return response;
    }

    async me(): Promise<User> {
        const response = await this.request<ApiItemResult<User>>(`/auth/me`);
        const user = extractItem<User>(response);
        return ensureUser(user);
    }

    async logout(): Promise<void> {
        await this.request(`/auth/logout`, { method: 'POST' });
        this.removeToken();
    }

    async logoutAll(): Promise<void> {
        await this.request(`/auth/logout-all`, { method: 'POST' });
        this.removeToken();
    }

    async customerRegister(payload: CustomerRegisterPayload): Promise<CustomerAuthResponse> {
        return this.request<CustomerAuthResponse>(`/customer/register`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async customerLogin(payload: CustomerLoginPayload): Promise<CustomerAuthResponse> {
        return this.request<CustomerAuthResponse>(`/customer/login`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async customerForgotPassword(payload: CustomerForgotPasswordPayload): Promise<ApiMessageResponse> {
        return this.request<ApiMessageResponse>(`/customer/password/forgot`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async customerResetPassword(payload: CustomerResetPasswordPayload): Promise<ApiMessageResponse> {
        return this.request<ApiMessageResponse>(`/customer/password/reset`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async customerVerify(payload: CustomerVerifyPayload): Promise<ApiMessageResponse> {
        return this.request<ApiMessageResponse>(`/customer/verify`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async customerMe(token: string): Promise<Customer> {
        const normalized = token.trim();
        if (!normalized) {
            throw new Error('Customer token is required');
        }
        const response = await this.request<CustomerProfileResponse | ApiItemResult<Customer>>(`/customer/me`, {
            headers: { Authorization: `Bearer ${normalized}` },
        });
        if (response && typeof response === 'object' && 'data' in response) {
            const profile = (response as CustomerProfileResponse).data;
            if (profile) {
                return profile;
            }
        }
        const customer = extractItem<Customer>(response as ApiItemResult<Customer>);
        if (!customer) {
            throw new Error('Invalid customer profile response');
        }
        return customer;
    }

    async customerLogout(token: string): Promise<ApiMessageResponse> {
        const normalized = token.trim();
        if (!normalized) {
            throw new Error('Customer token is required');
        }
        return this.request<ApiMessageResponse>(`/customer/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${normalized}` },
        });
    }

    async customerLogoutAll(token: string): Promise<ApiMessageResponse> {
        const normalized = token.trim();
        if (!normalized) {
            throw new Error('Customer token is required');
        }
        return this.request<ApiMessageResponse>(`/customer/logout-all`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${normalized}` },
        });
    }

    async fetchWidgetActivity(period: string, paginate = 20): Promise<WidgetActivityResponse> {
        return this.request<WidgetActivityResponse>(`/widgets/activity/${period}?paginate=${paginate}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`
            },
            cache: 'no-cache',
        });
    }

    async fetchAdminBookingsToday(
        params: AdminBookingsTodayParams = {},
    ): Promise<AdminBookingsTodayMetrics> {
        const searchParams = new URLSearchParams();
        if (params.by) {
            searchParams.append('by', params.by);
        }
        if (params.statuses) {
            const statusesValue = Array.isArray(params.statuses)
                ? params.statuses.join(',')
                : params.statuses;
            if (typeof statusesValue === 'string' && statusesValue.trim().length > 0) {
                searchParams.append('statuses', statusesValue.trim());
            }
        }
        const query = searchParams.toString();
        return this.request<AdminBookingsTodayMetrics>(
            `/admin/metrics/bookings-today${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminCarsTotal(
        params: AdminCarsTotalParams = {},
    ): Promise<AdminCarsTotalMetrics> {
        const searchParams = new URLSearchParams();
        if (params.status) {
            const normalized = params.status.trim();
            if (normalized.length > 0) {
                searchParams.append('status', normalized);
            }
        }
        const query = searchParams.toString();
        return this.request<AdminCarsTotalMetrics>(
            `/admin/metrics/cars-total${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminExpiringCarDocuments(
        params: AdminExpiringCarDocumentsParams = {},
    ): Promise<ApiListResult<AdminExpiringDocumentCar>> {
        const searchParams = new URLSearchParams();
        if (
            typeof params.within_days === 'number' &&
            Number.isFinite(params.within_days) &&
            params.within_days > 0
        ) {
            searchParams.append('within_days', String(params.within_days));
        }
        const query = searchParams.toString();
        return this.request<ApiListResult<AdminExpiringDocumentCar>>(
            `/admin/cars/expiring-documents${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminBookingsTotal(
        params: AdminBookingsTotalParams = {},
    ): Promise<AdminBookingsTotalMetrics> {
        const searchParams = new URLSearchParams();
        if (params.statuses) {
            const statusesValue = Array.isArray(params.statuses)
                ? params.statuses.join(',')
                : params.statuses;
            if (typeof statusesValue === 'string' && statusesValue.trim().length > 0) {
                searchParams.append('statuses', statusesValue.trim());
            }
        }
        const query = searchParams.toString();
        return this.request<AdminBookingsTotalMetrics>(
            `/admin/metrics/bookings-total${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminReportOverview(
        params: AdminReportOverviewParams = {},
    ): Promise<AdminReportOverviewResponse> {
        const searchParams = new URLSearchParams();
        if (params.week_start) {
            const normalized = params.week_start.trim();
            if (normalized.length > 0) {
                searchParams.append('week_start', normalized);
            }
        }
        if (params.quarter) {
            const normalized = params.quarter.trim();
            if (normalized.length > 0) {
                searchParams.append('quarter', normalized);
            }
        }
        if (params.timezone) {
            const normalized = params.timezone.trim();
            if (normalized.length > 0) {
                searchParams.append('timezone', normalized);
            }
        }
        const query = searchParams.toString();
        return this.request<AdminReportOverviewResponse>(
            `/admin/reports/overview${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminReportWeekly(
        params: AdminReportWeeklyParams,
    ): Promise<AdminReportWeeklyResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('start_date', params.start_date);
        if (params.compare_with) {
            const normalized = params.compare_with.trim();
            if (normalized.length > 0) {
                searchParams.append('compare_with', normalized);
            }
        }
        if (
            params.compare_with === 'custom' &&
            params.custom_compare_start &&
            params.custom_compare_start.trim().length > 0
        ) {
            searchParams.append('custom_compare_start', params.custom_compare_start.trim());
        }
        if (params.timezone) {
            const normalized = params.timezone.trim();
            if (normalized.length > 0) {
                searchParams.append('timezone', normalized);
            }
        }
        const query = searchParams.toString();
        return this.request<AdminReportWeeklyResponse>(
            `/admin/reports/weekly${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminReportMonthly(
        params: AdminReportMonthlyParams,
    ): Promise<AdminReportMonthlyResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('month', params.month);
        if (params.compare_with) {
            const normalized = params.compare_with.trim();
            if (normalized.length > 0) {
                searchParams.append('compare_with', normalized);
            }
        }
        if (
            params.compare_with === 'custom' &&
            params.custom_compare &&
            params.custom_compare.trim().length > 0
        ) {
            searchParams.append('custom_compare', params.custom_compare.trim());
        }
        if (params.timezone) {
            const normalized = params.timezone.trim();
            if (normalized.length > 0) {
                searchParams.append('timezone', normalized);
            }
        }
        const query = searchParams.toString();
        return this.request<AdminReportMonthlyResponse>(
            `/admin/reports/monthly${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminReportQuarterly(
        params: AdminReportQuarterlyParams,
    ): Promise<AdminReportQuarterlyResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('quarter', params.quarter);
        if (params.compare_with) {
            const normalized = params.compare_with.trim();
            if (normalized.length > 0) {
                searchParams.append('compare_with', normalized);
            }
        }
        if (
            params.compare_with === 'custom' &&
            params.custom_compare &&
            params.custom_compare.trim().length > 0
        ) {
            searchParams.append('custom_compare', params.custom_compare.trim());
        }
        if (params.timezone) {
            const normalized = params.timezone.trim();
            if (normalized.length > 0) {
                searchParams.append('timezone', normalized);
            }
        }
        const query = searchParams.toString();
        return this.request<AdminReportQuarterlyResponse>(
            `/admin/reports/quarterly${query ? `?${query}` : ''}`,
        );
    }

    async fetchAdminReportAnnual(
        params: AdminReportAnnualParams,
    ): Promise<AdminReportAnnualResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('year', params.year);
        if (params.compare_with) {
            const normalized = params.compare_with.trim();
            if (normalized.length > 0) {
                searchParams.append('compare_with', normalized);
            }
        }
        if (
            params.compare_with === 'custom' &&
            params.custom_compare &&
            params.custom_compare.trim().length > 0
        ) {
            searchParams.append('custom_compare', params.custom_compare.trim());
        }
        if (params.timezone) {
            const normalized = params.timezone.trim();
            if (normalized.length > 0) {
                searchParams.append('timezone', normalized);
            }
        }
        const query = searchParams.toString();
        return this.request<AdminReportAnnualResponse>(
            `/admin/reports/annual${query ? `?${query}` : ''}`,
        );
    }

    async getCategories(): Promise<ApiListResult<CarCategory>> {
        return this.request<ApiListResult<CarCategory>>(`/car-categories`);
    }

    async createCategory(payload: { name: string; description?: string }): Promise<ApiItemResult<CarCategory>> {
        return this.request<ApiItemResult<CarCategory>>(`/car-categories`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateCategory(id: number, payload: { name: string; description?: string }): Promise<ApiItemResult<CarCategory>> {
        return this.request<ApiItemResult<CarCategory>>(`/car-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async deleteCategory(id: number): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/car-categories/${id}`, {
            method: 'DELETE',
        });
    }

    async getCategoryPrices(categoryId: number): Promise<{
        prices: CategoryPrice[];
        priceCalendar: CategoryPriceCalendar | null;
    }> {
        const res = await this.request<ApiListResult<UnknownRecord>>(
            `/prices?category_id=${categoryId}&per_page=100`
        );

        const rawData = Array.isArray((res as { data?: UnknownRecord[] }).data)
            ? (res as { data?: UnknownRecord[] }).data
            : Array.isArray(res)
                ? res
                : [];
        const items: UnknownRecord[] = Array.isArray(rawData) ? rawData : [];

        const calendarCandidate = items.find((item) => {
            const value = item?.price_calendar;
            return value && typeof value === 'object';
        })?.price_calendar;
        const calendarSource = (calendarCandidate && typeof calendarCandidate === 'object')
            ? (calendarCandidate as UnknownRecord)
            : null;

        const parsePercentage = (value: unknown) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : 0;
        };

        const priceCalendar: CategoryPriceCalendar | null = calendarSource
            ? {
                  id: Number(calendarSource.id),
                  category_id: Number(calendarSource.category_id),
                  jan: parsePercentage(calendarSource.jan),
                  feb: parsePercentage(calendarSource.feb),
                  mar: parsePercentage(calendarSource.mar),
                  apr: parsePercentage(calendarSource.apr),
                  may: parsePercentage(calendarSource.may),
                  jun: parsePercentage(calendarSource.jun),
                  jul: parsePercentage(calendarSource.jul),
                  aug: parsePercentage(calendarSource.aug),
                  sep: parsePercentage(calendarSource.sep),
                  oct: parsePercentage(calendarSource.oct),
                  nov: parsePercentage(calendarSource.nov),
                  dec: parsePercentage(calendarSource.dec),
                  created_at: typeof calendarSource.created_at === 'string' ? calendarSource.created_at : undefined,
                  updated_at: typeof calendarSource.updated_at === 'string' ? calendarSource.updated_at : undefined,
              }
            : null;

        const prices = items
            .map((item) => {
                const { price_calendar: _calendar, category: _category, ...rest } =
                    item ?? {};
                const record = rest as UnknownRecord;
                const days = Number(record.days);
                const daysEnd = Number(record.days_end);

                if (!Number.isFinite(days) || !Number.isFinite(daysEnd)) {
                    return null;
                }

                const priceValue =
                    typeof record.price === "number"
                        ? record.price.toString()
                        : record.price ?? "";

                return {
                    ...record,
                    days,
                    days_end: daysEnd,
                    price: priceValue,
                } as CategoryPrice;
            })
            .filter((item): item is CategoryPrice => item !== null)
            .sort((a, b) => a.days - b.days);

        return { prices, priceCalendar };
    }

    async createCategoryPrice(payload: { category_id: number; days: number; days_end: number; price: number }): Promise<ApiItemResult<CategoryPrice>> {
        return this.request<ApiItemResult<CategoryPrice>>(`/prices`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateCategoryPrice(id: number, payload: { category_id: number; days: number; days_end: number; price: number }): Promise<ApiItemResult<CategoryPrice>> {
        return this.request<ApiItemResult<CategoryPrice>>(`/prices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async deleteCategoryPrice(id: number): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/prices/${id}`, {
            method: 'DELETE',
        });
    }

    async createCategoryPriceCalendar(payload: CategoryPriceCalendarPayload): Promise<ApiItemResult<CategoryPriceCalendar>> {
        return this.request<ApiItemResult<CategoryPriceCalendar>>(`/price-calendar`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateCategoryPriceCalendar(
        id: number,
        payload: CategoryPriceCalendarPayload,
    ): Promise<ApiItemResult<CategoryPriceCalendar>> {
        return this.request<ApiItemResult<CategoryPriceCalendar>>(`/price-calendar/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`
            },
        });
    }

    async getDynamicPrices(): Promise<ApiListResult<DynamicPrice>> {
        return this.request<ApiListResult<DynamicPrice>>(`/dynamic-prices`);
    }

    async createDynamicPrice(payload: DynamicPricePayload): Promise<ApiItemResult<DynamicPrice>> {
        return this.request<ApiItemResult<DynamicPrice>>(`/dynamic-prices`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateDynamicPrice(id: number, payload: DynamicPricePayload): Promise<ApiItemResult<DynamicPrice>> {
        return this.request<ApiItemResult<DynamicPrice>>(`/dynamic-prices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async toggleDynamicPrice(id: number, enabled: boolean): Promise<ApiItemResult<DynamicPrice>> {
        return this.request<ApiItemResult<DynamicPrice>>(`/dynamic-prices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ enabled }),
        });
    }

    async deleteDynamicPrice(id: number): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/dynamic-prices/${id}`, {
            method: 'DELETE',
        });
    }

    async getActivities(params: ActivityListParams = {}): Promise<ApiListResult<ActivityRecord>> {
        const query = toQuery(params);
        return this.request<ApiListResult<ActivityRecord>>(
            query ? `/activities?${query}` : `/activities`,
        );
    }

    async getActivity(id: number | string): Promise<ApiItemResult<ActivityRecord>> {
        return this.request<ApiItemResult<ActivityRecord>>(`/activities/${id}`);
    }

    async createActivity(payload: ActivityPayload): Promise<ApiItemResult<ActivityRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<ActivityRecord>>(`/activities`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateActivity(
        id: number | string,
        payload: ActivityUpdatePayload,
    ): Promise<ApiItemResult<ActivityRecord>> {
        const body = sanitizePayload(payload);
        return this.request<ApiItemResult<ActivityRecord>>(`/activities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteActivity(id: number | string): Promise<ApiDeleteResponse> {
        return this.request<ApiDeleteResponse>(`/activities/${id}`, {
            method: 'DELETE',
        });
    }

    async getActivityWeeklySummary(
        params: ActivityWeeklySummaryParams = {},
    ): Promise<ActivityWeeklySummary | null> {
        const query = toQuery(params);
        const response = await this.request<ApiItemResult<ActivityWeeklySummary>>(
            query ? `/activities/weekly-summary?${query}` : `/activities/weekly-summary`,
        );
        return extractItem(response);
    }

    async dispatchActivityWeeklySummary(
        payload: ActivityWeeklySummaryDispatchPayload,
    ): Promise<ActivityWeeklySummaryDispatchResponse> {
        const body = sanitizePayload(payload);
        const response = await this.request<
            ApiItemResult<ActivityWeeklySummaryDispatchResponse>
        >(`/activities/weekly-summary/dispatch`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        const dispatchPayload = extractItem(response);
        if (!dispatchPayload) {
            throw new Error('Răspuns invalid pentru dispatch-ul sumarului săptămânal.');
        }
        return dispatchPayload;
    }

    async markActivitiesPaid(
        payload: ActivityMarkPaidPayload,
    ): Promise<ActivityMarkPaidResponse> {
        const body = sanitizePayload(payload);
        const response = await this.request<ApiItemResult<ActivityMarkPaidResponse>>(
            `/activities/mark-paid`,
            {
                method: 'POST',
                body: JSON.stringify(body),
            },
        );
        const markPayload = extractItem(response);
        if (!markPayload) {
            throw new Error('Răspuns invalid pentru marcarea activităților ca achitate.');
        }
        return markPayload;
    }

}

export const createApiClient = (baseURL: string = API_BASE_URL): ApiClient => new ApiClient(baseURL);
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
