export const PORTS_CUSTOMS_MDAS = [
  {
    id: "mda_naqs",
    title: "NAQS",
    name: "Nigeria Agricultural Quarantine Service",
  },
  {
    id: "mda_ncs",
    title: "NCS",
    name: "Nigeria Customs Service",
  },
  {
    id: "mda_nis",
    title: "NIS",
    name: "Nigeria Immigration Service",
  },
  {
    id: "mda_npa",
    title: "NPA",
    name: "Nigerian Ports Authority",
  },
  {
    id: "mda_ndlea",
    title: "NDLEA",
    name: "National Drug Law Enforcement Agency",
  },
  {
    id: "mda_nepza",
    title: "NEPZA",
    name: "Nigeria Export Processing Zone Authority",
  },
  {
    id: "mda_nimasa",
    title: "NIMASA",
    name: "Nigerian Maritime Administration and Safety Agency",
  },
  {
    id: "mda_nsc",
    title: "NSC",
    name: "Nigerian Shippers’ Council",
  },
  {
    id: "mda_niwa",
    title: "NIWA",
    name: "National Inland Waterways Authority",
  },
  {
    id: "mda_pha",
    title: "PHA",
    name: "Port Health (Quarantine) Services",
  },
] as const;

export const GEO_ZONES = [
  {
    id: "zone_nc",
    title: "North Central",
    states: [
      "Benue",
      "Kogi",
      "Kwara",
      "Nasarawa",
      "Niger",
      "Plateau",
      "Federal Capital Territory",
    ],
  },
  {
    id: "zone_ne",
    title: "North East",
    states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
  },
  {
    id: "zone_nw",
    title: "North West",
    states: [
      "Jigawa",
      "Kaduna",
      "Kano",
      "Katsina",
      "Kebbi",
      "Sokoto",
      "Zamfara",
    ],
  },
  {
    id: "zone_se",
    title: "South East",
    states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
  },
  {
    id: "zone_ss",
    title: "South South",
    states: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
  },
  {
    id: "zone_sw",
    title: "South West",
    states: ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
  },
] as const;

export function findZone(id: string) {
  return GEO_ZONES.find((zone) => zone.id === id);
}

export function findMda(idOrText: string) {
  const needle = idOrText.trim().toLowerCase();
  if (!needle) return undefined;
  const exact = PORTS_CUSTOMS_MDAS.find(
    (mda) =>
      mda.id === idOrText ||
      mda.title.toLowerCase() === needle ||
      mda.name.toLowerCase() === needle,
  );
  if (exact) return exact;
  const partial = PORTS_CUSTOMS_MDAS.filter((mda) =>
    mda.name.toLowerCase().includes(needle),
  );
  return partial.length === 1 ? partial[0] : undefined;
}

export function stateRowId(state: string): string {
  return `state:${state}`;
}

export function stateFromRowId(id: string): string | null {
  if (!id.startsWith("state:")) return null;
  return id.slice("state:".length);
}

export function parseIncidentDate(input: string): number | null {
  const trimmed = input.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  let year: number;
  let month: number;
  let day: number;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (slash) {
    day = Number(slash[1]);
    month = Number(slash[2]);
    year = Number(slash[3]);
  } else {
    return null;
  }
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date.getTime() > today.getTime()) {
    return null;
  }
  return date.getTime();
}
