// Centralized indicators configuration - Updated to match PEBEC Framework Document
// Each indicator has subIndicators, and each subIndicator has options with scores

export const indicators = {
  "electricity": {
    name: "Electricity (16%)",
    subIndicators: {
      "state_electricity_law": {
        label: "State Electricity Law",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 }
        ]
      },
      "electricity_regulatory_commission": {
        label: "Establishment of State Electricity Regulatory Commission",
        options: [
          { value: "yes", label: "Yes (2)", score: 2 },
          { value: "no", label: "No (0)", score: 0 }
        ]
      },
      "nerc_transfer_request": {
        label: "Request for Transfer from NERC",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 }
        ]
      },
      "electricity_license": {
        label: "License",
        options: [
          { value: "yes", label: "Yes (1)", score: 1 },
          { value: "no", label: "No (0)", score: 0 }
        ]
      },
      "electricity_generation": {
        label: "Electricity Generation (Bonus)",
        options: [
          { value: "excellent", label: "Excellent (4)", score: 4 },
          { value: "good", label: "Good (3)", score: 3 },
          { value: "fair", label: "Fair (2)", score: 2 },
          { value: "poor", label: "Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 }
        ]
      },
      "electricity_transmission_distribution": {
        label: "Electricity Transmission and Distribution",
        options: [
          { value: "excellent", label: "Excellent (5)", score: 5 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (3)", score: 3 },
          { value: "poor", label: "Poor (2)", score: 2 },
          { value: "very_poor", label: "Very Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 }
        ]
      }
    }
  },
  "infrastructure": {
    name: "Infrastructure (8%)",
    subIndicators: {
      "roads_within_state_capital": {
        label: "Roads within State Capital",
        options: [
          { value: "excellent", label: "Excellent (8)", score: 8 },
          { value: "very_good", label: "Very Good (6)", score: 6 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (2)", score: 2 },
          { value: "poor", label: "Poor (0)", score: 0 }
        ]
      },
      "industrial_zones": {
        label: "Industrial Zones",
        options: [
          { value: "excellent", label: "Excellent (8)", score: 8 },
          { value: "very_good", label: "Very Good (6)", score: 6 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (2)", score: 2 },
          { value: "poor", label: "Poor (0)", score: 0 }
        ]
      }
    }
  },
  "digital_connectivity": {
    name: "Digital Connectivity (10%)",
    subIndicators: {
      "right_of_way_policy": {
        label: "Right of Way Policy",
        options: [
          { value: "excellent", label: "Excellent (5)", score: 5 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (3)", score: 3 },
          { value: "poor", label: "Poor (2)", score: 2 },
          { value: "very_poor", label: "Very Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 }
        ]
      },
      "coverage_5g_network_reliability": {
        label: "5G Coverage & Network Reliability",
        options: [
          { value: "excellent", label: "Excellent (5)", score: 5 },
          { value: "good", label: "Good (4)", score: 4 },
          { value: "fair", label: "Fair (3)", score: 3 },
          { value: "poor", label: "Poor (2)", score: 2 },
          { value: "very_poor", label: "Very Poor (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 }
        ]
      }
    }
  },
  "land_registration": {
    name: "Land Registration",
    subIndicators: {
      "process_automation": {
        label: "Process type",
        options: [
          { value: "automated", label: "Automated", score: 2 },
          { value: "hybrid", label: "Hybrid", score: 1 },
          { value: "manual", label: "Manual", score: 0 }
        ]
      },
      "certificate_time": {
        label: "Days for CofO",
        options: [
          { value: "0-30-days", label: "0–30 days", score: 1 },
          { value: "0-60-days", label: "0–60 days", score: 0.5 },
          { value: "over-60-days", label: ">60 days", score: 0 },
          { value: "not-available", label: "Not Available", score: 0 }
        ]
      },
      "procedures_availability": {
        label: "Procedure/fees publicly available",
        options: [
          { value: "publicly-available-online", label: "Procedure/Fees", score: 1 },
          { value: "either-fees-or-procedures", label: "Procedure only", score: 0.5 },
          { value: "not-publicly-available", label: "None", score: 0 }
        ]
      },
      "gis_functionality": {
        label: "Availability of GIS",
        options: [
          { value: "functional-gis-available", label: "GIS available", score: 2 },
          { value: "no-functional-gis", label: "No GIS", score: 0 }
        ]
      }
    }
  },
  "small_claims_courts": {
    name: "Small Claims Courts",
    subIndicators: {
      "number_of_courts": {
        label: "Number of SCCs established and actively sitting in main city",
        options: [
          { value: "1-5", label: "1-5", score: 1 },
          { value: "6-10", label: "6-10", score: 1.5 },
          { value: "11-14", label: "11-14", score: 2 },
          { value: "15-and-above", label: "15 and above", score: 3 }
        ]
      },
      "compliance_reporting": {
        label: "Compliance with publishing report",
        options: [
          { value: "up-to-date", label: "Up to date", score: 2 },
          { value: "6-months-old", label: "More than 6 months", score: 1.5 },
          { value: "3-months-old", label: "More than 3 months", score: 1 },
          { value: "not-published", label: "Not published", score: 0 }
        ]
      }
    }
  },
  "investor_aftercare_service": {
    name: "Investor Aftercare Service",
    subIndicators: {
      "designated_desk": {
        label: "Does the state have a designated investor aftercare desk/department?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "workforce_development": {
    name: "Workforce Development and Social Infrastructure",
    subIndicators: {
      "social_security_systems": {
        label: "Does the state operate social security systems for vulnerable populations?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "gender_inclusivity": {
        label: "Does the state meet the gender inclusivity benchmark?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "crisis_resilience": {
    name: "Crisis Resilience and Business Continuity",
    subIndicators: {
      "emergency_agency": {
        label: "Does the state have a functional emergency management agency?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "sema_funding": {
        label: "Is the SEMA or equivalent agency visibly funded in the current state budget?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "contract_enforcement": {
    name: "Contract Enforcement and Commercial Dispute Resolution",
    subIndicators: {
      "commercial_court": {
        label: "Does the state have a commercial court?",
        options: [
          { value: "yes-commercial-court", label: "Yes", score: 2.5 },
          { value: "no-commercial-court", label: "No", score: 0 }
        ]
      },
      "alternative_dispute_resolution": {
        label: "Does the state have ADR?",
        options: [
          { value: "yes-adr", label: "Yes", score: 2.5 },
          { value: "no-adr", label: "No", score: 0 }
        ]
      }
    }
  },
  "market_access": {
    name: "Market Access and Competition",
    subIndicators: {
      "one_stop_shop": {
        label: "Does the State have a one stop shop?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "public_incentives": {
        label: "Does the state have public incentives?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "getting_credit": {
    name: "Getting Credit (12%)",
    subIndicators: {
      "state_microfinance_banks": {
        label: "State Microfinance Banks",
        options: [
          { value: "excellent", label: "Excellent (6)", score: 6 },
          { value: "good", label: "Good (5)", score: 5 },
          { value: "fair", label: "Fair (4)", score: 4 },
          { value: "poor", label: "Poor (3)", score: 3 },
          { value: "very_poor", label: "Very Poor (2)", score: 2 },
          { value: "none", label: "None (0)", score: 0 }
        ]
      },
      "access_federal_financial_institutions": {
        label: "Access to Federal Financial Institutions",
        options: [
          { value: "excellent", label: "Excellent (6)", score: 6 },
          { value: "good", label: "Good (5)", score: 5 },
          { value: "fair", label: "Fair (4)", score: 4 },
          { value: "poor", label: "Poor (3)", score: 3 },
          { value: "very_poor", label: "Very Poor (2)", score: 2 },
          { value: "none", label: "None (0)", score: 0 }
        ]
      }
    }
  },
  "digitalizing_land": {
    name: "Digitalizing Land",
    subIndicators: {
      "gis": {
        label: "GIS (3%)",
        options: [
          { value: "excellent", label: "Excellent (3)", score: 3 },
          { value: "good", label: "Good (2)", score: 2 },
          { value: "fair", label: "Fair (1)", score: 1 },
          { value: "none", label: "None (0)", score: 0 }
        ]
      }
    }
  },
  "export_import_facilitation": {
    name: "Export-Import Facilitation",
    subIndicators: {
      "totalExporters_perState": {
        label: "Total number of exporters per state",
        options: [
          { value: ">=1000", label: "≥ 1000", score: 3 },
          { value: "500-999", label: "500-999", score: 2 },
          { value: "100-499", label: "100-499", score: 1 },
          { value: "0-99", label: "0-99", score: 0 }
        ]
      },
      "StateChamberOfCommerce": {
        label: "Have state chamber of commerce",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "interstate_trade": {
    name: "Interstate Trade",
    subIndicators: {
      "haulage_fees": {
        label: "Elimination of haulage fees via law/executive order and enforcement",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "state_owned_transport_assets": {
        label: "Presence of state owned airports, air carriers, rail, seaport and dry port (0, 1.5, 3 points)",
        options: [
          { value: "0", label: "No state owned transport assets", score: 0 },
          { value: "1.5", label: "Some presence (equivalent to 1.5 points)", score: 1.5 },
          { value: "3", label: "Comprehensive presence (equivalent to 3 points)", score: 3 }
        ]
      }
    }
  },
  "paying_taxes": {
    name: "Paying Taxes",
    subIndicators: {
      "tax_payment_transparency": {
        label: "How does the state facilitate tax payment collection and provide transaction transparency to taxpayers?",
        options: [
          { value: "digital-hybrid-e-payment", label: "Digital/hybrid with e-payment and automatic receipts", score: 2 },
          { value: "manual-cash-limited-transparency", label: "Manual/cash-based with limited transparency", score: 0 }
        ]
      },
      "tax_filing_burden": {
        label: "How burdensome is the tax filing process for taxpayers in the state?",
        options: [
          { value: "automated-consolidated", label: "Automated or consolidated filing that reduces compliance effort", score: 1 },
          { value: "manual-repetitive-high-burden", label: "Manual, repetitive filing with high administrative burden", score: 0 }
        ]
      },
      "tax_incentive_transparency": {
        label: "How transparent and accessible is the state's tax incentive and exemption framework?",
        options: [
          { value: "transparent-accessible-programs", label: "Transparent, publicly accessible tax incentive programs", score: 1 },
          { value: "unclear-opaque-framework", label: "Unclear or opaque tax incentive framework", score: 0 }
        ]
      }
    }
  },
  "grievance_redress_mechanisms": {
    name: "Grievance Redress Mechanisms",
    subIndicators: {
      "centralized_grm": {
        label: "Does the state have a centralized Grievance Redress Mechanism?",
        options: [
          { value: "centralized-grm-available", label: "Centralized GRM available", score: 2 },
          { value: "no-centralized-grm", label: "No centralized GRM", score: 0 }
        ]
      },
      "accessibility_and_channels": {
        label: "How accessible is the state's Grievance Redress Mechanism?",
        options: [
          { value: "easily-accessible-multiple-channels", label: "Easily accessible via multiple channels", score: 1 },
          { value: "difficult-to-find-access", label: "Difficult to find or access", score: 0 }
        ]
      }
    }
  },
  "access_to_skilled_labour": {
    name: "Access to Skilled Labour",
    subIndicators: {
      "education_investment": {
        label: "Post-secondary graduates relative to population",
        options: [
          { value: "highest-tier", label: "≫ average (733,120+)", score: 1.5 },
          { value: "second-tier", label: "Above average (549,840-733,119)", score: 1.25 },
          { value: "mid-tier", label: "Within average (366,560-549,839)", score: 0.75 },
          { value: "lowest-tier", label: "Minimum average (219,936-366,559)", score: 0.5 },
          { value: "below-average", label: "Below average (<219,936)", score: 0 }
        ]
      },
      "accredited_institutions": {
        label: "How many accredited tertiary and technical institutions are available in the state?",
        options: [
          { value: "seven-plus", label: "7 or more universities", score: 1.5 },
          { value: "three-to-six", label: "3 to 6 universities", score: 1 },
          { value: "one-to-two", label: "1 or 2 universities", score: 0.5 },
          { value: "zero", label: "No universities", score: 0 }
        ]
      },
    }
  }
} as const;

