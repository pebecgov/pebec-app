import {
  Camera,
  CreditCard,
  Laptop,
  Monitor,
  Package,
  Printer,
  Projector,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";

const TYPE_STYLES: Array<{
  match: string[];
  icon: LucideIcon;
  chip: string;
  soft: string;
}> = [
  {
    match: ["laptop", "notebook", "macbook"],
    icon: Laptop,
    chip: "bg-sky-100 text-sky-800",
    soft: "bg-sky-50 text-sky-700",
  },
  {
    match: ["phone", "mobile", "iphone"],
    icon: Smartphone,
    chip: "bg-violet-100 text-violet-800",
    soft: "bg-violet-50 text-violet-700",
  },
  {
    match: ["camera"],
    icon: Camera,
    chip: "bg-rose-100 text-rose-800",
    soft: "bg-rose-50 text-rose-700",
  },
  {
    match: ["tablet", "ipad"],
    icon: Tablet,
    chip: "bg-indigo-100 text-indigo-800",
    soft: "bg-indigo-50 text-indigo-700",
  },
  {
    match: ["monitor", "screen", "display"],
    icon: Monitor,
    chip: "bg-teal-100 text-teal-800",
    soft: "bg-teal-50 text-teal-700",
  },
  {
    match: ["printer"],
    icon: Printer,
    chip: "bg-amber-100 text-amber-800",
    soft: "bg-amber-50 text-amber-700",
  },
  {
    match: ["projector"],
    icon: Projector,
    chip: "bg-fuchsia-100 text-fuchsia-800",
    soft: "bg-fuchsia-50 text-fuchsia-700",
  },
  {
    match: ["card", "access"],
    icon: CreditCard,
    chip: "bg-emerald-100 text-emerald-800",
    soft: "bg-emerald-50 text-emerald-700",
  },
];

export function getItemTypeMeta(name: string) {
  const lower = name.toLowerCase();
  const found = TYPE_STYLES.find((style) =>
    style.match.some((token) => lower.includes(token)),
  );
  return (
    found ?? {
      icon: Package,
      chip: "bg-stone-100 text-stone-800",
      soft: "bg-stone-50 text-stone-700",
    }
  );
}

export function formatPrettyDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
