// Centralized indicators configuration
// Each indicator has subIndicators, and each subIndicator has options with scores

export const indicators = {
  "access_to_electricity": {
    name: "Access to Electricity",
    subIndicators: {
      "band_a_shares": {
        label: "Select percentage of businesses connected to Band A (High supply Feeder)",
        options: [
          { value: "70-100", label: "70-100%", score: 10 },
          { value: "50-69", label: "50-69%", score: 8 },
          { value: "30-49", label: "30-49%", score: 6 },
          { value: "10-29", label: "10-29%", score: 4 },
          { value: "0-10", label: "0-10%", score: 2 }
        ]
      }
    }
  },
  "infrastructure": {
    name: "Infrastructure",
    subIndicators: {
      "road_quality": {
        label: "Are key city-centre and industrial access roads paved?",
        options: [
          { value: "very-good", label: "Very Good", score: 2 },
          { value: "moderate", label: "Moderate", score: 1 },
          { value: "very-bad", label: "Very Bad", score: 0 }
        ]
      },
      "road_motorability": {
        label: "Are key city-centre access roads motorable?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "renewable_energy": {
        label: "Does this state have Renewable Energy Solution?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "airport": {
        label: "Does this state have an Airport?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "railway": {
        label: "Does this state have Railway?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "capital_budget": {
        label: "State Budgets for Capital Projects Vs Total Expenditure (%)",
        options: [
          { value: "40-100", label: "40%-100%", score: 3 },
          { value: "20-39", label: "20%-39%", score: 2 },
          { value: "10-19", label: "10%-19%", score: 1 },
          { value: "0-9", label: "0%-9%", score: 0 }
        ]
      }
    }
  },
  "digital_connectivity": {
    name: "Digital Connectivity",
    subIndicators: {
      "right_of_way": {
        label: "Does the state have right of way?",
        options: [
          { value: "free", label: "Free", score: 2 },
          { value: "reduced-price", label: "Reduced Price", score: 1 },
          { value: "full-price", label: "Full Price", score: 0 }
        ]
      },
      "4g_5g_coverage": {
        label: "Does this state have 4G/5G coverage?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "online_applications": {
        label: "Can you apply for a service online?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "partially", label: "Partially", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "land_registration": {
    name: "Land Registration",
    subIndicators: {
      "process_automation": {
        label: "Is the land registration process automated in the state?",
        options: [
          { value: "automated", label: "Automated", score: 1 },
          { value: "hybrid", label: "Hybrid", score: 0.5 	},
          { value: "manual", label: "Manual", score: 0 }
        ]
      },
      "certificate_time": {
        label: "How long does it take to obtain a Certificate of Occupancy (C of O) or Right of Occupancy (R of O) in the state?",
        options: [
          { value: "1-30-days", label: "1–30 days", score: 2 },
          { value: "31-60-days", label: "31–60 days", score: 1 },
          { value: "over-60-days", label: ">60 days", score: 0 },
          { value: "not-available", label: "Not Available", score: 0 }
        ]
      },
      "procedures_availability": {
        label: "Are land registration procedures and fees publicly available and accessible?",
        options: [
          { value: "publicly-available-online", label: "Publicly available online", score: 1 },
          { value: "either-fees-or-procedures", label: "Either fees or procedures are available", score: 0.5 },
          { value: "not-publicly-available", label: "Not publicly available", score: 0 }
        ]
      },
      "gis_functionality": {
        label: "Does the state have a functional and accessible Geographic Information System (GIS) for land records?",
        options: [
          { value: "functional-gis-available", label: "Functional GIS available", score: 1 },
          { value: "no-functional-gis", label: "No functional GIS", score: 0 }
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
      "customer_treatment": {
        label: "How are the customers treated?",
        options: [
          { value: "excellent", label: "Excellent", score: 1 },
          { value: "good", label: "Good", score: 0.5 },
          { value: "poor", label: "Poor", score: 0 }
        ]
      },
      "website_number": {
        label: "Does the number on the State website work?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "website_email": {
        label: "Does the email on the State website work?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "workforce_development": {
    name: "Workforce Development and Social Infrastructure",
    subIndicators: {
      "healthcare_budget": {
        label: "How much expenditure does the state allocate its 2025 budget to healthcare capital projects?",
        options: [
          { value: "10-15", label: "10-15%", score: 2 },
          { value: "5-9", label: "5-9%", score: 1 },
          { value: "0-4", label: "0-4%", score: 0 }
        ]
      },
      "health_insurance": {
        label: "Has the state launched and is it actively implementing a State Health Insurance Scheme?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "female_representation": {
        label: "Does the state have at least 35% female representation among Commissioners?",
        options: [
          { value: "35-100", label: "35-100%", score: 1 },
          { value: "25-34", label: "25-34%", score: 0.75 },
          { value: "1-24", label: "1-24%", score: 0.5 },
          { value: "0", label: "0%", score: 0 }
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
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "export_strategy": {
        label: "Does the state have a formal export promotion or diversification strategy?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
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
          { value: "yes", label: "Yes", score: 1 },
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
    name: "Getting Credit",
    subIndicators: {
      "boi_collaboration": {
        label: "Does the state collaborate with BOI or any federal Agency to create access to credit?",
        options: [
          { value: "yes", label: "Yes", score: 3 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "microfinance_banks": {
        label: "Have owned microfinance banks or cooperatives?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
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
          { value: ">999", label: ">999", score: 3 },
          { value: "500-999", label: "500-999", score: 2 },
          { value: "0-499", label: "0-499", score: 1 }
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
        label: "All haulage fees eliminated via law/executive order and enforced on ground",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "functional_grm": {
        label: "State has a functional GRM with multiple accessible channels",
        options: [
          { value: "yes", label: "Yes", score: 1.5 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "rail_dry_port": {
        label: "State owned rail or dry port",
        options: [
          { value: "yes", label: "Yes", score: 0.5 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "airport": {
        label: "State owned airport",
        options: [
          { value: "yes", label: "Yes", score: 0.5 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "air_carriers": {
        label: "State owned air carriers",
        options: [
          { value: "yes", label: "Yes", score: 0.5 },
          { value: "no", label: "No", score: 0 }
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
      "functional_grm": {
        label: "Does the state have a functional Grievance Redress Mechanism (GRM)?",
        options: [
          { value: "functional-grm-available", label: "Functional GRM available", score: 1 },
          { value: "no-functional-grm", label: "No functional GRM", score: 0 }
        ]
      },
      "centralized_grm": {
        label: "Does the state have a centralized Grievance Redress Mechanism?",
        options: [
          { value: "centralized-grm-available", label: "Centralized GRM available", score: 1 },
          { value: "no-centralized-grm", label: "No centralized GRM", score: 0 }
        ]
      },
      "grm_accessibility": {
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
        label: "What is the level of state government investment in education infrastructure and programs?",
        options: [
          { value: "significant-investment", label: "Significant investment", score: 1.5 },
          { value: "moderate-investment", label: "Moderate investment", score: 1 },
          { value: "minimal-unverified-activity", label: "Minimal or unverified activity", score: 0.5 },
          { value: "no-evidence-data-unavailable", label: "No evidence or data unavailable", score: 0 }
        ]
      },
      "accredited_institutions": {
        label: "How many accredited tertiary and technical institutions are available in the state?",
        options: [
          { value: "3-tertiary-2-technical", label: "≥3 tertiary + ≥2 technical", score: 1.5 },
          { value: "2-tertiary-1-technical", label: "2 tertiary + 1 technical", score: 1 },
          { value: "1-tertiary-institution", label: "1 tertiary institution", score: 0.5 },
          { value: "none", label: "None", score: 0 }
        ]
      },
    }
  }
} as const;

