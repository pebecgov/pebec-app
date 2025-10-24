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
      "connection_days": {
        label: "New connections are readily available within",
        options: [
          { value: "1-10", label: "1-10 Working days", score: 3 },
          { value: "11-20", label: "11-20 Working days", score: 2 },
          { value: "exceed-20", label: "Exceed 20 working days", score: 1 },
          { value: "unavailable", label: "Connections unavailable", score: 0 }
        ]
      },
      "supply_hours": {
        label: "Average electricity supply hours in a day",
        options: [
          { value: "15-24", label: "15–24 hours daily", score: 3 },
          { value: "10-14", label: "10–14 hours daily", score: 2 },
          { value: "4-9", label: "4–9 hours daily", score: 1 },
          { value: "0-3", label: "0–3 hours daily", score: 0 }
        ]
      },
      "affordability": {
        label: "Electricity connection costs relative to national averages",
        options: [
          { value: "very-expensive", label: "Very Expensive", score: 0 },
          { value: "moderate", label: "Moderate", score: 1 },
          { value: "very-affordable", label: "Very Affordable", score: 2 }
        ]
      },
      "fault_resolution": {
        label: "Faults were resolved within",
        options: [
          { value: "1-7", label: "1-7 days", score: 2 },
          { value: "8-14", label: "8-14 days", score: 1 },
          { value: "15-30", label: "15-30 days", score: 0 }
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
      "isp_presence": {
        label: "Does major ISP operate within the state?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "4g_5g_coverage": {
        label: "Does this state have 4G/5G coverage?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "online_applications": {
        label: "Can you apply for a service online?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "land_registration": {
    name: "Land Registration",
    subIndicators: {
      "process_clarity": {
        label: "Is the process for Land Registration clear?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "registration_time": {
        label: "Average registration time",
        options: [
          { value: "1-30-days", label: "Completed within 1–30 working days", score: 1 },
          { value: "exceeds-30-days", label: "Exceeds 30 working days", score: 0 }
        ]
      },
      "cost_threshold": {
        label: "Does average registration cost exceed 5%?",
        options: [
          { value: "no", label: "No (under 5%)", score: 1 },
          { value: "yes", label: "Yes (over 5%)", score: 0 }
        ]
      },
      "public_availability": {
        label: "Are fees and procedures publicly available?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "online_records": {
        label: "Can records be accessed quickly online?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
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
          { value: "yes", label: "Yes", score: 1 },
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
      "alternative_dispute_resolution": {
        label: "Does the state have Alternative Dispute Resolution (ADR)?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
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
      "bank_branches": {
        label: "Number of licensed bank branches and Micro Finance Banks per 100,000 adults",
        options: [
          { value: "15-100", label: "15%-100%", score: 2 },
          { value: "5-14", label: "5%-14%", score: 1 },
          { value: "0-4", label: "0%-4%", score: 0 }
        ]
      },
      "boi_collaboration": {
        label: "Does the state collaborate with BOI or any federal Agency to create access to credit?",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "microfinance_banks": {
        label: "Have owned microfinance banks or cooperatives?",
        options: [
          { value: "yes", label: "Yes", score: 1 },
          { value: "no", label: "No", score: 0 }
        ]
      }
    }
  },
  "export_import_facilitation": {
    name: "Export-Import Facilitation",
    subIndicators: {
      "licensing_automation": {
        label: "Automation of licensing Procedures",
        options: [
          { value: "yes", label: "Yes", score: 2 },
          { value: "no", label: "No", score: 0 }
        ]
      },
      "business_registration": {
        label: "Have businesses that have registered to be number",
        options: [
          { value: "high-number", label: "High number", score: 2 },
          { value: "moderate-number", label: "Moderate number", score: 1 },
          { value: "low-number", label: "Low number", score: 0 }
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
  }
};

interface StateScoreData {
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
  onUpdate,
  onSaveComplete
}: { 
  state: string; 
  indicator: string; 
  stateData: StateScoreData; 
  onUpdate: (subIndicator: string, value: string) => void;
  onSaveComplete?: () => void;
}) => {
  const saveStateScore = useMutation(api.saveStateScore.saveStateScore);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const indicatorConfig = indicators[indicator as keyof typeof indicators];
      if (!indicatorConfig) return;

      // Save each sub-indicator
      for (const [subIndicator, value] of Object.entries(stateData)) {
        if (value) {
          await saveStateScore({
            state,
            indicator,
            subIndicator,
            value
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
  }, [state, indicator, stateData, saveStateScore, onSaveComplete]);

  const indicatorConfig = indicators[indicator as keyof typeof indicators];
  if (!indicatorConfig) return null;

  // Determine if this state is completed
  const isCompleted = Object.values(stateData).some(value => value !== "");
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
  
  // Load existing scores
  const existingScores = useQuery(api.saveStateScore.getStateScores, 
    selectedIndicator && selectedState 
      ? { state: selectedState, indicator: selectedIndicator }
      : "skip"
  );

  // Sync existing scores with local state
  useEffect(() => {
    if (existingScores && selectedState) {
      const updatedStateData: StateScoreData = {};
      existingScores.forEach(score => {
        updatedStateData[score.subIndicator] = score.value;
      });
      setStateScores(prev => ({
        ...prev,
        [selectedState]: updatedStateData
      }));
    }
  }, [existingScores, selectedState]);

  // Refresh data after save
  const handleSaveComplete = useCallback(() => {
    // The query will automatically refetch due to Convex reactivity
    // The useEffect above will handle updating the local state
  }, []);

  // Memoized progress calculation
  const progressData = useMemo(() => {
    const totalStates = nigerianStates.length;
    const completedStates = Object.values(stateScores).filter(data => 
      Object.values(data).some(value => value !== "")
    ).length;
    
    const progressPercentage = (completedStates / totalStates) * 100;
    
    return {
      completed: completedStates,
      total: totalStates,
      percentage: progressPercentage
    };
  }, [stateScores]);

  // Memoized state list
  const stateList = useMemo(() => {
    return nigerianStates.map(state => {
      const isCompleted = stateScores[state] && 
        Object.values(stateScores[state]).some(value => value !== "");
      
      return {
        name: state,
        isCompleted
      };
    });
  }, [stateScores]);

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

  // Get current state data
  const getCurrentStateData = useCallback((state: string): StateScoreData => {
    return stateScores[state] || {};
  }, [stateScores]);

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
                      onUpdate={(subIndicator, value) => updateStateData(selectedState, subIndicator, value)}
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
