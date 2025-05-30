// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUploader from "@/components/file-uploader";
import { X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
const ROLES_WITH_STATE_SELECTION = ["reform_champion", "deputies", "magistrates", "state_governor"];
const ALLOWED_ROLES = ["admin", "staff", "mda", "reform_champion", "deputies", "magistrates", "state_governor"];
const staffStreams = ["regulatory", "innovation", "judiciary", "communications", "investments", "receptionist", "account", "auditor", "sub_national"];
export default function SubmitLetterForm({
  onClose
}: {
  onClose?: () => void;
}) {
  const submitLetter = useMutation(api.letters.submitLetter);
  const users = useQuery(api.users.getUsers) || [];
  const mdas = useQuery(api.users.getMDAs) || [];
  const [letterName, setLetterName] = useState("");
  const [fileId, setFileId] = useState<Id<"_storage"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedMda, setSelectedMda] = useState<Id<"mdas"> | "">("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);
  const states = Array.from(new Set(users.map(u => u.state).filter(Boolean)));
  const filteredUsers = users.filter(u => {
    if (!selectedRole) return false;
    if (selectedRole === "staff") {
      return u.role === "staff" && u.staffStream === selectedStream;
    }
    if (selectedRole === "mda") {
      return u.role === "mda" && u.mdaId === selectedMda;
    }
    if (ROLES_WITH_STATE_SELECTION.includes(selectedRole)) {
      return u.role === selectedRole && u.state === selectedState;
    }
    if (selectedRole === "admin") {
      return ["admin", "president", "vice_president"].includes(u.role ?? "");
    }
    return u.role === selectedRole;
  });
  const selectedUserDetails = users.find(u => u._id === selectedUser);
  const handleSubmit = async () => {
    if (!letterName.trim() || !fileId || !selectedUser) {
      toast.error("Please complete all fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitLetter({
        letterName,
        letterUploadId: fileId,
        sentTo: selectedUser
      });
      toast.success("✅ Letter Sent Successfully!");
      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error("❌ Failed to submit letter.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="fixed inset-0 overflow-auto flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4">Send Letter</h2>

        <Input placeholder="Letter Title" value={letterName} onChange={e => setLetterName(e.target.value)} className="mb-3" />

        <select value={selectedRole} onChange={e => {
        setSelectedRole(e.target.value);
        setSelectedStream("");
        setSelectedMda("");
        setSelectedState("");
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
          <option value="">Select Department (Role)</option>
          {ALLOWED_ROLES.map(role => <option key={role} value={role}>
              {role.replace("_", " ").toUpperCase()}
            </option>)}
        </select>

        {selectedRole === "staff" && <select value={selectedStream} onChange={e => {
        setSelectedStream(e.target.value);
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
            <option value="">Select Staff Stream</option>
            {staffStreams.map(stream => <option key={stream} value={stream}>
                {stream}
              </option>)}
          </select>}

        {selectedRole === "mda" && <select value={selectedMda} onChange={e => {
        setSelectedMda(e.target.value as Id<"mdas">);
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
            <option value="">Select MDA</option>
            {mdas.map(mda => <option key={mda._id} value={mda._id}>
                {mda.name}
              </option>)}
          </select>}

        {ROLES_WITH_STATE_SELECTION.includes(selectedRole) && <select value={selectedState} onChange={e => {
        setSelectedState(e.target.value);
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
            <option value="">Select State</option>
            {states.map(state => <option key={state} value={state}>
                {state}
              </option>)}
          </select>}

      {filteredUsers.length > 0 && <select value={selectedUser ?? ""} onChange={e => setSelectedUser(e.target.value as Id<"users">)} className="w-full border rounded-md p-2 mb-3">
    <option value="">Select User</option>
    {filteredUsers.map(user => <option key={user._id} value={user._id}>
        {user.firstName} {user.lastName}
        {user.jobTitle ? ` (${user.jobTitle})` : ""} - {user.staffStream || user.mdaName || user.role}
      </option>)}
  </select>}


        {selectedUserDetails && <div className="flex items-center gap-3 border p-3 rounded-lg bg-gray-50 mb-4">
            <Image src={selectedUserDetails.imageUrl || "/default-avatar.png"} alt="User" width={36} height={36} className="rounded-full object-cover" />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedUserDetails.firstName} {selectedUserDetails.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {selectedUserDetails.jobTitle ? `${selectedUserDetails.jobTitle}, ` : ""}
                {selectedUserDetails.staffStream || selectedUserDetails.mdaName || selectedUserDetails.role}
              </p>
            </div>
          </div>}

        <div className="mb-4">
          <label className="font-semibold text-sm mb-2 block">
            Upload Supporting Document
          </label>
          <FileUploader setFileId={id => setFileId(id as Id<"_storage">)} />
        </div>

        <Button onClick={handleSubmit} className="w-full bg-green-700 hover:bg-green-800 text-white" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Letter"}
        </Button>
      </div>
    </div>;
}