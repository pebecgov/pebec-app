export const FUEL_CAR_KEYS = [
  "land_cruiser",
  "hilux",
  "highlander",
  "bus",
  "camry"
] as const;

export type FuelCarKey = (typeof FUEL_CAR_KEYS)[number];

export const FUEL_CARS: { key: FuelCarKey; label: string }[] = [
  { key: "land_cruiser", label: "Toyota Land Cruiser" },
  { key: "hilux", label: "Toyota Hilux" },
  { key: "highlander", label: "Toyota HighLander" },
  { key: "bus", label: "Toyota Bus" },
  { key: "camry", label: "Toyota Camry" }
];

export function fuelCarLabel(key?: FuelCarKey | null): string {
  if (!key) return "—";
  return FUEL_CARS.find((c) => c.key === key)?.label ?? key;
}

