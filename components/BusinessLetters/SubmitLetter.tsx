// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
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