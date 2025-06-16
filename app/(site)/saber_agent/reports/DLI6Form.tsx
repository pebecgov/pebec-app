import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import type { Type6Data } from "./page"; 

const DLI6Form = ({
    templateFormData,
    setTemplateFormData,
    renderArrayInputs,
    renderDateArrayInputs,
    handleTemplateDataStringChange,
    handleTemplateDataArrayElementChange,
    handleAddArrayElement,
    handleRemoveArrayElement,
}) => {
    const handleType6NestedChange = (section: keyof Type6Data, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTemplateFormData((prev) => ({
            ...prev,
            type6Data: {
                ...prev.type6Data!,
                [section]: {
                    ...prev.type6Data?.[section],
                    [field]: value,
                },
            },
        }));
    };

    return (
        <div>
            {templateFormData.reportType === "type4" && templateFormData.type4Data && (
                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-uppercase">Schedule of trade related fees and levies on inter-state movement of goods;</h4>

                    <div className="space-y-2">
                        <Label>Has the State Published a Consolidated Schedule of Interstate Trade-Related Fees and Levies? Provide link to published document:</Label>
                        <Input
                            name="publishedDocumentLink"
                            value={templateFormData.type4Data.publishedDocumentLink || ""}
                            onChange={(e) => handleTemplateDataStringChange(e, "type4Data")}
                            placeholder="Enter published document link"
                            type="url"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>The state has eliminated haulage-related fees and levies through the following action(s):</Label>
                        <div className="space-y-3 mt-2">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={templateFormData.type4Data.legislativeActions.amendmentToRevenueCode}
                                    onChange={(e) => {
                                        setTemplateFormData((prev) => ({
                                            ...prev,
                                            type4Data: {
                                                ...prev.type4Data!,
                                                legislativeActions: {
                                                    ...prev.type4Data!.legislativeActions,
                                                    amendmentToRevenueCode: e.target.checked
                                                }
                                            }
                                        }));
                                    }}
                                    className="mt-1"
                                />
                                <Label className="text-sm flex-1">Amendment to the existing consolidated revenue code or revenue law, passed by the State House of Assembly and assented to by the Governor</Label>
                            </div>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={templateFormData.type4Data.legislativeActions.executiveOrder}
                                    onChange={(e) => {
                                        setTemplateFormData((prev) => ({
                                            ...prev,
                                            type4Data: {
                                                ...prev.type4Data!,
                                                legislativeActions: {
                                                    ...prev.type4Data!.legislativeActions,
                                                    executiveOrder: e.target.checked
                                                }
                                            }
                                        }));
                                    }}
                                    className="mt-1"
                                />
                                <Label className="text-sm flex-1">Executive order by the Governor (if applicable)</Label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Provide link to amended law or executive order:</Label>
                        <Input
                            name="amendedLawLink"
                            value={templateFormData.type4Data.amendedLawLink || ""}
                            onChange={(e) => handleTemplateDataStringChange(e, "type4Data")}
                            placeholder="Enter amended law link"
                            type="url"
                            required
                        />
                    </div>

                    {/* Verification Checklist */}
                    <div className="space-y-4 mt-6">
                        <h5 className="font-medium">Verification Checklist</h5>

                        <div className="space-y-4">
                            {/* Verification Item 1 - Yes/No radio buttons with affirmative/not affirmative output */}
                            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                    <Label className="text-sm flex-1">1. A single, consolidated document listing all inter-state trade-related fees and levies is available.</Label>
                                </div>
                                <div className="ml-6 space-y-2">
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="verification1"
                                                checked={templateFormData.type4Data!.verification1.confirmed === true}
                                                onChange={() => {
                                                    setTemplateFormData((prev) => ({
                                                        ...prev,
                                                        type4Data: {
                                                            ...prev.type4Data!,
                                                            verification1: {
                                                                ...prev.type4Data!.verification1,
                                                                confirmed: true
                                                            }
                                                        }
                                                    }));
                                                }}
                                            />
                                            Yes
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="verification1"
                                                checked={templateFormData.type4Data!.verification1.confirmed === false}
                                                onChange={() => {
                                                    setTemplateFormData((prev) => ({
                                                        ...prev,
                                                        type4Data: {
                                                            ...prev.type4Data!,
                                                            verification1: {
                                                                ...prev.type4Data!.verification1,
                                                                confirmed: false
                                                            }
                                                        }
                                                    }));
                                                }}
                                            />
                                            No
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Item 2 - Yes/No checkbox then provide link */}
                            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={templateFormData.type4Data!.verification2.confirmed}
                                        onChange={(e) => {
                                            setTemplateFormData((prev) => ({
                                                ...prev,
                                                type4Data: {
                                                    ...prev.type4Data!,
                                                    verification2: {
                                                        ...prev.type4Data!.verification2,
                                                        confirmed: e.target.checked
                                                    }
                                                }
                                            }));
                                        }}
                                        className="mt-1"
                                    />
                                    <Label className="text-sm flex-1">2. Each fee in the schedule includes a description and basis of estimation, even where amounts are not specified in the law.</Label>
                                </div>
                                {templateFormData.type4Data!.verification2.confirmed && (
                                    <div className="ml-6">
                                        <Label className="text-xs text-gray-600">Provide link:</Label>
                                        <Input
                                            value={templateFormData.type4Data!.verification2.evidence}
                                            onChange={(e) => {
                                                setTemplateFormData((prev) => ({
                                                    ...prev,
                                                    type4Data: {
                                                        ...prev.type4Data!,
                                                        verification2: {
                                                            ...prev.type4Data!.verification2,
                                                            evidence: e.target.value
                                                        }
                                                    }
                                                }));
                                            }}
                                            placeholder="Enter link"
                                            type="url"
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Verification Item 3 - Yes/No checkbox then provide link if yes only */}
                            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={templateFormData.type4Data!.verification3.confirmed}
                                        onChange={(e) => {
                                            setTemplateFormData((prev) => ({
                                                ...prev,
                                                type4Data: {
                                                    ...prev.type4Data!,
                                                    verification3: {
                                                        ...prev.type4Data!.verification3,
                                                        confirmed: e.target.checked,
                                                        evidence: e.target.checked ? prev.type4Data!.verification3.evidence : ""
                                                    }
                                                }
                                            }));
                                        }}
                                        className="mt-1"
                                    />
                                    <Label className="text-sm flex-1">3. The amended revenue law/consolidated code removing haulage fees is published on the state official website.</Label>
                                </div>
                                {templateFormData.type4Data!.verification3.confirmed && (
                                    <div className="ml-6">
                                        <Label className="text-xs text-gray-600">Provide link:</Label>
                                        <Input
                                            value={templateFormData.type4Data!.verification3.evidence}
                                            onChange={(e) => {
                                                setTemplateFormData((prev) => ({
                                                    ...prev,
                                                    type4Data: {
                                                        ...prev.type4Data!,
                                                        verification3: {
                                                            ...prev.type4Data!.verification3,
                                                            evidence: e.target.value
                                                        }
                                                    }
                                                }));
                                            }}
                                            placeholder="Enter link"
                                            type="url"
                                            className="text-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Verification Item 4 - Yes/No checkbox then provide link if yes or explanation */}
                            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={templateFormData.type4Data!.verification4.confirmed}
                                        onChange={(e) => {
                                            setTemplateFormData((prev) => ({
                                                ...prev,
                                                type4Data: {
                                                    ...prev.type4Data!,
                                                    verification4: {
                                                        ...prev.type4Data!.verification4,
                                                        confirmed: e.target.checked
                                                    }
                                                }
                                            }));
                                        }}
                                        className="mt-1"
                                    />
                                    <Label className="text-sm flex-1">4. The removal of haulage fees is clearly reflected in the amended revenue law/consolidated revenue code.</Label>
                                </div>
                                <div className="ml-6">
                                    <Label className="text-xs text-gray-600">
                                        {templateFormData.type4Data!.verification4.confirmed ? "Provide link:" : "Explanation:"}
                                    </Label>
                                    <Input
                                        value={templateFormData.type4Data!.verification4.evidence}
                                        onChange={(e) => {
                                            setTemplateFormData((prev) => ({
                                                ...prev,
                                                type4Data: {
                                                    ...prev.type4Data!,
                                                    verification4: {
                                                        ...prev.type4Data!.verification4,
                                                        evidence: e.target.value
                                                    }
                                                }
                                            }));
                                        }}
                                        placeholder={templateFormData.type4Data!.verification4.confirmed ? "Enter link" : "Enter explanation"}
                                        type={templateFormData.type4Data!.verification4.confirmed ? "url" : "text"}
                                        className="text-sm"
                                    />
                                </div>
                            </div>

                            {/* Verification Item 5 - Yes/No checkbox */}
                            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={templateFormData.type4Data!.verification5.confirmed}
                                        onChange={(e) => {
                                            setTemplateFormData((prev) => ({
                                                ...prev,
                                                type4Data: {
                                                    ...prev.type4Data!,
                                                    verification5: {
                                                        ...prev.type4Data!.verification5,
                                                        confirmed: e.target.checked
                                                    }
                                                }
                                            }));
                                        }}
                                        className="mt-1"
                                    />
                                    <Label className="text-sm flex-1">5. Hyperlinks to relevant revenue laws and regulations are provided in the schedule document.</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Type 5: State Committee on Export Promotion (SCEP) Report */}
            {templateFormData.reportType === "type5" && (
                <div className="space-y-6">
                    <h4 className="text-lg font-semibold">State Committee on Export Promotion (SCEP) Report</h4>

                    {/* Section 2: Functions of SCEP */}
                    <div className="space-y-4">
                        <h5 className="font-medium">2. Functions of SCEP</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                The SCEP performs the following statutory functions:<br />
                                • Constitutes a forum for the promotion of principal exportable products of the state.<br />
                                • Advises the Nigeria Export Promotion Council (NEPC) on strategies to achieve its mandate in the state.<br />
                                • Carries out additional functions as may be directed by the NEPC.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Insert link to state law, gazette, or mandate documentation confirming the existence of the SCEP:</Label>
                            <Input
                                name="scepMandateLink"
                                value={templateFormData.type5Data?.scepMandateLink || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type5Data")}
                                placeholder="Enter SCEP mandate documentation link"
                                type="url"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 3: Export Strategy */}
                    <div className="space-y-4">
                        <h5 className="font-medium">3. Export Strategy and Guideline Document</h5>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={templateFormData.type5Data?.hasExportStrategy || false}
                                onChange={(e) => {
                                    setTemplateFormData((prev) => ({
                                        ...prev,
                                        type5Data: {
                                            ...prev.type5Data!,
                                            hasExportStrategy: e.target.checked
                                        }
                                    }));
                                }}
                                className="mt-1"
                            />
                            <Label className="text-sm">The state has developed a comprehensive Export Strategy and Guidelines Document</Label>
                        </div>

                        {templateFormData.type5Data?.hasExportStrategy && (
                            <div className="space-y-2">
                                <Label>Provide link to the published Export Strategy document:</Label>
                                <Input
                                    name="exportStrategyLink"
                                    value={templateFormData.type5Data?.exportStrategyLink || ""}
                                    onChange={(e) => handleTemplateDataStringChange(e, "type5Data")}
                                    placeholder="Enter export strategy document link"
                                    type="url"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    {/* Section 4: Stakeholder Consultation */}
                    <div className="space-y-4">
                        <h5 className="font-medium">4. Stakeholder Consultation Process</h5>

                        <div className="space-y-2">
                            <Label>Attendance Sheets (Link to document):</Label>
                            <Input
                                name="attendanceSheets"
                                value={templateFormData.type5Data?.stakeholderConsultation.attendanceSheets || ""}
                                onChange={(e) => {
                                    setTemplateFormData((prev) => ({
                                        ...prev,
                                        type5Data: {
                                            ...prev.type5Data!,
                                            stakeholderConsultation: {
                                                ...prev.type5Data!.stakeholderConsultation,
                                                attendanceSheets: e.target.value
                                            }
                                        }
                                    }));
                                }}
                                placeholder="Enter link to attendance sheets"
                                type="url"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Meeting Minutes (Link to document):</Label>
                            <Input
                                name="meetingMinutes"
                                value={templateFormData.type5Data?.stakeholderConsultation.meetingMinutes || ""}
                                onChange={(e) => {
                                    setTemplateFormData((prev) => ({
                                        ...prev,
                                        type5Data: {
                                            ...prev.type5Data!,
                                            stakeholderConsultation: {
                                                ...prev.type5Data!.stakeholderConsultation,
                                                meetingMinutes: e.target.value
                                            }
                                        }
                                    }));
                                }}
                                placeholder="Enter link to meeting minutes"
                                type="url"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Names and contacts of private sector contributors:</Label>
                            {(templateFormData.type5Data?.stakeholderConsultation.privateContributors || [""]).map((value, index) => (
                                <div key={`privateContributors-${index}`} className="flex items-center gap-2">
                                    <Input
                                        value={value}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            setTemplateFormData((prev) => {
                                                const currentContributors = [...(prev.type5Data?.stakeholderConsultation.privateContributors || [])];
                                                currentContributors[index] = newValue;
                                                return {
                                                    ...prev,
                                                    type5Data: {
                                                        ...prev.type5Data!,
                                                        stakeholderConsultation: {
                                                            ...prev.type5Data!.stakeholderConsultation,
                                                            privateContributors: currentContributors
                                                        }
                                                    }
                                                };
                                            });
                                        }}
                                        placeholder="Enter name and contact"
                                        className="flex-1"
                                        required
                                    />
                                    {(templateFormData.type5Data?.stakeholderConsultation.privateContributors?.length || 0) > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setTemplateFormData((prev) => {
                                                    const currentContributors = [...(prev.type5Data?.stakeholderConsultation.privateContributors || [])];
                                                    currentContributors.splice(index, 1);
                                                    return {
                                                        ...prev,
                                                        type5Data: {
                                                            ...prev.type5Data!,
                                                            stakeholderConsultation: {
                                                                ...prev.type5Data!.stakeholderConsultation,
                                                                privateContributors: currentContributors
                                                            }
                                                        }
                                                    };
                                                });
                                            }}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setTemplateFormData((prev) => {
                                        const currentContributors = [...(prev.type5Data?.stakeholderConsultation.privateContributors || []), ""];
                                        return {
                                            ...prev,
                                            type5Data: {
                                                ...prev.type5Data!,
                                                stakeholderConsultation: {
                                                    ...prev.type5Data!.stakeholderConsultation,
                                                    privateContributors: currentContributors
                                                }
                                            }
                                        };
                                    });
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Contributor
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Narrative summary of private sector feedback:</Label>
                            <textarea
                                name="feedbackSummary"
                                value={templateFormData.type5Data?.stakeholderConsultation.feedbackSummary || ""}
                                onChange={(e) => {
                                    setTemplateFormData((prev) => ({
                                        ...prev,
                                        type5Data: {
                                            ...prev.type5Data!,
                                            stakeholderConsultation: {
                                                ...prev.type5Data!.stakeholderConsultation,
                                                feedbackSummary: e.target.value
                                            }
                                        }
                                    }));
                                }}
                                placeholder="Provide a summary of how private sector feedback influenced the final document"
                                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 5: Operational Budget */}
                    <div className="space-y-4">
                        <h5 className="font-medium">5. Operational Budget Allocation</h5>

                        <div className="space-y-2">
                            <Label>Budget Documents (Link to relevant pages from 2024 and 2025 Approved Budgets):</Label>
                            <Input
                                name="budgetDocuments"
                                value={templateFormData.type5Data?.budgetDocuments || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type5Data")}
                                placeholder="Enter link to budget documents showing SCEP allocation"
                                type="url"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 6: Implementation Activities */}
                    <div className="space-y-4">
                        <h5 className="font-medium">6. Implementation Activities and Institutional Mechanism</h5>

                        {renderArrayInputs(
                            "type5Data",
                            "implementationReports",
                            "Implementation Activity Reports (Links to 2 or more reports):",
                            "Enter link to implementation report",
                            true
                        )}
                    </div>

                    {/* Checklist */}
                    <div className="space-y-4">
                        <h5 className="font-medium">Checklist of Required Attachments/Links</h5>

                        <div className="space-y-3">
                            {[
                                { key: "exportStrategyDoc", label: "Export Strategy and Guidelines Document (PDF or Word)" },
                                { key: "publicationLink", label: "Publication link to state website hosting the strategy" },
                                { key: "attendanceSheets", label: "Signed meeting attendance sheets and consultation minutes" },
                                { key: "privateContributors", label: "Names/contacts of sampled private sector contributors" },
                                { key: "budgetLineItems", label: "Budget line items from FY2024 and FY2025 budgets" },
                                { key: "nepcCertification", label: "NEPC certification baseline data and 2025 firm data" },
                                { key: "exportActivities", label: "Evidence of export promotion activities executed by the SCEP" },
                                { key: "institutionalFramework", label: "Institutional mechanism and implementation framework" }
                            ].map((item) => (
                                <div key={item.key} className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={templateFormData.type5Data?.checklist[item.key] || false}
                                        onChange={(e) => {
                                            setTemplateFormData((prev) => ({
                                                ...prev,
                                                type5Data: {
                                                    ...prev.type5Data!,
                                                    checklist: {
                                                        ...prev.type5Data!.checklist,
                                                        [item.key]: e.target.checked
                                                    }
                                                }
                                            }));
                                        }}
                                        className="mt-1"
                                    />
                                    <Label className="text-sm">{item.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Type 6: Grievance Redress Mechanism (GRM) Report */}
            {templateFormData.reportType === "type6" && (
                <div className="space-y-6">
                    <h4 className="text-lg font-semibold">Grievance Redress Mechanism (GRM) Report</h4>

                    {/* Section 2: GRM Structure */}
                    <div className="space-y-4">
                        <h5 className="font-medium">2. GRM Structure</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                The GRM is structured to handle complaints efficiently and effectively. The structure involves:<br />
                                • A formal complaint logbook<br />
                                • A clear escalation framework<br />
                                • Regular communication with stakeholders<br />
                                • A written SOP for handling complaints<br />
                                • A mechanism for monitoring and evaluating the GRM's effectiveness
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Responsible Agency:</Label>
                            <Input
                                name="responsibleAgency"
                                value={templateFormData.type6Data?.responsibleAgency || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type6Data")}
                                placeholder="Enter responsible agency"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 3: Complaint Channels */}
                    <div className="space-y-4">
                        <h5 className="font-medium">3. Complaint Channels</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                Investors can submit complaints through multiple channels:<br />
                                • Telephone<br />
                                • Email<br />
                                • Walk-in address<br />
                                • Online portal
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Telephone:</Label>
                            <Input
                                name="telephone"
                                value={templateFormData.type6Data?.complaintChannels.telephone || ""}
                                onChange={handleType6NestedChange("complaintChannels", "telephone")}
                                placeholder="Enter telephone number"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Email:</Label>
                            <Input
                                name="email"
                                value={templateFormData.type6Data?.complaintChannels.email || ""}
                                onChange={handleType6NestedChange("complaintChannels", "email")}
                                placeholder="Enter email address"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Walk-in Address:</Label>
                            <Input
                                name="walkInAddress"
                                value={templateFormData.type6Data?.complaintChannels.walkInAddress || ""}
                                onChange={handleType6NestedChange("complaintChannels", "walkInAddress")}
                                placeholder="Enter walk-in address"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Online Portal:</Label>
                            <Input
                                name="onlinePortal"
                                value={templateFormData.type6Data?.complaintChannels.onlinePortal || ""}
                                onChange={handleType6NestedChange("complaintChannels", "onlinePortal")}
                                placeholder="Enter online portal URL"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 4: Registration System */}
                    <div className="space-y-4">
                        <h5 className="font-medium">4. Registration System</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                Investors must register their businesses with the state before they can submit complaints. The registration process includes:<br />
                                • Submission of a completed application form<br />
                                • Payment of a nominal registration fee<br />
                                • Submission of required documents (e.g., business license, tax identification number)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>System Link:</Label>
                            <Input
                                name="systemLink"
                                value={templateFormData.type6Data?.registrationSystem.systemLink || ""}
                                onChange={handleType6NestedChange("registrationSystem", "systemLink")}
                                placeholder="Enter system link"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>System Screenshot:</Label>
                            <Input
                                name="systemScreenshot"
                                value={templateFormData.type6Data?.registrationSystem.systemScreenshot || ""}
                                onChange={handleType6NestedChange("registrationSystem", "systemScreenshot")}
                                placeholder="Enter system screenshot URL"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 5: SLA Details */}
                    <div className="space-y-4">
                        <h5 className="font-medium">5. SLA Details</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                The state has established a Service Level Agreement (SLA) with the GRM to ensure timely and effective resolution of complaints. The SLA includes:<br />
                                • Acknowledgement time<br />
                                • Resolution time<br />
                                • Performance metrics<br />
                                • Escalation procedures
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Acknowledgement Time:</Label>
                            <Input
                                name="acknowledgementTime"
                                value={templateFormData.type6Data?.slaDetails.acknowledgementTime || ""}
                                onChange={handleType6NestedChange("slaDetails", "acknowledgementTime")}
                                placeholder="Enter acknowledgement time"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Resolution Time:</Label>
                            <Input
                                name="resolutionTime"
                                value={templateFormData.type6Data?.slaDetails.resolutionTime || ""}
                                onChange={handleType6NestedChange("slaDetails", "resolutionTime")}
                                placeholder="Enter resolution time"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>SLA Document:</Label>
                            <Input
                                name="slaDocument"
                                value={templateFormData.type6Data?.slaDetails.slaDocument || ""}
                                onChange={handleType6NestedChange("slaDetails", "slaDocument")}
                                placeholder="Enter SLA document link"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 6: Performance Tracking */}
                    <div className="space-y-4">
                        <h5 className="font-medium">6. Performance Tracking</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                The state has implemented a mechanism to monitor and evaluate the GRM's performance. The mechanism includes:<br />
                                • Quarterly reports<br />
                                • Complaint logbook analysis<br />
                                • Stakeholder feedback surveys<br />
                                • Performance metrics tracking
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Total Complaints:</Label>
                            <Input
                                name="totalComplaints"
                                value={templateFormData.type6Data?.performanceData.totalComplaints || ""}
                                onChange={handleType6NestedChange("performanceData", "totalComplaints")}
                                placeholder="Enter total complaints"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Resolved Within SLA:</Label>
                            <Input
                                name="resolvedWithinSLA"
                                value={templateFormData.type6Data?.performanceData.resolvedWithinSLA || ""}
                                onChange={handleType6NestedChange("performanceData", "resolvedWithinSLA")}
                                placeholder="Enter resolved within SLA"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Percentage Resolved:</Label>
                            <Input
                                name="percentageResolved"
                                value={templateFormData.type6Data?.performanceData.percentageResolved || ""}
                                onChange={handleType6NestedChange("performanceData", "percentageResolved")}
                                placeholder="Enter percentage resolved"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>SLA Compliance Met:</Label>
                            <input
                                type="checkbox"
                                checked={templateFormData.type6Data?.performanceData.slaComplianceMet || false}
                                onChange={(e) => {
                                    setTemplateFormData((prev) => ({
                                        ...prev,
                                        type6Data: {
                                            ...prev.type6Data!,
                                            performanceData: {
                                                ...prev.type6Data!.performanceData,
                                                slaComplianceMet: e.target.checked
                                            }
                                        }
                                    }));
                                }}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* Section 7: Escalation Framework */}
                    <div className="space-y-4">
                        <h5 className="font-medium">7. Escalation Framework</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                The state has established a clear escalation framework for handling unresolved complaints. The framework includes:<br />
                                • A step-by-step process for escalating complaints<br />
                                • A written SOP for handling escalated complaints<br />
                                • Regular communication with stakeholders
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Escalation Chart:</Label>
                            <Input
                                name="escalationChart"
                                value={templateFormData.type6Data?.escalationFramework.escalationChart || ""}
                                onChange={handleType6NestedChange("escalationFramework", "escalationChart")}
                                placeholder="Enter escalation chart"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>SOP Document:</Label>
                            <Input
                                name="sopDocument"
                                value={templateFormData.type6Data?.escalationFramework.sopDocument || ""}
                                onChange={handleType6NestedChange("escalationFramework", "sopDocument")}
                                placeholder="Enter SOP document link"
                                required
                            />
                        </div>
                    </div>

                    {/* Section 8: Stakeholder Communication */}
                    <div className="space-y-4">
                        <h5 className="font-medium">8. Stakeholder Communication</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                The state has established a mechanism for regular communication with stakeholders. The mechanism includes:<br />
                                • Meeting attendance sheets<br />
                                • Meeting minutes<br />
                                • Sample verification with private sector representatives
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Campaign Evidence:</Label>
                            <Input
                                name="campaignEvidence"
                                value={templateFormData.type6Data?.communicationEvidence.campaignEvidence || ""}
                                onChange={handleType6NestedChange("communicationEvidence", "campaignEvidence")}
                                placeholder="Enter campaign evidence"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Online Materials:</Label>
                            <Input
                                name="onlineMaterials"
                                value={templateFormData.type6Data?.communicationEvidence.onlineMaterials || ""}
                                onChange={handleType6NestedChange("communicationEvidence", "onlineMaterials")}
                                placeholder="Enter online materials"
                                required
                            />
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-4">
                        <h5 className="font-medium">Checklist of Required Attachments/Links</h5>

                        <div className="space-y-3">
                            {[
                                { key: "complaintLogbook", label: "Complaint Logbook" },
                                { key: "slaDocument", label: "SLA Document" },
                                { key: "quarterlyReport", label: "Quarterly Report" },
                                { key: "escalationSOP", label: "Escalation SOP" },
                                { key: "communicationMaterials", label: "Communication Materials" }
                            ].map((item) => (
                                <div key={item.key} className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={templateFormData.type6Data?.checklist[item.key] || false}
                                        onChange={(e) => {
                                            setTemplateFormData((prev) => ({
                                                ...prev,
                                                type6Data: {
                                                    ...prev.type6Data!,
                                                    checklist: {
                                                        ...prev.type6Data!.checklist,
                                                        [item.key]: e.target.checked
                                                    }
                                                }
                                            }));
                                        }}
                                        className="mt-1"
                                    />
                                    <Label className="text-sm">{item.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DLI6Form;