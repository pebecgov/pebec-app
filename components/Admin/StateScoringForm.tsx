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
import { indicators } from "@/convex/config/indicators";
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
  year,
  onUpdate,
  onLinkUpdate,
  onSaveComplete
}: { 
  state: string; 
  indicator: string; 
  stateData: StateScoreData;
  linkData: StateLinkData;
  savedScores?: Array<{ subIndicator: string; value: string; linkToSource?: string }>;
  year: number;
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
            linkToSource: link,
            year
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
            linkToSource: link,
            year
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
  }, [state, indicator, stateData, linkData, saveStateScore, saveStateScoreLink, year, onSaveComplete]);

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
  const [selectedYear, setSelectedYear] = useState(2026);
  const [stateScores, setStateScores] = useState<Record<string, StateScoreData>>({});
  const [stateLinks, setStateLinks] = useState<Record<string, StateLinkData>>({});
  
  // Load existing scores
  const existingScores = useQuery(api.saveStateScore.getStateScores, 
    selectedIndicator && selectedState 
      ? { state: selectedState, indicator: selectedIndicator, year: selectedYear }
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
          <div className="p-4 border-b bg-white space-y-4">
            <div>
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
            
            <div>
              <Label className="text-sm font-medium">Assessment Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose year" />
                </SelectTrigger>
                <SelectContent>
                  {[2026, 2025, 2024, 2023, 2022].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                      year={selectedYear}
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
