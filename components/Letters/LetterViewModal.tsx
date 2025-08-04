// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { formatRole } from "@/lib/formatters";
import { Id } from "@/convex/_generated/dataModel";

interface LetterViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: {
    _id: Id<"letters">;
    letterName: string;
    description?: string;
    letterDate: number;
    userId: Id<"users">;
    status?: string;
    letterUploadId?: Id<"_storage">;
  };
  sender: {
    firstName?: string;
    lastName?: string;
    role?: string;
    jobTitle?: string;
    staffStream?: string;
  } | null;
}

export default function LetterViewModal({ isOpen, onClose, letter, sender }: LetterViewModalProps) {
  const statusColors: Record<string, string> = {
    sent: "bg-yellow-100 text-yellow-700",
    acknowledged: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    resolved: "bg-green-100 text-green-700"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800">
            📄 Letter Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Letter Header Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Letter Information</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Subject:</span> {letter.letterName}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {format(new Date(letter.letterDate), "PPP p")}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Status:</span>{" "}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[letter.status ?? "sent"]}`}>
                    {letter.status?.replace("_", " ") || "Awaiting Acknowledgment"}
                  </span>
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Sender Information</h3>
                {sender ? (
                  <>
                                         <p className="text-sm text-gray-600">
                       <span className="font-medium">Name:</span> {sender.firstName || "N/A"} {sender.lastName || ""}
                     </p>
                     <p className="text-sm text-gray-600">
                       <span className="font-medium">Role:</span> {sender.role ? formatRole(sender.role) : "N/A"}
                       {sender.staffStream && ` - ${sender.staffStream}`}
                     </p>
                    {sender.jobTitle && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Job Title:</span> {sender.jobTitle}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Sender information not available</p>
                )}
              </div>
            </div>
          </div>

          {/* Letter Body */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Letter Content</h3>
            {letter.description ? (
              <div className="bg-white border rounded-lg p-4 min-h-[200px]">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {letter.description}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border rounded-lg p-8 text-center">
                <p className="text-gray-500 italic">No letter content available</p>
                {letter.letterUploadId && (
                  <p className="text-sm text-gray-400 mt-2">
                    Letter content may be available in the attached file
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
           
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 