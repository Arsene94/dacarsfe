import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEZONE = "Europe/Bucharest";
const BASELINE_MONTH = "2025-03";
const EXCHANGE_RATE = 5;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/u;

interface MonthlyCarUsageCar {
    car_id: number;
    car_name: string;
    license_plate: string;
    days_rented: number;
    bookings_count: number;
    total_revenue: number;
    total_revenue_ron: number;
    average_daily_rate: number;
    average_daily_rate_ron: number;
}

interface BaseCarTemplate {
    car_id: number;
    car_name: string;
    license_plate: string;
    days_rented: number;
    bookings_count: number;
    total_revenue: number;
}

const BASE_CAR_TEMPLATE: readonly BaseCarTemplate[] = [
    {
        car_id: 12,
        car_name: "Dacia Duster 4x4",
        license_plate: "B-23-ABC",
        days_rented: 22,
        bookings_count: 6,
        total_revenue: 18240,
    },
    {
        car_id: 14,
        car_name: "VW Tiguan R-Line",
        license_plate: "CJ-44-XYZ",
        days_rented: 18,
        bookings_count: 5,
        total_revenue: 13460,
    },
    {
        car_id: 21,
        car_name: "Renault Austral E-Tech",
        license_plate: "CJ-55-LUP",
        days_rented: 55,
        bookings_count: 12,
        total_revenue: 37290,
    },
    {
        car_id: 22,
        car_name: "Toyota RAV4 Plug-in",
        license_plate: "B-88-TYT",
        days_rented: 48,
        bookings_count: 11,
        total_revenue: 33024,
    },
    {
        car_id: 24,
        car_name: "BMW X3 M Sport",
        license_plate: "IF-08-BMW",
        days_rented: 62,
        bookings_count: 14,
        total_revenue: 43680,
    },
    {
        car_id: 27,
        car_name: "Audi Q5 Quattro",
        license_plate: "B-66-AQD",
        days_rented: 45,
        bookings_count: 10,
        total_revenue: 31590,
    },
    {
        car_id: 28,
        car_name: "Skoda Karoq Style",
        license_plate: "SB-12-SKD",
        days_rented: 38,
        bookings_count: 9,
        total_revenue: 24840,
    },
    {
        car_id: 33,
        car_name: "Mercedes GLC AMG Line",
        license_plate: "B-77-MBZ",
        days_rented: 32,
        bookings_count: 7,
        total_revenue: 22156,
    },
    {
        car_id: 35,
        car_name: "Hyundai Tucson N Line",
        license_plate: "CJ-34-HTN",
        days_rented: 44,
        bookings_count: 8,
        total_revenue: 29520,
    },
    {
        car_id: 40,
        car_name: "Ford Kuga Titanium",
        license_plate: "B-45-KGA",
        days_rented: 48,
        bookings_count: 9,
        total_revenue: 33600,
    },
];

const capitalizeFirstLetter = (value: string): string =>
    value.replace(/^[\p{L}]/u, (match) => match.toUpperCase());

const isValidTimezone = (value: string): boolean => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
        return true;
    } catch {
        return false;
    }
};

const getCurrentMonthInTimezone = (timezone: string): string => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const formatted = formatter.format(new Date());
    return formatted.slice(0, 7);
};

const formatMonthLabel = (month: string, timezone: string): string => {
    const [year, monthValue] = month.split("-").map((value) => Number.parseInt(value, 10));
    const date = new Date(Date.UTC(year, (monthValue || 1) - 1, 1));
    const formatter = new Intl.DateTimeFormat("ro-RO", {
        timeZone: timezone,
        month: "long",
        year: "numeric",
    });
    return capitalizeFirstLetter(formatter.format(date));
};

const computeScalingFactor = (month: string): number => {
    if (month === BASELINE_MONTH) {
        return 1;
    }

    const base = Array.from(month).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = (base % 21) - 10; // results between -10 and +10
    return 1 + offset / 100;
};

const toCarStats = (
    template: BaseCarTemplate,
    factor: number,
): MonthlyCarUsageCar => {
    const days = Math.max(5, Math.round(template.days_rented * factor));
    const bookings = Math.max(1, Math.round(template.bookings_count * factor));
    const revenue = Math.max(1500, Math.round(template.total_revenue * factor));
    const average = days > 0 ? revenue / days : 0;
    const averageEur = Number(average.toFixed(2));
    const averageRon = Number((average * EXCHANGE_RATE).toFixed(2));

    return {
        car_id: template.car_id,
        car_name: template.car_name,
        license_plate: template.license_plate,
        days_rented: days,
        bookings_count: bookings,
        total_revenue: revenue,
        total_revenue_ron: revenue * EXCHANGE_RATE,
        average_daily_rate: averageEur,
        average_daily_rate_ron: averageRon,
    };
};

const buildCarsForMonth = (month: string): MonthlyCarUsageCar[] => {
    const baseFactor = computeScalingFactor(month);

    const cars = BASE_CAR_TEMPLATE.map((template, index) => {
        if (month === BASELINE_MONTH) {
            return toCarStats(template, 1);
        }

        const variability = 1 + ((index % 5) - 2) * 0.0125;
        const factor = baseFactor * variability;
        return toCarStats(template, factor);
    });

    return cars;
};

const buildSummary = (cars: MonthlyCarUsageCar[]) => {
    const totalDays = cars.reduce((acc, car) => acc + car.days_rented, 0);
    const totalRevenueEur = cars.reduce((acc, car) => acc + car.total_revenue, 0);
    const totalRevenueRon = cars.reduce((acc, car) => acc + car.total_revenue_ron, 0);

    const averageEur = totalDays > 0 ? Number((totalRevenueEur / totalDays).toFixed(2)) : 0;
    const averageRon = totalDays > 0 ? Number((totalRevenueRon / totalDays).toFixed(2)) : 0;

    return {
        total_days_rented: totalDays,
        total_revenue: {
            eur: totalRevenueEur,
            ron: totalRevenueRon,
        },
        average_daily_rate: {
            eur: averageEur,
            ron: averageRon,
        },
    };
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const timezoneParam = url.searchParams.get("timezone");
    const timezone = timezoneParam && timezoneParam.trim().length > 0 ? timezoneParam.trim() : DEFAULT_TIMEZONE;

    if (!isValidTimezone(timezone)) {
        return NextResponse.json(
            { error: "Parametrul timezone nu este recunoscut." },
            { status: 400 },
        );
    }

    const monthParam = url.searchParams.get("month");
    let month: string;

    if (monthParam && monthParam.trim().length > 0) {
        const normalized = monthParam.trim();
        if (!MONTH_PATTERN.test(normalized)) {
            return NextResponse.json(
                { error: "Parametrul month trebuie să fie în formatul YYYY-MM." },
                { status: 400 },
            );
        }
        month = normalized;
    } else {
        month = getCurrentMonthInTimezone(timezone);
    }

    const carIdParam = url.searchParams.get("car_id");
    let carId: number | null = null;

    if (carIdParam !== null) {
        const normalized = carIdParam.trim();
        if (normalized.length === 0) {
            return NextResponse.json(
                { error: "Parametrul car_id trebuie să fie un număr întreg valid." },
                { status: 400 },
            );
        }
        const parsed = Number(normalized);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
            return NextResponse.json(
                { error: "Parametrul car_id trebuie să fie un număr întreg valid." },
                { status: 400 },
            );
        }
        carId = parsed;
    }

    const cars = buildCarsForMonth(month);
    const filteredCars = typeof carId === "number" ? cars.filter((car) => car.car_id === carId) : cars;
    const summary = buildSummary(filteredCars);

    return NextResponse.json({
        period: {
            month,
            label: formatMonthLabel(month, timezone),
        },
        filters: {
            car_id: carId,
        },
        currency: "EUR",
        currency_secondary: "RON",
        summary,
        cars: filteredCars,
    });
}
