// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import FileUploader from "../file-uploader";
import MultiFileUploader from "../multi-file-uploader";
import { useToast } from "@/hooks/use-toast";
interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}
export default function SendLetterModal({
  open,
  setOpen
}: Props) {
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [letterFileId, setLetterFileId] = useState<string | null>(null);
  const [supportingFileIds, setSupportingFileIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createLetter = useMutation(api.business_letters.createBusinessLetter);
   const sendEmail = useAction(api.sendEmail.sendEmail);
  const {
    toast
  } = useToast();
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Please enter a title.";
    if (!companyName.trim()) newErrors.companyName = "Please enter a company name.";
    if (!contactName.trim()) newErrors.contactName = "Please enter a contact name.";
    if (!email.trim()) newErrors.email = "Please enter an email address.";
    if (!phone.trim()) newErrors.phone = "Please enter a phone number.";
    if (!letterFileId) newErrors.letter = "Please upload the main letter file.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
        const submissionDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    });
      const autoReply = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
        <p style="text-align: right;">${submissionDate}</p>
        <p>
          ${contactName}<br/>
          ${companyName}
        </p>
        <p><strong>RE: ${title}</strong></p>
        <p>
          On behalf of the Presidential Enabling Business Environment Council (PEBEC), I acknowledge receipt of your letter dated <strong>${submissionDate}</strong>, highlighting <strong>${title}</strong>.
        </p>
        <p>
          <strong>PEBEC</strong> was established with a dual mandate to remove bureaucratic and legislative constraints to doing business and to improve the perception of Nigeria’s business climate.
        </p>
        <p>
          We understand the urgency of this matter and will keep you informed of any developments. If <strong>${companyName}</strong> wishes to make further inquiries or provide additional input, please send an email to <a href="mailto:infor@pebec.gov.ng">infor@pebec.gov.ng</a> or call 08075079164.
        </p>
        <p>Please accept the assurance of my best regards.</p>
        <p><strong>For: Presidential Enabling Business Environment Council (PEBEC)</strong></p>
      </div>
    `;
    await sendEmail({
        to: email,
      subject: `Acknowledgement of Your Letter - ${title}`,
      html: autoReply
      });
      await createLetter({
        title,
        companyName,
        contactName,
        email,
        phone,
        letterFileId: letterFileId as Id<"_storage">,
        supportingFileIds: supportingFileIds as Id<"_storage">[]
      });
      toast({
        title: "Letter Submitted",
        description: "Your letter has been successfully submitted."
      });
      setOpen(false);
      setTitle("");
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setLetterFileId(null);
      setSupportingFileIds([]);
      setErrors({});
    } catch (err) {
      console.error(err);
      toast({
        title: "Submission Failed",
        description: "An error occurred while submitting your letter.",
        variant: "destructive"
      });
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            📨 Submit a Letter to PEBEC
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 text-sm">
          <div>
            <Input placeholder="Subject (Letter Title)" value={title} onChange={e => setTitle(e.target.value)} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <Input placeholder="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
          </div>

          <div>
            <Input placeholder="Contact Person's Name" value={contactName} onChange={e => setContactName(e.target.value)} />
            {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>}
          </div>

          <div>
            <Input placeholder="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <Input placeholder="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div className="border rounded-md p-4">
            <h4 className="text-sm font-medium mb-2">Upload Letter (PDF)</h4>
            <FileUploader setFileId={id => setLetterFileId(id)} />
            {errors.letter && <p className="text-red-500 text-xs mt-2">{errors.letter}</p>}
          </div>

          <div className="border rounded-md p-4">
            <h4 className="text-sm font-medium mb-2">
              Upload Supporting Documents{" "}
              <span className="text-xs text-muted-foreground">
                (Optional – Max: 6 files, 15MB total)
              </span>
            </h4>
            <MultiFileUploader setFileIds={setSupportingFileIds} />
          </div>

          <Button onClick={handleSubmit} className="w-full mt-2 bg-black text-white hover:bg-zinc-800">
            Submit Letter
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}