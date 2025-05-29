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
export default function SubmitLetterForm({
  onClose
}: {
  onClose?: () => void;
}) {
  const submitLetter = useMutation(api.letters.submitLetter);
  const users = useQuery(api.users.getAllAdminsAndStaff) || [];
  const [letterName, setLetterName] = useState("");
  const [fileId, setFileId] = useState<Id<"_storage"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);
  const staffStreams = ["regulatory", "sub-national", "innovation", "judiciary", "communications", "investments", "receptionist", "account", "auditor"];
  const filteredUsers = department === "admin" ? users.filter(u => u.role === "admin") : users.filter(u => u.staffStream === selectedStream);
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
  return <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
        {}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4">Submit Letter</h2>

        {}
        <Input placeholder="Letter Title" value={letterName} onChange={e => setLetterName(e.target.value)} className="mb-3" />

        {}
        <select value={department} onChange={e => {
        setDepartment(e.target.value);
        setSelectedStream("");
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
          <option value="">Select Department</option>
          <option value="admin">Admin</option>
          <option value="staff">PEBEC Staff</option>
        </select>

        {}
        {department === "staff" && <select value={selectedStream} onChange={e => {
        setSelectedStream(e.target.value);
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
            <option value="">Select Staff Stream</option>
            {staffStreams.map(stream => <option key={stream} value={stream}>
                {stream.charAt(0).toUpperCase() + stream.slice(1)}
              </option>)}
          </select>}

        {}
        {(department === "admin" || selectedStream) && <select value={selectedUser ?? ""} onChange={e => setSelectedUser(e.target.value as Id<"users">)} className="w-full border rounded-md p-2 mb-4">
            <option value="">Select User</option>
            {filteredUsers.map(user => <option key={user._id} value={user._id}>
    {user.firstName} {user.lastName}
    {user.jobTitle ? ` (${user.jobTitle})` : ""} - {user.staffStream || user.role}
  </option>)}

          </select>}

        {}
        {selectedUser && <div className="flex items-center gap-3 border p-3 rounded-lg bg-gray-50 mb-4">
            {(() => {
          const user = users.find(u => u._id === selectedUser);
          return user ? <>
                  <Image src={user.imageUrl || "/default-avatar.png"} alt="User" width={36} height={36} className="rounded-full" />
                  <div>
                    <p className="font-semibold text-sm">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
  {user.jobTitle ? `${user.jobTitle}, ` : ""}
  {user.staffStream || user.role}
              </p>
                  </div>
                </> : null;
        })()}
          </div>}

        {}
        <div className="mb-4">
          <label className="font-semibold text-sm mb-2 block">Upload Supporting Document</label>
          <FileUploader setFileId={id => setFileId(id as Id<"_storage">)} />
        </div>

        {}
        <Button onClick={handleSubmit} className="w-full bg-green-700 hover:bg-green-800 text-white" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Letter"}
        </Button>
      </div>
    </div>;
}