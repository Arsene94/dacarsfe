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
                ...(this.token && { Authorization: `Bearer 27|7YBKC3eaKss2qhy5EVEbMr0CfJo04vE48v7Fnpco788b99fd` }),
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

        return this.request<any>(`/front/cars?${searchParams.toString()}`);

    }

    async getCarsByDateCriteria(payload: any){
        return this.request<any>(`/front/cars/paginate`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }

    async getCarCategories() {
        return this.request<any>(`/front/cars/categories`);
    }

    async getCarForBooking(params: { car_id: number; start_date: string; end_date: string }) {
        return this.request<any>(`/front/cars/booking`, {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
