// mapFilters.ts
export function mapCarSearchFilters(payload: any) {
    return {
        // perioada pentru preț dinamic
        start_date: payload.start_date ?? payload.startDate ?? undefined,
        end_date:   payload.end_date   ?? payload.endDate   ?? undefined,

        // paging / limit
        page:      payload.page ?? undefined,
        per_page:  payload.per_page ?? undefined,
        limit:     payload.limit ?? undefined, // dacă vrei ?limit=4 (non-paginat)

        // sort (ex: '-weight_front' sau 'year:desc' – după cum ai implementat)
        sort_by: payload.sort_by ?? undefined,

        // filtre business (mapează la ce acceptă CarController/HandlesFiltering)
        make_id:           payload.make_id ?? undefined,
        vehicle_type_id:   payload.vehicle_type      ?? payload.car_type ?? undefined,
        transmission_id:   payload.transmission      ?? undefined,
        fuel_type_id:      payload.fuel              ?? undefined,
        number_of_seats:   payload.seats             ?? undefined, // dacă ai suport în backend
        year:              payload.year              ?? undefined,

        // căutare
        name_like: payload.search ?? undefined,

        // include relații utile (poți lăsa frontendul să le trimită sau hardcode)
        include: payload.include ?? 'make,type,transmission,fuel,categories,colors',
    };
}
