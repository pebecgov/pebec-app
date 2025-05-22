// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploader from "@/components/file-uploader";
import { useToast } from "@/hooks/use-toast";
import { Id } from "@/convex/_generated/dataModel";
import Stepper, { Step } from "@/components/Stepper";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { mdasList } from "@/components/mdaList";
import RichTextEditor from "@/components/RichTextEditor";
import { ApiException } from "svix";
import { useRef } from "react";
import { useRouter } from "next/navigation";
const nigerianStates = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Federal Capital Territory"];
export default function UserTicketForm({
  guestMode = false
}: {
  guestMode?: boolean;
}) {
  const {
    user
  } = useUser();
  const createTicket = useMutation(api.tickets.createTicket);
  const [modalOpen, setModalOpen] = useState(false);
  const [ticketId, setTicketId] = useState<Id<"tickets"> | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const sendEmail = useAction(api.sendEmail.sendEmail);
  const adminUsers = useQuery(api.users.getAdmins);
  const adminEmails = adminUsers?.map(admin => admin.email) ?? [];
  const [currentStep, setCurrentStep] = useState(1);
  const userData = !guestMode ? useQuery(api.users.getUserDetails) : null;
  const getUsersWithRole = useQuery(api.users.getUsersWithRole, {
    role: "mda"
  }) || [];
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const codeInputsRef = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);
  const [codeError, setCodeError] = useState("");
  const router = useRouter();
  const existingMDAs = useQuery(api.users.getMDAs) || [];
  const sendVerificationCode = useAction(api.sendEmail.sendVerificationCode);
  const verifyEmailCode = useAction(api.sendEmail.verifyEmailCode);
  const handleSendVerificationCode = async () => {
    try {
      await sendVerificationCode({
        email: form.email
      });
      setVerificationCodeSent(true);
      toast({
        title: "Verification code sent to your email."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification code.",
        variant: "destructive"
      });
    }
  };
  const [form, setForm] = useState({
    fullName: guestMode ? "" : `${user?.firstName ?? ""} ${user?.lastName ?? ""}`,
    email: guestMode ? "" : user?.emailAddresses[0]?.emailAddress ?? "",
    phoneNumber: "",
    title: "",
    description: "",
    location: "",
    state: "",
    assignedMDA: "",
    incidentDate: "",
    supportingDocuments: [] as Id<"_storage">[],
    businessName: guestMode ? "" : userData?.businessName ?? "",
    emailVerified: false,
    verificationCode: ""
  });
  const emailCheckResult = useQuery(api.users.checkEmailExists, form.email && form.email.includes("@") ? {
    email: form.email
  } : "skip");
  useEffect(() => {
    if (userData && !guestMode) {
      setForm(prev => ({
        ...prev,
        fullName: prev.fullName || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`,
        email: prev.email || (user?.emailAddresses[0]?.emailAddress ?? ""),
        phoneNumber: prev.phoneNumber || (userData.phoneNumber ?? ""),
        state: prev.state || (userData.state ?? "")
      }));
    }
  }, [userData, user]);
  const handleVerifyCode = async () => {
    try {
      const result = await verifyEmailCode({
        email: form.email,
        code: form.verificationCode
      });
      if (result.verified) {
        setForm({
          ...form,
          emailVerified: true
        });
        setCodeError("");
        toast({
          title: "Email verified successfully."
        });
      } else {
        setCodeError("The code you entered is incorrect.");
      }
    } catch (error) {
      setCodeError("Verification failed. Please try again.");
      toast({
        title: "Error",
        description: "Verification failed.",
        variant: "destructive"
      });
    }
  };
  function isUserProfileComplete() {
    return form.phoneNumber && form.state;
  }
  function isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        const baseValid = form.fullName.trim() !== "" && form.email.trim() !== "" && form.phoneNumber.trim().length === 11 && form.state.trim() !== "";
        if (guestMode && !form.emailVerified) return false;
        return baseValid;
      case 2:
        return form.assignedMDA.trim() !== "" && form.incidentDate.trim() !== "" && !checkFutureDate(form.incidentDate);
      case 3:
        return form.title.trim() !== "" && form.description.trim() !== "";
      case 4:
        return true;
      default:
        return true;
    }
  }
  async function handleSubmit() {
    if (!isStepValid(currentStep)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive"
      });
      return;
    }
    try {
      toast({
        title: "Submitting...",
        description: "Please wait while we submit your ticket."
      });
      const {
        ticketId,
        ticketNumber
      } = await createTicket({
        title: form.title,
        description: form.description,
        assignedMDA: form.assignedMDA,
        incidentDate: new Date(form.incidentDate).getTime(),
        location: form.location,
        phoneNumber: form.phoneNumber,
        fullName: form.fullName,
        email: form.email,
        state: form.state,
        businessName: form.businessName,
        supportingDocuments: form.supportingDocuments
      });
      if (!ticketId || !ticketNumber) {
        throw new Error("❌ Failed to create ticket.");
      }
      setTicketId(ticketId);
      setTicketNumber(ticketNumber);
      if (adminEmails.length === 0) {
        throw new Error("❌ No admin emails found.");
      }
      console.log("📧 Sending email to user:", form.email);
      console.log("📧 Sending emails to admins:", adminEmails);
      const userEmailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        
        <!-- Header -->
        <div style="background-color: #4CAF50; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
          <strong>Your Report Has Been Created</strong>
        </div>
      
        <!-- Body -->
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Dear <strong>${form.fullName}</strong>,</p>
          <p>Your report has been successfully created. Below are the details:</p>
      
          <div style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; margin: 15px 0;">
            <p style="font-size: 16px; font-weight: bold;">Report Number: <span style="color: #4CAF50;">${ticketNumber}</span></p>
          </div>
      
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f8f8f8;">
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Subject:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${form.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${form.description}</td>
            </tr>
            <tr style="background-color: #f8f8f8;">
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${form.state} </td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Incident Date:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date(form.incidentDate).toLocaleDateString()}</td>
            </tr>
          </table>
      
          <p style="margin-top: 15px;">We will get back to you soon. You can track your report status in your dashboard.</p>
        </div>
      
        <!-- Footer -->
        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          <p>© PEBEC GOV | <a href="https://www.pebec.gov.ng" style="color: #4CAF50;">Visit Website</a></p>
        </div>
      </div>
      `;
      const assignedMDAUser = getUsersWithRole.find(user => user.mdaName === form.assignedMDA);
      const mdaEmail = assignedMDAUser?.email ?? null;
      if (mdaEmail) {
        console.log(`📧 Sending email to MDA: ${mdaEmail}`);
        const mdaEmailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #007bff; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
            <strong>New Report Assigned to Your MDA</strong>
          </div>
          <div style="padding: 20px; color: #333;">
            <p>A new report has been assigned to your MDA (${form.assignedMDA}).</p>
            <p><strong>Report Number:</strong> ${ticketNumber}</p>
            <p><strong>Title:</strong> ${form.title}</p>
            <p><strong>Description:</strong> ${form.description}</p>
            <p><strong>Location:</strong> ${form.state}</p>
            <p><strong>Incident Date:</strong> ${new Date(form.incidentDate).toLocaleDateString()}</p>
            <p>Please log in to your dashboard to manage this report.</p>
          </div>
          <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
            <p>© PEBEC GOV | <a href="https://pebec.gov.ng" style="color: #007bff;">MDA Dashboard</a></p>
          </div>
        </div>
        `;
        await sendEmail({
          to: mdaEmail,
          subject: `New Ticket Assigned to ${form.assignedMDA}`,
          html: mdaEmailTemplate
        });
      }
      await sendEmail({
        to: form.email,
        subject: `Your Ticket #${ticketNumber} Has Been Created`,
        html: userEmailTemplate
      });
      const adminEmailTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
  
  <!-- Header -->
  <div style="background-color: #FF9800; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
    <strong>New Report Created</strong>
  </div>

  <!-- Body -->
  <div style="padding: 20px; color: #333;">
    <p style="font-size: 16px;">A new report has been created. Below are the details:</p>

    <div style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; margin: 15px 0;">
      <p style="font-size: 16px; font-weight: bold;">Report Number: <span style="color: #FF9800;">${ticketNumber}</span></p>
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background-color: #f8f8f8;">
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Title:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${form.title}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${form.description}</td>
      </tr>
      <tr style="background-color: #f8f8f8;">
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reported By:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${form.fullName} (${form.email})</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${form.state}</td>
      </tr>
      <tr style="background-color: #f8f8f8;">
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Incident Date:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(form.incidentDate).toLocaleDateString()}</td>
      </tr>
    </table>

    <p style="margin-top: 15px;">Please review the ticket in your admin dashboard.</p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
    <p>© PEBEC GOV | <a href="https://www.pebec.gov.ng" style="color: #FF9800;">Admin Dashboard</a></p>
  </div>
</div>
`;
      await Promise.all(adminEmails.map(adminEmail => sendEmail({
        to: adminEmail,
        subject: `New Ticket Created - ${ticketNumber}`,
        html: adminEmailTemplate
      })));
      setModalOpen(true);
      toast({
        title: "Success",
        description: "Report submitted successfully. "
      });
    } catch (error) {
      console.error("❌ Error submitting report:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    }
  }
  function handleCloseDialog() {
    setCurrentStep(1);
    setModalOpen(false);
    setForm({
      fullName: guestMode ? "" : `${user?.firstName ?? ""} ${user?.lastName ?? ""}`,
      email: guestMode ? "" : user?.emailAddresses[0]?.emailAddress ?? "",
      phoneNumber: guestMode ? "" : userData?.phoneNumber || "",
      title: "",
      description: "",
      location: "",
      state: guestMode ? "" : userData?.state || "",
      assignedMDA: "",
      incidentDate: "",
      supportingDocuments: [],
      businessName: guestMode ? "" : userData?.businessName ?? "",
      emailVerified: false,
      verificationCode: ""
    });
  }
  const checkFutureDate = (date: string) => {
    const today = new Date();
    const incidentDate = new Date(date);
    return incidentDate > today;
  };
  useEffect(() => {
    if (guestMode && form.verificationCode.length === 6 && form.verificationCode.split("").every(char => /\d/.test(char)) && !form.emailVerified) {
      handleVerifyCode();
    }
  }, [form.verificationCode]);
  return <div className="max-w-5xl mx-auto w-full bg-white shadow-md rounded-md p-2">
  <h2 className="text-2xl font-bold text-center mb-4">Submit a Complaint</h2>
  <TooltipProvider> 

  {}
  <Stepper key={modalOpen ? "open" : "closed"} initialStep={1} onStepChange={step => {
        if (guestMode && currentStep === 1 && step > 1 && !form.emailVerified) {
          toast({
            title: "Email Not Verified",
            description: "Please verify your email before continuing.",
            variant: "destructive"
          });
          return;
        }
        setCurrentStep(step);
      }} onFinalStepCompleted={handleSubmit} backButtonText="Previous" nextButtonText={currentStep === 4 ? "Submit" : "Next"} isNextDisabled={!isStepValid(currentStep)}>

     {}
     <Step>

     {(!userData?.phoneNumber || !userData?.state) && !guestMode && <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded-md text-sm">
    <p><strong>Tip:</strong> If you fill out your profile, the personal info section will be automatically completed next time.</p>
  </div>}

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-700">Personal Info</h2>

              {guestMode && <div className="flex flex-col space-y-1">
    <Label className="font-semibold text-gray-700">Business Name</Label>
    <Input value={form.businessName} onChange={e => setForm({
                ...form,
                businessName: e.target.value
              })} />
  </div>}


              <div className="flex flex-col space-y-1">
                <Label className="font-semibold text-gray-700">Full Name</Label>
                <Input value={form.fullName} onChange={e => setForm({
                ...form,
                fullName: e.target.value
              })} />              </div>

            <div className="flex flex-col space-y-1">
  <Label className="font-semibold text-gray-700">Email Address</Label>
  <Input type="email" value={form.email} disabled={guestMode && form.emailVerified} onChange={e => setForm({
                ...form,
                email: e.target.value
              })} />

              {guestMode && emailCheckResult === true && <p className="text-red-600 text-sm mt-2">
    This email is already associated with an account.{" "}
    <button className="text-blue-600 underline ml-1" onClick={() => router.push("/sign-in")}>
      Sign in instead
    </button>
  </p>}


  {guestMode && !form.emailVerified && <div className="mt-2 space-y-3 transition-all">
 <Button variant="secondary" size="sm" onClick={handleSendVerificationCode} disabled={!form.email || !form.email.includes("@") || emailCheckResult === true}>
  Send Verification Code
                </Button>


      {verificationCodeSent && <div className="flex flex-col space-y-2">
     <div className="flex gap-2">
  {Array.from({
                      length: 6
                    }).map((_, i) => <Input key={i} type="text" inputMode="numeric" maxLength={1} className="w-12 h-12 text-center text-lg font-medium tracking-widest" value={form.verificationCode[i] || ""} onChange={e => {
                      const value = e.target.value.replace(/\D/g, "");
                      setCodeError("");
                      const updatedCode = form.verificationCode.split("");
                      updatedCode[i] = value;
                      const newCode = updatedCode.join("").slice(0, 6);
                      setForm({
                        ...form,
                        verificationCode: newCode
                      });
                      if (value && i < 5) {
                        codeInputsRef.current[i + 1]?.focus();
                      }
                      if (newCode.length === 6 && newCode.split("").every(char => /\d/.test(char))) {}
                    }} onKeyDown={e => {
                      if (e.key === "Backspace" && !form.verificationCode[i] && i > 0) {
                        codeInputsRef.current[i - 1]?.focus();
                      }
                    }} ref={el => {
                      codeInputsRef.current[i] = el;
                    }} />)}
                  </div>
                  <Button size="sm" variant="default" onClick={handleVerifyCode} disabled={form.verificationCode.length !== 6 || form.emailVerified}>
  Verify Code
                  </Button>
          {codeError && <p className="text-sm text-red-600 mt-2">{codeError}</p>}

        </div>}
    </div>}

  {guestMode && form.emailVerified && <div className="mt-2 flex items-center gap-2 text-green-600 text-sm font-medium">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
      Email verified successfully
    </div>}
            </div>



            <div className="flex flex-col space-y-1">
  <Label className="font-semibold text-gray-700">Phone Number</Label>
  <Input value={form.phoneNumber} maxLength={11} onChange={e => {
                const value = e.target.value.replace(/\D/g, "");
                setForm({
                  ...form,
                  phoneNumber: value
                });
                if (value.length !== 11) {
                  setPhoneError("Phone number must be exactly 11 digits.");
                } else {
                  setPhoneError("");
                }
              }} />
  {phoneError && <p className="text-red-600 text-sm mt-1">{phoneError}</p>}
            </div>

              <div className="flex flex-col space-y-1">
                <Label className="font-semibold text-gray-700">State</Label>
                <Select value={form.state} onValueChange={value => setForm({
                ...form,
                state: value
              })}>
                  <SelectTrigger>
                    <SelectValue>{form.state || "Select State"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {nigerianStates.map(state => <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {}
            </div>
          </Step>

                  {}
        <Step>
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-700">MDA Selection</h2>
              <div className="flex flex-col space-y-1">
  <Label className="font-semibold text-gray-700">Assigned MDA</Label>
  <Select value={form.assignedMDA} onValueChange={mda => setForm({
                ...form,
                assignedMDA: mda
              })}>
    <SelectTrigger>
      <SelectValue>{form.assignedMDA || "Select MDA"}</SelectValue>
    </SelectTrigger>
    <SelectContent>
  {Array.from(new Set((getUsersWithRole ?? []).map(mdaUser => mdaUser.mdaName).filter((name): name is string => !!name?.trim()))).map((mdaName, index) => <SelectItem key={index} value={mdaName}>
      {mdaName}
    </SelectItem>)}
                </SelectContent>

  </Select>
            </div>

              <div className="flex flex-col space-y-1">
                <Label className="font-semibold text-gray-700">Incident Date</Label>
                <Input type="date" value={form.incidentDate} onChange={e => {
                const selectedDate = e.target.value;
                if (checkFutureDate(selectedDate)) {
                  toast({
                    title: "Error",
                    description: "Incident date cannot be in the future.",
                    variant: "destructive"
                  });
                  return;
                }
                setForm({
                  ...form,
                  incidentDate: selectedDate
                });
              }} />
              </div>
            </div>
          </Step>

        {}
         {}
         <Step>
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-700">Report Details</h2>
              <div className="flex flex-col space-y-1">
                <Label className="font-semibold text-gray-700">Title</Label>
                <Input value={form.title} onChange={e => setForm({
                ...form,
                title: e.target.value
              })} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className="font-semibold text-gray-700">Description</Label>
                <RichTextEditor value={form.description} onChange={value => setForm({
                ...form,
                description: value
              })} />
              </div>
            </div>
          </Step>




    {}
    <Step>
      <div className="space-y-4 w-full max-w-lg mx-auto">
        <h2 className="text-lg font-bold text-gray-700">Upload Evidence</h2>

        <FileUploader setFileId={storageId => {
              setForm(prev => ({
                ...prev,
                supportingDocuments: [...prev.supportingDocuments, storageId as Id<"_storage">]
              }));
              toast({
                title: "Success",
                description: "File uploaded successfully!"
              });
            }} />

        {}
        {form.supportingDocuments.length > 0 && <div className="mt-4 text-center">
            <h3 className="text-sm font-medium text-gray-600">Uploaded Files:</h3>
            <ul className="text-gray-700 text-sm mt-2">
              {form.supportingDocuments.map((file, index) => <li key={index} className="mt-1">{file}</li>)}
            </ul>
          </div>}
      </div>
    </Step>
  </Stepper>


  

  <Dialog open={modalOpen} onOpenChange={open => {
        if (!open) handleCloseDialog();
      }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Report Submitted Successfully</DialogTitle>
    </DialogHeader>
    <p>Your report number is: <strong>{ticketNumber}</strong>. We will get back to you shortly. Please save your report number safely for your reference.</p>
    <DialogFooter>
      <Button onClick={handleCloseDialog}>Close</Button>
    </DialogFooter>
  </DialogContent>
      </Dialog>

  </TooltipProvider>
  </div>;
}