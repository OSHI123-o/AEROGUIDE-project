import type { FlightLookupResult } from "./flightLookup";
import type { PassengerProfile } from "./passengerProfile";

export type BookingLookupResult = {
  passenger: PassengerProfile;
  flights: FlightLookupResult[];
};

export async function lookupBookingByPnr(pnr: string, lastName: string): Promise<BookingLookupResult> {
  const p = pnr.trim().toUpperCase();
  const ln = lastName.trim().toUpperCase();

  const res = await fetch("/api/booking-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pnr: p, lastName: ln }),
  });

  if (!res.ok) {
    let msg = "Flight lookup failed. Please try again.";
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) msg = data.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return (await res.json()) as BookingLookupResult;
}

