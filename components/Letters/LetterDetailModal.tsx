// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { Download, FileText, User, Calendar, MessageSquare } from "lucide-react";

interface Letter {
  _id: Id<"letters">;
  letterName: string;
  description?: string;
  letterDate: number;
  userFullName: string;
  userRole: string;
  letterUploadId?: Id<"_storage">;
  status?: "sent" | "acknowledged" | "in_progress" | "resolved";
  sentTo?: Id<"users">;
}

interface LetterDetailModalProps {
  letter: Letter | null;
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
}

export default function LetterDetailModal({ 
  letter, 
  isOpen, 
  onClose,
  recipientName 
}: LetterDetailModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("downloaded_file");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);

  useEffect(() => {
    const loadFileUrl = async () => {
      if (letter?.letterUploadId) {
        setIsLoadingFile(true);
        try {
          const result = await getFileUrl({ storageId: letter.letterUploadId });
          if (result) {
            setFileUrl(result.url);
            setFileName(result.fileName);
          }
        } catch (error) {
          console.error("Error loading file:", error);
        } finally {
          setIsLoadingFile(false);
        }
      }
    };

    if (isOpen && letter) {
      loadFileUrl();
    } else {
      setFileUrl(null);
      setFileName("downloaded_file");
    }
  }, [letter, isOpen, getFileUrl]);

  if (!letter) return null;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "acknowledged":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-700 border-green-200";
      case "sent":
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatRole = (role: string) => {
    return role.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span style={{ verticalAlign: '-0.125em' }}>📧</span>
            Letter Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 space-y-6 max-h-[60vh]">
          {/* Letter Title */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {letter.letterName}
            </h3>
            <Badge className={getStatusColor(letter.status)}>
              {letter.status || "sent"}
            </Badge>
          </div>

          <Separator />

          {/* Sender Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              Sender Information
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p><strong>Name:</strong> {letter.userFullName || "Unknown"}</p>
              <p><strong>Role:</strong> {formatRole(letter.userRole || "user")}</p>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <strong>Date Sent:</strong> {format(new Date(letter.letterDate), "PPP 'at' p")}
              </p>
              {recipientName && (
                <p><strong>Sent To:</strong> {recipientName}</p>
              )}
            </div>
          </div>

          {/* Letter Description */}
          {letter.description && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message Content
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {letter.description}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* File Attachment */}
          {letter.letterUploadId && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Attachment
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  {isLoadingFile ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      Loading attachment...
                    </div>
                  ) : fileUrl ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium">{fileName}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(fileUrl, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Unable to load attachment</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 