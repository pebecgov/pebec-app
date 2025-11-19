# Bulk Import State Scores Guide

## Overview
You can bulk import state scores from an Excel file instead of entering them one by one. This saves time when you have data for multiple states and indicators.

## Excel File Format

Your Excel file should have the following columns (in order):

| Column A | Column B | Column C | Column D | Column E (Optional) |
|----------|----------|----------|----------|---------------------|
| **State** | **Indicator Key** | **SubIndicator Key** | **Value** | **Link to Source** |

### Column Details

1. **State** (Column A): The name of the Nigerian state
   - Example: `Lagos`, `Abia`, `Kano`

2. **Indicator Key** (Column B): The technical key for the indicator
   - Example: `access_to_electricity`, `infrastructure`, `digital_connectivity`
   - See full list below

3. **SubIndicator Key** (Column C): The technical key for the sub-indicator
   - Example: `band_a_shares`, `road_quality`, `right_of_way`
   - See indicator configurations for valid sub-indicators

4. **Value** (Column D): The selected option value
   - Example: `70-100`, `yes`, `very-good`, `free`
   - Must match one of the valid options for that sub-indicator

5. **Link to Source** (Column E, Optional): URL to source documentation
   - Example: `https://nerc.gov.ng/order/123`
   - Can be left empty

## Example Excel Data

```
State    | Indicator Key              | SubIndicator Key                    | Value   | Link to Source
---------|----------------------------|-------------------------------------|---------|------------------
Lagos    | access_to_electricity      | band_a_shares                      | 70-100  | https://nerc.gov.ng/...
Lagos    | access_to_electricity      | state_owned_electricity_regulator  | yes     | https://nerc.gov.ng/...
Abia     | infrastructure             | road_quality                       | very-good| 
Abia     | infrastructure             | road_motorability                  | yes     |
```

## Available Indicator Keys

- `access_to_electricity`
- `infrastructure`
- `digital_connectivity`
- `land_registration`
- `small_claims_courts`
- `investor_aftercare_service`
- `workforce_development`
- `crisis_resilience`
- `contract_enforcement`
- `market_access`
- `getting_credit`
- `export_import_facilitation`
- `interstate_trade`
- `paying_taxes`
- `grievance_redress_mechanisms`
- `access_to_skilled_labour`

## How to Use

1. **Prepare your Excel file** with the format above
2. **Go to Admin → State Scoring → Score States tab**
3. **Click "Choose File"** in the Bulk Import section
4. **Select your Excel file** (.xlsx, .xls, or .csv)
5. **Review the parsed data** - it will show how many scores were found
6. **Click "Import All"** to import all scores
7. **Check the results** - you'll see how many were imported successfully

## Tips

- **One row per sub-indicator**: Each row represents one sub-indicator score for one state
- **Multiple rows for same state**: You can have multiple rows for the same state (different indicators/sub-indicators)
- **Validation**: The system validates that indicator keys and sub-indicator keys exist
- **Batch processing**: Large files are imported in batches of 50 for better performance
- **Error handling**: If there are errors, they'll be shown in the results section

### Interstate Trade Reference

To match the spreadsheet template, `interstate_trade` now has two sub-indicators:

| Indicator Key | SubIndicator Key | Description | Allowed Values |
|---------------|------------------|-------------|----------------|
| `interstate_trade` | `haulage_fees` | Elimination of haulage fees (0–2 points) | `yes`, `no` |
| `interstate_trade` | `state_owned_transport_assets` | Presence of state-owned airports, air carriers, rail, seaport and dry port (0–3 points) | `0`, `1.5`, `3` |

Example rows:

```
State    | Indicator Key     | SubIndicator Key             | Value | Link to Source
---------|-------------------|------------------------------|-------|------------------
Lagos    | interstate_trade  | haulage_fees                 | yes   | https://example.com/law
Lagos    | interstate_trade  | state_owned_transport_assets | 1.5   | https://example.com/assets
```

### Export-Import Facilitation Conversion Guide

Many legacy spreadsheets (like the one in the screenshot) list each state once with both exporter counts and chamber scores. Convert that sheet into the bulk template using the steps below.

1. **Start from the legacy sheet**  
   - Column A: `STATES`  
   - Column B: `TOTAL NUMBER OF EXPORTERS PER STATE` (raw count)  
   - Column C: Score column (0–3) – ignore; we recompute from the count  
   - Column D: `State Chamber of Commerce Score (1 Point)` – value is 1 or 0  
   - Column E: `TOTAL SCORE (4 POINTS)` – ignore

2. **Map exporter count to descriptive value**  
   Use the raw number in Column B to produce the string value required by the app:

   | Raw Count | Value to Upload | SubIndicator Key |
   |-----------|-----------------|------------------|
   | ≥ 1000    | `>=1000`        | `totalExporters_perState` |
   | 500–999   | `500-999`       | `totalExporters_perState` |
   | 100–499   | `100-499`       | `totalExporters_perState` |
   | 0–99      | `0-99`          | `totalExporters_perState` |

3. **Map chamber score to yes/no**  
   Column D contains `1` (has chamber) or `0` (no chamber). Convert to:

   | Raw Value | Value to Upload | SubIndicator Key |
   |-----------|-----------------|------------------|
   | `1`       | `yes`           | `StateChamberOfCommerce` |
   | `0`       | `no`            | `StateChamberOfCommerce` |

4. **Build the bulk-import rows**  
   For every state you should end up with two rows:

   ```
   State   | Indicator Key               | SubIndicator Key        | Value     | Link (optional)
   ------- |-----------------------------|-------------------------|-----------|----------------
   Kano    | export_import_facilitation  | totalExporters_perState | >=1000    | https://...
   Kano    | export_import_facilitation  | StateChamberOfCommerce  | yes       | https://...
   ```

5. **Automate with the provided script (optional)**  
   - Update the paths in `scripts/transformExportImportExcel.ts` to point to your legacy sheet.  
   - Run `npx ts-node scripts/transformExportImportExcel.ts`.  
   - The script reads the original layout, applies the mappings above, and writes a ready-to-upload Excel file to the output path you set.

### Small Claims Courts Conversion Guide

Legacy SCC spreadsheets usually have the layout in the screenshot: state name, raw SCC count, a “Point Availability SCC (3)” column, and a “Up to Date Compliance Report (2)” column. Convert it as follows:

1. **Identify the columns**  
   - Column A: `State`  
   - Column B: `Availability of SCC` (raw number of functioning SCCs)  
   - Column C: `Point Availability SCC (3)` – can be ignored because the system recalculates the score  
   - Column D: `Up to Date Compliance Report (2)` – numeric score 0–2  
   - Column E: Total – ignore

2. **Map SCC count to ranges**  
   Use the raw number in Column B to determine the descriptive value for `number_of_courts`:

   | Raw Count | Value to Upload | Score | Notes |
   |-----------|-----------------|-------|-------|
   | 1–5       | `1-5`           | 1     | Matches sheet score 1 |
   | 6–9       | `6-10`          | 1.5   | Sheet score 1.5 (rounds 6–9 into this bucket) |
   | 10–14     | `11-14`         | 2     | Sheet score 2 |
   | ≥15       | `15-and-above`  | 3     | Sheet score 3 |
   | 0 or blank| _leave empty / skip row_ | 0 | No functioning SCCs |

3. **Map compliance score to descriptive value**  
   Column D already displays the numeric score. Convert each to the system value for `compliance_reporting`:

   | Raw Score | Value to Upload       | Meaning                              |
   |-----------|-----------------------|--------------------------------------|
   | `2`       | `up-to-date`          | Report is current                    |
   | `1.5`     | `6-months-old`        | Last report 4–6 months ago           |
   | `1`       | `3-months-old`        | Last report 1–3 months ago           |
   | `0`       | `not-published`       | No report                            |

4. **Produce two rows per state**  
   ```
   State   | Indicator Key         | SubIndicator Key     | Value         | Link (optional)
   ------- |-----------------------|----------------------|---------------|----------------
   Kaduna  | small_claims_courts   | number_of_courts     | 15-and-above  | https://...
   Kaduna  | small_claims_courts   | compliance_reporting | 6-months-old  | https://...
   ```

5. **Optional automation**  
   Adapt the existing conversion scripts (e.g., copy `scripts/transformExportImportExcel.ts`) or build a quick script to perform the mappings above automatically.

### Crisis Resilience Conversion Guide

The latest spreadsheet version tracks two SEMA-related checks totaling 3 points (1 + 2). Each column maps directly to a sub-indicator in the system.

1. **Spreadsheet columns** (rename as needed):
   - Column A: `State`
   - Column B: `Existence of State Emergency Management Agency (SEMA)` (1 point)
   - Column C: `Funding of the Agency (Budgetary allocations)` (2 points)
   - Column D: `Sources` (optional links)
   - Column E: `TOTAL` (ignore)

2. **Convert each column to the proper sub-indicator keys**:

   | Spreadsheet column | SubIndicator Key | Allowed Values |
   |--------------------|------------------|----------------|
   | Existence of SEMA  | `emergency_agency` | `yes`, `no` |
   | Funding of the agency | `sema_funding`  | `yes`, `no` |

   - If the sheet uses `1`/`0`, convert `1` → `yes`, `0` → `no`.
   - Treat blanks as `no` unless you have supporting documentation.

3. **Generate the bulk rows** (two per state):

   ```
   State  | Indicator Key       | SubIndicator Key | Value | Link (optional)
   -------|---------------------|------------------|-------|----------------
   Abia   | crisis_resilience   | emergency_agency | yes   | https://...
   Abia   | crisis_resilience   | sema_funding     | no    | https://...
   ```

4. **Automate if helpful**: Copy the pattern used in the other conversion scripts—load the sheet, normalize the yes/no values, and emit rows for each state/sub-indicator.

### Workforce Development & Social Infrastructure Conversion Guide

If your sheet mirrors the two-column template (Social Security Systems worth 2 points + Gender Inclusivity worth 1 point), convert it like this:

1. **Spreadsheet columns**
   - Column A: `State`
   - Column B: `Social Security Systems (2)` – value 2 (yes) or 0 (no)
   - Column C (or G): `Gender Inclusivity Point (1)` – value 1 (yes) or 0 (no)
   - Column D/E: Totals or links (optional)

2. **Map to sub-indicators**

   | Spreadsheet column         | SubIndicator Key          | Allowed Values |
   |----------------------------|---------------------------|----------------|
   | Social Security Systems    | `social_security_systems` | `yes`, `no`    |
   | Gender Inclusivity         | `gender_inclusivity`      | `yes`, `no`    |

   Convert numeric scores: 2 → `yes`, 0 → `no` for social security; 1 → `yes`, 0 → `no` for gender inclusivity.

3. **Build rows**
   ```
   State   | Indicator Key          | SubIndicator Key         | Value | Link (optional)
   ------- |------------------------|--------------------------|-------|----------------
   Abia    | workforce_development  | social_security_systems  | yes   | https://...
   Abia    | workforce_development  | gender_inclusivity       | no    | https://...
   ```

4. **Automation**: copy the earlier conversion scripts—load the sheet, normalize numbers to yes/no strings, and export the standard bulk-import layout.

### Access to Skilled Labour Conversion Guide

Your spreadsheet already mirrors the two 1.5-point sub-indicators (education investment + accredited institutions). Convert it like this:

1. **Spreadsheet columns**
   - Column A: `State`
   - Column B: `Investing in Education (1.5)` – numeric score 0–1.5
   - Column C: `Availability of Tertiary and Technical Institutions (1.5)` – numeric score 0–1.5
   - Column D/E: totals or links (optional)

2. **Map investment scores to option values**

   | Numeric Score | Value to Upload                | SubIndicator Key        |
   |---------------|--------------------------------|-------------------------|
   | `1.5`         | `highest-tier`                 | `education_investment`  |
   | `1.25`        | `second-tier`                  | `education_investment`  |
   | `0.75`        | `mid-tier`                     | `education_investment`  |
   | `0.5`         | `lowest-tier`                  | `education_investment`  |
   | `0`           | `below-average`                | `education_investment`  |

3. **Map institution scores to option values**

   | Numeric Score | Value to Upload              | SubIndicator Key        |
   |---------------|------------------------------|-------------------------|
   | `1.5`         | `seven-plus`                 | `accredited_institutions` |
   | `1`           | `three-to-six`               | `accredited_institutions` |
   | `0.5`         | `one-to-two`                 | `accredited_institutions` |
   | `0`           | `zero`                       | `accredited_institutions` |

4. **Create rows**
   ```
   State   | Indicator Key            | SubIndicator Key         | Value                       | Link (optional)
   ------- |--------------------------|--------------------------|-----------------------------|----------------
   Edo     | access_to_skilled_labour | education_investment     | moderate-investment         | https://...
   Edo     | access_to_skilled_labour | accredited_institutions  | 3-tertiary-2-technical      | https://...
   ```

5. **Automation tip**: Duplicate any of the previous conversion scripts and adjust the numeric-to-string mapping arrays to match the tables above.

## Troubleshooting

**"Invalid indicator key" error:**
- Check that you're using the exact indicator key (case-sensitive, with underscores)
- See the list above for valid keys

**"Missing value" error:**
- Make sure the Value column matches one of the valid options for that sub-indicator
- Check the indicator configuration for valid values

**"Failed to parse Excel file" error:**
- Make sure your file is a valid Excel file (.xlsx, .xls) or CSV
- Check that the file isn't corrupted
- Ensure the first row contains headers (even if they're not used)

## Alternative: Manual Entry

If you prefer to enter data manually or need to make individual edits, you can still use the form below the bulk import section to enter scores one by one.

