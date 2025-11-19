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

