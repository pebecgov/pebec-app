// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FileUploader from "@/components/file-uploader";
import { X, Paperclip, FileText } from "lucide-react";
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
  const [description, setDescription] = useState("");
  const [fileId, setFileId] = useState<Id<"_storage"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);

  const staffStreams = ["regulatory", "sub_national", "innovation", "judiciary", "communications", "investments", "receptionist", "account", "auditor"];
  const filteredUsers = department === "admin" ? users.filter(u => u.role === "admin") : users.filter(u => u.staffStream === selectedStream);

  const handleSubmit = async () => {
    if (!letterName.trim() || !description.trim() || !selectedUser) {
      toast.error("Please complete all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitLetter({
        letterName,
        description,
        letterUploadId: fileId || undefined,
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
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg relative">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4">Submit Letter</h2>

        {/* Letter Title */}
        <Input placeholder="Letter Subject" value={letterName} onChange={e => setLetterName(e.target.value)} className="mb-3" />

        {/* Department Selection */}
        <select value={department} onChange={e => {
        setDepartment(e.target.value);
        setSelectedStream("");
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
          <option value="">Select Department</option>
          <option value="admin">Admin</option>
          <option value="staff">PEBEC Staff</option>
        </select>

        {/* Staff Stream Selection */}
        {department === "staff" && <select value={selectedStream} onChange={e => {
        setSelectedStream(e.target.value);
        setSelectedUser(null);
      }} className="w-full border rounded-md p-2 mb-3">
            <option value="">Select Staff Stream</option>
            {staffStreams.map(stream => <option key={stream} value={stream}>
                {stream.charAt(0).toUpperCase() + stream.slice(1)}
              </option>)}
          </select>}

        {/* User Selection */}
        {(department === "admin" || selectedStream) && <select value={selectedUser ?? ""} onChange={e => setSelectedUser(e.target.value as Id<"users">)} className="w-full border rounded-md p-2 mb-4">
            <option value="">Select User</option>
            {filteredUsers.map(user => <option key={user._id} value={user._id}>
    {user.firstName} {user.lastName}
    {user.jobTitle ? ` (${user.jobTitle})` : ""} - {user.staffStream || user.role}
  </option>)}
          </select>}

        {/* Selected User Preview */}
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

        {/* Main Letter Body with Attachment */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-sm">Letter Body</label>
            <div className="flex items-center gap-2">
              {/* Attachment Status */}
              {fileId && (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <FileText size={14} />
                  <span>Attached</span>
                </div>
              )}
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => setShowAttachmentUpload(!showAttachmentUpload)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  fileId 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Add attachment"
              >
                <Paperclip size={14} />
                <span>{fileId ? 'Change' : 'Attach'}</span>
              </button>
            </div>
          </div>
          
          {/* Description Textarea */}
          <Textarea 
            placeholder="Write your letter content here..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="min-h-[120px] resize-none"
            required
          />
          
          {/* Attachment Upload Area (Collapsible) */}
          {showAttachmentUpload && (
            <div className="mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Attach Supporting Document</span>
              </div>
              <FileUploader setFileId={id => {
                setFileId(id as Id<"_storage">);
                setShowAttachmentUpload(false); // Hide uploader after successful upload
              }} />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button onClick={handleSubmit} className="w-full bg-green-700 hover:bg-green-800 text-white" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Letter"}
        </Button>
      </div>
    </div>;
}