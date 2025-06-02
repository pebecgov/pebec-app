// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { mdasList } from "../mdaList";
import { useClerk } from "@clerk/nextjs";
import { UserIcon, BriefcaseIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { toast, Toaster } from "sonner";
const statesOfNigeria = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"];
type AllowedRoles = "mda" | "staff" | "reform_champion" | "deputies" | "magistrates" | "state_governor" | "saber_agent";
export default function InternalRoleRequestForm({
  user
}: {
  user: any;
}) {
  const requestInternalRole = useMutation(api.users.requestInternalRole);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const {
    user: clerkUser
  } = useClerk();
  const [form, setForm] = useState({
    requestedRole: "mda" as AllowedRoles,
    mdaId: "",
    firstName: "",
    lastName: "",
    jobTitle: "",
    state: "",
    address: "",
    phoneNumber: ""
  });
  const rolesList: {
    value: AllowedRoles;
    label: string;
  }[] = [{
    value: "mda",
    label: "Ministries, Departments & Agencies (MDA)"
  }, {
    value: "reform_champion",
    label: "Reform Champion"
  }, {
    value: "saber_agent",
    label: "Saber"
  }, {
    value: "deputies",
    label: "Sherrif"
  }, {
    value: "magistrates",
    label: "Magistrate"
  }, {
    value: "state_governor",
    label: "State Governor"
  }];
  const userProfile = useQuery(api.users.getUserProfile, user?.clerkUserId ? {
    clerkUserId: user.clerkUserId
  } : "skip");
  useEffect(() => {
    if (!userProfile) return;
    setForm(prev => ({
      ...prev,
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      jobTitle: userProfile.jobTitle || "",
      state: userProfile.state || "",
      address: userProfile.address || "",
      phoneNumber: userProfile.phoneNumber || ""
    }));
  }, [userProfile]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  if (user?.role && user?.role !== "user") {
    return <p className="text-center text-xl py-10 font-semibold">
        You are already assigned as "{user.role}" role.
      </p>;
  }
  if (user?.roleRequest?.status === "pending") {
    return <p className="text-yellow-500 font-semibold text-center py-10">
        Your request is pending admin approval.
      </p>;
  }
  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.jobTitle || !form.address || !form.phoneNumber || !form.requestedRole || ["mda", "reform_champion"].includes(form.requestedRole) && !form.mdaId || !form.state) {
      return toast.error("Please fill all the fields.");
    }
    setLoading(true);
    setError("");
    try {
      await updateUserProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        state: form.state,
        address: form.address,
        jobTitle: form.jobTitle
      });
      if (clerkUser) {
        await clerkUser.update({
          firstName: form.firstName,
          lastName: form.lastName
        });
      }
      await requestInternalRole({
        requestedRole: form.requestedRole,
        mdaName: form.mdaId,
        firstName: form.firstName,
        lastName: form.lastName,
        jobTitle: form.jobTitle,
        state: form.state,
        address: form.address,
        phoneNumber: form.phoneNumber
      });
      setSubmitted(true);
      toast.success("Request submitted successfully!");
      setTimeout(() => {
        setForm({
          requestedRole: "mda",
          mdaId: "",
          firstName: "",
          lastName: "",
          jobTitle: "",
          state: "",
          address: "",
          phoneNumber: ""
        });
      }, 0);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return <div className="flex flex-col md:flex-row  bg-[#0A0E27] text-gray-900 px-4 py-10 items-center justify-center gap-10">
  
      {}
      <div className="w-full md:w-1/2 flex items-center justify-center">

        <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-2xl shadow-lg space-y-6">
        {submitted && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 text-sm flex items-center gap-2">
    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-9.707a1 1 0 00-1.414 0L7 10.586 6.293 9.879a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414 0L11.707 9.88a1 1 0 000-1.414z" clipRule="evenodd" />
    </svg>
    Request submitted successfully! An admin will look into it and you'll be notified once your account has been approved.
  </div>}


          <h2 className="text-3xl font-bold mb-2 text-center">Request Internal Access</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
           Fill out the below form and an admin will approve your account once all details have been verified.  
          </p>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <UserIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <Input className="pl-10" placeholder="First Name" value={form.firstName} onChange={e => setForm({
              ...form,
              firstName: e.target.value
            })} />
            </div>
            <div className="relative">
              <UserIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <Input className="pl-10" placeholder="Last Name" value={form.lastName} onChange={e => setForm({
              ...form,
              lastName: e.target.value
            })} />
            </div>
          </div>
  
          <div className="space-y-4">
            <div className="relative">
              <BriefcaseIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <Input className="pl-10" placeholder="Job Title" value={form.jobTitle} onChange={e => setForm({
              ...form,
              jobTitle: e.target.value
            })} />
            </div>
  
            <div className="relative">
              <MapPinIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <Input className="pl-10" placeholder="Address" value={form.address} onChange={e => setForm({
              ...form,
              address: e.target.value
            })} />
            </div>
  
            <div className="relative">
              <PhoneIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <Input className="pl-10" placeholder="Phone Number" value={form.phoneNumber} onChange={e => setForm({
              ...form,
              phoneNumber: e.target.value
            })} />
            </div>
  
            <div>
              <Label className="text-sm mb-1 block text-gray-700">Role</Label>
              <Select value={form.requestedRole} onValueChange={value => setForm({
              ...form,
              requestedRole: value as AllowedRoles
            })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                {[{
                  value: "mda",
                  label: "Ministries, Departments & Agencies (MDA) - ReportGov Agent"
                }, {
                  value: "reform_champion",
                  label: "Reform Champion"
                }, {
                  value: "saber_agent",
                  label: "Saber"
                }, {
                  value: "deputies",
                  label: "Sherrif"
                }, {
                  value: "magistrates",
                  label: "Magistrate"
                }, {
                  value: "state_governor",
                  label: "State Governor"
                }].map(role => <SelectItem key={role.value} value={role.value}>
    {role.label}
  </SelectItem>)}

                </SelectContent>
              </Select>
            </div>
  
            {["mda", "reform_champion"].includes(form.requestedRole) && <div>
                <Label className="text-sm mb-1 block text-gray-700">Select MDA</Label>
                <Select value={form.mdaId} onValueChange={value => setForm({
              ...form,
              mdaId: value
            })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select MDA" />
                  </SelectTrigger>
                  <SelectContent>
                  {mdasList.map(mda => <SelectItem key={mda.name} value={`${mda.abbreviation} - ${mda.name}`}>
    {mda.abbreviation} - {mda.name}
  </SelectItem>)}

                  </SelectContent>
                </Select>
              </div>}
  
            <div>
              <Label className="text-sm mb-1 block text-gray-700">State</Label>
              <Select value={form.state} onValueChange={value => setForm({
              ...form,
              state: value
            })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {statesOfNigeria.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
  
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
  
            <Button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-medium mt-2">
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
          <Toaster className="mb-40" />

        </div>

      </div>
  
      {}
      <div className="hidden md:flex md:w-1/2 items-center justify-center">
        <img src="/images/access_request.svg" alt="Request Access" className="max-w-[800px] object-contain" />
      </div>
    </div>;
}