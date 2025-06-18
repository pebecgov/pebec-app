import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

const DLI8Form = ({
    templateFormData,
    setTemplateFormData,
    handleTemplateDataStringChange,
    renderArrayInputs,
    renderDateArrayInputs,
}) => {
    const { reportType } = templateFormData;
    const typeData = templateFormData[reportType + "Data"] || {};

    // Helper to render a text input
    const renderInput = (name, label, placeholder = "", type = "text") => (
        <div className="mb-4">
            <Label className="text-sm font-medium">{label}</Label>
            <Input
                name={name}
                value={typeData[name] || ""}
                onChange={e => handleTemplateDataStringChange(e, reportType + "Data")}
                placeholder={placeholder}
                type={type}
                className="mt-1"
                required
            />
        </div>
    );

    // Helper to render a select input
    const renderSelect = (name, label, options) => (
      <div className="mb-4">
        <Label className="text-sm font-medium">{label}</Label>
        <Select
          value={typeData[name] || ""}
          onValueChange={val => {
            setTemplateFormData(prev => ({
              ...prev,
              [reportType + "Data"]: {
                ...prev[reportType + "Data"],
                [name]: val,
              },
            }));
          }}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );

    // Render fields based on reportType
    let fields: React.ReactNode = null;
    if (reportType === "type8") {
        fields = <>
            {renderInput("courtAddress", "Court Address")}
            {renderSelect("dayOf", "Day Of", days)}
            {renderSelect("month", "Month", months)}
            {renderSelect("year", "Year", years.map(String))}
            {renderInput("nameOfMagistrate", "Name of Magistrate")}
            {renderInput("signature", "Signature (Link to Signature Image)", "Paste signature image link here", "url")}
        </>;
    } else if (reportType === "type9") {
        fields = <>
            {renderInput("courtAddress", "Court Address")}
            {renderSelect("dayOf", "Day Of", days)}
            {renderSelect("month", "Month", months)}
            {renderSelect("year", "Year", years.map(String))}
            {renderInput("nameOfSheriff", "Name of Sheriff")}
            {renderInput("signature", "Signature (Link to Signature Image)", "Paste signature image link here", "url")}
        </>;
    } else if (reportType === "type10") {
        fields = <>
            {renderSelect("month", "Month", months)}
            {renderSelect("year", "Year", years.map(String))}
            {renderInput("address", "Court Address")}
            {renderArrayInputs(
                "type10Data",
                "suitNoAndParties",
                "SUIT NO. AND PARTIES",
                "Suit No",
                false
            )}
            {renderDateArrayInputs(
                "type10Data",
                "dateOfJudgment",
                "Date of Judgment",
                false
            )}
            {renderDateArrayInputs(
                "type10Data",
                "dateOfExecution",
                "Date of Execution",
                false
            )}
            {renderArrayInputs(
                "type10Data",
                "durationFromJudgmentToExecution",
                "Duration from Judgment to Execution",
                "Duration",
                false
            )}
            {renderArrayInputs(
                "type10Data",
                "statusOfJudgmentsNotExecuted",
                "Status of Judgments Not Executed (Whether on Appeal)",
                "Status",
                false
            )}
            {renderInput("numberOfCasesExecuted", "Number of Cases Executed")}
            {renderInput("numberOfCasesNotExecuted", "Number of Cases Not Executed")}
            {renderInput("nameOfDeputySheriff", "Name of Deputy Sheriff")}
            {renderInput("date", "Date", "", "date")}
            {renderInput("signature", "Signature (Link to Signature Image)", "Paste signature image link here", "url")}
        </>;
    } else if (reportType === "type11") {
        fields = <>
            {renderSelect("month", "Month", months)}
            {renderSelect("year", "Year", years.map(String))}
            {renderInput("address", "Court Address")}
            {renderArrayInputs(
                "type11Data",
                "suitNoAndParties",
                "SUIT NO. AND PARTIES",
                "Suit No",
                false
            )}
            {renderDateArrayInputs(
                "type11Data",
                "dateOfFiling",
                "Date of Filing",
                false
            )}
            {renderDateArrayInputs(
                "type11Data",
                "dateOfAssignment",
                "Date of Assignment",
                false
            )}
            {renderDateArrayInputs(
                "type11Data",
                "dateOfService",
                "Date of Service",
                false
            )}
            {renderDateArrayInputs(
                "type11Data",
                "dateOfCommencementOfHearing",
                "Date of Commencement of Hearing",
                false
            )}
            {renderArrayInputs(
                "type11Data",
                "numberOfAdjournments",
                "Number of Adjournments",
                "Number of Adjournments",
                false
            )}
            {renderArrayInputs(
                "type11Data",
                "reasonForAdjournment",
                "Reason for Adjournment (Where More Than Once)",
                "Reason for Adjournment",
                false
            )}
            {renderDateArrayInputs(
                "type11Data",
                "dateOfJudgment",
                "Date of Judgment",
                false
            )}
            {renderArrayInputs(
                "type11Data",
                "stageOfPendingClaims",
                "Stage of Pending Claims (Where Judgement Has Not Been Delivered)",
                "Stage of Pending Claims",
                false
            )}
            {renderArrayInputs(
                "type11Data",
                "durationFromFilingTillJudgment",
                "Duration from Filing Till Judgment",
                "Duration from Filing Till Judgment",
                false
            )}
            {renderInput("numberOfPendingCasesForTheMonth", "Number of Pending Cases for the Month")}
            {renderInput("numberOfDisposedCasesForTheMonth", "Number of Disposed Cases for the Month")}
            {renderInput("nameOfMagistrate", "Name of Magistrate")}
            {renderInput("date", "Date", "", "date")}
            {renderInput("signature", "Signature (Link to Signature Image)", "Paste signature image link here", "url")}
        </>;
    }

    return <div>{fields}</div>;
};

export default DLI8Form;
