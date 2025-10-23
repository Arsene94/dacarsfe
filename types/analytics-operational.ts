export type OperationalOverview = {
    fleet_utilization_rate: number;
    average_idle_time: number;
    maintenance_cost_avg: number;
    total_km_driven: number;
};

export type OperationalTopCar = {
    id: number | string;
    licensePlate: string;
    carName?: string | null;
    profit: number;
};

export type OperationalMaintenanceTrend = {
    label: string;
    cost: number;
};

export type OperationalTopCarApi = {
    id?: number | string | null;
    car_id?: number | string | null;
    vehicle_id?: number | string | null;
    uuid?: string | null;
    name?: string | null;
    car_name?: string | null;
    model?: string | null;
    license_plate?: string | null;
    car_license_plate?: string | null;
    registration?: string | null;
    plate?: string | null;
    profit?: number | string | null;
    total_profit?: number | string | null;
    net_profit?: number | string | null;
    netProfit?: number | string | null;
    value?: number | string | null;
    amount?: number | string | null;
    revenue?: number | string | null;
    utilization_rate?: number | string | null;
    total_reservations?: number | string | null;
    average_revenue?: number | string | null;
    maintenance_cost?: number | string | null;
};

export type OperationalMaintenanceTrendApi = {
    label?: string | null;
    period?: string | null;
    date?: string | null;
    month?: string | null;
    cost?: number | string | null;
    total_cost?: number | string | null;
    value?: number | string | null;
    amount?: number | string | null;
};

export type OperationalTopResponse = {
    top_cars?: (OperationalTopCarApi | null)[] | null;
    topCars?: (OperationalTopCarApi | null)[] | null;
    cars?: (OperationalTopCarApi | null)[] | null;
    vehicles?: (OperationalTopCarApi | null)[] | null;
    top_vehicles?: (OperationalTopCarApi | null)[] | null;
    topVehicles?: (OperationalTopCarApi | null)[] | null;
    leaderboard?: (OperationalTopCarApi | null)[] | null;
    top?: (OperationalTopCarApi | null)[] | null;
    rankings?: (OperationalTopCarApi | null)[] | null;
    top10?: (OperationalTopCarApi | null)[] | null;
    profit_leaders?: (OperationalTopCarApi | null)[] | null;
    items?: (OperationalTopCarApi | null)[] | null;
    data?: (OperationalTopCarApi | null)[] | null;
    maintenance_trends?: (OperationalMaintenanceTrendApi | null)[] | null;
    maintenanceTrends?: (OperationalMaintenanceTrendApi | null)[] | null;
    trends?: (OperationalMaintenanceTrendApi | null)[] | null;
    maintenance?: (OperationalMaintenanceTrendApi | null)[] | null;
    maintenance_costs?: (OperationalMaintenanceTrendApi | null)[] | null;
    cost_trends?: (OperationalMaintenanceTrendApi | null)[] | null;
    timeline?: (OperationalMaintenanceTrendApi | null)[] | null;
    series?: (OperationalMaintenanceTrendApi | null)[] | null;
    history?: (OperationalMaintenanceTrendApi | null)[] | null;
};
