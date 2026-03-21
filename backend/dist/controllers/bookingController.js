import { z } from "zod";
import { findFlights, findPassenger } from "../models/bookingModel.js";
const BookingLookupSchema = z.object({
    pnr: z
        .string()
        .trim()
        .transform((v) => v.toUpperCase())
        .refine((v) => /^[A-Z0-9]{6}$/.test(v), "Invalid PNR format"),
    lastName: z
        .string()
        .trim()
        .transform((v) => v.toUpperCase())
        .refine((v) => /^[A-Z][A-Z\s'-]{1,29}$/.test(v), "Invalid last name"),
});
export async function bookingLookup(req, res) {
    const parsed = BookingLookupSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid request",
            issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        });
    }
    const { pnr, lastName } = parsed.data;
    try {
        const passenger = await findPassenger(pnr, lastName);
        const flights = await findFlights(pnr, lastName);
        if (!passenger || flights.length === 0) {
            return res.status(404).json({ message: "No flights found for that PNR and last name." });
        }
        const response = { passenger, flights };
        return res.json(response);
    }
    catch (error) {
        return res.status(500).json({
            message: "Booking lookup failed.",
            details: error instanceof Error ? error.message : "Unexpected error",
        });
    }
}
// Compatibility endpoint (frontend may call /api/flight-lookup)
export async function flightLookup(req, res) {
    const parsed = BookingLookupSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request" });
    }
    const { pnr, lastName } = parsed.data;
    try {
        const flights = await findFlights(pnr, lastName);
        if (!flights.length) {
            return res.status(404).json({ message: "No flights found for that PNR and last name." });
        }
        return res.json(flights);
    }
    catch (error) {
        return res.status(500).json({
            message: "Flight lookup failed.",
            details: error instanceof Error ? error.message : "Unexpected error",
        });
    }
}
