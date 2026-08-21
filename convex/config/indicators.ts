// PEBEC Sub-National Ease of Doing Business Ranking Framework
// Source: PEBEC Subnational Justification Matrix (current official version)

export const indicators = {
  electricity: {
    name: "Electricity (16%)",
    subIndicators: {
      state_electricity_law: {
        label: "State Electricity Law (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      electricity_regulatory_commission: {
        label: "Establishment of State Electricity Regulatory Commission (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      nerc_transfer_request: {
        label: "Request for Transfer from NERC (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      electricity_license: {
        label: "License (1%)",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      electricity_generation: {
        label: "Electricity Generation (4% Bonus)",
        options: [
          { value: "excellent", label: "Excellent (4)", score: 4 },
          { value: "good", label: "Good (3)", score: 3 },
          { value: "fair", label: "Fair (2)", score: 2 },
          { value: "poor", label: "Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      electricity_transmission_distribution: {
        label: "Electricity Transmission and Distribution (5%)",
        options: [
          { value: "excellent", label: "Excellent (5)", score: 5 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (3)", score: 3 },
          { value: "poor", label: "Poor (2)", score: 2 },
          { value: "very_poor", label: "Very Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
    },
  },
  infrastructure: {
    name: "Infrastructure (8%)",
    subIndicators: {
      roads_within_state_capital: {
        label: "Roads within State Capital (4%)",
        options: [
          { value: "excellent", label: "Excellent (4)", score: 4 },
          { value: "very_good", label: "Very Good (3)", score: 3 },
          { value: "good", label: "Good (2)", score: 2 },
          { value: "fair", label: "Fair (1)", score: 1 },
          { value: "poor", label: "Poor (0)", score: 0 },
        ],
      },
      industrial_zones: {
        label: "Industrial Zones (4%)",
        options: [
          { value: "excellent", label: "Excellent (4)", score: 4 },
          { value: "very_good", label: "Very Good (3)", score: 3 },
          { value: "good", label: "Good (2)", score: 2 },
          { value: "fair", label: "Fair (1)", score: 1 },
          { value: "poor", label: "Poor (0)", score: 0 },
        ],
      },
    },
  },
  getting_credit: {
    name: "Getting Credit (12%)",
    subIndicators: {
      state_microfinance_banks: {
        label: "State Microfinance Banks (6%)",
        options: [
          { value: "excellent", label: "Excellent (6)", score: 6 },
          { value: "good", label: "Good (5)", score: 5 },
          { value: "fair", label: "Fair (4)", score: 4 },
          { value: "poor", label: "Poor (3)", score: 3 },
          { value: "very_poor", label: "Very Poor (2)", score: 2 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      access_federal_financial_institutions: {
        label: "Access to Federal Financial Institutions (6%)",
        options: [
          { value: "excellent", label: "Excellent (6)", score: 6 },
          { value: "good", label: "Good (5)", score: 5 },
          { value: "fair", label: "Fair (4)", score: 4 },
          { value: "poor", label: "Poor (3)", score: 3 },
          { value: "very_poor", label: "Very Poor (2)", score: 2 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
    },
  },
  digital_connectivity: {
    name: "Digital Connectivity (10%)",
    subIndicators: {
      right_of_way_policy: {
        label: "Right of Way Policy (5%)",
        options: [
          { value: "excellent", label: "Excellent (5)", score: 5 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (3)", score: 3 },
          { value: "poor", label: "Poor (2)", score: 2 },
          { value: "very_poor", label: "Very Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      coverage_5g_network_reliability: {
        label: "5G Coverage & Network Reliability (5%)",
        options: [
          { value: "excellent", label: "Excellent (5)", score: 5 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (3)", score: 3 },
          { value: "poor", label: "Poor (2)", score: 2 },
          { value: "very_poor", label: "Very Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
    },
  },
  digitalizing_land_registration: {
    name: "Digitalizing Land Registration (10%)",
    subIndicators: {
      gis: {
        label: "GIS (3%)",
        options: [
          { value: "excellent", label: "Excellent (3)", score: 3 },
          { value: "good", label: "Good (2)", score: 2 },
          { value: "fair", label: "Fair (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      automated: {
        label: "Automated (7%)",
        options: [
          { value: "fully-automated", label: "Fully automated (7)", score: 7 },
          { value: "hybrid", label: "Hybrid (4)", score: 4 },
          { value: "manual", label: "Manual (0)", score: 0 },
        ],
      },
    },
  },
  access_to_skilled_labour: {
    name: "Access to Skilled Labor (5%)",
    subIndicators: {
      technical_vocational_training_centers: {
        label: "Technical & Vocational Training Centers (2.5%)",
        options: [
          { value: "seven-plus", label: "7 or more centres (2.5)", score: 2.5 },
          { value: "four-to-six", label: "4 to 6 centres (1.75)", score: 1.75 },
          { value: "one-to-three", label: "1 to 3 centres (1)", score: 1 },
          { value: "zero", label: "None (0)", score: 0 },
        ],
      },
      tertiary_institutions: {
        label: "Total number of tertiary institutions (2.5%)",
        options: [
          { value: "seven-plus", label: "7 or more institutions (2.5)", score: 2.5 },
          { value: "three-to-six", label: "3 to 6 institutions (1.75)", score: 1.75 },
          { value: "one-to-two", label: "1 or 2 institutions (1)", score: 1 },
          { value: "zero", label: "None (0)", score: 0 },
        ],
      },
    },
  },
  access_to_justice: {
    name: "Access to Justice (8%)",
    subIndicators: {
      small_claims_court: {
        label: "Small Claims Court (2%)",
        options: [
          { value: "15-and-above", label: "15 and above (2)", score: 2 },
          { value: "11-14", label: "11-14 (1.5)", score: 1.5 },
          { value: "6-10", label: "6-10 (1)", score: 1 },
          { value: "1-5", label: "1-5 (0.5)", score: 0.5 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      compliance_reporting: {
        label: "Compliance Reporting (2%)",
        options: [
          { value: "up-to-date", label: "Up to date (2)", score: 2 },
          { value: "6-months-old", label: "More than 6 months (1.5)", score: 1.5 },
          { value: "3-months-old", label: "More than 3 months (1)", score: 1 },
          { value: "not-published", label: "Not published (0)", score: 0 },
        ],
      },
      multi_door_courthouse: {
        label: "Multi-Door Courthouse (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      commercial_court: {
        label: "Commercial Court (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  harmonized_taxes: {
    name: "Harmonized Taxes, Levies & Fees (10%)",
    subIndicators: {
      harmonization_law: {
        label: "Harmonization Law (3%)",
        options: [
          { value: "yes", label: "Yes (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      digitized_tax_payment: {
        label: "Digitized Tax Payment (4%)",
        options: [
          { value: "digital", label: "Digital / e-payment with automatic receipts (4)", score: 4 },
          { value: "hybrid", label: "Partial / hybrid digitization (2)", score: 2 },
          { value: "manual", label: "Manual / cash-based (0)", score: 0 },
        ],
      },
      publication_of_fees_procedures: {
        label: "Publication of Fees & Procedures (2%)",
        options: [
          { value: "publicly-available", label: "Fees and procedures publicly available (2)", score: 2 },
          { value: "partial", label: "Either fees or procedures published (1)", score: 1 },
          { value: "not-published", label: "Not published (0)", score: 0 },
        ],
      },
      tax_incentives: {
        label: "Tax Incentives (1% Bonus)",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  investor_lifecycle: {
    name: "Investor Lifecycle (5%)",
    subIndicators: {
      digital_one_stop_shop: {
        label: "Digital One Stop Shop",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      digitization_of_processes: {
        label: "Digitization of Processes",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      investor_aftercare: {
        label: "Investor Aftercare / Retention Support",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  grievance_redress_mechanisms: {
    name: "Grievance Redress Mechanism (3%)",
    subIndicators: {
      availability_of_grm: {
        label: "Availability of GRM (1%)",
        options: [
          { value: "yes", label: "Available (1)", score: 1 },
          { value: "no", label: "Not available (0)", score: 0 },
        ],
      },
      centralized_grm: {
        label: "Centralized GRM (1%)",
        options: [
          { value: "yes", label: "Centralized GRM available (1)", score: 1 },
          { value: "no", label: "No centralized GRM (0)", score: 0 },
        ],
      },
      multiple_channels_functionality: {
        label: "Multiple Channels & Functionality (1%)",
        options: [
          { value: "yes", label: "Easily accessible via multiple channels (1)", score: 1 },
          { value: "no", label: "Difficult to find or access (0)", score: 0 },
        ],
      },
    },
  },
  export_facilitation: {
    name: "Export Facilitation (2%)",
    subIndicators: {
      formalization_of_informal_businesses: {
        label: "Formalization of Informal Businesses",
        options: [
          { value: "yes", label: "Yes (0.5)", score: 0.5 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      nepc_certificate_facilitation: {
        label: "NEPC Certificate Facilitation",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      export_strategy_document: {
        label: "Export Strategy Document",
        options: [
          { value: "yes", label: "Yes (0.5)", score: 0.5 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  social_infrastructure: {
    name: "Social Infrastructure (3%)",
    subIndicators: {
      social_security_system: {
        label: "Social Security System",
        options: [
          { value: "yes", label: "Yes (1.5)", score: 1.5 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      primary_healthcare_free_education: {
        label: "Primary Health-Care Centres / Free Education",
        options: [
          { value: "yes", label: "Yes (1.5)", score: 1.5 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  crisis_resilience: {
    name: "Crisis Resilience (2%)",
    subIndicators: {
      disaster_emergency_preparedness: {
        label: "Disaster & Emergency Preparedness",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      emergency_response_channels: {
        label: "Emergency Response Channels",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
} as const;

export type IndicatorKey = keyof typeof indicators;

function maxOptionScore(options: ReadonlyArray<{ score: number }>): number {
  return options.reduce((max, option) => Math.max(max, option.score), 0);
}

export function getIndicatorMaxScore(indicatorKey: IndicatorKey): number {
  const config = indicators[indicatorKey];
  return Object.values(config.subIndicators).reduce(
    (sum, subIndicator) => sum + maxOptionScore(subIndicator.options),
    0
  );
}

export const indicatorMaxScores = Object.fromEntries(
  (Object.keys(indicators) as IndicatorKey[]).map((key) => [key, getIndicatorMaxScore(key)])
) as Record<IndicatorKey, number>;

export const overallIndicatorMaxScore = (Object.values(indicatorMaxScores) as number[]).reduce(
  (sum, value) => sum + value,
  0
);

export const INDICATOR_COUNT = Object.keys(indicators).length;
