"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useStateRankings, StateRanking } from "@/hooks/useStateRankings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { indicators } from "@/convex/config/indicators";
import { generateStateRankingPDF } from "@/lib/stateRankingPdfGenerator";

const INDICATOR_ALL_VALUE = "all";

export function StateRankingsTable() {
  const [selectedIndicator, setSelectedIndicator] = useState<string>(INDICATOR_ALL_VALUE);
  const indicatorKey = selectedIndicator === INDICATOR_ALL_VALUE ? undefined : selectedIndicator;
  const { rankings, isLoading, isEmpty } = useStateRankings(indicatorKey);

  const indicatorOptions = useMemo(() => {
    return [
      { value: INDICATOR_ALL_VALUE, label: "All Indicators" },
      ...Object.entries(indicators).map(([key, config]) => ({
        value: key,
        label: config.name,
      })),
    ];
  }, []);

  const selectedIndicatorLabel = useMemo(() => {
    if (selectedIndicator === INDICATOR_ALL_VALUE) {
      return "All Indicators";
    }

    return indicators[selectedIndicator]?.name ?? selectedIndicator;
  }, [selectedIndicator]);

  const maxScore = rankings.length > 0 ? rankings[0].maxScore : 0;

  const getRankBadgeVariant = (rank: number) => {
    if (rank === 1) return "default"; // Gold
    if (rank === 2) return "secondary"; // Silver
    if (rank === 3) return "outline"; // Bronze
    return "outline";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank.toString();
  };

  const exportPDF = useCallback(async () => {
    await generateStateRankingPDF({
      rankings,
      indicatorLabel: selectedIndicatorLabel,
      indicatorKey,
    });
  }, [rankings, selectedIndicatorLabel, indicatorKey]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>State Rankings</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading rankings...</span>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>State Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger className="w-full sm:w-60">
                <SelectValue placeholder="Filter by indicator" />
              </SelectTrigger>
              <SelectContent>
                {indicatorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportPDF} variant="outline" disabled>
              Generate PDF
            </Button>
          </div>
          <p className="text-muted-foreground text-center py-8">
            No state scores available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Nigerian States Ranking</CardTitle>
            <p className="text-sm text-muted-foreground">
              States ranked by their performance scores for {selectedIndicatorLabel}.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by indicator" />
              </SelectTrigger>
              <SelectContent>
                {indicatorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportPDF} className="bg-green-600 hover:bg-green-700 text-white">
              Generate PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selectedIndicatorLabel}</p>
              <p className="text-xs text-muted-foreground">
                Showing rankings based on {selectedIndicator === INDICATOR_ALL_VALUE ? "all indicators" : "the selected indicator"}.
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Max Score: {maxScore.toFixed(1)}
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Indicator Score</TableHead>
                  <TableHead className="text-right">% Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((ranking: StateRanking) => (
                  <TableRow key={ranking.state}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getRankIcon(ranking.rank)}</span>
                        <Badge variant={getRankBadgeVariant(ranking.rank)}>
                          #{ranking.rank}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {ranking.state}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {ranking.deduction && ranking.deduction > 0
                        ? `- ${ranking.deduction.toFixed(1)}`
                        : "0"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {ranking.totalScore.toFixed(1)}/{ranking.maxScore.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {ranking.percentageScore.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {rankings.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {rankings.length} states with available scores.
            <span className="ml-1">
              Totals already reflect any deductions (e.g. Ogun −6 points this cycle).
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
