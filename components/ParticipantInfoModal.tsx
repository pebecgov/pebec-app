"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HOLDING_MESSAGE = `Thank you for registering your interest in the Existing Foreign Direct Investors Roundtable.
Participation is being reviewed in line with the specific focus of this engagement.
Our team will review your submission and contact you regarding suitable engagement opportunities.`;

const FOREIGN_QUESTION =
  "To help us align participation with the focus of this investor engagement, please indicate whether your organisation currently has foreign ownership, a foreign parent company, or active foreign equity participation.";

const HELPER_TEXT =
  "Information provided may be reviewed as part of the confirmation process.";

export type ParticipantPrefill = {
  firstName: string;
  lastName: string;
  organization: string;
  designation: string;
  email: string;
  phone: string;
};

type ParticipantInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: Id<"events">;
  onEligible: (prefill: ParticipantPrefill) => void;
  onPendingReview: () => void;
};

export function ParticipantInfoModal({
  open,
  onOpenChange,
  eventId,
  onEligible,
  onPendingReview,
}: ParticipantInfoModalProps) {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [foreignAnswer, setForeignAnswer] = useState<"yes" | "no" | "not_sure" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"form" | "holding">("form");

  const submitEligibility = useMutation(api.events.submitEligibilityForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !companyName.trim() || !email.trim() || !phone.trim() || !foreignAnswer) {
      return;
    }
    setSubmitting(true);
    try {
      const { status } = await submitEligibility({
        eventId,
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        foreignOwnershipAnswer: foreignAnswer as "yes" | "no" | "not_sure",
      });
      if (status === "eligible") {
        const parts = fullName.trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ") ?? "";
        onEligible({
          firstName,
          lastName,
          organization: companyName.trim(),
          designation: jobTitle.trim(),
          email: email.trim(),
          phone: phone.trim(),
        });
        onOpenChange(false);
      } else {
        setView("holding");
        onPendingReview();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && view === "holding") {
      setView("form");
      setFullName("");
      setCompanyName("");
      setJobTitle("");
      setEmail("");
      setPhone("");
      setForeignAnswer("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {view === "holding" ? (
          <>
            <DialogHeader>
              <DialogTitle>Thank you</DialogTitle>
            </DialogHeader>
            <div className="whitespace-pre-line text-sm text-gray-700 pt-2">
              {HOLDING_MESSAGE}
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" onClick={() => handleClose(false)}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Participant Information</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Section 1 — Basic details
                </p>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="rounded border-gray-300 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Business / Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company or institution"
                    required
                    className="rounded border-gray-300 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title / Role (optional)</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Your position or role"
                    className="rounded border-gray-300 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Official Company Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="company@example.com"
                    required
                    className="rounded border-gray-300 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    required
                    className="rounded border-gray-300 bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Section 2 — Organisation information
                </p>
                <p className="text-sm text-gray-800">{FOREIGN_QUESTION}</p>
                <div className="space-y-2">
                  {(["Yes", "No", "Not sure"] as const).map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="foreignOwnership"
                        value={opt.toLowerCase().replace(" ", "_")}
                        checked={
                          foreignAnswer ===
                          (opt === "Not sure" ? "not_sure" : opt.toLowerCase())
                        }
                        onChange={() =>
                          setForeignAnswer(
                            opt === "Not sure" ? "not_sure" : opt.toLowerCase()
                          )
                        }
                        className="w-4 h-4 text-green-600"
                        required
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500">{HELPER_TEXT}</p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? "Submitting…" : "Register / Continue"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
