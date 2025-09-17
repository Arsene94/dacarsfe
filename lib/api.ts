import { mapCarSearchFilters } from "@/lib/mapFilters";
import { toQuery } from "@/lib/qs";
import type { AuthResponse, User } from "@/types/auth";
import type { WidgetActivityResponse } from "@/types/activity";
import type {
    CategoryPrice,
    CategoryPriceCalendar,
} from "@/types/admin";
import type { Role } from "@/types/roles";
import type { WheelOfFortunePrizePayload } from "@/types/wheel";

type CategoryPriceCalendarPayload = Omit<
    CategoryPriceCalendar,
    "id" | "created_at" | "updated_at"
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const sanitizePayload = <T extends Record<string, any>>(payload: T) => {
    const cleaned: Record<string, any> = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (typeof value !== "undefined") {
            cleaned[key] = value;
        }
    });
    return cleaned;
};

class ApiClient {
    private baseURL: string;
    private token: string | null = null;

    constructor(baseURL: string) {
        this.baseURL = baseURL;

        // Get token from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
        }
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
        }
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
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
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
        limit?: number,
        page?: number,
        perPage?: number,
        search?: string,
        start_date?: string,
        end_date?: string
    } = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value.toString());
            }
        });
        const query = searchParams.toString();
        return this.request<any>(`/cars${query ? `?${query}` : ''}`);
    }

    async getHomePageCars(params: {
        limit?: number,
        page?: number,
        perPage?: number
    }) {
        const searchParams = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value.toString());
            }
        });

        return this.request<any>(`/cars?${searchParams.toString()}`);

    }

    async getCarsByDateCriteria(uiPayload: any){
        const mapped = mapCarSearchFilters(uiPayload);
        const query  = toQuery(mapped);
        return this.request<any>(`/cars?${query}`);
    }

    async createCar(payload: Record<string, any> | FormData) {
        if (typeof FormData !== 'undefined' && payload instanceof FormData) {
            return this.request<any>(`/cars`, {
                method: 'POST',
                body: payload,
            });
        }

        const cleanPayload = JSON.parse(JSON.stringify(payload));
        return this.request<any>(`/cars`, {
            method: 'POST',
            body: JSON.stringify(cleanPayload),
        });
    }

    async updateCar(id: number, payload: Record<string, any> | FormData) {
        if (typeof FormData !== 'undefined' && payload instanceof FormData) {
            return this.request<any>(`/cars/${id}`, {
                method: 'PUT',
                body: payload,
            });
        }

        const cleanPayload = JSON.parse(JSON.stringify(payload));
        return this.request<any>(`/cars/${id}`, {
            method: 'PUT',
            body: JSON.stringify(cleanPayload),
        });
    }

    async getCarMakes(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<any>(`/car-makes${query ? `?${query}` : ''}`);
    }

    async getCarMake(id: number | string) {
        return this.request<any>(`/car-makes/${id}`);
    }

    async getCarTypes(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<any>(`/car-types${query ? `?${query}` : ''}`);
    }

    async getCarType(id: number | string) {
        return this.request<any>(`/car-types/${id}`);
    }

    async getCarTransmissions(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<any>(`/car-transmissions${query ? `?${query}` : ''}`);
    }

    async getCarTransmission(id: number | string) {
        return this.request<any>(`/car-transmissions/${id}`);
    }

    async getCarFuels(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<any>(`/car-fuels${query ? `?${query}` : ''}`);
    }

    async getCarFuel(id: number | string) {
        return this.request<any>(`/car-fuels/${id}`);
    }

    async getCarCategories(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit || params.limit === 0) {
            searchParams.append('limit', (params.limit ?? 0).toString());
        } else {
            searchParams.append('limit', '100');
        }
        const query = searchParams.toString();
        return this.request<any>(`/car-categories${query ? `?${query}` : ''}`);
    }

    async getCarCategory(id: number | string) {
        return this.request<any>(`/car-categories/${id}`);
    }

    async getCarColors(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<any>(`/car-colors${query ? `?${query}` : ''}`);
    }

    async getCarColor(id: number | string) {
        return this.request<any>(`/car-colors/${id}`);
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
    ) {
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
        return this.request<any>(`/users${query ? `?${query}` : ''}`);
    }

    async getUser(
        id: number | string,
        params: { includeRoles?: boolean } = {},
    ) {
        const searchParams = new URLSearchParams();
        if (params.includeRoles) {
            searchParams.append('include', 'roles');
        }
        const query = searchParams.toString();
        return this.request<any>(`/users/${id}${query ? `?${query}` : ''}`);
    }

    async createUser(payload: UserPayload) {
        const body = sanitizePayload(payload);
        return this.request<any>(`/users`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateUser(id: number | string, payload: UserPayload) {
        const body = sanitizePayload(payload);
        return this.request<any>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async makeUserSuper(id: number | string) {
        return this.request<any>(`/users/${id}/super`, {
            method: 'POST',
        });
    }

    async removeUserSuper(id: number | string) {
        return this.request<any>(`/users/${id}/super`, {
            method: 'DELETE',
        });
    }

    async deleteUser(id: number | string) {
        return this.request<any>(`/users/${id}`, {
            method: 'DELETE',
        });
    }

    async getRoles(
        params: {
            page?: number;
            perPage?: number;
            includePermissions?: boolean;
        } = {},
    ) {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.perPage) searchParams.append('per_page', params.perPage.toString());
        if (params.includePermissions) {
            searchParams.append('include', 'permissions');
        }
        const query = searchParams.toString();
        return this.request<{ data: Role[]; meta?: any; links?: any }>(
            `/roles${query ? `?${query}` : ''}`,
        );
    }

    async getRole(
        id: number | string,
        params: { includePermissions?: boolean } = {},
    ) {
        const searchParams = new URLSearchParams();
        if (params.includePermissions) {
            searchParams.append('include', 'permissions');
        }
        const query = searchParams.toString();
        return this.request<Role>(`/roles/${id}${query ? `?${query}` : ''}`);
    }

    async createRole(payload: RolePayload) {
        const body = sanitizePayload(payload);
        return this.request<Role>(`/roles`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async updateRole(id: number | string, payload: RolePayload) {
        const body = sanitizePayload(payload);
        return this.request<Role>(`/roles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteRole(id: number | string) {
        return this.request<{ message: string }>(`/roles/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarForBooking(uiPayload: any) {
        const mapped = mapCarSearchFilters(uiPayload);
        const query  = toQuery(mapped);
        return this.request<any>(`/cars/${uiPayload.car_id}/info-for-booking?${query}`);
    }

    async getServices() {
        return this.request<any>(`/services`);
    }

    async createService(payload: { name: string; price: number }) {
        return this.request<any>(`/services`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateService(id: number, payload: { name: string; price: number }) {
        return this.request<any>(`/services/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async validateDiscountCode(params: { code: string, car_id: number, start_date: any, end_date: any, price: any, price_casco: any, total_price: any, total_price_casco: any }) {
        return this.request<any>(`/coupons/validate`, {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }

    async checkCarAvailability(params: { car_id: number, start_date: string, end_date: string }) {
        return this.request<any>(`/bookings/availability/check`, {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async createBooking(payload: any) {
        return this.request<any>(`/bookings`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateBooking(id: any, payload: any) {
        return this.request<any>(`/bookings/${id}`, {
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

    async generateContract(payload: any, id?: any) {
        return this.request<any>(`/bookings/contract/${id}`, {
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

    async storeAndGenerateContract(payload: any) {
        return this.request<any>(`/bookings/store-contract`, {
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

    async updateBookingDate(id: any, params: { arrivalDate: string | undefined, arrivalTime: string | undefined, returnDate: string | undefined, returnTime: string | undefined }) {
        return this.request<any>(`/bookings/${id}/update-date`, {
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
    async getBookingInfo(id: any) {
        return this.request<any>(`/bookings/${id}`)
    }

    async getBookings(params: {
        page?: number;
        perPage?: number;
        search?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
    } = {}) {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.perPage) searchParams.append('per_page', params.perPage.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.status) searchParams.append('status', params.status);
        if (params.start_date) searchParams.append('start_date', params.start_date);
        if (params.end_date) searchParams.append('end_date', params.end_date);
        const query = searchParams.toString();
        return this.request<any>(`/bookings${query ? `?${query}` : ''}`);
    }

    async quotePrice(payload: any) {
        return this.request<any>(`/bookings/quote`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }

    async getCustomers(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<any>(`/customers${query ? `?${query}` : ''}`);
    }

    async searchCustomersByPhone(phone: string) {
        return this.request<any>(`/customers/get/byphone`, {
            method: 'POST',
            body: JSON.stringify({ phone }),
        });
    }

    async getWheelOfFortunePeriods(params: {
        page?: number;
        per_page?: number;
        limit?: number;
        active?: number | boolean;
        is_active?: number | boolean;
    } = {}) {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const appendBooleanParam = (key: string, value: number | boolean) => {
            const normalized = typeof value === 'boolean'
                ? value ? '1' : '0'
                : value.toString();
            searchParams.append(key, normalized);
        };
        if (typeof params.active !== 'undefined') {
            appendBooleanParam('active', params.active);
        }
        if (typeof params.is_active !== 'undefined') {
            appendBooleanParam('is_active', params.is_active);
        }
        const query = searchParams.toString();
        return this.request<any>(`/wheel-of-fortune-periods${query ? `?${query}` : ''}`);
    }

    async createWheelOfFortunePeriod(payload: {
        name: string;
        start_at?: string | null;
        end_at?: string | null;
        active?: boolean;
        is_active?: boolean;
        description?: string | null;
    }) {
        const body = sanitizePayload({
            ...payload,
            ...(typeof payload.active === 'boolean'
                ? { active: payload.active }
                : {}),
            ...(typeof payload.is_active === 'boolean'
                ? { is_active: payload.is_active }
                : {}),
        });
        return this.request<any>(`/wheel-of-fortune-periods`, {
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
            active?: boolean;
            is_active?: boolean;
            description?: string | null;
        },
    ) {
        const body = sanitizePayload({
            ...payload,
            ...(typeof payload.active === 'boolean'
                ? { active: payload.active }
                : {}),
            ...(typeof payload.is_active === 'boolean'
                ? { is_active: payload.is_active }
                : {}),
        });
        return this.request<any>(`/wheel-of-fortune-periods/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteWheelOfFortunePeriod(id: number) {
        return this.request<any>(`/wheel-of-fortune-periods/${id}`, {
            method: 'DELETE',
        });
    }

    async getWheelOfFortunes(params: {
        period_id?: number;
        page?: number;
        per_page?: number;
        limit?: number;
        is_active?: boolean;
    } = {}) {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (typeof params.period_id !== 'undefined') {
            searchParams.append('period_id', params.period_id.toString());
        }
        if (typeof params.is_active !== 'undefined') {
            const value = params.is_active ? '1' : '0';
            searchParams.append('is_active', value);
        }
        const query = searchParams.toString();
        return this.request<any>(`/wheel-of-fortunes${query ? `?${query}` : ''}`);
    }

    async createWheelOfFortune(payload: {
        period_id: number;
        title: string;
        description?: string | null;
        amount?: number | null;
        color: string;
        probability: number;
        type: string;
    }) {
        const body = sanitizePayload(payload);
        return this.request<any>(`/wheel-of-fortunes`, {
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
    ) {
        const body = sanitizePayload(payload);
        return this.request<any>(`/wheel-of-fortunes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async deleteWheelOfFortune(id: number) {
        return this.request<any>(`/wheel-of-fortunes/${id}`, {
            method: 'DELETE',
        });
    }

    async createWheelOfFortunePrize(payload: WheelOfFortunePrizePayload) {
        const body = sanitizePayload(payload);
        return this.request<any>(`/wheel-of-fortune-prizes`, {
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
    } = {}) {
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
        return this.request<any>(`/wheel-of-fortune-prizes${query ? `?${query}` : ''}`);
    }

    // Authentication helpers

    async login(payload: { login: string; password: string }): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>(`/auth/login`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (response?.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async me(): Promise<User> {
        return this.request<User>(`/auth/me`);
    }

    async logout(): Promise<void> {
        await this.request(`/auth/logout`, { method: 'POST' });
        this.removeToken();
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

    async fetchAdminBookingsToday(params: { by?: string; statuses?: string } = {}) {
        const searchParams = new URLSearchParams();
        if (params.by) searchParams.append('by', params.by);
        if (params.statuses) searchParams.append('statuses', params.statuses);
        const query = searchParams.toString();
        return this.request<any>(`/admin/metrics/bookings-today${query ? `?${query}` : ''}`);
    }

    async fetchAdminCarsTotal(params: { status?: string } = {}) {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.append('status', params.status);
        const query = searchParams.toString();
        return this.request<any>(`/admin/metrics/cars-total${query ? `?${query}` : ''}`);
    }

    async fetchAdminBookingsTotal(params: { statuses?: string } = {}) {
        const searchParams = new URLSearchParams();
        if (params.statuses) searchParams.append('statuses', params.statuses);
        const query = searchParams.toString();
        return this.request<any>(`/admin/metrics/bookings-total${query ? `?${query}` : ''}`);
    }

    async getCategories() {
        return this.request<any>(`/car-categories`);
    }

    async createCategory(payload: { name: string; description?: string }) {
        return this.request<any>(`/car-categories`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateCategory(id: number, payload: { name: string; description?: string }) {
        return this.request<any>(`/car-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async deleteCategory(id: number) {
        return this.request<any>(`/car-categories/${id}`, {
            method: 'DELETE',
        });
    }

    async getCategoryPrices(categoryId: number): Promise<{
        prices: CategoryPrice[];
        priceCalendar: CategoryPriceCalendar | null;
    }> {
        const res = await this.request<any>(
            `/prices?category_id=${categoryId}&per_page=100`
        );

        const rawData = Array.isArray(res?.data) ? res.data : res;
        const items: any[] = Array.isArray(rawData) ? rawData : [];

        const calendarSource = items.find(
            (item) => item && item.price_calendar
        )?.price_calendar;

        const parsePercentage = (value: unknown) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : 0;
        };

        const priceCalendar: CategoryPriceCalendar | null = calendarSource
            ? {
                  id: calendarSource.id,
                  category_id: calendarSource.category_id,
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
                  created_at: calendarSource.created_at,
                  updated_at: calendarSource.updated_at,
              }
            : null;

        const prices = items
            .map((item) => {
                const { price_calendar: _calendar, category: _category, ...rest } =
                    item ?? {};
                const days = Number(rest.days);
                const daysEnd = Number(rest.days_end);

                if (!Number.isFinite(days) || !Number.isFinite(daysEnd)) {
                    return null;
                }

                const priceValue =
                    typeof rest.price === "number"
                        ? rest.price.toString()
                        : rest.price ?? "";

                return {
                    ...rest,
                    days,
                    days_end: daysEnd,
                    price: priceValue,
                } as CategoryPrice;
            })
            .filter((item): item is CategoryPrice => item !== null)
            .sort((a, b) => a.days - b.days);

        return { prices, priceCalendar };
    }

    async createCategoryPrice(payload: { category_id: number; days: number; days_end: number; price: number }) {
        return this.request<any>(`/prices`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateCategoryPrice(id: number, payload: { category_id: number; days: number; days_end: number; price: number }) {
        return this.request<any>(`/prices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async deleteCategoryPrice(id: number) {
        return this.request<any>(`/prices/${id}`, {
            method: 'DELETE',
        });
    }

    async createCategoryPriceCalendar(payload: CategoryPriceCalendarPayload) {
        return this.request<any>(`/price-calendars`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateCategoryPriceCalendar(
        id: number,
        payload: CategoryPriceCalendarPayload,
    ) {
        return this.request<any>(`/price-calendars/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async getDynamicPrices() {
        return this.request<any>(`/dynamic-prices`);
    }

    async createDynamicPrice(payload: any) {
        return this.request<any>(`/dynamic-prices`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateDynamicPrice(id: number, payload: any) {
        return this.request<any>(`/dynamic-prices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    async toggleDynamicPrice(id: number, enabled: boolean) {
        return this.request<any>(`/dynamic-prices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ enabled }),
        });
    }

    async deleteDynamicPrice(id: number) {
        return this.request<any>(`/dynamic-prices/${id}`, {
            method: 'DELETE',
        });
    }

}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
