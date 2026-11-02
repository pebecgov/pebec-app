// PEBEC Sub-National Ease of Doing Business Ranking Framework
// Source: PEBEC Subnational Justification Matrix
//
// The framework is versioned by assessment year. Scores already saved against an
// earlier framework must keep being read, scored and ranked with that framework,
// so never edit a past year's set — add a new one instead.

export type IndicatorOption = {
  readonly value: string;
  readonly label: string;
  readonly score: number;
};

export type SubIndicatorConfig = {
  readonly label: string;
  readonly options: readonly IndicatorOption[];
};

export type IndicatorConfig = {
  readonly name: string;
  readonly subIndicators: Readonly<Record<string, SubIndicatorConfig>>;
};

export type IndicatorSet = Readonly<Record<string, IndicatorConfig>>;

// 2025 and earlier: 13 indicators, includes Social Infrastructure and Crisis
// Resilience, which were dropped for 2026.
const indicators2025 = {
  electricity: {
    name: "Electricity (16%)",
    // Spreadsheet: Law 3 + Agency 3 + Licence 1 + Generation 4 + Transmission 5 = 16
    subIndicators: {
      state_electricity_law: {
        label: "Law (3%)",
        options: [
          {
            value: "transfer_order_issued",
            label: "Transfer Order Issued by NERC (3)",
            score: 3,
          },
          {
            value: "no_transfer_order",
            label: "No Transfer Order from NERC (0)",
            score: 0,
          },
        ],
      },
      electricity_regulatory_commission: {
        label: "Establishment of Agency (3%)",
        options: [
          { value: "yes", label: "Yes (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      electricity_license: {
        label: "Licence (1%)",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      electricity_generation: {
        label: "Generation (4%)",
        options: [
          { value: "excellent", label: "Excellent (4)", score: 4 },
          { value: "good", label: "Good (3)", score: 3 },
          { value: "fair", label: "Fair (2)", score: 2 },
          { value: "poor", label: "Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      electricity_transmission_distribution: {
        label: "Transmission (5%)",
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
    // Presence of industrial layout 2 + Functional industrial park 6 = 8
    subIndicators: {
      industrial_layout_presence: {
        label: "Presence of Industrial Layout (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      functional_industrial_park: {
        label: "Functional Industrial Park (6%)",
        options: [
          { value: "yes", label: "Yes (6)", score: 6 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  getting_credit: {
    name: "Access to Credit (12%)",
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
    // GIS 3 + one automation tier (Full 7 / Semi 5 / Doc 2) = max 10
    subIndicators: {
      gis: {
        label: "Availability of GIS (3%)",
        options: [
          { value: "yes", label: "Yes (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      automated: {
        label: "Land Registration Automation (7%)",
        options: [
          {
            value: "full_automation",
            label: "Full automation end-to-end (7)",
            score: 7,
          },
          {
            value: "semi_automation",
            label: "Semi-automation (5)",
            score: 5,
          },
          {
            value: "document_downloads",
            label: "Document downloads/processing (2)",
            score: 2,
          },
          { value: "none", label: "None (0)", score: 0 },
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
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      compliance_reporting: {
        label: "Compliance Reporting (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
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
    // Law 3 + Digitized 2 + Publication 2 + Procedures 2 + Incentives 1 = 10
    subIndicators: {
      harmonization_law: {
        label: "Harmonization Law (3%)",
        options: [
          { value: "yes", label: "Yes (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      digitized_tax_payment: {
        label: "Digitized Tax System (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      publication_of_fees: {
        label: "Publication of Fees (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      procedures: {
        label: "Procedures (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
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
} as const satisfies IndicatorSet;

// 2026 onwards: 12 indicators summing to 100%, matching the Justification Matrix.
const indicators2026 = {
  electricity: {
    name: "Electricity (16%)",
    // Spreadsheet: Law 3 + Agency 3 + Licence 1 + Generation 4 + Transmission 5 = 16
    subIndicators: {
      state_electricity_law: {
        label: "Law (3%)",
        options: [
          {
            value: "transfer_order_issued",
            label: "Transfer Order Issued by NERC (3)",
            score: 3,
          },
          {
            value: "no_transfer_order",
            label: "No Transfer Order from NERC (0)",
            score: 0,
          },
        ],
      },
      electricity_regulatory_commission: {
        label: "Establishment of Agency (3%)",
        options: [
          { value: "yes", label: "Yes (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      electricity_license: {
        label: "Licence (1%)",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      electricity_generation: {
        label: "Generation (4%)",
        options: [
          { value: "excellent", label: "Excellent (4)", score: 4 },
          { value: "good", label: "Good (3)", score: 3 },
          { value: "fair", label: "Fair (2)", score: 2 },
          { value: "poor", label: "Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      electricity_transmission_distribution: {
        label: "Transmission (5%)",
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
    // Presence of industrial layout 2 + Functional industrial park 6 = 8
    subIndicators: {
      industrial_layout_presence: {
        label: "Presence of Industrial Layout (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      functional_industrial_park: {
        label: "Functional Industrial Park (6%)",
        options: [
          { value: "yes", label: "Yes (6)", score: 6 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  getting_credit: {
    name: "Access to Credit (12%)",
    subIndicators: {
      state_microfinance_banks: {
        label: "State Microfinance Banks (6%)",
        options: [
          { value: "yes", label: "Yes (6)", score: 6 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      access_federal_financial_institutions: {
        label: "Access to Federal Financial Institutions (6%)",
        options: [
          { value: "yes", label: "Yes (6)", score: 6 },
          { value: "no", label: "No (0)", score: 0 },
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
    // GIS 3 + one automation tier (Full 7 / Semi 5 / Doc 2) = max 10
    subIndicators: {
      gis: {
        label: "Availability of GIS (3%)",
        options: [
          { value: "yes", label: "Yes (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      automated: {
        label: "Land Registration Automation (7%)",
        options: [
          {
            value: "full_automation",
            label: "Full automation end-to-end (7)",
            score: 7,
          },
          {
            value: "semi_automation",
            label: "Semi-automation (5)",
            score: 5,
          },
          {
            value: "document_downloads",
            label: "Document downloads/processing (2)",
            score: 2,
          },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
    },
  },
  access_to_skilled_labour: {
    name: "Access to Skilled Labor (5%)",
    subIndicators: {
      technical_vocational_training_centers: {
        label: "Technical & Vocational Training Centers (5%)",
        options: [
          { value: "seven-plus", label: "7 or more centres (5)", score: 5 },
          { value: "four-to-six", label: "4 to 6 centres (3.5)", score: 3.5 },
          { value: "one-to-three", label: "1 to 3 centres (2)", score: 2 },
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
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      compliance_reporting: {
        label: "Compliance Reporting (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
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
    // Law 3 + Digitized 2 + Publication 2 + Procedures 2 + Incentives 1 = 10
    subIndicators: {
      harmonization_law: {
        label: "Harmonization Law (3%)",
        options: [
          { value: "yes", label: "Yes (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      digitized_tax_payment: {
        label: "Digitized Tax System (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      publication_of_fees: {
        label: "Publication of Fees (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
      procedures: {
        label: "Procedures (2%)",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 },
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
        label: "Digital One Stop Shop (5%)",
        options: [
          { value: "yes", label: "Yes (5)", score: 5 },
          { value: "no", label: "No (0)", score: 0 },
        ],
      },
    },
  },
  grievance_redress_mechanisms: {
    name: "Grievance Redress Mechanism (4%)",
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
        label: "Multiple Channels & Functionality (2%)",
        options: [
          { value: "yes", label: "Easily accessible via multiple channels (2)", score: 2 },
          { value: "no", label: "Difficult to find or access (0)", score: 0 },
        ],
      },
    },
  },
  export_facilitation: {
    name: "Export Facilitation (2%)",
    subIndicators: {
      nepc_certificate_facilitation: {
        label: "NEPC Certificate Facilitation (2%)",
        options: [
          { value: "excellent", label: "Excellent (2)", score: 2 },
          { value: "good", label: "Good (1.5)", score: 1.5 },
          { value: "fair", label: "Fair (1)", score: 1 },
          { value: "poor", label: "Poor (0.5)", score: 0.5 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
    },
  },
  nationwide_tour_engagement: {
    name: "State Engagement (10%)",
    subIndicators: {
      peer_to_peer: {
        label: "Peer to Peer (3%)",
        options: [
          { value: "excellent", label: "Excellent (3)", score: 3 },
          { value: "good", label: "Good (2)", score: 2 },
          { value: "fair", label: "Fair (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      hosted_ta_session: {
        label: "Hosted TA Session (3%)",
        options: [
          { value: "excellent", label: "Excellent (3)", score: 3 },
          { value: "good", label: "Good (2)", score: 2 },
          { value: "fair", label: "Fair (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
      private_sector_stakeholder_engagement: {
        label: "Private Sector Stakeholder Engagement (4%)",
        options: [
          { value: "excellent", label: "Excellent (4)", score: 4 },
          { value: "good", label: "Good (3)", score: 3 },
          { value: "fair", label: "Fair (2)", score: 2 },
          { value: "poor", label: "Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 },
        ],
      },
    },
  },
} as const satisfies IndicatorSet;

/** Assessment year the app defaults to when a caller does not supply one. */
export const CURRENT_INDICATOR_YEAR = 2026;

/**
 * Frameworks in descending order of the first year they apply to. Any year at or
 * above `startYear` uses that set, so 2027+ keeps using the 2026 framework until
 * a newer one is added here.
 */
const FRAMEWORKS = [
  { startYear: 2026, set: indicators2026 as IndicatorSet },
  { startYear: 0, set: indicators2025 as IndicatorSet },
] as const;

export function getIndicatorsForYear(year?: number): IndicatorSet {
  const target = year ?? CURRENT_INDICATOR_YEAR;
  const framework = FRAMEWORKS.find((entry) => target >= entry.startYear);
  return framework ? framework.set : indicators2026;
}

function maxOptionScore(options: readonly { score: number }[]): number {
  return options.reduce((max, option) => Math.max(max, option.score), 0);
}

const maxScoreCache = new Map<IndicatorSet, Record<string, number>>();

export function getIndicatorMaxScoresForYear(year?: number): Record<string, number> {
  const set = getIndicatorsForYear(year);
  const cached = maxScoreCache.get(set);
  if (cached) return cached;

  const computed = Object.fromEntries(
    Object.entries(set).map(([key, config]) => [
      key,
      Object.values(config.subIndicators).reduce(
        (sum, subIndicator) => sum + maxOptionScore(subIndicator.options),
        0
      ),
    ])
  );
  maxScoreCache.set(set, computed);
  return computed;
}

/**
 * Fold land-registration sub-points: GIS + automation.
 * Still folds legacy split columns (full/semi/doc) to the highest tier until migrated.
 */
export function foldLandRegistrationPoints(
  subPoints: Record<string, number | undefined>
): number {
  const gis = Number(subPoints.gis) || 0;
  const automation = Math.max(
    Number(subPoints.automated) || 0,
    Number(subPoints.full_automation) || 0,
    Number(subPoints.semi_automation) || 0,
    Number(subPoints.document_downloads) || 0
  );
  return gis + automation;
}

/** Sum sub-points for one indicator, applying land-registration fold when needed. */
export function sumIndicatorSubPoints(
  indicatorKey: string,
  subPoints: Record<string, number | undefined>
): number {
  if (indicatorKey === "digitalizing_land_registration") {
    return foldLandRegistrationPoints(subPoints);
  }
  return Object.values(subPoints).reduce<number>(
    (sum, value) => sum + (Number(value) || 0),
    0
  );
}

/**
 * Sum points across score rows for one or more indicators, with land fold.
 */
export function sumStateScoreRows(
  rows: ReadonlyArray<{
    indicator: string;
    subIndicator: string;
    value?: string | null;
  }>,
  year?: number
): number {
  const byIndicator = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const points = getSubIndicatorScore(
      row.indicator,
      row.subIndicator,
      row.value ?? "",
      year
    );
    const bucket = byIndicator.get(row.indicator) ?? {};
    bucket[row.subIndicator] = points;
    byIndicator.set(row.indicator, bucket);
  }
  let total = 0;
  for (const [indicatorKey, subPoints] of byIndicator) {
    total += sumIndicatorSubPoints(indicatorKey, subPoints);
  }
  return total;
}

export function getIndicatorMaxScoreForYear(indicatorKey: string, year?: number): number {
  return getIndicatorMaxScoresForYear(year)[indicatorKey] ?? 0;
}

export function getOverallMaxScoreForYear(year?: number): number {
  return Object.values(getIndicatorMaxScoresForYear(year)).reduce((sum, value) => sum + value, 0);
}

export function getIndicatorCountForYear(year?: number): number {
  return Object.keys(getIndicatorsForYear(year)).length;
}

/** Resolves the points a stored option value is worth under a given year's framework. */
export function getSubIndicatorScore(
  indicatorKey: string,
  subIndicatorKey: string,
  value: string,
  year?: number
): number {
  // Retired: folded into Law (Transfer Order) by migrateElectricityToSpreadsheetModel.
  if (
    indicatorKey === "electricity" &&
    subIndicatorKey === "nerc_transfer_request"
  ) {
    return 0;
  }

  const subIndicator = getIndicatorsForYear(year)[indicatorKey]?.subIndicators?.[subIndicatorKey];
  if (!subIndicator) {
    // Legacy split land-automation columns (pre single dropdown).
    if (indicatorKey === "digitalizing_land_registration") {
      if (subIndicatorKey === "full_automation" && value === "yes") return 7;
      if (subIndicatorKey === "semi_automation" && value === "yes") return 5;
      if (subIndicatorKey === "document_downloads" && value === "yes") return 2;
    }
    return 0;
  }
  const direct = subIndicator.options.find((option) => option.value === value)?.score;
  if (direct != null) return direct;

  // Legacy electricity Law values (pre-spreadsheet Transfer Order options).
  if (
    indicatorKey === "electricity" &&
    subIndicatorKey === "state_electricity_law" &&
    (value === "yes" || value === "no")
  ) {
    return value === "yes" ? 3 : 0;
  }

  // Legacy land-registration GIS / automation values.
  if (indicatorKey === "digitalizing_land_registration") {
    if (subIndicatorKey === "gis") {
      if (value === "excellent" || value === "good" || value === "fair") return 3;
      if (value === "none") return 0;
    }
    if (subIndicatorKey === "automated") {
      if (value === "yes" || value === "fully-automated") return 7;
      if (value === "hybrid") return 5;
      if (value === "no" || value === "manual") return 0;
    }
  }

  // Legacy harmonized-taxes values (pre split fees/procedures + digital max 2).
  if (indicatorKey === "harmonized_taxes") {
    if (subIndicatorKey === "digitized_tax_payment") {
      if (value === "digital" || value === "hybrid" || value === "yes") return 2;
      if (value === "manual" || value === "no") return 0;
    }
    if (subIndicatorKey === "publication_of_fees_procedures") {
      // Retired combined field — scored only via publication_of_fees + procedures.
      return 0;
    }
  }

  // Legacy infrastructure keys (roads / single industrial_zones scale).
  if (indicatorKey === "infrastructure") {
    if (subIndicatorKey === "roads_within_state_capital") return 0;
    if (subIndicatorKey === "industrial_zones") {
      if (
        value === "eight" ||
        value === "excellent" ||
        value === "very_good" ||
        value === "good"
      ) {
        return 8; // treated as full via fold in migration; legacy sum path
      }
      if (value === "four" || value === "fair") return 2; // layout only
      return 0;
    }
  }
  return 0;
}

export type IndicatorKey = keyof typeof indicators2026 | keyof typeof indicators2025;

// Convenience aliases for the current framework. Prefer the year-aware helpers
// above anywhere the assessment year is known.
export const indicators = getIndicatorsForYear(CURRENT_INDICATOR_YEAR);
export const indicatorMaxScores = getIndicatorMaxScoresForYear(CURRENT_INDICATOR_YEAR);
export const overallIndicatorMaxScore = getOverallMaxScoreForYear(CURRENT_INDICATOR_YEAR);
export const INDICATOR_COUNT = getIndicatorCountForYear(CURRENT_INDICATOR_YEAR);

export function getIndicatorMaxScore(indicatorKey: string): number {
  return getIndicatorMaxScoreForYear(indicatorKey, CURRENT_INDICATOR_YEAR);
}
