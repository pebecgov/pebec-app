"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { parseBeepaCsv } from "@/lib/beepaImport";

type Props = {
  year: number;
  scoringPeriod: string;
  knownMdas: Array<{ name: string; abbreviation?: string }>;
  onImported?: () => void;
};

export default function BeepaCsvImportCard({
  year,
  scoringPeriod,
  knownMdas,
  onImported,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const importBeepa = useMutation(api.beepaImport.importBeepaCsvScores);
  const [importing, setImporting] = useState(false);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    try {
      setImporting(true);
      setLastSummary(null);
      const text = await file.text();
      const rows = parseBeepaCsv(text);
      if (rows.length === 0) {
        toast.error("No MDA rows found in that CSV.");
        return;
      }

      const result = await importBeepa({
        year,
        scoringPeriod,
        knownMdas,
        rows: rows.map((row) => ({
          mdaName: row.mdaName,
          abbreviation: row.abbreviation || undefined,
          points: row.points,
          exempted: row.exempted,
        })),
      });

      const summary = [
        `Updated ${result.updated} MDA(s)`,
        result.exempted > 0 ? `${result.exempted} exempted` : null,
        result.unmatched.length > 0 ? `${result.unmatched.length} unmatched` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      setLastSummary(
        [
          summary,
          `BEEPA item: ${result.beepaItemName} (${result.beepaWeight} pts)`,
          result.unmatched.length
            ? `Unmatched: ${result.unmatched.slice(0, 8).join("; ")}${
                result.unmatched.length > 8 ? "…" : ""
              }`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      );

      if (result.updated === 0 && result.exempted === 0) {
        toast.error("No MDAs were updated. Check unmatched names.");
      } else {
        toast.success(`BEEPA import complete: ${summary}`);
      }
      onImported?.();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to import BEEPA CSV");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full border-dashed border-teal-300 bg-teal-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-teal-700" />
          Import BEEPA CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-600">
          Upload the BEEPA sheet to map <strong>Subnational_BEEPA_Points</strong> into the Others
          BEEPA metric for every matched MDA in <strong>{scoringPeriod}</strong>. Exempted MDAs are
          excluded from BEEPA instead of scored as 0.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          className="w-full bg-teal-700 hover:bg-teal-800"
          disabled={importing || year < 2026}
          onClick={() => inputRef.current?.click()}
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload BEEPA CSV
            </>
          )}
        </Button>
        {lastSummary && (
          <pre className="whitespace-pre-wrap text-[11px] text-gray-700 bg-white/80 border rounded-md p-2">
            {lastSummary}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
