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

export async function lookupFlightByPnr(pnr: string, lastName: string): Promise<FlightLookupResult> {
  // Backend-ready shape:
  // replace this block with:
  // const res = await fetch('/api/flight-lookup', { method:'POST', body: JSON.stringify({ pnr, lastName }) })
  // return await res.json()
  await new Promise((r) => setTimeout(r, 650));

  const p = pnr.trim().toUpperCase();
  const ln = lastName.trim().toUpperCase();
  const hit = MOCK_DB.find((f) => f.pnr === p && f.lastName === ln);
  if (!hit) {
    throw new Error("Flight not found for provided PNR and last name.");
  }
  return hit;
}

export async function lookupFlightsByPnr(pnr: string, lastName: string): Promise<FlightLookupResult[]> {
  await new Promise((r) => setTimeout(r, 650));

  const p = pnr.trim().toUpperCase();
  const ln = lastName.trim().toUpperCase();
  const matches = MOCK_DB.filter((f) => f.pnr === p && (!ln || f.lastName === ln));
  if (!matches.length) {
    throw new Error("No flights found for that PNR and last name.");
  }
  return matches;
}
