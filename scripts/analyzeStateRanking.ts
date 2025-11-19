/**
 * Script to analyze why a specific state is ranked at a certain position
 * Usage: npx tsx scripts/analyzeStateRanking.ts Anambra
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { indicators } from "../convex/config/indicators";

// Get Convex URL from environment or use production default
// Production: https://kindred-fox-158.convex.cloud
// Dev: https://cheerful-poodle-480.convex.cloud
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "https://kindred-fox-158.convex.cloud";

if (!CONVEX_URL) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable is not set");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Calculate indicator max scores
const indicatorMaxScores = Object.fromEntries(
  Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
    const maxScoreForIndicator = Object.values(indicatorConfig.subIndicators).reduce(
      (sum, subIndicator: any) => {
        const options = subIndicator.options as Array<{ score: number }>;
        const maxOptionScore = options.reduce((max, option) => Math.max(max, option.score), 0);
        return sum + maxOptionScore;
      },
      0
    );
    return [indicatorKey, maxScoreForIndicator];
  })
);

const overallMaxScore = Object.values(indicatorMaxScores).reduce((sum, value) => sum + value, 0);

async function analyzeStateRanking(stateName: string) {
  try {
    console.log(`\n🔍 Analyzing ranking for: ${stateName}\n`);
    console.log("=" .repeat(80));

    // Get all scores for the state - try both API paths
    let stateScores: any[] = [];
    let allScores: any[] = [];
    
    try {
      stateScores = await client.query(api.saveStateScore.getStateScores as any, {
        state: stateName,
      });
      allScores = await client.query(api.saveStateScore.getStateScores as any, {});
    } catch (error) {
      // Try alternative API path
      console.log("Trying alternative API path...");
      stateScores = await client.query(api.state_scores.getStateRankings as any, {});
      // Filter for the specific state
      const allStateScores = await client.query(api.saveStateScore.getStateScores as any, {});
      stateScores = allStateScores?.filter((s: any) => s.state === stateName) || [];
      allScores = allStateScores || [];
    }

    if (!stateScores || stateScores.length === 0) {
      console.log(`❌ No scores found for ${stateName}`);
      return;
    }

    // Calculate rankings
    const stateTotals = new Map<string, number>();
    allScores?.forEach((score: any) => {
      const currentTotal = stateTotals.get(score.state) || 0;
      stateTotals.set(score.state, currentTotal + (score.score || 0));
    });

    // Sort by total score
    const rankings = Array.from(stateTotals.entries())
      .map(([state, totalScore]) => ({
        state,
        totalScore,
        percentageScore: (totalScore / overallMaxScore) * 100,
      }))
      .sort((a, b) => b.percentageScore - a.percentageScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    // Find the target state's ranking
    const targetStateRanking = rankings.find((r) => r.state === stateName);

    if (!targetStateRanking) {
      console.log(`❌ ${stateName} not found in rankings`);
      return;
    }

    // Calculate state's total score
    const stateTotalScore = stateScores.reduce((sum: number, score: any) => sum + (score.score || 0), 0);
    const statePercentage = (stateTotalScore / overallMaxScore) * 100;

    // Group scores by indicator
    const scoresByIndicator: Record<string, {
      scores: any[];
      total: number;
      max: number;
      percentage: number;
    }> = {};

    stateScores.forEach((score: any) => {
      if (!scoresByIndicator[score.indicator]) {
        scoresByIndicator[score.indicator] = {
          scores: [],
          total: 0,
          max: indicatorMaxScores[score.indicator] || 0,
          percentage: 0,
        };
      }
      scoresByIndicator[score.indicator].scores.push(score);
      scoresByIndicator[score.indicator].total += score.score || 0;
    });

    // Calculate percentages
    Object.keys(scoresByIndicator).forEach((indicator) => {
      const data = scoresByIndicator[indicator];
      data.percentage = data.max > 0 ? (data.total / data.max) * 100 : 0;
    });

    // Display results
    console.log(`\n📊 OVERALL RANKING SUMMARY`);
    console.log("=" .repeat(80));
    console.log(`Rank: #${targetStateRanking.rank}`);
    console.log(`Total Score: ${stateTotalScore.toFixed(1)} / ${overallMaxScore} points`);
    console.log(`Percentage: ${statePercentage.toFixed(2)}%`);
    console.log(`Grade: ${getGrade(statePercentage)}`);

    // Show top 5 states for comparison
    console.log(`\n🏆 TOP 5 STATES (for comparison)`);
    console.log("=" .repeat(80));
    rankings.slice(0, 5).forEach((ranking) => {
      const isTarget = ranking.state === stateName;
      const marker = isTarget ? "👉 " : "   ";
      console.log(
        `${marker}#${ranking.rank.toString().padStart(2)} | ${ranking.state.padEnd(20)} | ${ranking.totalScore.toFixed(1).padStart(6)} / ${overallMaxScore} | ${ranking.percentageScore.toFixed(2).padStart(6)}% | ${getGrade(ranking.percentageScore)}`
      );
    });

    // Show breakdown by indicator
    console.log(`\n📈 BREAKDOWN BY INDICATOR`);
    console.log("=" .repeat(80));
    
    const sortedIndicators = Object.entries(scoresByIndicator)
      .sort((a, b) => b[1].total - a[1].total);

    sortedIndicators.forEach(([indicatorKey, data]) => {
      const indicatorName = indicators[indicatorKey as keyof typeof indicators]?.name || indicatorKey;
      console.log(`\n${indicatorName} (${indicatorKey})`);
      console.log(`  Score: ${data.total.toFixed(1)} / ${data.max} points (${data.percentage.toFixed(1)}%)`);
      console.log(`  Sub-indicators:`);
      
      data.scores.forEach((score: any) => {
        const subIndicatorConfig = indicators[indicatorKey as keyof typeof indicators]?.subIndicators?.[score.subIndicator];
        const subIndicatorLabel = subIndicatorConfig?.label || score.subIndicator;
        const subIndicatorMax = subIndicatorConfig?.options?.reduce((max: number, opt: any) => Math.max(max, opt.score), 0) || 0;
        const subIndicatorPercentage = subIndicatorMax > 0 ? ((score.score || 0) / subIndicatorMax) * 100 : 0;
        
        console.log(`    • ${subIndicatorLabel}: ${(score.score || 0).toFixed(1)} / ${subIndicatorMax} (${subIndicatorPercentage.toFixed(1)}%) - Value: "${score.value}"`);
      });
    });

    // Show missing indicators
    const completedIndicators = new Set(Object.keys(scoresByIndicator));
    const allIndicators = Object.keys(indicators);
    const missingIndicators = allIndicators.filter((ind) => !completedIndicators.has(ind));

    if (missingIndicators.length > 0) {
      console.log(`\n⚠️  MISSING INDICATORS (0 points)`);
      console.log("=" .repeat(80));
      missingIndicators.forEach((indicatorKey) => {
        const indicatorName = indicators[indicatorKey as keyof typeof indicators]?.name || indicatorKey;
        const maxScore = indicatorMaxScores[indicatorKey] || 0;
        console.log(`  • ${indicatorName}: 0 / ${maxScore} points (0%)`);
      });
    }

    // Show what's needed to move up
    if (targetStateRanking.rank > 1) {
      const stateAbove = rankings[targetStateRanking.rank - 2];
      const pointsNeeded = stateAbove.totalScore - stateTotalScore;
      const percentageNeeded = stateAbove.percentageScore - statePercentage;
      
      console.log(`\n📊 TO MOVE UP TO #${targetStateRanking.rank - 1}`);
      console.log("=" .repeat(80));
      console.log(`Current rank #${targetStateRanking.rank}: ${stateTotalScore.toFixed(1)} points (${statePercentage.toFixed(2)}%)`);
      console.log(`Rank #${targetStateRanking.rank - 1} (${stateAbove.state}): ${stateAbove.totalScore.toFixed(1)} points (${stateAbove.percentageScore.toFixed(2)}%)`);
      console.log(`Points needed: ${pointsNeeded.toFixed(1)} points (${percentageNeeded.toFixed(2)}%)`);
    }

    // Show what's needed to maintain position
    if (targetStateRanking.rank < rankings.length) {
      const stateBelow = rankings[targetStateRanking.rank];
      const pointsAhead = stateTotalScore - stateBelow.totalScore;
      const percentageAhead = statePercentage - stateBelow.percentageScore;
      
      console.log(`\n📊 LEAD OVER #${targetStateRanking.rank + 1}`);
      console.log("=" .repeat(80));
      console.log(`Current rank #${targetStateRanking.rank}: ${stateTotalScore.toFixed(1)} points (${statePercentage.toFixed(2)}%)`);
      console.log(`Rank #${targetStateRanking.rank + 1} (${stateBelow.state}): ${stateBelow.totalScore.toFixed(1)} points (${stateBelow.percentageScore.toFixed(2)}%)`);
      console.log(`Lead: ${pointsAhead.toFixed(1)} points (${percentageAhead.toFixed(2)}%)`);
    }

    console.log("\n" + "=" .repeat(80) + "\n");

  } catch (error) {
    console.error("Error analyzing state ranking:", error);
    process.exit(1);
  }
}

function getGrade(percentage: number): string {
  if (percentage >= 85) return "A (Excellent)";
  if (percentage >= 70) return "B (Good)";
  if (percentage >= 55) return "C (Average)";
  if (percentage >= 40) return "D (Below Average)";
  return "F (Poor)";
}

// Get state name from command line argument
const stateName = process.argv[2] || "Anambra";

analyzeStateRanking(stateName);

