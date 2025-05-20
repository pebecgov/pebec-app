import React from "react";
import { Metadata } from "next";
import FeedbackForm from "@/components/Feedback";

// Metadata for SEO
export const metadata: Metadata = {
  title: "ReportGov - Feedback",
  description: "Share your feedback",
};

const Feedback = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 to-green-50 py-10 md:py-20 px-6 md:px-12 mt-20">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-3xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        
        {/* Left – Feedback Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-300 mb-4">
            Share Your Feedback
          </h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Your insights help us improve the experience on ReportGov.
            Please take a moment to share your suggestions, concerns, or feedback.
          </p>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <FeedbackForm />
          </div>
        </div>

        {/* Right – Illustration */}
        <div className="hidden md:flex items-center justify-center bg-gray-500">
          <img
            src="/images/feedback.svg"
            alt="Feedback Illustration"
            className="max-w-md w-full h-auto object-contain p-10"
          />
        </div>
      </div>
    </div>
  );
};

export default Feedback;
