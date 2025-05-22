// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud } from "lucide-react";
import { useUserRole } from "@/lib/useUserRole";
import { useRouter } from "next/router";
export default function TicketForm() {
  const createTicket = useMutation(api.tickets.createTicket);
  const [loading, setLoading] = useState(false);
  const role = useUserRole();
  const router = useRouter();
  useEffect(() => {
    if (role && role !== "admin") {
      router.replace("/");
    }
  }, [role, router]);
  if (!role) return <p>Loading...</p>;
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedMDA: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    incidentDate: "",
    location: "",
    supportingDocuments: [] as File[]
  });
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createTicket({
        ...form,
        incidentDate: new Date(form.incidentDate).getTime(),
        supportingDocuments: []
      });
      toast.success("Ticket submitted successfully!");
      setForm({
        title: "",
        description: "",
        assignedMDA: "",
        fullName: "",
        email: "",
        phoneNumber: "",
        incidentDate: "",
        location: "",
        supportingDocuments: []
      });
    } catch (error) {
      toast.error("Failed to submit ticket.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  return <form className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md space-y-6" onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold text-gray-900">Report a Problem</h2>
      <p className="text-gray-500">Fill out the form below to submit a complaint or feedback.</p>

      {}
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" type="text" placeholder="Enter your full name" required value={form.fullName} onChange={e => setForm({
        ...form,
        fullName: e.target.value
      })} />
      </div>

      {}
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" placeholder="Enter your email" required value={form.email} onChange={e => setForm({
        ...form,
        email: e.target.value
      })} />
      </div>

      {}
      <div>
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input id="phoneNumber" type="tel" placeholder="Enter your phone number" required value={form.phoneNumber} onChange={e => setForm({
        ...form,
        phoneNumber: e.target.value
      })} />
      </div>

      {}
      <div>
        <Label htmlFor="incidentDate">Date of Incident</Label>
        <Input id="incidentDate" type="date" required value={form.incidentDate} onChange={e => setForm({
        ...form,
        incidentDate: e.target.value
      })} />
      </div>

      {}
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" type="text" placeholder="Enter location of the incident" required value={form.location} onChange={e => setForm({
        ...form,
        location: e.target.value
      })} />
      </div>

      {}
      <div>
        <Label htmlFor="assignedMDA">Select MDA (Ministry, Department, or Agency)</Label>
        <Select onValueChange={value => setForm({
        ...form,
        assignedMDA: value
      })} required>
          <SelectTrigger>
            <SelectValue placeholder="Select an MDA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Nigerian Police Force">Nigerian Police Force</SelectItem>
            <SelectItem value="Federal Road Safety Corps">Federal Road Safety Corps</SelectItem>
            <SelectItem value="National Identity Management Commission">National Identity Management Commission</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {}
      <div>
        <Label htmlFor="title">Complaint Title</Label>
        <Input id="title" type="text" placeholder="Short title for your complaint" required value={form.title} onChange={e => setForm({
        ...form,
        title: e.target.value
      })} />
      </div>

      {}
      <div>
        <Label htmlFor="description">Complaint Description</Label>
        <Textarea id="description" placeholder="Describe your issue in detail" required value={form.description} onChange={e => setForm({
        ...form,
        description: e.target.value
      })} />
      </div>

      {}
      <div>
        <Label htmlFor="fileUpload">Upload Supporting Documents (Optional)</Label>
        <div className="flex items-center gap-3">
          <Input id="fileUpload" type="file" multiple accept="image/*,application/pdf" onChange={e => setForm({
          ...form,
          supportingDocuments: Array.from(e.target.files || [])
        })} />
          <Button variant="outline">
            <UploadCloud className="w-5 h-5 mr-2" /> Upload
          </Button>
        </div>
        {form.supportingDocuments.length > 0 && <p className="text-sm text-gray-500 mt-2">
            {form.supportingDocuments.length} file(s) selected.
          </p>}
      </div>

      {}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Submit Ticket"}
      </Button>
    </form>;
}