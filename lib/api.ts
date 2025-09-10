import { mapCarSearchFilters } from "@/lib/mapFilters";
import { toQuery } from "@/lib/qs";
import type { AuthResponse, User } from "@/types/auth";
import type { WidgetActivityResponse } from "@/types/activity";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

        const config: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { Authorization: `Bearer ${this.token}` }),
                'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
                ...options.headers,
            },
            credentials: 'include',
            ...options,
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
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return {} as T;
            }
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

    async getCarCategories() {
        return this.request<any>(`/car-categories?limit=100`);
    }

    async getCarForBooking(uiPayload: any) {
        const mapped = mapCarSearchFilters(uiPayload);
        const query  = toQuery(mapped);
        return this.request<any>(`/cars/${uiPayload.car_id}/info-for-booking?${query}`);
    }

    async getServices() {
        return this.request<any>(`/services`);
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

    async updateBookingDate(id: any, params: { arrivalDate: string | undefined, arrivalTime: string | undefined, returnDate: string | undefined, returnTime: string | undefined }) {
        return this.request<any>(`/bookings/${id}/update-date`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${this.token}`
            },
            credentials: 'include',
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

    async getCustomers(params: { search?: string; limit?: number } = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<any>(`/customers${query ? `?${query}` : ''}`);
    }

    async getClientByPhone(phone: string) {
        return this.request<any>(`/customers/get/byphone`, {
            method: 'POST',
            body: JSON.stringify({phone})
        })
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
            credentials: 'include',
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

}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
