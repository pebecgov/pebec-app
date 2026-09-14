"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Loader2, CheckCircle } from "lucide-react";

type Props = {
  year: number;
  scoringPeriod: string;
};

export default function BulkTransparencyCard({
  year,
  scoringPeriod,
}: Props) {
  const awardTransparency = useMutation(api.bulkTransparencyUpdate.awardTransparencyForSLAPublication);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleAwardTransparency = async (dryRun: boolean = false) => {
    try {
      setProcessing(true);
      setLastResult(null);
      
      const result = await awardTransparency({
        year,
        scoringPeriod,
        transparencyScore: 5,
        dryRun
      });

      const summary = [
        `Processed: ${result.processed} MDAs`,
        result.created > 0 ? `Created: ${result.created}` : null,
        result.updated > 0 ? `Updated: ${result.updated}` : null,
        result.errors.length > 0 ? `Errors: ${result.errors.length}` : null,
      ].filter(Boolean).join(" · ");

      setLastResult([
        dryRun ? "DRY RUN RESULTS:" : "RESULTS:",
        summary,
        `Transparency points awarded: ${result.transparencyScore}`,
        result.errors.length > 0 
          ? `First few errors: ${result.errors.slice(0, 3).join("; ")}${result.errors.length > 3 ? "..." : ""}`
          : null
      ].filter(Boolean).join("\n"));

      if (result.errors.length === 0) {
        toast.success(dryRun 
          ? `Dry run complete: ${summary}` 
          : `Transparency points awarded successfully: ${summary}`
        );
      } else {
        toast.error(`Completed with errors: ${summary}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to award transparency points");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full border-dashed border-blue-300 bg-blue-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-700" />
          Bulk Transparency Award
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-600">
          Award <strong>5 transparency points</strong> to all 38 MDAs with 100% SLA publication 
          (Activity 1.8) for <strong>{scoringPeriod}</strong>. This will boost their BFA scores 
          in the "Other Metrics" section.
        </p>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100"
            disabled={processing}
            onClick={() => handleAwardTransparency(true)}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Dry Run
              </>
            )}
          </Button>
          
          <Button
            type="button"
            className="flex-1 bg-blue-700 hover:bg-blue-800"
            disabled={processing || year < 2026}
            onClick={() => handleAwardTransparency(false)}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Award Points
              </>
            )}
          </Button>
        </div>
        
        {lastResult && (
          <pre className="whitespace-pre-wrap text-[11px] text-gray-700 bg-white/80 border rounded-md p-2">
            {lastResult}
          </pre>
        )}
        
        <div className="text-xs text-gray-500">
          <p><strong>MDAs included:</strong> CAC, CBN, EHCON, FAAN, FRSC, GBB, ITF, NAICOM, 
          NAMA, NAQS, NBS, NCAA, NCC, NCDMB, NCS, NDLEA, NEMSA, NEPC, NEPZA, NESREA, 
          NEXIM, NIMASA, NIMC, NIPC, NIPOST, NIS, NITDA, NIWA, NPA, NSC, NUPRC, OGFZA, 
          PENCOM, REA, SCUML, SEC, SERVICOM, SON</p>
        </div>
      </CardContent>
    </Card>
  );
}