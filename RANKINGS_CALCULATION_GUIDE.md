# How Overall Rankings Are Calculated (All Indicators)

## Overview

When viewing "All Indicators" in the Detailed Rankings table, the system calculates overall scores by summing scores across **all indicators** for each state.

## Calculation Process

### Step 1: Calculate Maximum Possible Score for Each Indicator

For each indicator, the system calculates the maximum possible score by:

1. **For each sub-indicator** in the indicator:
   - Find the **highest score** among all options
   - Example: If a sub-indicator has options with scores [0, 1, 2, 3], the max is **3**

2. **Sum all sub-indicator maximums** for that indicator:
   ```
   Indicator Max Score = Sum of (max score for each sub-indicator)
   ```

**Example - Export-Import Facilitation:**
- `totalExporters_perState`: Max score = 3 (from ">=1000" option)
- `StateChamberOfCommerce`: Max score = 1 (from "yes" option)
- **Indicator Max Score = 3 + 1 = 4 points**

### Step 2: Calculate Overall Maximum Score

The overall maximum score is the **sum of all indicator maximum scores**:

```javascript
overallMaxScore = Sum of (max score for each indicator)
```

**Example:**
- Access to Electricity: 10 points max
- Infrastructure: 12 points max
- Digital Connectivity: 6 points max
- Export-Import Facilitation: 4 points max
- ... (all other indicators)
- **Overall Max Score = Sum of all indicator max scores**

### Step 3: Calculate State Total Score

For each state, the system:

1. **Fetches all scores** from the `state_scores` table (across all indicators)
2. **Groups by state** and **sums all scores**:
   ```javascript
   stateTotalScore = Sum of (all score values for that state)
   ```

**Example for "Lagos":**
- Access to Electricity: 8 points
- Infrastructure: 10 points
- Digital Connectivity: 5 points
- Export-Import Facilitation: 4 points
- ... (other indicators)
- **Lagos Total Score = 8 + 10 + 5 + 4 + ... = Sum of all**

### Step 4: Calculate Percentage Score

For each state:
```javascript
percentageScore = (stateTotalScore / overallMaxScore) × 100
```

**Example:**
- Lagos Total Score: 45 points
- Overall Max Score: 100 points
- **Lagos Percentage = (45 / 100) × 100 = 45%**

### Step 5: Rank States

States are sorted by **percentage score** in descending order (highest first), then assigned ranks:
- Rank 1: Highest percentage
- Rank 2: Second highest
- etc.

### Step 6: Calculate Grade

Based on percentage score:
- **Grade A**: ≥ 85% (Excellent)
- **Grade B**: 70-84% (Good)
- **Grade C**: 55-69% (Average)
- **Grade D**: 40-54% (Below Average)
- **Grade F**: < 40% (Poor)

## Code Location

The calculation happens in:

1. **`convex/state_scores.ts`** - `getStateRankings` query:
   - Calculates `overallMaxScore` from indicator configs
   - Sums all scores per state
   - Calculates percentages
   - Ranks states

2. **`hooks/useStateRankings.ts`** - Frontend hook:
   - Uses the query results
   - Handles filtering by indicator (if selected)
   - Formats data for display

3. **`app/(site)/admin/state-scoring/page.tsx`** - RankingsTable component:
   - Displays the rankings
   - Shows total score, percentage, and grade

## Important Notes

### Missing Data Handling

- If a state has **no scores** for an indicator, that indicator contributes **0 points** to the total
- The percentage is still calculated against the **full overallMaxScore**
- This means states with incomplete data will have lower percentages

### Example Scenario

**State A (Complete Data):**
- Has scores for all 14 indicators
- Total Score: 80 points
- Overall Max: 100 points
- **Percentage: 80%** (Grade B)

**State B (Incomplete Data):**
- Has scores for only 7 indicators
- Total Score: 40 points
- Overall Max: 100 points
- **Percentage: 40%** (Grade D)

Even though State B might have perfect scores for the indicators it completed, it ranks lower because it's missing data.

### When Filtering by Indicator

When you select a specific indicator (not "All Indicators"):

1. Only scores for that indicator are included
2. The maximum score is the **indicator's max score** (not overall max)
3. Percentage is calculated as: `(indicatorScore / indicatorMaxScore) × 100`

**Example - Filtering by Export-Import Facilitation:**
- Lagos Score: 4 points (both sub-indicators maxed)
- Indicator Max: 4 points
- **Percentage: (4 / 4) × 100 = 100%** (Grade A)

## Current Overall Max Score

The overall maximum score is calculated dynamically from the indicator configurations. To see the current value, check:

```javascript
// In convex/state_scores.ts or hooks/useStateRankings.ts
const overallMaxScore = Object.values(indicatorMaxScores).reduce(
  (sum, value) => sum + value,
  0
);
```

This value changes automatically when:
- New indicators are added
- Sub-indicators are added/removed
- Option scores are modified

## Summary Formula

```
For "All Indicators" view:

1. Overall Max Score = Σ (Max score of each indicator)
2. State Total Score = Σ (All scores for that state across all indicators)
3. Percentage = (State Total Score / Overall Max Score) × 100
4. Rank = Position when sorted by percentage (descending)
5. Grade = Based on percentage thresholds
```

