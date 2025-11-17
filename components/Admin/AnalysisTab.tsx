import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Anchor,
  ArrowUpCircle,
  BarChart3,
  Briefcase,
  Building2,
  Compass,
  Gauge,
  Layers,
  Network,
  Scale,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  Waypoints,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Indicator = {
  name: string;
  totalScore: number;
  percentage: number;
};

type AnalysisTabProps = {
  selectedState?: string;
  indicators?: Indicator[];
  className?: string;
};

const MAX_CARD_COUNT = 16;

const DEFAULT_INDICATORS: Indicator[] = [
  "Access to Electricity",
  "Infrastructure",
  "Getting Credit",
  "Digital Connectivity",
  "Land Registration",
  "Interstate Trade",
  "Access to Skilled Labor",
  "Small Claims Courts",
  "Paying Taxes",
  "Investor Aftercare Service",
  "Grievance Redress Mechanisms",
  "Export-Import Facilitation",
  "Workforce Development and Social Infrastructure",
  "Crisis Resilience and Business Continuity",
  "Contract Enforcement and Commercial Dispute Resolution",
  "Market Access and Competition",
].map((name) => ({
  name,
  totalScore: 0,
  percentage: 0,
}));

const ICON_ROTATION: LucideIcon[] = [
  BarChart3,
  Gauge,
  Activity,
  TrendingUp,
  Layers,
  ShieldCheck,
  Network,
  Scale,
  Target,
  Anchor,
  Waypoints,
  Compass,
  Building2,
  Briefcase,
  ArrowUpCircle,
  Trophy,
];

const formatScore = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);

const formatPercentage = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)}%`;

const getIndicatorVisuals = (percentage: number) => {
  if (percentage >= 85) {
    return {
      card: "bg-emerald-50 border-emerald-100/70",
      icon: "bg-emerald-100 text-emerald-700",
      label: "text-emerald-700",
    };
  }
  if (percentage >= 70) {
    return {
      card: "bg-blue-50 border-blue-100/70",
      icon: "bg-blue-100 text-blue-700",
      label: "text-blue-700",
    };
  }
  if (percentage >= 55) {
    return {
      card: "bg-amber-50 border-amber-100/70",
      icon: "bg-amber-100 text-amber-700",
      label: "text-amber-700",
    };
  }
  if (percentage >= 40) {
    return {
      card: "bg-orange-50 border-orange-100/70",
      icon: "bg-orange-100 text-orange-700",
      label: "text-orange-700",
    };
  }

  return {
    card: "bg-rose-50 border-rose-100/70",
    icon: "bg-rose-100 text-rose-700",
    label: "text-rose-700",
  };
};

const AnalysisTab: React.FC<AnalysisTabProps> = ({
  selectedState,
  indicators,
  className,
}) => {
  const showEmptyState = !selectedState;
  const isFetching = Boolean(selectedState) && (!indicators || indicators.length === 0);

  const preparedIndicators = React.useMemo(() => {
    if (!indicators || indicators.length === 0) {
      return DEFAULT_INDICATORS.slice(0, MAX_CARD_COUNT);
    }

    if (indicators.length >= MAX_CARD_COUNT) {
      return indicators.slice(0, MAX_CARD_COUNT);
    }

    return [
      ...indicators,
      ...DEFAULT_INDICATORS.slice(0, MAX_CARD_COUNT - indicators.length),
    ];
  }, [indicators]);

  if (showEmptyState) {
    return (
      <div
        className={cn(
          "flex w-full rounded-3xl bg-muted/20 p-6 sm:p-8",
          className,
        )}
      >
        <div className="flex min-h-[360px] w-full flex-col items-center justify-center text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Indicator Analysis
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-foreground">
            Select a state to explore indicators
          </h2>
          <p className="mt-2 max-w-lg text-base text-muted-foreground">
            Use the global filter above to choose a state and unlock its full indicator breakdown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-3xl bg-muted/20 p-6 sm:p-8",
        className,
      )}
    >
      <header className="mb-8 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-foreground">
              {selectedState ? `${selectedState} Indicators` : "Select a state"}
            </h2>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {(isFetching ? DEFAULT_INDICATORS : preparedIndicators).map(
          (indicator, index) => {
            const Icon = ICON_ROTATION[index % ICON_ROTATION.length];

            if (isFetching) {
              return (
                <Card
                  key={`skeleton-${indicator.name}-${index}`}
                  className="h-full rounded-2xl border border-border/60 bg-white/70 shadow-sm"
                >
                  <div className="flex h-full flex-col gap-4 p-6 animate-pulse">
                    <div className="flex items-start justify-between">
                      <div className="h-4 w-32 rounded-full bg-muted/70" />
                      <div className="h-10 w-10 rounded-2xl bg-muted/60" />
                    </div>
                    <div className="h-12 w-24 rounded-full bg-muted/70" />
                    <div className="h-6 w-32 rounded-full bg-muted/60" />
                    <div className="h-4 w-40 rounded-full bg-muted/50" />
                  </div>
                </Card>
              );
            }

            const visuals = getIndicatorVisuals(indicator.percentage);

            return (
              <Card
                key={`${indicator.name}-${index}`}
                className={cn(
                  "h-full rounded-2xl border text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                  visuals.card,
                )}
              >
                <CardHeader className="flex flex-col space-y-0 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-semibold leading-tight">
                        {indicator.name}
                      </CardTitle>
                    </div>
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl",
                        visuals.icon,
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-0">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Score</p>
                    <p className="text-3xl font-bold tracking-tight">
                      {formatScore(indicator.totalScore)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p
                      className={cn(
                        "text-xl font-semibold",
                        visuals.label,
                      )}
                    >
                      {formatPercentage(indicator.percentage)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>
    </div>
  );
};

export default AnalysisTab;

