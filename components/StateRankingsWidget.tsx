"use client";

import { useStateRankings } from "@/hooks/useStateRankings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StateRankingsWidgetProps {
  limit?: number;
  showTop?: boolean;
}

export function StateRankingsWidget({ limit = 5, showTop = true }: StateRankingsWidgetProps) {
  const { rankings, isLoading, isEmpty } = useStateRankings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>State Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
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
          <div className="text-center py-4 text-muted-foreground">
            No rankings available
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayRankings = showTop 
    ? rankings.slice(0, limit)
    : rankings.slice(-limit).reverse();

  const title = showTop ? `Top ${limit} States` : `Bottom ${limit} States`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayRankings.map((ranking) => (
            <div key={ranking.state} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{ranking.rank}</Badge>
                <span className="font-medium">{ranking.state}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold font-mono">
                  {ranking.totalScore.toFixed(1)}/79
                </div>
                <div className="text-xs text-muted-foreground">
                  {ranking.percentageScore ? ranking.percentageScore.toFixed(1) : ((ranking.totalScore / 79) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
