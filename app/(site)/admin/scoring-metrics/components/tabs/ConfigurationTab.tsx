'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical, Save, Loader2 } from "lucide-react";
import { mdasList } from "@/components/mdaList";

interface ConfigurationTabProps {
    currentYear: number;
    onYearChange?: (year: number) => void;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const METRIC_OPTIONS = [
    { key: "efficiencyBundle", label: "Efficiency Bundle (SLA + Report Submission + Timeliness)" },
    { key: "reportGov", label: "Report Governance" },
    { key: "mystery", label: "Mystery Shopping" },
];

export default function ConfigurationTab({ currentYear, onYearChange }: ConfigurationTabProps) {
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Load all configurations for the selected year
    const configurations = useQuery(api.scoring_config.getAllConfigurationsForYear, { year: selectedYear });

    const handleYearChange = (year: number) => {
        setSelectedYear(year);
        onYearChange?.(year);
    };

    return (
        <div className="space-y-6">
            {/* Year Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Year Configuration</CardTitle>
                    <CardDescription>
                        Configure scoring parameters for each year independently
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Label>Select Year</Label>
                        <Select
                            value={selectedYear.toString()}
                            onValueChange={(value) => handleYearChange(parseInt(value))}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025">2025 (Legacy)</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                                <SelectItem value="2027">2027</SelectItem>
                                <SelectItem value="2028">2028</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedYear === 2025 && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> 2025 uses the legacy hardcoded configuration system.
                                Configuration changes are only available for 2026 and beyond.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Configuration Tabs - Only show for 2026+ */}
            {selectedYear >= 2026 && (
                <Tabs defaultValue="efficiency" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="efficiency">Efficiency Bundle</TabsTrigger>
                        <TabsTrigger value="others">Others</TabsTrigger>
                        <TabsTrigger value="penalties">Penalties</TabsTrigger>
                        <TabsTrigger value="exclusions">Exclude MDA</TabsTrigger>
                    </TabsList>

                    <TabsContent value="efficiency">
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                                <h3 className="font-semibold text-blue-900">Efficiency Bundle (Total: 70 points)</h3>
                                <p className="text-sm text-blue-800 mt-1">
                                    This category includes all efficiency-related metrics: Core Metrics (30 points: SLA, Report Submission, Report Governance, Timeliness) + Mystery Shopping (40 points)
                                </p>
                            </div>
                            <EfficiencyConfiguration year={selectedYear} config={configurations?.efficiencyPeriod} />
                            <MysteryShoppingConfiguration
                                year={selectedYear}
                                mysteryShoppingTypes={configurations?.mysteryShoppingTypes || []}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="penalties">
                        <PenaltyConfiguration
                            year={selectedYear}
                            items={configurations?.penaltyItems || []}
                        />
                    </TabsContent>

                    <TabsContent value="others">
                        <OthersConfiguration
                            year={selectedYear}
                            othersItems={configurations?.othersItems || []}
                        />
                    </TabsContent>

                    <TabsContent value="exclusions">
                        <MetricExclusionConfiguration
                            year={selectedYear}
                            allExclusions={configurations?.metricExclusions || []}
                            othersItems={configurations?.othersItems || []}
                        />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

function MetricExclusionConfiguration({ year, allExclusions, othersItems }: any) {
    const [selectedMdas, setSelectedMdas] = useState<string[]>([]);
    const [selectedMetricToggles, setSelectedMetricToggles] = useState<string[]>([]);
    const [mdaSearch, setMdaSearch] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const saveMdaMetricExclusions = useMutation(api.scoring_config.saveMdaMetricExclusions);

    const mdaOptions = mdasList
        .map((mda) => `${mda.abbreviation} - ${mda.name}`)
        .sort((a, b) => a.localeCompare(b));

    const filteredMdaOptions = mdaOptions.filter((mda) =>
        mda.toLowerCase().includes(mdaSearch.toLowerCase())
    );
    const allOthersItems = (othersItems || []) as Array<{ itemId: string; itemName: string; weight?: number }>;

    const toggleMetric = (metricKey: string) => {
        setSelectedMetricToggles((prev) => {
            if (prev.includes(metricKey)) return prev.filter((m) => m !== metricKey);
            return [...prev, metricKey];
        });
    };

    const toggleMda = (mdaName: string) => {
        setSelectedMdas((prev) => {
            if (prev.includes(mdaName)) return prev.filter((m) => m !== mdaName);
            return [...prev, mdaName];
        });
    };

    const getExpandedMetrics = () => {
        const expanded = new Set<string>();
        selectedMetricToggles.forEach((key) => {
            if (key === "efficiencyBundle") {
                expanded.add("sla");
                expanded.add("reportSubmission");
                expanded.add("timeliness");
            } else {
                expanded.add(key);
            }
        });
        return Array.from(expanded);
    };

    const handleSave = async () => {
        if (selectedMdas.length === 0) {
            toast.error("Select at least one MDA.");
            return;
        }
        setIsSaving(true);
        try {
            const expandedMetrics = getExpandedMetrics();
            await Promise.all(
                selectedMdas.map((mdaName) =>
                    saveMdaMetricExclusions({
                        year,
                        mdaName,
                        excludedMetrics: expandedMetrics
                    })
                )
            );
            toast.success(`Metric exclusions saved for ${selectedMdas.length} MDA(s).`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save MDA metric exclusions.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Exclude MDA from Metrics</CardTitle>
                <CardDescription>
                    Select multiple MDAs and apply the same exclusions in bulk.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Select MDA(s)</Label>
                    <Input
                        placeholder="Search MDA..."
                        value={mdaSearch}
                        onChange={(e) => setMdaSearch(e.target.value)}
                    />
                    <div className="border rounded-md max-h-56 overflow-auto p-2 space-y-2">
                        {filteredMdaOptions.map((mda) => {
                            const checked = selectedMdas.includes(mda);
                            return (
                                <div
                                    key={mda}
                                    onClick={() => toggleMda(mda)}
                                    className={`w-full flex items-center justify-between rounded border px-3 py-2 text-left transition-colors ${checked
                                            ? "bg-green-50 border-green-500"
                                            : "bg-white border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <span className="text-sm">{mda}</span>
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggleMda(mda)}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`${checked ? "border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" : "border-gray-400"} focus-visible:ring-0 focus-visible:ring-offset-0`}
                                    />
                                </div>
                            );
                        })}
                        {filteredMdaOptions.length === 0 && (
                            <p className="text-sm text-gray-500 p-2">No MDA found.</p>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">{selectedMdas.length} selected</p>
                </div>

                <div className="space-y-3">
                    <Label>Metrics to Exclude</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {METRIC_OPTIONS.map((metric) => {
                            const checked = selectedMetricToggles.includes(metric.key);
                            return (
                                <div
                                    key={metric.key}
                                    onClick={() => toggleMetric(metric.key)}
                                    className={`w-full flex items-center justify-between rounded-md border p-3 text-left transition-colors ${checked
                                            ? "bg-green-50 border-green-500"
                                            : "bg-white border-gray-200 hover:bg-gray-50"
                                        }`}
                                    aria-disabled={selectedMdas.length === 0}
                                >
                                    <span className="text-sm">{metric.label}</span>
                                    <Switch
                                        checked={checked}
                                        onCheckedChange={() => toggleMetric(metric.key)}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={selectedMdas.length === 0}
                                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>Others Metrics (Independent)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(allOthersItems || []).map((item) => {
                            const key = `others:${item.itemId}`;
                            const checked = selectedMetricToggles.includes(key);
                            return (
                                <div
                                    key={key}
                                    onClick={() => toggleMetric(key)}
                                    className={`w-full flex items-center justify-between rounded-md border p-3 text-left transition-colors ${checked
                                            ? "bg-green-50 border-green-500"
                                            : "bg-white border-gray-200 hover:bg-gray-50"
                                        }`}
                                    aria-disabled={selectedMdas.length === 0}
                                >
                                    <span className="text-sm">{item.itemName}</span>
                                    <Switch
                                        checked={checked}
                                        onCheckedChange={() => toggleMetric(key)}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={selectedMdas.length === 0}
                                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                            );
                        })}
                        {(allOthersItems || []).length === 0 && (
                            <p className="text-sm text-gray-500">No Others metrics configured yet.</p>
                        )}
                    </div>
                </div>

                <Button onClick={handleSave} className="w-full" disabled={isSaving || selectedMdas.length === 0}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Exclusions
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

// ============================================
// EFFICIENCY PERIOD CONFIGURATION
// ============================================

function EfficiencyConfiguration({ year, config }: any) {
    const [startMonth, setStartMonth] = useState(config?.startMonth || "January");
    const [startYear, setStartYear] = useState(config?.startYear || year - 1);
    const [endMonth, setEndMonth] = useState(config?.endMonth || "December");
    const [endYear, setEndYear] = useState(config?.endYear || year);
    const [slaPoints, setSlaPoints] = useState(config?.slaPoints || 5);
    const [reportSubmissionPoints, setReportSubmissionPoints] = useState(config?.reportSubmissionPoints || 2);
    const [reportGovPoints, setReportGovPoints] = useState(config?.reportGovPoints || 20);
    const [timelinessPoints, setTimelinessPoints] = useState(config?.timelinessPoints || 3);
    const [isSaving, setIsSaving] = useState(false);

    const saveEfficiencyPeriod = useMutation(api.scoring_config.saveEfficiencyPeriod);

    const calculateMonths = () => {
        const startIdx = MONTHS.indexOf(startMonth);
        const endIdx = MONTHS.indexOf(endMonth);

        if (startYear === endYear) {
            return Math.max(0, endIdx - startIdx + 1);
        } else {
            const monthsInStartYear = 12 - startIdx;
            const yearsDiff = endYear - startYear - 1;
            const monthsInEndYear = endIdx + 1;
            return monthsInStartYear + (yearsDiff * 12) + monthsInEndYear;
        }
    };

    const totalMonths = calculateMonths();
    const totalEfficiencyPoints = slaPoints + reportSubmissionPoints + reportGovPoints + timelinessPoints;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveEfficiencyPeriod({
                year,
                periodName: `${year} Efficiency Period`,
                startMonth,
                startYear,
                endMonth,
                endYear,
                totalMonths,
                slaPoints,
                reportSubmissionPoints,
                reportGovPoints,
                timelinessPoints
            });
            toast.success("Efficiency period configuration saved!");
        } catch (error) {
            toast.error("Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Core Efficiency Metrics (30 points)</CardTitle>
                <CardDescription>
                    Configure SLA, Report Governance, Report Submission, and Timeliness metrics. Set the month range for calculations.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    {/* Start Month/Year */}
                    <div className="space-y-2">
                        <Label>Start Period</Label>
                        <div className="flex gap-2">
                            <Select value={startMonth} onValueChange={setStartMonth}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map(month => (
                                        <SelectItem key={month} value={month}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                value={startYear}
                                onChange={(e) => setStartYear(parseInt(e.target.value))}
                                className="w-24"
                            />
                        </div>
                    </div>

                    {/* End Month/Year */}
                    <div className="space-y-2">
                        <Label>End Period</Label>
                        <div className="flex gap-2">
                            <Select value={endMonth} onValueChange={setEndMonth}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map(month => (
                                        <SelectItem key={month} value={month}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                value={endYear}
                                onChange={(e) => setEndYear(parseInt(e.target.value))}
                                className="w-24"
                            />
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-900">
                        <strong>Period:</strong> {startMonth} {startYear} to {endMonth} {endYear}
                    </p>
                    <p className="text-sm text-blue-900 mt-1">
                        <strong>Total Months:</strong> {totalMonths} months (for SLA, Report Submission, Timeliness)
                    </p>
                    <p className="text-sm text-blue-900 mt-1">
                        <strong>Core Efficiency Points:</strong> {totalEfficiencyPoints} points
                    </p>
                    <p className="text-sm text-blue-900 mt-1">
                        <strong>Total Efficiency Bundle:</strong> {totalEfficiencyPoints} + 40 (Mystery Shopping) = {totalEfficiencyPoints + 40} points
                    </p>
                </div>

                {/* Individual Metric Points */}
                <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                    <h4 className="font-semibold text-sm">Points Per Metric</h4>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs">SLA Points</Label>
                            <Input
                                type="number"
                                value={slaPoints}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setSlaPoints(isNaN(val) ? 0 : val);
                                }}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Report Submission Points</Label>
                            <Input
                                type="number"
                                value={reportSubmissionPoints}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setReportSubmissionPoints(isNaN(val) ? 0 : val);
                                }}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Report Governance Points</Label>
                            <Input
                                type="number"
                                value={reportGovPoints}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setReportGovPoints(isNaN(val) ? 0 : val);
                                }}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Timeliness Points</Label>
                            <Input
                                type="number"
                                value={timelinessPoints}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setTimelinessPoints(isNaN(val) ? 0 : val);
                                }}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Efficiency Configuration
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

// ============================================
// MYSTERY SHOPPING CONFIGURATION (Hierarchical)
// ============================================

function MysteryShoppingConfiguration({ year, mysteryShoppingTypes }: any) {
    const [totalMysteryPoints, setTotalMysteryPoints] = useState(40); // Fixed total for ALL types
    const [types, setTypes] = useState(mysteryShoppingTypes?.length > 0 ? mysteryShoppingTypes : [
        {
            typeId: '1',
            typeName: 'Phone Call Mystery Shopping',
            order: 0,
            questions: [
                { questionId: '1-1', questionText: 'Call Response Quality (0=No Response, 1=Poor, 2=Fair, 3=Average, 4=Good, 5=Excellent)', weight: 8, answerType: 'scale_1_10', order: 0 },
                { questionId: '1-2', questionText: 'Information Accuracy Provided', weight: 4, answerType: 'scale_1_10', order: 1 },
                { questionId: '1-3', questionText: 'Professional Courtesy and Helpfulness', weight: 3, answerType: 'scale_1_10', order: 2 }
            ]
        },
        {
            typeId: '2',
            typeName: 'Email Response Mystery Shopping',
            order: 1,
            questions: [
                { questionId: '2-1', questionText: 'Email Response Received Within 48 Hours', weight: 3, answerType: 'yes_no', order: 0 },
                { questionId: '2-2', questionText: 'Email Response Quality (0=No Response, 1=Poor, 2=Fair, 3=Average, 4=Good, 5=Excellent)', weight: 4, answerType: 'scale_1_10', order: 1 },
                { questionId: '2-3', questionText: 'Information Completeness - All Questions Addressed', weight: 3, answerType: 'yes_no', order: 2 }
            ]
        },
        {
            typeId: '3',
            typeName: 'Website Functionality Assessment',
            order: 2,
            questions: [
                { questionId: '3-1', questionText: 'Functional Website', weight: 2, answerType: 'yes_no', order: 0 },
                { questionId: '3-2', questionText: 'Customer Services Contact Info Listed (Email & Phone)', weight: 2, answerType: 'yes_no', order: 1 },
                { questionId: '3-3', questionText: 'FAQ Available', weight: 2, answerType: 'yes_no', order: 2 },
                { questionId: '3-4', questionText: 'Requirements/Eligibility for Services Clearly Outlined', weight: 3, answerType: 'yes_no', order: 3 },
                { questionId: '3-5', questionText: 'Costs for Each Service Clearly Indicated with No Hidden Charges', weight: 3, answerType: 'yes_no', order: 4 },
                { questionId: '3-6', questionText: 'Availability of Online Application/Process', weight: 3, answerType: 'yes_no', order: 5 }
            ]
        }
    ]);
    const [isSaving, setIsSaving] = useState(false);
    const [isEqualDistribution, setIsEqualDistribution] = useState(false); // Toggle between equal vs manual point distribution

    const saveMysteryShoppingConfiguration = useMutation(api.scoring_config.saveMysteryShoppingConfiguration);

    // Auto-update equal distribution when total points change
    React.useEffect(() => {
        if (isEqualDistribution) {
            const updated = [...types];
            updated.forEach((type, typeIndex) => {
                const questionsCount = type.questions?.length || 0;
                if (questionsCount > 0) {
                    const equalWeight = totalMysteryPoints / questionsCount;
                    type.questions = type.questions.map((q: any) => ({
                        ...q,
                        weight: equalWeight
                    }));
                }
            });
            setTypes(updated);
        }
    }, [totalMysteryPoints, isEqualDistribution]);

    // Type Management
    const addType = () => {
        setTypes([...types, {
            typeId: Date.now().toString(),
            typeName: '',
            order: types.length,
            questions: []
        }]);
    };

    const removeType = (index: number) => {
        setTypes(types.filter((_: any, i: number) => i !== index));
    };

    const updateType = (index: number, field: string, value: any) => {
        const updated = [...types];
        updated[index] = { ...updated[index], [field]: value };
        setTypes(updated);
    };

    // Question Management
    const addQuestion = (typeIndex: number) => {
        const updated = [...types];
        const type = updated[typeIndex];
        type.questions = type.questions || [];
        
        const newWeight = isEqualDistribution ? 
            totalMysteryPoints / (type.questions.length + 1) : 
            5; // Default weight for manual mode
        
        type.questions.push({
            questionId: `${type.typeId}-${Date.now()}`,
            questionText: '',
            weight: newWeight,
            answerType: 'yes_no',
            order: type.questions.length
        });

        // If in equal distribution mode, update all question weights
        if (isEqualDistribution) {
            const equalWeight = totalMysteryPoints / type.questions.length;
            type.questions = type.questions.map((q: any) => ({
                ...q,
                weight: equalWeight
            }));
        }
        
        setTypes(updated);
    };

    const removeQuestion = (typeIndex: number, questionIndex: number) => {
        const updated = [...types];
        const type = updated[typeIndex];
        type.questions = type.questions.filter((_: any, i: number) => i !== questionIndex);
        
        // If in equal distribution mode and there are remaining questions, redistribute points
        if (isEqualDistribution && type.questions.length > 0) {
            const equalWeight = totalMysteryPoints / type.questions.length;
            type.questions = type.questions.map((q: any) => ({
                ...q,
                weight: equalWeight
            }));
        }
        
        setTypes(updated);
    };

    const updateQuestion = (typeIndex: number, questionIndex: number, field: string, value: any) => {
        const updated = [...types];
        updated[typeIndex].questions[questionIndex] = {
            ...updated[typeIndex].questions[questionIndex],
            [field]: value
        };
        setTypes(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Clean up types and limit to allowed fields
            const cleanedTypes = types.map((type: any) => ({
                typeId: type.typeId,
                typeName: type.typeName,
                order: type.order,
                questions: (type.questions || []).map((q: any) => ({
                    questionId: q.questionId,
                    questionText: q.questionText,
                    weight: q.weight,
                    answerType: q.answerType,
                    order: q.order
                }))
            }));

            await saveMysteryShoppingConfiguration({ year, types: cleanedTypes });
            toast.success("Mystery shopping configuration saved!");
        } catch (error) {
            toast.error("Failed to save configuration");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate points per type
    const getTypePoints = (type: any) => {
        return (type.questions || []).reduce((sum: number, q: any) => sum + (q.weight || 0), 0);
    };

    // Toggle equal distribution for a specific type
    const toggleEqualDistribution = (typeIndex: number) => {
        const updated = [...types];
        const type = updated[typeIndex];
        const questionsCount = type.questions?.length || 0;
        
        if (questionsCount === 0) {
            toast.error("Add questions first to distribute points.");
            return;
        }

        if (isEqualDistribution) {
            // Switch to manual mode - keep current weights but allow editing
            setIsEqualDistribution(false);
            toast.success("Switched to manual point setting mode. You can now set individual question weights.");
        } else {
            // Switch to equal distribution mode - divide points equally
            const equalWeight = totalMysteryPoints / questionsCount;
            updated[typeIndex].questions = type.questions.map((q: any) => ({
                ...q,
                weight: equalWeight
            }));
            setTypes(updated);
            setIsEqualDistribution(true);
            toast.success(`Equal distribution enabled. Each of ${questionsCount} questions has ${equalWeight} points.`);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mystery Shopping - Efficiency Component (40 points)</CardTitle>
                <CardDescription>
                    Create mystery shopping types (e.g., Physical Visit, Phone Call) with questions. This is part of the Efficiency Bundle and contributes 40 points to the total efficiency score.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Fixed Total Points */}
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-sm font-semibold">Mystery Shopping Points (Part of Efficiency Bundle)</Label>
                            <p className="text-xs text-gray-600">
                                This contributes to the total 70-point Efficiency Bundle. All mystery shopping types share this point total.
                            </p>
                            {isEqualDistribution && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                                    ⚡ Equal Distribution Mode Active - Points automatically divided among all questions
                                </div>
                            )}
                        </div>
                        <Input
                            type="number"
                            value={totalMysteryPoints}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setTotalMysteryPoints(isNaN(val) ? 0 : val);
                            }}
                            className="w-24 font-bold text-lg"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {types.map((type: any, typeIndex: number) => {
                        const typeTotal = getTypePoints(type);
                        const isExactMatch = typeTotal === totalMysteryPoints;
                        const isOverBudget = typeTotal > totalMysteryPoints;
                        const isUnderBudget = typeTotal < totalMysteryPoints && type.questions?.length > 0;

                        return (
                            <div key={type.typeId} className={`border-2 rounded-lg p-4 space-y-3 ${isOverBudget ? 'bg-red-50 border-red-300' :
                                isUnderBudget ? 'bg-yellow-50 border-yellow-300' :
                                    'bg-gray-50 border-gray-200'
                                }`}>
                                {/* Type Header */}
                                <div className="flex gap-2 items-center">
                                    <GripVertical className="h-5 w-5 text-gray-400" />

                                    <Input
                                        placeholder="Type name (e.g., Physical Visit)"
                                        value={type.typeName}
                                        onChange={(e) => updateType(typeIndex, 'typeName', e.target.value)}
                                        className="flex-1 font-semibold"
                                    />

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeType(typeIndex)}
                                        className="text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Budget Warning */}
                                {type.questions?.length > 0 && (
                                    <div className="space-y-2">
                                        <div className={`text-sm px-3 py-2 rounded ${isOverBudget ? 'bg-red-100 text-red-800 border border-red-300' :
                                            isUnderBudget ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                                'bg-green-100 text-green-800 border border-green-300'
                                            }`}>
                                            <strong>Budget:</strong> {typeTotal} / {totalMysteryPoints} points {
                                                isOverBudget ? '⚠️ Over budget!' :
                                                    isUnderBudget ? '⚠️ Under budget' :
                                                        '✓ Exact match!'
                                            }
                                        </div>

                                        <Button
                                            variant={isEqualDistribution ? "default" : "secondary"}
                                            size="sm"
                                            onClick={() => toggleEqualDistribution(typeIndex)}
                                            className="w-full"
                                        >
                                            {isEqualDistribution ? (
                                                <>🔓 Switch to Manual Point Setting</>
                                            ) : (
                                                <>⚡ Divide {totalMysteryPoints} Points Equally</>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {/* Questions under this type */}
                                <div className="ml-6 space-y-2 border-l-2 border-blue-300 pl-4">
                                    {type.questions && type.questions.length > 0 ? (
                                        type.questions.map((question: any, questionIndex: number) => (
                                            <div key={question.questionId} className="flex gap-2 items-start p-3 border rounded-md bg-white">
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        placeholder="Question text"
                                                        value={question.questionText}
                                                        onChange={(e) => updateQuestion(typeIndex, questionIndex, 'questionText', e.target.value)}
                                                    />

                                                    <div className="flex gap-2">
                                                        <Select
                                                            value={question.answerType}
                                                            onValueChange={(value) => updateQuestion(typeIndex, questionIndex, 'answerType', value)}
                                                        >
                                                            <SelectTrigger className="w-[150px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="yes_no">Yes / No</SelectItem>
                                                                <SelectItem value="scale_1_10">Scale 1-10</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <Input
                                                            type="number"
                                                            placeholder="Weight"
                                                            value={question.weight}
                                                            onChange={(e) => {
                                                                if (!isEqualDistribution) {
                                                                    const val = parseInt(e.target.value);
                                                                    updateQuestion(typeIndex, questionIndex, 'weight', isNaN(val) ? 0 : val);
                                                                }
                                                            }}
                                                            disabled={isEqualDistribution}
                                                            className={`w-24 ${isEqualDistribution ? 'bg-gray-100' : ''}`}
                                                            title={isEqualDistribution ? 'Points are automatically distributed equally. Switch to manual mode to edit individual weights.' : 'Set individual question weight'}
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeQuestion(typeIndex, questionIndex)}
                                                    className="text-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No questions added yet</p>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addQuestion(typeIndex)}
                                        className="w-full"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Question to {type.typeName || 'this type'}
                                    </Button>
                                </div>

                                {/* Type Summary */}
                                <div className="text-sm text-gray-600 ml-6">
                                    {type.questions?.length || 0} question(s) • {typeTotal} points
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={addType} className="flex-1">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Mystery Shopping Type
                    </Button>
                    
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            const realWorldExamples = [
                                {
                                    typeId: '1',
                                    typeName: 'Phone Call Mystery Shopping',
                                    order: 0,
                                    questions: [
                                        { questionId: '1-1', questionText: 'Call Response Quality (0=No Response, 1=Poor, 2=Fair, 3=Average, 4=Good, 5=Excellent)', weight: 8, answerType: 'scale_1_10', order: 0 },
                                        { questionId: '1-2', questionText: 'Information Accuracy Provided', weight: 4, answerType: 'scale_1_10', order: 1 },
                                        { questionId: '1-3', questionText: 'Professional Courtesy and Helpfulness', weight: 3, answerType: 'scale_1_10', order: 2 }
                                    ]
                                },
                                {
                                    typeId: '2',
                                    typeName: 'Email Response Mystery Shopping',
                                    order: 1,
                                    questions: [
                                        { questionId: '2-1', questionText: 'Email Response Received Within 48 Hours', weight: 3, answerType: 'yes_no', order: 0 },
                                        { questionId: '2-2', questionText: 'Email Response Quality (0=No Response, 1=Poor, 2=Fair, 3=Average, 4=Good, 5=Excellent)', weight: 4, answerType: 'scale_1_10', order: 1 },
                                        { questionId: '2-3', questionText: 'Information Completeness - All Questions Addressed', weight: 3, answerType: 'yes_no', order: 2 }
                                    ]
                                },
                                {
                                    typeId: '3',
                                    typeName: 'Website Functionality Assessment',
                                    order: 2,
                                    questions: [
                                        { questionId: '3-1', questionText: 'Functional Website', weight: 2, answerType: 'yes_no', order: 0 },
                                        { questionId: '3-2', questionText: 'Customer Services Contact Info Listed (Email & Phone)', weight: 2, answerType: 'yes_no', order: 1 },
                                        { questionId: '3-3', questionText: 'FAQ Available', weight: 2, answerType: 'yes_no', order: 2 },
                                        { questionId: '3-4', questionText: 'Requirements/Eligibility for Services Clearly Outlined', weight: 3, answerType: 'yes_no', order: 3 },
                                        { questionId: '3-5', questionText: 'Costs for Each Service Clearly Indicated with No Hidden Charges', weight: 3, answerType: 'yes_no', order: 4 },
                                        { questionId: '3-6', questionText: 'Availability of Online Application/Process', weight: 3, answerType: 'yes_no', order: 5 }
                                    ]
                                }
                            ];
                            setTypes(realWorldExamples);
                            toast.success("Loaded real-world mystery shopping examples from BFA data!");
                        }}
                        className="px-4"
                        title="Load examples based on actual BFA mystery shopping data"
                    >
                        📋 Load BFA Examples
                    </Button>
                </div>

                <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Mystery Shopping Configuration
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}



// ============================================
// PENALTY CONFIGURATION
// ============================================

function PenaltyConfiguration({ year, items }: any) {
    const [itemList, setItemList] = useState(items.length > 0 ? items : [
        { penaltyId: '1', penaltyName: 'Touting & Rentseeking', penaltyValue: -10, order: 0 }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    const savePenaltyItems = useMutation(api.scoring_config.savePenaltyItems);

    const addItem = () => {
        setItemList([...itemList, {
            penaltyId: Date.now().toString(),
            penaltyName: '',
            penaltyValue: -5,
            order: itemList.length
        }]);
    };

    const removeItem = (index: number) => {
        setItemList(itemList.filter((_: any, i: number) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const updated = [...itemList];
        updated[index] = { ...updated[index], [field]: value };
        setItemList(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Clean up items and limit to allowed fields
            const cleanedItems = itemList.map((item: any) => ({
                penaltyId: item.penaltyId,
                penaltyName: item.penaltyName,
                penaltyValue: item.penaltyValue,
                order: item.order
            }));

            await savePenaltyItems({ year, items: cleanedItems });
            toast.success("Penalty items saved!");
        } catch (error) {
            toast.error("Failed to save penalties");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Penalty Configuration</CardTitle>
                <CardDescription>
                    Configure penalty items and their negative point values
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    {itemList.map((item: any, index: number) => (
                        <div key={item.penaltyId} className="flex gap-2 items-start p-3 border rounded-md">
                            <GripVertical className="h-5 w-5 text-gray-400 mt-2" />

                            <div className="flex-1 space-y-2">
                                <Input
                                    placeholder="Penalty name"
                                    value={item.penaltyName}
                                    onChange={(e) => updateItem(index, 'penaltyName', e.target.value)}
                                />

                                <Input
                                    type="number"
                                    placeholder="Points (negative)"
                                    value={item.penaltyValue}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateItem(index, 'penaltyValue', isNaN(val) ? 0 : val);
                                    }}
                                    className="w-32"
                                />
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <Button variant="outline" onClick={addItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Penalty
                </Button>

                <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Penalty Configuration
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}



// ============================================
// OTHERS CONFIGURATION (Custom Metrics)
// ============================================

function OthersConfiguration({ year, othersItems }: any) {
    const [isSaving, setIsSaving] = useState(false);

    const [items, setItems] = useState(() => {
        // If we have saved items, use them
        if (othersItems && othersItems.length > 0) {
            return othersItems.map((item: any) => ({
                ...item,
                answerType: item.answerType || item.inputType || 'yes_no'
            }));
        }

        // Default initialization for new year
        return [
            {
                itemId: '1',
                itemName: 'Transparency',
                weight: 5,
                answerType: 'yes_no',
                order: 0
            },
            {
                itemId: '2',
                itemName: 'Stakeholder Engagement',
                weight: 5,
                answerType: 'yes_no',
                order: 1
            },
            {
                itemId: '3',
                itemName: 'BEEPA',
                weight: 10,
                answerType: 'yes_no',
                order: 2
            }
        ];
    });

    // Update items when othersItems prop changes (e.g. year change)
    // This is important because the initial state function only runs once on mount
    React.useEffect(() => {
        if (othersItems && othersItems.length > 0) {
            setItems(othersItems.map((item: any) => ({
                ...item,
                answerType: item.answerType || item.inputType || 'yes_no'
            })));
        } else {
            setItems([
                {
                    itemId: '1',
                    itemName: 'Transparency',
                    weight: 5,
                    answerType: 'yes_no',
                    order: 0
                },
                {
                    itemId: '2',
                    itemName: 'Stakeholder Engagement',
                    weight: 5,
                    answerType: 'yes_no',
                    order: 1
                },
                {
                    itemId: '3',
                    itemName: 'BEEPA',
                    weight: 10,
                    answerType: 'yes_no',
                    order: 2
                }
            ]);
        }
    }, [othersItems]);

    const saveOthersItems = useMutation(api.scoring_config.saveOthersItems);

    const addItem = () => {
        setItems([...items, {
            itemId: Date.now().toString(),
            itemName: '',
            weight: 5,
            answerType: 'yes_no',
            order: items.length
        }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_: any, i: number) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Clean up items and limit to allowed fields
            const cleanedItems = items.map((item: any) => ({
                itemId: item.itemId,
                itemName: item.itemName,
                weight: item.weight,
                answerType: item.answerType,
                order: item.order
            }));

            await saveOthersItems({ year, items: cleanedItems });
            toast.success("Others configuration saved!");
        } catch (error) {
            toast.error("Failed to save configuration");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Other Metrics Configuration</CardTitle>
                <CardDescription>
                    Add custom metrics (Transparency, Innovation, Engagement, etc.) with answer types and point values
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

                <div className="space-y-3">
                    {items.map((item: any, index: number) => (
                        <div key={item.itemId} className="flex gap-2 items-start p-3 border rounded-md bg-gray-50">
                            <GripVertical className="h-5 w-5 text-gray-400 mt-2" />

                            <div className="flex-1 space-y-2">
                                <Input
                                    placeholder="Metric name (e.g., Service Level Agreement Publishing)"
                                    value={item.itemName}
                                    onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                                />

                                <div className="flex gap-2">
                                    <Select
                                        value={item.answerType}
                                        onValueChange={(value) => updateItem(index, 'answerType', value)}
                                    >
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yes_no">Yes / No</SelectItem>
                                            <SelectItem value="scale_1_10">Scale 1-10</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Input
                                        type="number"
                                        placeholder="Points"
                                        value={item.weight}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            updateItem(index, 'weight', isNaN(val) ? 0 : val);
                                        }}
                                        className="w-24"
                                    />
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <Button variant="outline" onClick={addItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Metric
                </Button>

                <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Others Configuration
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
