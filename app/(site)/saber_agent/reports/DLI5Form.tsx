import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import type { Type7Data } from "./page"; 

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
          <h4 className="text-lg font-medium">Grievance Redress Mechanism (GRM) Report<br /></h4>
                  
           
             <div className="space-y-2">
               <h5 className="font-medium">GRM Structure</h5>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-4">
                                Each of the two key BEE MDAs has an established and operational GRM, equipped to capture essential grievance
                                 details through a manual and/or online register. This includes, at a minimum:<br />
                                • Name of complainant <br />
                                • Contact information <br />
                                • Date grievance was received <br />
                                • Description of the issue <br />
                                • Date of response and/or acknowledgement by the MDA

                            </p>
                        </div>
                  <p>GRM System</p>
              <Label>Do you have a Grievance Redress Mechanism? </Label>
                            <select
  name="grevianceMechSelect"
  value={templateFormData.type7Data.grevianceMechSelect || ""}
  onChange={(e) => handleTemplateDataStringChange(e, "type7Data")}
  required
  className="border rounded px-3 py-2 w-full"
>
  <option value="">Select an option</option>
  <option value="Yes">Yes</option>
  <option value="No">No</option>
</select>
                        </div>
  <div>
                     <Label> If Yes provide the link</Label>
                        <Input
                                name="grievianvceMechanismLink"
                                value={templateFormData.type7Data.grievianvceMechanismLink || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type7Data")}
                                placeholder="Provide link"
                                type="url"
                                required
                            />
 </div>
            
<div className="space-y-2">
<Label>For 2024 (Year 2): Provide link to GRM Report here: </Label>
<p className="text-sm text-gray-500">At least 50% of received grievances were resolved within the SLA timeline.</p>

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
<p className="text-sm text-gray-500">At least 75% of received grievances were resolved within the SLA timeline.</p>

                        <Input
                                name="year2025Link"
                                value={templateFormData.type7Data.year2025Link || ""}
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
          <h4 className="text-lg font-medium">Publication of Business Regulatory Processes by 5 BEE State MDAs<br /></h4>
    
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
              <p>Online Publication Verification  (for all 5 BEE MDAs)</p>
             
                            
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
          <Label>Web link to the above Regulatory Process</Label>
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
          <Label>SLA References (if any) and Timeline Commitments to the above regulatory process </Label>
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

        <div>
          <Label>Date of Publication:</Label>
          <Input
            type="date"
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

    
        </div>

                    
      )}

      {/* Type 14 Form Fields */}
      {templateFormData.reportType === "type14" && templateFormData.type14Data && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium">Monthly Compliance Report By 5 MDAs For Each Regulatory Process<br /></h4>
                  
           
             <div className="space-y-2">
                                
                
              <Label>Does each MDA have a Monthly Compliance Report? </Label>
                            <select
  name="monthlyComplianceSelect"
  value={templateFormData.type14Data.monthlyComplianceSelect || ""}
  onChange={(e) => handleTemplateDataStringChange(e, "type14Data")}
  required
  className="border rounded px-3 py-2 w-full"
>
  <option value="">Select an option</option>
  <option value="Yes">Yes</option>
  <option value="No">No</option>
</select>
                        </div>
  <div className="space-y-2">
                                
                
              <Label>Does the Compliance Report have information like Business name, address, email, and phone number,  
                Service Requested, Date of Request, Action Status, Acknowledgement and Closing Date, e.t.c.? </Label>
                            <select
  name="infoSelect"
  value={templateFormData.type14Data.infoSelect || ""}
  onChange={(e) => handleTemplateDataStringChange(e, "type14Data")}
  required
  className="border rounded px-3 py-2 w-full"
>
  <option value="">Select an option</option>
  <option value="Yes">Yes</option>
  <option value="No">No</option>
</select>
                        </div>

<div className="space-y-2">
                                
                
              <Label>Has the Monthly Compliance Report been published on the state website or MDA website? </Label>
                            <select
  name="reportPublishedSelect"
  value={templateFormData.type14Data.reportPublishedSelect || ""}
  onChange={(e) => handleTemplateDataStringChange(e, "type14Data")}
  required
  className="border rounded px-3 py-2 w-full"
>
  <option value="">Select an option</option>
  <option value="Yes">Yes</option>
  <option value="No">No</option>
</select>
                        </div>
            
<div className="space-y-2">
  <Label>Select compliance report month</Label>
  <select
    name="monthlyComplianceMonth"
    value={templateFormData.type14Data.monthlyComplianceMonth || ""}
    onChange={(e) => handleTemplateDataStringChange(e, "type14Data")}
    required
    className="border rounded px-3 py-2 w-full"
  >
    <option value="">Select month</option>
    {months.map((month) => (
      <option key={month} value={month}>{month}</option>
    ))}
  </select>
<Label>Insert link to Monthly Compliance Report: </Label>

                        <Input
                                name="monthlyComplianceLink"
                                value={templateFormData.type14Data.monthlyComplianceLink || ""}
                                onChange={(e) => handleTemplateDataStringChange(e, "type14Data")}
                                placeholder="Provide link"
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