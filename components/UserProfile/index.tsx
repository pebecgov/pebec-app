// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { CameraIcon, KeyIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
export default function UserProfile() {
  const {
    user
  } = useUser();
  const {
    toast
  } = useToast();
  const {
    user: clerkUser,
    openUserProfile
  } = useClerk();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const userProfile = useQuery(api.users.getUserProfile, user ? {
    clerkUserId: user.id
  } : "skip");
  const getCurrentAccessCode = useMutation(api.users.generateMonthlyAccessCode);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    state: "",
    address: "",
    businessName: "",
    industry: "",
    jobTitle: ""
  });
  const [profileImage, setProfileImage] = useState(user?.imageUrl || "/default-avatar.png");
  const [showOtherIndustry, setShowOtherIndustry] = useState(false);
  const handleInternalAccessRequest = async () => {
    const code = prompt("Enter your internal access code:");
    if (!code) return;
    try {
      const currentCode = await getCurrentAccessCode({});
      if (code === currentCode) {
        sessionStorage.setItem("accessGranted", "true");
        router.push("/request-access");
      } else {
        toast({
          title: "Invalid Code",
          description: "The access code you entered is incorrect.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to verify access code.",
        variant: "destructive"
      });
    }
  };
  const statesOfNigeria = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Federal Capital Territory"];
  const industries = ["Technology", "Finance", "Healthcare", "Education", "Retail", "Manufacturing", "Real Estate", "Transportation", "Entertainment", "Other"];
  const role = userProfile?.role;
  const isUser = role === "user";
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  useEffect(() => {
    if (!userProfile || !user) return;
    setForm({
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      phoneNumber: userProfile.phoneNumber || "",
      state: userProfile.state || "",
      address: userProfile.address || "",
      businessName: userProfile.businessName || "",
      industry: userProfile.industry || "",
      jobTitle: userProfile.jobTitle || ""
    });
    setUsername(user.username || "");
    setShowOtherIndustry(userProfile.industry === "Other");
  }, [userProfile, user]);
  const handleUpdate = async () => {
    try {
      await updateUserProfile(form);
      if (clerkUser) {
        const updatedFields: any = {
          firstName: form.firstName,
          lastName: form.lastName
        };
        if (username !== user?.username) {
          updatedFields.username = username || undefined;
        }
        await clerkUser.update(updatedFields);
        if (updatedFields.username) {
          toast({
            title: "Username Updated",
            description: "Your username was successfully updated!"
          });
        } else {
          toast({
            title: "Profile Updated",
            description: "Your profile details were successfully updated!"
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.errors && err.errors.find((e: any) => e.code === 'uniqueness_failure')) {
        toast({
          title: "Username already taken",
          description: "Please choose a different username.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update profile.",
          variant: "destructive"
        });
      }
    }
  };
  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill all password fields.",
        variant: "destructive"
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }
    try {
      if (clerkUser) {
        await clerkUser.updatePassword({
          currentPassword: oldPassword,
          newPassword
        });
      }
      toast({
        title: "Password Updated",
        description: "Your password was changed successfully!"
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to change password.",
        variant: "destructive"
      });
    }
  };
  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      if (ev.target?.result) setProfileImage(ev.target.result as string);
      if (clerkUser) await clerkUser.setProfileImage({
        file
      });
    };
    reader.readAsDataURL(file);
  };
  if (!user || !userProfile) return <p className="text-center mt-10">Loading...</p>;
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 overflow-x-hidden">
      <div className="flex justify-end mb-4">
      {isUser && <div className="flex justify-end items-center mb-4">
    <Button variant="outline" onClick={() => setShowAccessPrompt(true)} className="border-dashed border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition">
      Are you an internal member? Request access now!
    </Button>
  </div>}

    </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10">
        {}
        <div className="flex justify-center -mt-16">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32">
            <img src={profileImage} className="w-full h-full rounded-full border-4 border-white shadow-md object-cover" alt="Profile" />
            <label className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow cursor-pointer">
              <CameraIcon className="w-5 h-5 text-gray-500" />
              <input type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" />
            </label>
          </div>
        </div>

        {}
        <div className="text-center mt-4">
          <h1 className="text-xl sm:text-2xl font-semibold">
            {form.firstName} {form.lastName}
          </h1>
          <p className="text-sm text-gray-500 break-words">
         Primary email address: {user.primaryEmailAddress?.emailAddress}
          </p>
            {}
  {user.emailAddresses?.filter(email => email.id !== user.primaryEmailAddress?.id).map(email => <p key={email.id} className="text-xs text-gray-400 italic">
        Secondary: {email.emailAddress}
      </p>)}
          <p className="text-sm text-gray-600 mt-1">
            <strong>Role:</strong> {role}
          </p>
          {role === "staff" && <p className="text-sm text-gray-600">
              <strong>Staff Stream:</strong> {userProfile.staffStream || "—"}
            </p>}
          {role === "mda" && <p className="text-sm text-gray-600">
              <strong>MDA:</strong> {userProfile.mdaName || "—"}
            </p>}
        </div>

        {}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div>
            <Label>First Name</Label>
            <Input className="w-full max-w-full" value={form.firstName} onChange={e => setForm({
            ...form,
            firstName: e.target.value
          })} />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input className="w-full max-w-full" value={form.lastName} onChange={e => setForm({
            ...form,
            lastName: e.target.value
          })} />
          </div>
          <div>
  <Label>Job Title</Label>
  <Input className="w-full max-w-full" value={form.jobTitle} onChange={e => setForm({
            ...form,
            jobTitle: e.target.value
          })} />
        </div>

          <div className="col-span-1 md:col-span-2">
            <Label>Phone Number</Label>
            <PhoneInput country={"ng"} value={form.phoneNumber} onChange={phone => setForm({
            ...form,
            phoneNumber: phone
          })} containerClass="!w-full" inputClass="!w-full !max-w-full" specialLabel="" inputStyle={{
            width: "100%"
          }} />
          </div>
          <div>
  <Label>State</Label>
  {role === "reform_champion" || role === "state_governor" || role === "deputies" ? <Input value={form.state} readOnly disabled className="w-full bg-gray-100 text-gray-700 cursor-not-allowed" /> : <Select value={form.state} onValueChange={value => setForm({
            ...form,
            state: value
          })}>
      <SelectTrigger className="w-full max-w-full">
        <SelectValue>{form.state || "Select State"}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-full max-w-full">
        {statesOfNigeria.map(state => <SelectItem key={state} value={state}>
            {state}
          </SelectItem>)}
      </SelectContent>
    </Select>}
        </div>

          <div>
            <Label>Address</Label>
            <Input className="w-full max-w-full" value={form.address} onChange={e => setForm({
            ...form,
            address: e.target.value
          })} />
          </div>

          {isUser && <>
              <div>
                <Label>Business Name</Label>
                <Input className="w-full max-w-full" value={form.businessName} onChange={e => setForm({
              ...form,
              businessName: e.target.value
            })} />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={val => {
              setShowOtherIndustry(val === "Other");
              setForm({
                ...form,
                industry: val
              });
            }}>
                  <SelectTrigger className="w-full max-w-full">
                    <SelectValue>{form.industry || "Select Industry"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full max-w-full">
                    {industries.map(ind => <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {showOtherIndustry && <Input className="mt-2 w-full max-w-full" placeholder="Specify Industry" value={form.industry} onChange={e => setForm({
              ...form,
              industry: e.target.value
            })} />}
              </div>
            </>}
        </div>

        {}
      <div className="mt-6">
  <Label>Username</Label>
  <Input className="w-full max-w-full" value={username} onChange={e => setUsername(e.target.value)} />
      </div>

      {}
      {user && user.externalAccounts.length === 0 && <div className="mt-6 space-y-4">
    <h2 className="text-lg font-semibold text-gray-700">Change Password</h2>
    <div>
      <Label>Old Password</Label>
      <Input type="password" className="w-full max-w-full" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
    </div>
    <div>
      <Label>New Password</Label>
      <Input type="password" className="w-full max-w-full" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
    </div>
    <div>
      <Label>Confirm New Password</Label>
      <Input type="password" className="w-full max-w-full" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
    </div>
    <Button onClick={handlePasswordChange} className="w-full bg-blue-600 text-white hover:bg-blue-700">
      Update Password
    </Button>
  </div>}


        {}
        <div className="mt-6 space-y-3">
          <Button onClick={handleUpdate} className="w-full bg-black text-white hover:bg-zinc-900">
            Update Profile
          </Button>
         
        </div>
      </div>

  


      <Toaster />
      {showAccessPrompt && <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
    <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">
        Enter Internal Access Code
      </h2>
      <Input placeholder="Enter access code" onKeyDown={e => {
          if (e.key === "Enter") {
            const value = (e.target as HTMLInputElement).value;
            getCurrentAccessCode({}).then(currentCode => {
              if (value === currentCode) {
                sessionStorage.setItem("accessGranted", "true");
                setShowAccessPrompt(false);
                router.push("/request-access");
              } else {
                toast({
                  title: "Invalid Code",
                  description: "The access code you entered is incorrect.",
                  variant: "destructive"
                });
              }
            }).catch(() => {
              toast({
                title: "Error",
                description: "Unable to validate code at the moment.",
                variant: "destructive"
              });
            });
          }
        }} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setShowAccessPrompt(false)}>
          Cancel
        </Button>
        <Button onClick={async () => {
            const input = document.querySelector<HTMLInputElement>("input[placeholder='Enter access code']");
            const value = input?.value?.trim();
            if (!value) return;
            try {
              const currentCode = await getCurrentAccessCode({});
              if (value === currentCode) {
                sessionStorage.setItem("accessGranted", "true");
                setShowAccessPrompt(false);
                router.push("/request-access");
              } else {
                toast({
                  title: "Invalid Code",
                  description: "The access code you entered is incorrect.",
                  variant: "destructive"
                });
              }
            } catch (error) {
              toast({
                title: "Error",
                description: "Unable to validate code at the moment.",
                variant: "destructive"
              });
            }
          }}>
  Proceed to form
          </Button>

      </div>
    </div>
  </div>}
    </div>;
}