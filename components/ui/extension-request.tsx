import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { format } from 'date-fns';

interface ExtensionRequest {
  requestedAt: number;
  requestedDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  includeWeekends: boolean;
  adminResponse?: string;
}

interface ExtensionRequestProps {
  ticketId: Id<"tickets">;
  extensionRequest?: ExtensionRequest;
  extensionHistory?: ExtensionRequest[];
  isAdmin?: boolean;
  ticketStatus?: string;
}

export function ExtensionRequest({ 
  ticketId, 
  extensionRequest, 
  extensionHistory = [],
  isAdmin,
  ticketStatus 
}: ExtensionRequestProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestedDays, setRequestedDays] = useState(1);
  const [reason, setReason] = useState('');
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');

  const requestExtension = useMutation(api.tickets.requestTicketExtension);
  const handleExtension = useMutation(api.tickets.handleExtensionRequest);

  const handleRequest = async () => {
    try {
      await requestExtension({
        ticketId,
        requestedDays,
        reason,
        includeWeekends
      });
      toast.success('Extension request submitted successfully');
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit extension request');
      console.error(error);
    }
  };

  const handleAdminDecision = async (approved: boolean) => {
    try {
      await handleExtension({
        ticketId,
        approved,
        adminResponse
      });
      toast.success(`Extension request ${approved ? 'approved' : 'rejected'}`);
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process extension request');
      console.error(error);
    }
  };

  if (isAdmin) {
    return (
      <div className="space-y-4 mt-4">
        {extensionRequest?.status === "pending" && (
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h3 className="font-semibold text-lg text-yellow-800">Extension Request Pending</h3>
            <div className="mt-2 space-y-2 text-sm">
              <p><span className="font-medium">Days Requested:</span> {extensionRequest.requestedDays}</p>
              <p><span className="font-medium">Include Weekends:</span> {extensionRequest.includeWeekends ? 'Yes' : 'No'}</p>
              <p><span className="font-medium">Reason:</span> {extensionRequest.reason}</p>
              <div className="mt-4">
                <Textarea
                  placeholder="Add a response (optional)"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="mb-4"
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleAdminDecision(true)} variant="default">
                    Approve
                  </Button>
                  <Button onClick={() => handleAdminDecision(false)} variant="destructive">
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extension History */}
        {extensionHistory.length > 0 && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-lg mb-4">Extension History</h3>
            <div className="space-y-4">
              {extensionHistory.map((ext, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-md ${
                    ext.status === 'approved' ? 'bg-green-50 border-green-200' :
                    ext.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  } border`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {ext.requestedDays} days requested
                        {ext.includeWeekends && ' (including weekends)'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(ext.requestedAt), 'PPp')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm ${
                      ext.status === 'approved' ? 'bg-green-100 text-green-800' :
                      ext.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ext.status.charAt(0).toUpperCase() + ext.status.slice(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm"><span className="font-medium">Reason:</span> {ext.reason}</p>
                  {ext.adminResponse && (
                    <p className="mt-1 text-sm"><span className="font-medium">Admin Response:</span> {ext.adminResponse}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isAdmin && extensionRequest) {
    const statusColors = {
      pending: "text-yellow-700 bg-yellow-50",
      approved: "text-green-700 bg-green-50",
      rejected: "text-red-700 bg-red-50"
    };

    return (
      <div className={`mt-4 p-4 border rounded-lg ${statusColors[extensionRequest.status]}`}>
        <h3 className="font-semibold text-lg">Extension Request {extensionRequest.status}</h3>
        <div className="mt-2 space-y-2 text-sm">
          <p><span className="font-medium">Days Requested:</span> {extensionRequest.requestedDays}</p>
          <p><span className="font-medium">Include Weekends:</span> {extensionRequest.includeWeekends ? 'Yes' : 'No'}</p>
          <p><span className="font-medium">Reason:</span> {extensionRequest.reason}</p>
          {extensionRequest.adminResponse && (
            <p><span className="font-medium">Admin Response:</span> {extensionRequest.adminResponse}</p>
          )}
        </div>
      </div>
    );
  }

  // Don't show request button for resolved/closed tickets
  if (!isAdmin && !extensionRequest && ticketStatus !== "resolved" && ticketStatus !== "closed") {
    return (
      <>
        <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-4">
          Request Deadline Extension
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Deadline Extension</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Days Needed (max 7)</label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={requestedDays}
                  onChange={(e) => setRequestedDays(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason for Extension</label>
                <Textarea
                  placeholder="Explain why you need more time..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weekends"
                  checked={includeWeekends}
                  onCheckedChange={(checked) => setIncludeWeekends(checked as boolean)}
                />
                <label htmlFor="weekends" className="text-sm font-medium">
                  Include weekends in the extension period
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsDialogOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleRequest} disabled={!reason || requestedDays < 1 || requestedDays > 7}>
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
} 