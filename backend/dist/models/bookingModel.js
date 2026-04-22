import { getEnvConfig } from "../config/env.js";
import { getSupabaseAdmin } from "../config/supabase.js";
// Replace this file with a real DB (Postgres/MySQL) in production.
// For the project demo, we use an in-memory dataset.
const passengers = [
    {
        pnr: "AG1234",
        lastName: "PERERA",
        firstName: "Nimal",
        title: "Mr",
        email: "nimal.perera@example.com",
        phone: "+94 71 234 5678",
        nationality: "Sri Lankan",
        passportNo: "N1234567",
        frequentFlyerNo: "UL 123456789",
        seat: "13C",
        cabin: "Economy",
    },
    {
        pnr: "AG5678",
        lastName: "SILVA",
        firstName: "Ayesha",
        title: "Ms",
        email: "ayesha.silva@example.com",
        phone: "+94 77 987 6543",
        nationality: "Sri Lankan",
        passportNo: "N9876543",
        frequentFlyerNo: "UL 987654321",
        seat: "7A",
        cabin: "Business",
    },
];
const flights = [
    {
        pnr: "AG1234",
        lastName: "PERERA",
        flightNo: "UL225",
        originCode: "CMB",
        originCity: "Colombo",
        destinationCode: "DXB",
        destinationCity: "Dubai",
        departureIso: "2026-02-25T12:30:00+05:30",
        gate: "A12",
        terminal: "T1",
        status: "On Schedule",
    },
    {
        pnr: "AG1234",
        lastName: "PERERA",
        flightNo: "UL226",
        originCode: "DXB",
        originCity: "Dubai",
        destinationCode: "CMB",
        destinationCity: "Colombo",
        departureIso: "2026-03-02T09:10:00+04:00",
        gate: "C08",
        terminal: "T2",
        status: "On Schedule",
    },
    {
        pnr: "AG5678",
        lastName: "SILVA",
        flightNo: "UL307",
        originCode: "CMB",
        originCity: "Colombo",
        destinationCode: "SIN",
        destinationCity: "Singapore",
        departureIso: "2026-02-25T15:45:00+05:30",
        gate: "B03",
        terminal: "T1",
        status: "Delayed",
    },
    {
        pnr: "AG5678",
        lastName: "SILVA",
        flightNo: "UL308",
        originCode: "SIN",
        originCity: "Singapore",
        destinationCode: "CMB",
        destinationCity: "Colombo",
        departureIso: "2026-03-05T08:20:00+08:00",
        gate: "A04",
        terminal: "T1",
        status: "On Schedule",
    },
];
function asText(value) {
    return typeof value === "string" ? value : "";
}
function rowValue(row, camelKey, snakeKey) {
    const camel = row[camelKey];
    if (camel !== undefined && camel !== null && camel !== "")
        return asText(camel);
    return asText(row[snakeKey]);
}
function normalizePassenger(row) {
    return {
        pnr: rowValue(row, "pnr", "pnr"),
        lastName: rowValue(row, "lastName", "last_name"),
        firstName: rowValue(row, "firstName", "first_name"),
        title: rowValue(row, "title", "title") || undefined,
        email: rowValue(row, "email", "email") || undefined,
        phone: rowValue(row, "phone", "phone") || undefined,
        nationality: rowValue(row, "nationality", "nationality") || undefined,
        passportNo: rowValue(row, "passportNo", "passport_no") || undefined,
        frequentFlyerNo: rowValue(row, "frequentFlyerNo", "frequent_flyer_no") || undefined,
        seat: rowValue(row, "seat", "seat") || undefined,
        cabin: rowValue(row, "cabin", "cabin") || undefined,
    };
}
function normalizeFlight(row) {
    const status = rowValue(row, "status", "status");
    const safeStatus = status === "Boarding Soon" || status === "Delayed" ? status : "On Schedule";
    return {
        pnr: rowValue(row, "pnr", "pnr"),
        lastName: rowValue(row, "lastName", "last_name"),
        flightNo: rowValue(row, "flightNo", "flight_no"),
        originCode: rowValue(row, "originCode", "origin_code"),
        originCity: rowValue(row, "originCity", "origin_city"),
        destinationCode: rowValue(row, "destinationCode", "destination_code"),
        destinationCity: rowValue(row, "destinationCity", "destination_city"),
        departureIso: rowValue(row, "departureIso", "departure_iso"),
        gate: rowValue(row, "gate", "gate"),
        terminal: rowValue(row, "terminal", "terminal"),
        status: safeStatus,
    };
}
async function querySupabase(table, pnr, lastName, limit) {
    const env = getEnvConfig();
    if (!env.useSupabase)
        return null;
    try {
        const supabase = getSupabaseAdmin();
        let query = supabase
            .from(table)
            .select("*")
            .eq("pnr", pnr)
            .ilike("last_name", lastName);
        if (limit)
            query = query.limit(limit);
        const { data, error } = await query;
        if (error) {
            throw new Error(`Supabase query failed: ${error.message}`);
        }
        return data;
    }
    catch {
        return null;
    }
}
export async function findPassenger(pnr, lastName) {
    const env = getEnvConfig();
    if (env.useSupabase) {
        try {
            const rows = await querySupabase(env.supabasePassengersTable, pnr, lastName, 1);
            if (rows && rows.length)
                return normalizePassenger(rows[0]);
        }
        catch {
            // Fall back to demo data when Supabase is unreachable/misconfigured.
        }
    }
    return passengers.find((p) => p.pnr === pnr && p.lastName === lastName) ?? null;
}
export async function findFlights(pnr, lastName) {
    const env = getEnvConfig();
    if (env.useSupabase) {
        try {
            const rows = await querySupabase(env.supabaseFlightsTable, pnr, lastName);
            if (rows && rows.length)
                return rows.map(normalizeFlight);
        }
        catch {
            // Fall back to demo data when Supabase is unreachable/misconfigured.
        }
    }
    return flights.filter((f) => f.pnr === pnr && f.lastName === lastName);
}
export async function suggestPassengers(queryText) {
    const env = getEnvConfig();
    if (env.useSupabase) {
        try {
            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase
                .from(env.supabasePassengersTable)
                .select("pnr, last_name")
                .or(`pnr.ilike.%${queryText}%,last_name.ilike.%${queryText}%`)
                .limit(5);
            if (!error && data) {
                return data.map((row) => ({
                    pnr: rowValue(row, "pnr", "pnr"),
                    lastName: rowValue(row, "lastName", "last_name"),
                }));
            }
        }
        catch {
            // Fall back to demo data when Supabase is unreachable/misconfigured.
        }
    }
    const upperQuery = queryText.toUpperCase();
    const matches = passengers.filter((p) => p.pnr.includes(upperQuery) || p.lastName.includes(upperQuery));
    return matches.slice(0, 5).map((p) => ({ pnr: p.pnr, lastName: p.lastName }));
}
