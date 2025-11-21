"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FaSpinner } from "react-icons/fa";
import { Id } from "@/convex/_generated/dataModel";

export default function DmoReportPage() {
  const { user } = useUser();
  const [linkPublished, setLinkPublished] = useState<"yes" | "no">("no");
  const [webLink, setWebLink] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const myReport = useQuery(api.dmo_reports.getMyDmoReports) ?? [];
  const existingReport = myReport[0]; // Get the first (and should be only) report

  const submitReport = useMutation(api.dmo_reports.submitDmoReport);

  // Pre-fill form if report exists
  React.useEffect(() => {
    if (existingReport) {
      setLinkPublished(existingReport.linkPublished);
      setWebLink(existingReport.webLink || "");
      if (existingReport.publishedDate) {
        const date = new Date(existingReport.publishedDate);
        setPublishedDate(date.toISOString().split("T")[0]);
      }
    }
  }, [existingReport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate: if linkPublished is "yes", webLink and publishedDate are required
      if (linkPublished === "yes") {
        if (!webLink.trim()) {
          toast.error("Web link is required when link is published");
          setIsSubmitting(false);
          return;
        }
        if (!publishedDate) {
          toast.error("Published date is required when link is published");
          setIsSubmitting(false);
          return;
        }
      }

      const publishedDateTimestamp = publishedDate
        ? new Date(publishedDate).getTime()
        : undefined;

      await submitReport({
        linkPublished,
        webLink: webLink.trim() || undefined,
        publishedDate: publishedDateTimestamp,
      });

      toast.success("DMO report submitted successfully!");
      
      // Reset form if new submission
      if (!existingReport) {
        setLinkPublished("no");
        setWebLink("");
        setPublishedDate("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const state = currentUser?.state || currentUser?.roleRequest?.state || "Unknown";
  const deadline = new Date("2025-11-30T23:59:59+01:00");
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>DMO Report Submission</CardTitle>
          <CardDescription>
            Submit your DSA/DMS publication information for DMO review. Deadline: November 30, 2025
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>State:</strong> {state}
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Days until deadline:</strong>{" "}
              <span className={daysUntilDeadline <= 7 ? "text-red-600 font-bold" : ""}>
                {daysUntilDeadline > 0 ? daysUntilDeadline : "Deadline passed"}
              </span>
            </p>
            {existingReport?.dmoAssessment && (
              <p className="text-sm text-blue-800 mt-2">
                <strong>DMO Assessment:</strong>{" "}
                <span
                  className={
                    existingReport.dmoAssessment === "met"
                      ? "text-green-600 font-bold"
                      : "text-red-600 font-bold"
                  }
                >
                  {existingReport.dmoAssessment.toUpperCase()}
                </span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Has the link been published on your state website? *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="linkPublished"
                    value="yes"
                    checked={linkPublished === "yes"}
                    onChange={(e) => setLinkPublished(e.target.value as "yes" | "no")}
                    className="w-4 h-4"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="linkPublished"
                    value="no"
                    checked={linkPublished === "no"}
                    onChange={(e) => setLinkPublished(e.target.value as "yes" | "no")}
                    className="w-4 h-4"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {linkPublished === "yes" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webLink">Web Link *</Label>
                  <Input
                    id="webLink"
                    type="url"
                    placeholder="https://example.com/dsa-dms"
                    value={webLink}
                    onChange={(e) => setWebLink(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publishedDate">Date the link was published on your state website *</Label>
                  <Input
                    id="publishedDate"
                    type="date"
                    value={publishedDate}
                    onChange={(e) => setPublishedDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Submitting...
                </>
              ) : existingReport ? (
                "Update Report"
              ) : (
                "Submit Report"
              )}
            </Button>
          </form>

          {existingReport && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">Current Submission</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Link Published:</strong> {existingReport.linkPublished}
                </p>
                {existingReport.webLink && (
                  <p>
                    <strong>Web Link:</strong>{" "}
                    <a
                      href={existingReport.webLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {existingReport.webLink}
                    </a>
                  </p>
                )}
                {existingReport.publishedDate && (
                  <p>
                    <strong>Published Date:</strong>{" "}
                    {new Date(existingReport.publishedDate).toLocaleDateString()}
                  </p>
                )}
                <p>
                  <strong>Submitted:</strong>{" "}
                  {new Date(existingReport.submittedAt).toLocaleString()}
                </p>
                {existingReport.updatedAt && (
                  <p>
                    <strong>Last Updated:</strong>{" "}
                    {new Date(existingReport.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

