import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import type { Type7Data } from "./page"; 

const DLI5Form = ({
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
      {/* Type 7 Form Fields */}
      {templateFormData.reportType === "type7" && templateFormData.type7Data && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium">Operational GRMs in Two Key BEE MDAs – Compliance Report Template<br /></h4>
                  
           
             <div className="space-y-2">
                  <p>GRM System and Documentation</p>
              <Label>Evidence of committed turnaround time to resolve grievances received communicated to
                the public or SLA on GRM on the MDA or state official website: </Label>
                            <Input
                                name="evidenceOfCommittedTurnaroundLink"
                                value={templateFormData.type7Data.evidenceOfCommittedTurnaroundLink || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type7Data")}
                                placeholder="Enter evidence of commmitted turnaround link"
                                type="url"
                                required
                            />
                        </div>
            
<div className="space-y-2">
<Label>For 2024 (Year 2): Provide link to GRM Report here: </Label>
                        <Input
                                name="year2024Link"
                                value={templateFormData.type7Data.year2024Link || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type7Data")}
                                placeholder="Provide link"
                                type="url"
                                required
                            />
                            
                        </div>
                        <div className="space-y-2">
<Label>For 2025 (Year 3): Provide link to GRM Report here: </Label>
                        <Input
                                name="year2025Link"
                                value={templateFormData.type7Data.year2025Link || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type7Data")}
                                placeholder="Provide link"
                                type="url"
                                required
                            />
                           
                  

                        </div>

                             
                <div>
             <p>Monthly Publication of Compliance Statistics</p>
                     <Label> Provide link to Monthly Compliance Report here:</Label>
                        <Input
                                name="monthlyComplianceLink"
                                value={templateFormData.type7Data.monthlyComplianceLink || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type7Data")}
                                placeholder="Provide link"
                                type="url"
                                required
                            />
               </div>


               

          
        </div>

                    
      )}


      {/* Type 12 Form Fields */}
      {templateFormData.reportType === "type12" && templateFormData.type12Data && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium">Compliance Report: Publication of Business Regulatory Processes by BEE State MDAs<br /></h4>
    
                 <div className="space-y-2">
            <p>Key Publication Requirements</p>
                   
                 
                       {renderArrayInputs(
            "type12Data",
            "fiveMDA",
            "The Five MDAs Selected for Our State are:",
            "Enter MDA",
            false
          )}
                        </div>

                             
                <div>
              <p>Executive Order Verification</p>
                     <Label> Provide link to Excecutive order here:</Label>
                        <Input
                                name="executiveOrderLink"
                                value={templateFormData.type12Data.executiveOrderLink || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type12Data")}
                                placeholder="Provide link"
                                type="url"
                                required
                            />
               </div>

                 <div>
              <p>Online Publication Verification  (for all 5 BEE MDAs)</p>
              <p className="text-sm">For each of the five selected BEE MDAs, provide the following:</p><br />
                  can you  
                            
    <div className="space-y-4">
  <p className="font-semibold text-lg">For each of the five selected BEE MDAs, provide the following:</p>

  {templateFormData.type12Data?.mdaRecords?.map((record, index) => (
    <div
      key={index}
      className="border border-gray-300 rounded-xl p-6 shadow-sm space-y-4 relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Name of MDA</Label>
          <Input
            value={record.NameOfMDA ?? ""}
            onChange={(e) =>
              handleTemplateDataArrayElementChange(
                "type12Data",
                "mdaRecords",
                index,
                "NameOfMDA",
                e.target.value
              )
            }
          />
        </div>
        <div>
          <Label>Title of the Regulatory Process</Label>
          <Input
            value={record.titleOfRP ?? ""}
            onChange={(e) =>
              handleTemplateDataArrayElementChange(
                "type12Data",
                "mdaRecords",
                index,
                "titleOfRP",
                e.target.value
              )
            }
          />
        </div>
        <div>
          <Label>Web Link to Published Information</Label>
          <Input
            type="url"
            value={record.WebLinkPI ?? ""}
            onChange={(e) =>
              handleTemplateDataArrayElementChange(
                "type12Data",
                "mdaRecords",
                index,
                "WebLinkPI",
                e.target.value
              )
            }
          />
        </div>
        <div>
          <Label>Link to Screenshot or Timestamp Verifying the Publication Date</Label>
          <Input
            type="url"
            value={record.link2Sr ?? ""}
            onChange={(e) =>
              handleTemplateDataArrayElementChange(
                "type12Data",
                "mdaRecords",
                index,
                "link2Sr",
                e.target.value
              )
            }
          />
        </div>
        <div>
          <Label>Link to Supporting Documents / Step-by-step Procedure</Label>
          <Input
            type="url"
            value={record.link2Sup ?? ""}
            onChange={(e) =>
              handleTemplateDataArrayElementChange(
                "type12Data",
                "mdaRecords",
                index,
                "link2Sup",
                e.target.value
              )
            }
          />
        </div>
        <div>
          <Label>SLA References (if any) and Timeline Commitments </Label>
          <Input
            value={record.slaRef ?? ""}
            onChange={(e) =>
              handleTemplateDataArrayElementChange(
                "type12Data",
                "mdaRecords",
                index,
                "slaRef",
                e.target.value
              )
            }
          />
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() =>
            handleRemoveArrayElement("type12Data", "mdaRecords", index)
          }
        >
          <Minus className="w-4 h-4 mr-2" />
          Remove MDA
        </Button>
      </div>
    </div>
  ))}

  {/* Add New MDA Button */}
  <div className="pt-2">
    <Button
      type="button"
      onClick={() =>
        handleAddArrayElement("type12Data", "mdaRecords", {
          NameOfMDA: "",
          titleOfRP: "",
          WebLinkPI: "",
          link2Sr: "",
          link2Sup: "",
          slaRef: "",
        })
      }
    >
      <Plus className="w-4 h-4 mr-2" />
      Add Another MDA
    </Button>
  </div>
</div>

               </div>
<div>
   <br /> <p>Backend Verification</p>        
  <Label>Provide backend verification evidence: </Label>
                        <Input
                                name="backEndVerf"
                                value={templateFormData.type12Data.backEndVerf || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type12Data")}
                                placeholder="Backend verification evidence link"
                                type="url"
                                required
                            />
</div>
    
        </div>

                    
      )}

      

    </>
  );
};

export default DLI5Form; 