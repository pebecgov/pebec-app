# Migration Guide: Export-Import Facilitation Scoring Update

## Overview
The Export-Import Facilitation scoring system has been updated from a 3-tier to a 4-tier system.

## Changes

### Old System (3 tiers):
- **>999** (1000+) → 3 points
- **500-999** → 2 points  
- **0-499** → 1 point (minimum)

### New System (4 tiers):
- **≥ 1000** → 3 points
- **500-999** → 2 points
- **100-499** → 1 point
- **0-99** → 0 points (new tier)

## Impact on Existing Data

### What Happens:
1. **Existing records** with old values (`>999`, `500-999`, `0-499`) will need to be migrated
2. **New records** will use the new 4-tier system automatically
3. **Scores are calculated dynamically** from the config, so old values won't match and will return 0 points until migrated

### Migration Mapping:
- `>999` → `>=1000` (same score: 3 points) ✅
- `500-999` → `500-999` (no change) ✅
- `0-499` → `100-499` (preserves 1 point) ⚠️

**Important Note**: States with `0-499` are mapped to `100-499` to preserve their score. However, states that actually have **less than 100 exporters** should be manually updated to `0-99` (0 points) after migration.

## How to Run the Migration

### Option 1: Using Convex Dashboard
1. Go to your Convex Dashboard
2. Navigate to Functions
3. Find `migrations/migrateExportImportFacilitation`
4. Click "Run" and execute the mutation

### Option 2: Using Convex CLI
```bash
npx convex run migrations/migrateExportImportFacilitation:migrateExportImportFacilitation
```

### Option 3: From Your Application Code
```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const migrate = useMutation(api.migrations.migrateExportImportFacilitation.migrateExportImportFacilitation);

// Run migration
const result = await migrate({});
console.log(result);
```

## After Migration

1. **Review the migration results** - Check which states were updated
2. **Manually review states with `100-499`** - If you know a state has <100 exporters, update it to `0-99`
3. **Verify scores** - Check that state rankings and percentages are correct

## Maximum Score Impact

The maximum possible score for Export-Import Facilitation remains **4 points**:
- Total exporters: 3 points (max)
- Chamber of commerce: 1 point (max)

## Rollback

If you need to rollback:
1. Revert the config changes in `convex/config/indicators.ts` and `components/Admin/StateScoringForm.tsx`
2. Run a reverse migration to map values back:
   - `>=1000` → `>999`
   - `100-499` → `0-499`
   - `0-99` → `0-499` (or remove if they should have 0 points)

