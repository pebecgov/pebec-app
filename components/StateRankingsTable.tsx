"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useStateRankings, StateRanking } from "@/hooks/useStateRankings";

export function StateRankingsTable() {
  const { rankings, isLoading, isEmpty } = useStateRankings();

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
          <p className="text-muted-foreground text-center py-8">
            No state scores available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nigerian States Ranking</CardTitle>
        <p className="text-sm text-muted-foreground">
          States ranked by their total performance scores
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Score & Percentage</TableHead>
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
                  <TableCell className="text-right font-mono">
                    <div className="text-right">
                      <div className="font-semibold">{ranking.totalScore.toFixed(1)}/79</div>
                      <div className="text-xs text-muted-foreground">
                        {ranking.percentageScore ? ranking.percentageScore.toFixed(1) : ((ranking.totalScore / 79) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {rankings.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {rankings.length} states with available scores
          </div>
        )}
      </CardContent>
    </Card>
  );
}
