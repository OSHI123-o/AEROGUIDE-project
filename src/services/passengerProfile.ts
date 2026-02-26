export type PassengerProfile = {
  pnr: string;
  lastName: string;
};

export type DemoUser = {
  id: string;
  label: string;
  profile: PassengerProfile;
};

export const DEMO_USERS: DemoUser[] = [
  { id: "perera_dubai", label: "Perera (Dubai)", profile: { pnr: "AG1234", lastName: "PERERA" } },
  { id: "silva_singapore", label: "Silva (Singapore)", profile: { pnr: "AG5678", lastName: "SILVA" } },
];

export function getPassengerProfileFromUserId(userId: string): PassengerProfile {
  const found = DEMO_USERS.find((u) => u.id === userId);
  return found?.profile ?? DEMO_USERS[0].profile;
}
