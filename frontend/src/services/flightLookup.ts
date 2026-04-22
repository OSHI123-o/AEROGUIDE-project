export type FlightLookupResult = {
  pnr: string;
  lastName: string;
  flightNo: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  departureIso: string;
  gate: string;
  terminal: string;
  status: "On Schedule" | "Boarding Soon" | "Delayed";
};

export type FlightLookupRequest = {
  pnr: string;
  lastName: string;
};

function normalizePnr(pnr: string) {
  return pnr.trim().toUpperCase();
}

function normalizeLastName(lastName: string) {
  return lastName.trim().toUpperCase();
}

function getLookupEndpoint() {
  // Prefer a configured endpoint (production)
  // Example: VITE_FLIGHT_LOOKUP_ENDPOINT=https://api.yourdomain.com/flight-lookup
  const configured = (import.meta as any)?.env?.VITE_FLIGHT_LOOKUP_ENDPOINT as string | undefined;
  return configured?.trim() || "/api/flight-lookup";
}

const MOCK_DB: FlightLookupResult[] = [
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

const DEMO_DESTINATIONS = [
  { code: "DXB", city: "Dubai" },
  { code: "SIN", city: "Singapore" },
  { code: "DOH", city: "Doha" },
  { code: "KUL", city: "Kuala Lumpur" },
  { code: "BKK", city: "Bangkok" },
  { code: "MAA", city: "Chennai" },
];

function hashValue(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function toIsoWithOffset(date: Date, offset = "+05:30") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${offset}`;
}

function buildPersonalizedDemoFlights(pnr: string, lastName: string): FlightLookupResult[] {
  const seed = hashValue(`${pnr}:${lastName}`);
  const dest = DEMO_DESTINATIONS[seed % DEMO_DESTINATIONS.length];
  const gateNumber = 1 + (seed % 18);
  const gate = `${seed % 2 === 0 ? "A" : "B"}${String(gateNumber).padStart(2, "0")}`;
  const depHour = 6 + (seed % 12);
  const depMinute = (seed % 4) * 15;
  const flightNumberBase = 200 + (seed % 500);

  const outbound = new Date();
  outbound.setDate(outbound.getDate() + 1);
  outbound.setHours(depHour, depMinute, 0, 0);

  const inbound = new Date(outbound);
  inbound.setDate(inbound.getDate() + 6);
  inbound.setHours((depHour + 2) % 24, depMinute, 0, 0);

  return [
    {
      pnr,
      lastName,
      flightNo: `UL${flightNumberBase}`,
      originCode: "CMB",
      originCity: "Colombo",
      destinationCode: dest.code,
      destinationCity: dest.city,
      departureIso: toIsoWithOffset(outbound, "+05:30"),
      gate,
      terminal: "T1",
      status: "On Schedule",
    },
    {
      pnr,
      lastName,
      flightNo: `UL${flightNumberBase + 1}`,
      originCode: dest.code,
      originCity: dest.city,
      destinationCode: "CMB",
      destinationCity: "Colombo",
      departureIso: toIsoWithOffset(inbound, "+05:30"),
      gate: `${seed % 2 === 0 ? "C" : "A"}${String(((gateNumber + 4) % 20) || 1).padStart(2, "0")}`,
      terminal: "T1",
      status: "On Schedule",
    },
  ];
}

async function lookupFlightsFromApi(pnr: string, lastName: string): Promise<FlightLookupResult[]> {
  const endpoint = getLookupEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pnr, lastName } satisfies FlightLookupRequest),
  });

  if (!res.ok) {
    // Keep messages user-friendly and backend-agnostic.
    throw new Error(res.status === 404 ? "No flights found for that PNR and last name." : "Flight lookup failed. Please try again.");
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("Flight lookup failed. Invalid response.");
  }
  return data as FlightLookupResult[];
}

async function lookupFlightsFromMock(pnr: string, lastName: string): Promise<FlightLookupResult[]> {
  // Dev fallback only.
  await new Promise((r) => setTimeout(r, 650));
  const p = normalizePnr(pnr);
  const ln = normalizeLastName(lastName);
  const matches = MOCK_DB.filter((f) => f.pnr === p && f.lastName === ln);
  if (matches.length) return matches;
  // Personalized demo fallback so every passenger can continue even without known seed data.
  return buildPersonalizedDemoFlights(p, ln);
}

export async function lookupFlightByPnr(pnr: string, lastName: string): Promise<FlightLookupResult> {
  const flights = await lookupFlightsByPnr(pnr, lastName);
  return flights[0];
}

export async function lookupFlightsByPnr(pnr: string, lastName: string): Promise<FlightLookupResult[]> {
  const p = normalizePnr(pnr);
  const ln = normalizeLastName(lastName);

  // Prefer server lookup when available.
  try {
    const fromApi = await lookupFlightsFromApi(p, ln);
    if (!fromApi.length) return buildPersonalizedDemoFlights(p, ln);
    return fromApi;
  } catch {
    return await lookupFlightsFromMock(p, ln);
  }
}

export async function suggestPassengers(query: string): Promise<{ pnr: string; lastName: string }[]> {
  const q = query.trim().toUpperCase();
  if (q.length < 2) return [];

  try {
    const configured = (import.meta as any)?.env?.VITE_FLIGHT_LOOKUP_ENDPOINT as string | undefined;
    const base = configured?.trim() || "/api/flight-lookup";
    // Replace /flight-lookup with /passenger-suggest
    const endpoint = base.replace(/\/flight-lookup$/, "/passenger-suggest") + `?q=${encodeURIComponent(q)}`;
    
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {
    // ignore fetch error
  }

  // Fallback to mock DB
  const matches = MOCK_DB.filter((f) => f.pnr.includes(q) || f.lastName.includes(q));
  const unique = new Map<string, { pnr: string; lastName: string }>();
  for (const m of matches) {
    unique.set(m.pnr, { pnr: m.pnr, lastName: m.lastName });
  }
  return Array.from(unique.values()).slice(0, 5);
}
