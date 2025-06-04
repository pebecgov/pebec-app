// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, ChangeEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Paperclip, FileText, Upload, Trash2 } from "lucide-react";
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
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const users = useQuery(api.users.getUsers) || [];
  const mdas = useQuery(api.users.getMDAs) || [];
  const [letterName, setLetterName] = useState("");
  const [description, setDescription] = useState("");
  const [fileId, setFileId] = useState<Id<"_storage"> | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedMda, setSelectedMda] = useState<Id<"mdas"> | "">("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);

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

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must not exceed 5MB");
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
      toast.info(`Selected: ${file.name}`);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });
      const { storageId } = await result.json();
      
      await saveUploadedFile({
        storageId,
        fileName: selectedFile.name
      });
      
      setFileId(storageId as Id<"_storage">);
      setFileName(selectedFile.name);
      setSelectedFile(null);
      setShowAttachmentUpload(false);
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFileId(null);
    setFileName("");
    setSelectedFile(null);
    setShowAttachmentUpload(false);
  };

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

  return <div className="fixed inset-0 overflow-auto flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4">Send Letter</h2>

        <Input placeholder="Letter Subject" value={letterName} onChange={e => setLetterName(e.target.value)} className="mb-3" />
        
        <Textarea 
          placeholder="Write your letter content here..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="mb-3 min-h-[100px] resize-none"
          required
        />

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

        {/* Compact Attachment Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-sm">Supporting Document</label>
            <div className="flex items-center gap-2">
              {/* Attachment Status */}
              {fileId && (
                <div className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                  <FileText size={12} />
                  <span className="truncate max-w-[100px]">{fileName}</span>
                  <button onClick={handleRemoveFile} className="ml-1 hover:text-red-600">
                    <X size={12} />
                  </button>
                </div>
              )}
              {/* Attachment Button */}
              {!fileId && (
                <button
                  type="button"
                  onClick={() => setShowAttachmentUpload(!showAttachmentUpload)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                  title="Add attachment"
                >
                  <Paperclip size={12} />
                  <span>Attach</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Compact Attachment Upload Area */}
          {showAttachmentUpload && (
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Attach Document</span>
                <span className="text-xs text-gray-500">Max 5MB</span>
              </div>
              
              {!selectedFile ? (
                <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400 transition-colors">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                  />
                  <div className="flex items-center gap-2 text-gray-600">
                    <Upload size={16} />
                    <span className="text-sm">Choose file</span>
                  </div>
                </label>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-white border rounded min-w-0">
                  <FileText size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button 
                      size="sm" 
                      onClick={handleFileUpload}
                      disabled={isUploading}
                      className="h-7 px-2 text-xs"
                    >
                      {isUploading ? "..." : "Upload"}
                    </Button>
                    <button 
                      onClick={() => setSelectedFile(null)}
                      className="p-1 hover:text-red-600"
                      title="Remove file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} className="w-full bg-green-700 hover:bg-green-800 text-white" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Letter"}
        </Button>
      </div>
    </div>;
}