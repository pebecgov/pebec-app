import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

const DLI4Form = ({
  templateFormData,
  setTemplateFormData,
  renderArrayInputs,
  renderDateArrayInputs,
  handleTemplateDataStringChange,
  handleTemplateDataArrayElementChange,
  handleAddArrayElement,
  handleRemoveArrayElement,
}) => {
  return (
    <>
      {/* Type 1 Form Fields */}
      {templateFormData.reportType === "type1" && templateFormData.type1Data && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium">State Investor Aftercare Retention Program</h4>

          {renderArrayInputs(
            "type1Data",
            "question2",
            "1. What are the key investment sectors the state has prioritized to provide aftercare and retentions services to?",
            "Enter the answer",
            true
          )}

          <div className="space-y-2">
            <Label>
              2. What is the minimum capital threshold for an investment to be
              eligible for aftercare and retention services?
            </Label>
            <Input
              name="question3"
              value={templateFormData.type1Data.question3 || ""}
              onChange={(e) => handleTemplateDataStringChange(e, "type1Data")}
              placeholder="Answer"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              3. What is the minimum employment threshold for an investment to be
              eligible for aftercare and retention services?
            </Label>
            <Input
              name="question4"
              value={templateFormData.type1Data.question4 || ""}
              onChange={(e) => handleTemplateDataStringChange(e, "type1Data")}
              placeholder="Answer"
              required
            />
          </div>

          {renderArrayInputs(
            "type1Data",
            "question5",
            "4. What additional factors are used to determine eligibility for aftercare and retention services?",
            "Answer",
            false
          )}

          <div className="space-y-2">
            <Label>
              5. How often does the state Investment Promotion Agency plan to
              engage with investors through formal stakeholder Engagements?
            </Label>
            <Input
              name="question6"
              value={templateFormData.type1Data.question6 || ""}
              onChange={(e) => handleTemplateDataStringChange(e, "type1Data")}
              placeholder="Answer"
              required
            />
          </div>

          {renderArrayInputs(
            "type1Data",
            "question7",
            "6. What specific services will the state Investment Promotion Agency provide to investors under its aftercare and retention program?",
            "Answer",
            false
          )}

          {renderArrayInputs(
            "type1Data",
            "question8",
            "7. What kind of assistance will the state Investment Promotion Agency provide to investors on obtaining and renewal of permits and licenses and fulfilling other regulatory compliance obligations?",
            "Answer",
            false
          )}

          {renderArrayInputs(
            "type1Data",
            "question9",
            "8. Does the State Investment Promotion Agency have a greviance redress mechanism for resolving complaints by Investors?",
            "Answer",
            false
          )}

          {renderArrayInputs(
            "type1Data",
            "question10",
            "9. Through which channels can investors submit grievances?",
            "Answer",
            false
          )}

          {renderArrayInputs(
            "type1Data",
            "question11",
            "10. What is the escalation framework if an investor's issue cannot resolved by the Investment Promotion Agency?",
            "Answer",
            false
          )}
        </div>
      )}

      {/* Type 2 Form Fields */}
      {templateFormData.reportType === "type2" && templateFormData.type2Data && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium">Announce Investment</h4>

          {renderArrayInputs(
            "type2Data",
            "announceInvestment",
            "Announce Investment Details",
            "Enter investment detail",
            false
          )}

          {renderDateArrayInputs(
            "type2Data",
            "dateOfAnnouncement",
            "DATE OF ANNOUNCEMENT",
            true
          )}

          {renderArrayInputs(
            "type2Data",
            "media_platform",
            "MEDIA OUTLET/PLATFORM WHERE INVESTMENT WAS ANNOUNCED",
            "Enter details",
            true
          )}
        </div>
      )}

      {/* Type 3 Form Fields */}
      {templateFormData.reportType === "type3" && templateFormData.type3Data && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium">INVENTORY INCENTIVE</h4>

          {renderArrayInputs(
            "type3Data",
            "noim",
            "NAME OF INCENTIVE MEASURE",
            "Enter details",
            false
          )}

          {renderArrayInputs(
            "type3Data",
            "lri",
            "LEGAL REFERENCE INSTRUMENT",
            "Enter LRI details",
            false
          )}

          {renderArrayInputs(
            "type3Data",
            "sectors",
            "SECTORS",
            "Enter sector",
            false
          )}

          {renderArrayInputs(
            "type3Data",
            "elibility",
            "ELIGIBILITY CRITERIA",
            "Enter eligibility criteria",
            false
          )}

          {renderArrayInputs(
            "type3Data",
            "description",
            "DESCRIPTION OF BENEFITS",
            "Enter description of Benefits",
            false
          )}

          {renderArrayInputs(
            "type3Data",
            "duration",
            "DURATION",
            "Enter duration",
            false
          )}

          {renderArrayInputs(
            "type3Data",
            "aaia",
            "AWARDING IMPLEMENTING AGENCY",
            "Enter AIA detail",
            false
          )}

          {[2021, 2022, 2023].map((year) => (
            <React.Fragment key={year}>
              {renderArrayInputs(
                "type3Data",
                `noiri${year}`,
                `NUMBER OF INCENTIVES RECIPIENTS IN ${year}`,
                `Enter ${year} data`,
                false
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
};

export default DLI4Form; 