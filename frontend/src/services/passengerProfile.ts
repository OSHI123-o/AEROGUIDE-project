export type PassengerProfile = {
  pnr: string;
  lastName: string;
  firstName?: string;
  title?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  passportNo?: string;
  frequentFlyerNo?: string;
  seat?: string;
  cabin?: "Economy" | "Premium Economy" | "Business" | "First";
};

export async function lookupPassengerProfile(pnr: string, lastName: string): Promise<PassengerProfile | null> {
  const p = pnr.trim().toUpperCase();
  const ln = lastName.trim().toUpperCase();
  const res = await fetch("/api/booking-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pnr: p, lastName: ln }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { passenger?: PassengerProfile };
  return data?.passenger ?? null;
}
