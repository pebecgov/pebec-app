export const FUEL_DRIVER_KEYS = ["dawi_ezra", "nathan_james", "seidu_isah"] as const;
export type FuelDriverKey = (typeof FUEL_DRIVER_KEYS)[number];

export const FUEL_DRIVERS: { key: FuelDriverKey; label: string }[] = [
  { key: "dawi_ezra", label: "Dawi Ezra" },
  { key: "nathan_james", label: "Nathan James" },
  { key: "seidu_isah", label: "Seidu Isah" },
];

const CANONICAL: Record<FuelDriverKey, string> = {
  dawi_ezra: "dawi ezra",
  nathan_james: "nathan james",
  seidu_isah: "seidu isah",
};

function normalizeFullName(firstName?: string, lastName?: string): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Resolve which fuel driver this profile represents, if any (by full name). */
export function getFuelDriverKeyForUser(user: {
  firstName?: string;
  lastName?: string;
} | null): FuelDriverKey | null {
  if (!user) return null;
  const n = normalizeFullName(user.firstName, user.lastName);
  for (const key of FUEL_DRIVER_KEYS) {
    if (n === CANONICAL[key]) return key;
  }
  return null;
}

export function fuelDriverLabel(key: FuelDriverKey): string {
  return FUEL_DRIVERS.find((d) => d.key === key)?.label ?? key;
}

/** For Convex: match stored user doc to a driver key (same rules as client). */
export function getFuelDriverKeyFromUserDoc(
  user: { firstName?: string; lastName?: string } | null
): FuelDriverKey | null {
  return user ? getFuelDriverKeyForUser(user) : null;
}
