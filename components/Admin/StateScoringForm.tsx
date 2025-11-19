"use client";

import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Save, 
  BarChart3, 
  CheckCircle, 
  Circle, 
  Clock,
  MapPin,
  TrendingUp,
  Users
} from "lucide-react";

// Nigerian States List
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", 
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", 
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", 
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", 
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", 
  "Federal Capital Territory"
];

// Indicators with their sub-indicators and form configurations
const indicators = {
  "access_to_electricity": {
    name: "Access to Electricity",
    subIndicators: {
      "band_a_shares": {
        label: "Band A Share of Feeders",
        options: [
          { value: "70-100", label: "70-100% (4)", score: 4 },
          { value: "50-69", label: "50-69% (3)", score: 3 },
          { value: "30-49", label: "30-49% (2)", score: 2 },
          { value: "10-29", label: "10-29% (1)", score: 1 },
          { value: "0-10", label: "0-10% (0)", score: 0 }
        ]
      },
      "state_owned_electricity_regulator": {
        label: "State Owned Electricity Regulation",
        options: [
          { value: "yes", label: "Yes (6)", score: 6 },
          { value: "transition", label: "Transition (3)", score: 3 },
          { value: "no", label: "No (0)", score: 0 }
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
          { value: "hybrid", label: "Hybrid", score: 0.5 },
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
      }
    }
  }
};

interface StateScoreData {
  [subIndicator: string]: string;
}

interface StateLinkData {
  [subIndicator: string]: string;
}

// Memoized State List Item Component
const StateListItem = memo(({ 
  state, 
  isSelected, 
  isCompleted, 
  onSelect 
}: { 
  state: string; 
  isSelected: boolean; 
  isCompleted: boolean; 
  onSelect: () => void; 
}) => (
  <div
    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 shadow-md' 
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
    onClick={onSelect}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-sm">{state}</span>
      </div>
      {isCompleted ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <Circle className="h-4 w-4 text-gray-300" />
      )}
    </div>
  </div>
));

StateListItem.displayName = "StateListItem";

// Memoized State Form Component
const StateForm = memo(({ 
  state, 
  indicator, 
  stateData, 
  linkData,
  savedScores,
  onUpdate,
  onLinkUpdate,
  onSaveComplete
}: { 
  state: string; 
  indicator: string; 
  stateData: StateScoreData;
  linkData: StateLinkData;
  savedScores?: Array<{ subIndicator: string; value: string; linkToSource?: string }>;
  onUpdate: (subIndicator: string, value: string) => void;
  onLinkUpdate: (subIndicator: string, link: string) => void;
  onSaveComplete?: () => void;
}) => {
  const saveStateScore = useMutation(api.saveStateScore.saveStateScore);
  const saveStateScoreLink = useMutation(api.saveStateScore.saveStateScoreLink);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const indicatorConfig = indicators[indicator as keyof typeof indicators];
      if (!indicatorConfig) return;

      // Save each sub-indicator with value and optional link
      for (const [subIndicator, value] of Object.entries(stateData)) {
        if (value) {
          const link = linkData[subIndicator] || undefined;
          await saveStateScore({
            state,
            indicator,
            subIndicator,
            value,
            linkToSource: link
          });
        }
      }

      // Save links for sub-indicators that have links but no value yet
      for (const [subIndicator, link] of Object.entries(linkData)) {
        if (link && !stateData[subIndicator]) {
          await saveStateScoreLink({
            state,
            indicator,
            subIndicator,
            linkToSource: link
          });
        }
      }

      toast.success(`Scores saved for ${state}`);
      // Call the callback to refresh data
      onSaveComplete?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to save scores");
    } finally {
      setIsSaving(false);
    }
  }, [state, indicator, stateData, linkData, saveStateScore, saveStateScoreLink, onSaveComplete]);

  const indicatorConfig = indicators[indicator as keyof typeof indicators];
  if (!indicatorConfig) return null;

  // Determine if this state is completed - check saved scores, not local edits
  // Completion status should only reflect what's actually saved to the database
  const allSubIndicators = Object.keys(indicatorConfig.subIndicators);
  const savedScoresMap = savedScores?.reduce((acc, score) => {
    acc[score.subIndicator] = score.value;
    return acc;
  }, {} as Record<string, string>) || {};
  
  const filledSubIndicators = allSubIndicators.filter(
    subIndicator => savedScoresMap[subIndicator] && savedScoresMap[subIndicator] !== ""
  );
  const isCompleted = allSubIndicators.length > 0 && filledSubIndicators.length === allSubIndicators.length;
  const statusVariant = isCompleted ? "default" : "secondary";
  const statusText = isCompleted ? "Completed" : "In Progress";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{state}</h3>
          <p className="text-sm text-gray-600">{indicatorConfig.name}</p>
        </div>
        <Badge variant={statusVariant}>{statusText}</Badge>
      </div>

      <Separator />

      {/* Dynamic Form Content Based on Indicator */}
      <div className="space-y-4">
        {Object.entries(indicatorConfig.subIndicators).map(([subIndicator, config]) => (
          <div key={subIndicator} className="space-y-2">
            <Label className="text-sm font-medium">{config.label}</Label>
            <Select
              value={stateData[subIndicator] || ""}
              onValueChange={(value) => onUpdate(subIndicator, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {config.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Link to Source (Optional)</Label>
              <Input
                type="url"
                placeholder="https://example.com/source"
                value={linkData[subIndicator] || ""}
                onChange={(e) => onLinkUpdate(subIndicator, e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <Button onClick={handleSave} className="w-full" disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : `Save ${state} Scores`}
        </Button>
      </div>
    </div>
  );
});

StateForm.displayName = "StateForm";

export default function StateScoringForm() {
  const [selectedIndicator, setSelectedIndicator] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [stateScores, setStateScores] = useState<Record<string, StateScoreData>>({});
  const [stateLinks, setStateLinks] = useState<Record<string, StateLinkData>>({});
  
  // Load existing scores
  const existingScores = useQuery(api.saveStateScore.getStateScores, 
    selectedIndicator && selectedState 
      ? { state: selectedState, indicator: selectedIndicator }
      : "skip"
  );

  // Sync existing scores and links with local state
  useEffect(() => {
    if (existingScores && selectedState) {
      const updatedStateData: StateScoreData = {};
      const updatedLinkData: StateLinkData = {};
      existingScores.forEach(score => {
        updatedStateData[score.subIndicator] = score.value;
        if ((score as any).linkToSource) {
          updatedLinkData[score.subIndicator] = (score as any).linkToSource;
        }
      });
      setStateScores(prev => ({
        ...prev,
        [selectedState]: updatedStateData
      }));
      setStateLinks(prev => ({
        ...prev,
        [selectedState]: updatedLinkData
      }));
    }
  }, [existingScores, selectedState]);

  // Refresh data after save
  const handleSaveComplete = useCallback(() => {
    // The query will automatically refetch due to Convex reactivity
    // The useEffect above will handle updating the local state
  }, []);

  // Helper function to check if a state is completed for the selected indicator
  const isStateCompleted = useCallback((state: string, indicator: string): boolean => {
    if (!indicator || !state) return false;
    
    const indicatorConfig = indicators[indicator as keyof typeof indicators];
    if (!indicatorConfig) return false;
    
    const stateData = stateScores[state] || {};
    const allSubIndicators = Object.keys(indicatorConfig.subIndicators);
    
    // Check if ALL sub-indicators have values
    return allSubIndicators.length > 0 && 
           allSubIndicators.every(subIndicator => 
             stateData[subIndicator] && stateData[subIndicator] !== ""
           );
  }, [stateScores]);

  // Memoized progress calculation
  const progressData = useMemo(() => {
    if (!selectedIndicator) {
      return { completed: 0, total: nigerianStates.length, percentage: 0 };
    }
    
    const totalStates = nigerianStates.length;
    const completedStates = nigerianStates.filter(state => 
      isStateCompleted(state, selectedIndicator)
    ).length;
    
    const progressPercentage = (completedStates / totalStates) * 100;
    
    return {
      completed: completedStates,
      total: totalStates,
      percentage: progressPercentage
    };
  }, [selectedIndicator, stateScores, isStateCompleted]);

  // Memoized state list
  const stateList = useMemo(() => {
    return nigerianStates.map(state => {
      const isCompleted = selectedIndicator ? isStateCompleted(state, selectedIndicator) : false;
      
      return {
        name: state,
        isCompleted
      };
    });
  }, [stateScores, selectedIndicator, isStateCompleted]);

  // Update state data
  const updateStateData = useCallback((state: string, subIndicator: string, value: string) => {
    setStateScores(prev => ({
      ...prev,
      [state]: {
        ...prev[state],
        [subIndicator]: value
      }
    }));
  }, []);

  // Update link data
  const updateLinkData = useCallback((state: string, subIndicator: string, link: string) => {
    setStateLinks(prev => ({
      ...prev,
      [state]: {
        ...prev[state],
        [subIndicator]: link
      }
    }));
  }, []);

  // Get current state data
  const getCurrentStateData = useCallback((state: string): StateScoreData => {
    return stateScores[state] || {};
  }, [stateScores]);

  // Get current link data
  const getCurrentLinkData = useCallback((state: string): StateLinkData => {
    return stateLinks[state] || {};
  }, [stateLinks]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              State Scoring Metrics
            </h2>
            <p className="text-gray-600 mt-1">Score states across different indicators</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {progressData.completed}/{progressData.total} States Completed
              </span>
            </div>
            <Progress value={progressData.percentage} className="w-48" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Indicators & State List */}
        <div className="w-1/3 border-r bg-gray-50 flex flex-col">
          {/* Indicator Selection */}
          <div className="p-4 border-b bg-white">
            <Label className="text-sm font-medium">Select Indicator</Label>
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose an indicator" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(indicators).map(([id, config]) => (
                  <SelectItem key={id} value={id}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State List */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm">States ({progressData.completed}/{progressData.total})</h3>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </div>
              
              {selectedIndicator ? (
                <div className="space-y-2">
                  {stateList.map(({ name, isCompleted }) => (
                    <StateListItem
                      key={name}
                      state={name}
                      isSelected={selectedState === name}
                      isCompleted={isCompleted}
                      onSelect={() => setSelectedState(name)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Select an indicator to view states</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - State Form */}
        <div className="flex-1 bg-white">
          {selectedIndicator && selectedState ? (
            <div className="h-full overflow-y-auto">
              <div className="p-6">
                <Card>
                  <CardContent className="p-6">
                    <StateForm
                      state={selectedState}
                      indicator={selectedIndicator}
                      stateData={getCurrentStateData(selectedState)}
                      linkData={getCurrentLinkData(selectedState)}
                      savedScores={existingScores}
                      onUpdate={(subIndicator, value) => updateStateData(selectedState, subIndicator, value)}
                      onLinkUpdate={(subIndicator, link) => updateLinkData(selectedState, subIndicator, link)}
                      onSaveComplete={handleSaveComplete}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select Indicator & State</h3>
                <p className="text-sm">
                  Choose an indicator from the left panel, then select a state to begin scoring.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
