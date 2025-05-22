// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React from "react";
import { ClipboardDocumentListIcon, WrenchScrewdriverIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
interface TicketStepperProps {
  currentStep: number;
  status: "open" | "in_progress" | "resolved" | "closed";
}
const TicketStepper: React.FC<TicketStepperProps> = ({
  currentStep,
  status
}) => {
  const steps = [{
    title: "Open",
    description: "Waiting for the MDA to acknowledge it.",
    icon: ClipboardDocumentListIcon
  }, {
    title: "In Progress",
    description: "MDA is analyzing your report, please stay close for more updates.",
    icon: WrenchScrewdriverIcon
  }, {
    title: status === "closed" ? "Closed" : "Resolved",
    description: status === "closed" ? "Your issue has been closed." : "Your issue has been resolved.",
    icon: status === "closed" ? XCircleIcon : CheckCircleIcon
  }];
  return <div className="flex flex-col sm:flex-row items-center justify-center w-full px-4 sm:px-10 py-6">
      {steps.map((step, index) => <div key={index} className="relative flex flex-col sm:flex-row items-center text-center sm:text-left">
          {}
          <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-semibold transition-all
              ${currentStep === index ? "bg-blue-600 shadow-lg" : currentStep > index ? index === steps.length - 1 && status === "closed" ? "bg-red-500" : "bg-green-500" : "bg-gray-400"}`}>
            <step.icon className="w-6 h-6" />
          </div>

          {}
          <div className="mt-2 sm:mt-0 sm:ml-3">
            <p className="font-semibold text-gray-700">{step.title}</p>
            <p className="text-xs text-gray-500 max-w-xs">{step.description}</p>
          </div>

          {}
          {index !== steps.length - 1 && <div className="hidden sm:block w-16 sm:w-24 border-t-2 border-dotted border-gray-400" />}

          {}
          {index !== steps.length - 1 && <div className="sm:hidden w-1 h-10 border-l-2 border-dotted border-gray-400 mx-auto my-2"></div>}
        </div>)}
    </div>;
};
export default TicketStepper;