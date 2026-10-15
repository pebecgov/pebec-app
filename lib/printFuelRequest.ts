import { format } from "date-fns";
import { fuelCarLabel, type FuelCarKey } from "@/lib/fuelCars";
import { fuelDriverLabel, type FuelDriverKey } from "@/lib/fuelDrivers";

export type PrintableFuelRequest = {
  _id: string;
  driverKey: FuelDriverKey;
  carKey?: FuelCarKey | null;
  requestDate: string;
  status: "pending_approval" | "approved" | "completed";
  requestedAt: number;
  approvedAt?: number;
  priceAmount?: number;
  priceEnteredAt?: number;
  requestedByName?: string | null;
  approvedByName?: string | null;
  priceEnteredByName?: string | null;
};

const STATUS_LABEL: Record<PrintableFuelRequest["status"], string> = {
  pending_approval: "Pending approval",
  approved: "Approved",
  completed: "Completed",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWhen(value: number | undefined): string {
  if (value == null) return "—";
  return format(new Date(value), "d MMMM yyyy, h:mm a");
}

function formatTripDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return format(new Date(year, month - 1, day), "d MMMM yyyy");
}

function row(label: string, value: string): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

export function printFuelRequest(request: PrintableFuelRequest): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const amount =
    request.priceAmount != null
      ? `NGN ${request.priceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "Not yet recorded";

  const reference = request._id.slice(-8).toUpperCase();

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Fuel request ${escapeHtml(reference)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 32px; }
      h1 { font-size: 18px; letter-spacing: 0.04em; text-transform: uppercase; margin: 0; }
      h2 { font-size: 16px; margin: 8px 0 0; font-weight: normal; }
      .meta { margin-top: 16px; font-family: Arial, sans-serif; font-size: 12px; color: #444; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: Arial, sans-serif; font-size: 13px; }
      th, td { border: 1px solid #222; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { width: 34%; background: #f4f4f4; font-weight: 600; }
      .signs { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px 40px; font-family: Arial, sans-serif; font-size: 13px; }
      .line { margin-top: 28px; border-bottom: 1px solid #111; height: 18px; }
      .caption { margin-top: 6px; }
    </style>
  </head>
  <body>
    <h1>Presidential Enabling Business Environment Council</h1>
    <h2>Driver fuel request</h2>
    <p class="meta">Reference ${escapeHtml(reference)} · Printed ${escapeHtml(format(new Date(), "d MMMM yyyy, h:mm a"))}</p>
    <table>
      ${row("Trip date", formatTripDate(request.requestDate))}
      ${row("Driver", fuelDriverLabel(request.driverKey))}
      ${row("Vehicle", fuelCarLabel(request.carKey))}
      ${row("Status", STATUS_LABEL[request.status])}
      ${row("Amount paid", amount)}
      ${row("Requested by", request.requestedByName || "—")}
      ${row("Requested at", formatWhen(request.requestedAt))}
      ${row("Approved by", request.approvedByName || "—")}
      ${row("Approved at", formatWhen(request.approvedAt))}
      ${row("Price recorded by", request.priceEnteredByName || "—")}
      ${row("Price recorded at", formatWhen(request.priceEnteredAt))}
    </table>
    <div class="signs">
      <div><div class="line"></div><div class="caption">Requested by</div></div>
      <div><div class="line"></div><div class="caption">Approved by</div></div>
      <div><div class="line"></div><div class="caption">Driver</div></div>
      <div><div class="line"></div><div class="caption">Auditor</div></div>
    </div>
    <script>
      window.onload = function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      };
    </script>
  </body>
</html>`);
  printWindow.document.close();
  return true;
}
