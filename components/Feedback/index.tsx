"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function FeedbackForm() {
  const { user } = useUser();
  const sendEmail = useAction(api.sendEmail.sendEmail);
  const adminUsers = useQuery(api.users.getAdmins);
  const adminEmails = adminUsers?.map((admin) => admin.email) ?? [];
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // ✅ Prefill name & email from logged-in user
  const [form, setForm] = useState({
    fullName: user ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}` : "",
    email: user?.emailAddresses[0]?.emailAddress ?? "",
    message: "",
  });

  // ✅ Validate Form
  function isFormValid() {
    return form.fullName.trim() !== "" && form.email.trim() !== "" && form.message.trim() !== "";
  }

  // ✅ Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isFormValid()) {
      toast({
        title: "Error",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (adminEmails.length === 0) {
      toast({
        title: "Error",
        description: "No admin emails found. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      toast({
        title: "Submitting...",
        description: "Please wait while we send your feedback.",
      });

      // ✅ Step 1: Format Email Content
      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          
          <!-- Header -->
          <div style="background-color: #007bff; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
            <strong>New Feedback Received</strong>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px;">You have received a new feedback message.</p>
        
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr style="background-color: #f8f8f8;">
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Full Name:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${form.fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${form.email}</td>
              </tr>
              <tr style="background-color: #f8f8f8;">
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Message:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${form.message}</td>
              </tr>
            </table>

            <p style="margin-top: 15px;">Please review and respond as necessary.</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
            <p>© 2024 PEBEC GOV | <a href="https://www.pebecgov.com" style="color: #007bff;">Visit Website</a></p>
            <p>Need assistance? <a href="mailto:support@pebecgov.com" style="color: #007bff;">Contact Support</a></p>
          </div>
        </div>
      `;

      // ✅ Step 2: Send Email to All Admins
      await Promise.all(
        adminEmails.map((adminEmail) =>
          sendEmail({
            to: adminEmail,
            subject: "New Feedback Received",
            html: emailTemplate,
          })
        )
      );

      setModalOpen(true);
      toast({ title: "Success", description: "Your feedback has been sent!" });

    } catch (error) {
      console.error("❌ Error sending feedback:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to send feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCloseDialog() {
    setModalOpen(false);
    setForm({
      fullName: user ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}` : "",
      email: user?.emailAddresses[0]?.emailAddress ?? "",
      message: "",
    });
  }

  return (
    <div className="max-w-lg mx-auto bg-white shadow-md rounded-md p-6">
      {/* ✅ Proper HTML Structure Fix */}
      <h2 className="text-2xl font-bold text-center mb-4">Share Your Feedback</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="font-semibold text-gray-700">Full Name</Label>
          <Input
  value={form.fullName}
  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
/>           </div>

        <div>
          <Label className="font-semibold text-gray-700">Email Address</Label>
          <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />        </div>

        <div>
          <Label className="font-semibold text-gray-700">Your Message</Label>
          <Textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
            className="resize-none min-h-[120px] w-full"
          />
        </div>

        <Button type="submit" className="w-full bg-green-600 text-white" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </form>



      {/* ✅ Success Dialog */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback Submitted</DialogTitle>
          </DialogHeader>
          <p>Your feedback has been sent successfully.</p>
          <DialogFooter>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
