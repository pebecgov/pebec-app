"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";

interface ReportSubmissionSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  title?: string;
  description?: string;
}

export default function ReportSubmissionSuccessDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Report submitted successfully",
  description,
}: ReportSubmissionSuccessDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    onConfirm?.();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) handleClose();
      else onOpenChange(next);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-center text-sm text-gray-600">
              <p>
                {description ?? "PEBEC has received your report and it is now on record."}
              </p>
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                  <div>
                    <p className="font-medium text-green-900">Acknowledgement email</p>
                    <p className="mt-1 text-green-800">
                      You will receive an acknowledgement email shortly. If you do not see it in your inbox, please check your spam or junk folder.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
