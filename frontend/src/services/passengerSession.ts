export type PassengerSession = {
  pnr: string;
  lastName: string;
};

const PNR_KEY = "aeroguide_passenger_pnr";
const LAST_NAME_KEY = "aeroguide_passenger_last_name";

export function normalizePnr(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeLastName(value: string) {
  return value.trim().toUpperCase();
}

export function isValidPnr(value: string) {
  return /^[A-Z0-9]{5,8}$/.test(normalizePnr(value));
}

export function isValidLastName(value: string) {
  return /^[A-Z][A-Z' -]{1,29}$/.test(normalizeLastName(value));
}

export function getPassengerSession(): PassengerSession | null {
  const pnr = localStorage.getItem(PNR_KEY);
  const lastName = localStorage.getItem(LAST_NAME_KEY);
  if (!pnr || !lastName) return null;
  return {
    pnr: normalizePnr(pnr),
    lastName: normalizeLastName(lastName),
  };
}

export function hasPassengerSession() {
  return Boolean(getPassengerSession());
}

export function savePassengerSession(input: PassengerSession) {
  localStorage.setItem(PNR_KEY, normalizePnr(input.pnr));
  localStorage.setItem(LAST_NAME_KEY, normalizeLastName(input.lastName));
}

export function clearPassengerSession() {
  localStorage.removeItem(PNR_KEY);
  localStorage.removeItem(LAST_NAME_KEY);
  localStorage.removeItem("aeroguide_active_flight");
}
