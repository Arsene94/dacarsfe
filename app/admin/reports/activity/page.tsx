"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type { ActivityReservation, WidgetActivityResponse } from "@/types/activity";

const toDateInputValue = (date: Date): string => date.toISOString().slice(0, 10);

const formatDateTime = (value: string): string => {
    if (!value) {
        return "—";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("ro-RO", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const ActivityReportsPage = () => {
    const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(new Date()));
    const [activity, setActivity] = useState<WidgetActivityResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchActivity = useCallback(async () => {
        if (!selectedDate) {
            setError("Selectează o dată pentru a vedea activitatea.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.fetchWidgetActivityByDate(selectedDate);
            setActivity(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Nu am putut încărca activitatea.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    const schedule = useMemo(() => {
        if (!activity) {
            return [] as { hour: string; events: ActivityReservation[] }[];
        }

        return activity.hours
            .map((hour) => ({
                hour,
                events: activity.data.filter((reservation) => {
                    const rentalStartDate = reservation.rental_start_date.slice(0, 10);
                    const rentalEndDate = reservation.rental_end_date.slice(0, 10);
                    return (
                        (rentalStartDate === activity.day && reservation.start_hour_group.slice(0, 5) === hour) ||
                        (rentalEndDate === activity.day && reservation.end_hour_group.slice(0, 5) === hour)
                    );
                }),
            }))
            .filter((entry) => entry.events.length > 0);
    }, [activity]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-dm-sans text-gray-600">Rapoarte &gt; Activitate zilnică</p>
                <h1 className="text-3xl font-poppins font-semibold text-berkeley">Activitate zilnică</h1>
                <p className="text-sm font-dm-sans text-gray-600">
                    Vizualizează predările și retururile programate pentru o dată specifică, folosind aceleași date ca widget-ul
                    din dashboard.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex w-full flex-col gap-2 md:max-w-sm">
                        <Label htmlFor="activity-date" className="text-sm font-dm-sans font-semibold text-gray-700">
                            Selectează data
                        </Label>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                                <Calendar className="h-4 w-4 text-jade" />
                                <Input
                                    id="activity-date"
                                    type="date"
                                    className="border-0 px-0 shadow-none focus-visible:ring-0"
                                    value={selectedDate}
                                    onChange={(event) => setSelectedDate(event.target.value)}
                                    aria-label="Selectează data pentru activitate"
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="font-dm-sans"
                                onClick={() => setSelectedDate(toDateInputValue(new Date()))}
                            >
                                Azi
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activity && (
                            <div className="text-right">
                                <p className="text-sm font-dm-sans text-gray-600">Rezervări găsite</p>
                                <p className="text-lg font-poppins font-semibold text-berkeley">
                                    {activity.pagination.total}
                                </p>
                            </div>
                        )}
                        <Button
                            type="button"
                            className="font-dm-sans"
                            variant="default"
                            onClick={fetchActivity}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Se încarcă
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Actualizează
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <Loader2 className="h-4 w-4 animate-spin text-jade" />
                        Se încarcă activitatea pentru data selectată...
                    </div>
                )}

                {!loading && activity && (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-dm-sans text-gray-600">Ziua selectată</p>
                                <p className="text-lg font-poppins font-semibold text-berkeley">{activity.day}</p>
                                <p className="text-xs font-dm-sans text-gray-500">{activity.period}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-green-500" aria-hidden />
                                    <span className="text-sm font-dm-sans text-gray-600">Plecare</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-red-500" aria-hidden />
                                    <span className="text-sm font-dm-sans text-gray-600">Sosire</span>
                                </div>
                            </div>
                        </div>

                        {schedule.length === 0 && (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-dm-sans text-gray-600">
                                Nu există predări sau retururi programate pentru această zi.
                            </div>
                        )}

                        <div className="space-y-4">
                            {schedule.map(({ hour, events }) => (
                                <div key={hour} className="rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-3 border-b border-gray-200 bg-gradient-to-r from-berkeley/5 to-jade/5 px-4 py-3">
                                        <Clock className="h-5 w-5 text-berkeley" />
                                        <p className="text-base font-poppins font-semibold text-berkeley">{hour}</p>
                                        <span className="text-sm font-dm-sans text-gray-600">{events.length} rezervări</span>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {events.map((reservation) => {
                                            const startDate = reservation.rental_start_date.slice(0, 10);
                                            const isDeparture =
                                                activity.day === startDate &&
                                                reservation.start_hour_group.slice(0, 5) === hour;

                                            return (
                                                <div
                                                    key={reservation.id}
                                                    className={cn(
                                                        "flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between",
                                                        isDeparture ? "bg-green-50" : "bg-red-50",
                                                    )}
                                                >
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-dm-sans uppercase tracking-wide text-gray-500">
                                                            Rezervarea #{reservation.booking_number}
                                                        </p>
                                                        <p className="text-lg font-poppins font-semibold text-berkeley">
                                                            {reservation.customer_name}
                                                        </p>
                                                        <p className="text-sm font-dm-sans text-gray-600">
                                                            {reservation.car?.name ?? "Mașină neatribuită"}
                                                        </p>
                                                        {reservation.note && (
                                                            <p className="text-sm font-dm-sans text-gray-500">{reservation.note}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p
                                                            className={cn(
                                                                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase",
                                                                isDeparture
                                                                    ? "bg-green-100 text-green-800"
                                                                    : "bg-red-100 text-red-800",
                                                            )}
                                                        >
                                                            {isDeparture ? "Plecare" : "Sosire"}
                                                        </p>
                                                        <p className="text-sm font-dm-sans text-gray-700">
                                                            {isDeparture
                                                                ? formatDateTime(reservation.rental_start_date)
                                                                : formatDateTime(reservation.rental_end_date)}
                                                        </p>
                                                        <p className="text-xs font-dm-sans text-gray-500">
                                                            Interval: {isDeparture ? reservation.start_hour_group : reservation.end_hour_group}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityReportsPage;
