"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import DLICertificate from "@/components/DLICertificate";
import { Info, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";

export default function ViewDLIPage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUsers); // ✅ Fetch current user

  const dliTemplates = useQuery(api.dli.getAllDliTemplates) || [];
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const dliProgressList = useQuery(api.dli.getAllUserDLIProgress, shouldRefetch ? {} : undefined);
  
  const getFileUrl = useMutation(api.dli.getStorageUrl);
  const startDLI = useMutation(api.dli.startDLI);
  const setupSteps = useMutation(api.dli.setupSteps);
  const completeStep = useMutation(api.dli.completeStep);
  const confirmEC = useMutation(api.dli.confirmEC); // ✅ API to confirm EC

  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const [selectedDli, setSelectedDli] = useState<string | null>(null);
  const [stepNames, setStepNames] = useState<string[]>([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [activeStep, setActiveStep] = useState<{ [key: string]: number }>({});
  const [dliProgressLists, setDliProgressLists] = useState(dliProgressList || []);

  useEffect(() => {
    if (dliProgressLists.length !== dliProgressLists.length) {
      setDliProgressLists(dliProgressLists);
    }
  }, [dliProgressList, dliProgressLists.length]);
  


  // ✅ Load file URLs
  useEffect(() => {
    const fetchGuideUrls = async () => {
      const urls: { [key: string]: string } = {};
  
      for (const dli of dliTemplates) {
        if (dli.guideFileId) {
          try {
            const url = await getFileUrl({ storageId: dli.guideFileId as Id<"_storage"> });
            if (url) {
              urls[dli._id] = url;
            }
          } catch (error) {
            console.error(`Error fetching guide file for ${dli.title}:`, error);
          }
        }
      }
  
      setFileUrls(urls);
    };
  
    if (dliTemplates.length > 0) {
      fetchGuideUrls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dliTemplates]); // ✅ Only stable dependency
  

  // ✅ Progress Map
  const progressMap = (dliProgressList || [])
  .filter((progress) => progress.state === user?.state) // ✅ Only DLIs for user's actual state
  .reduce((map, progress) => {
    map[progress.dliTemplateId] = progress;
    return map;
  }, {} as Record<string, any>);

  
  // ✅ Handle "Start" click — open modal with step list
  const handleStart = (dliId: string, steps: { title: string }[]) => {
    if (!steps || steps.length === 0) return;
    setSelectedDli(dliId);
    setStepNames(steps.map((s) => s.title));
    setShowSetupModal(true);
  };
  const handleConfirmStart = async () => {
    if (!selectedDli || stepNames.length === 0) return;
  
    try {
      // ✅ Ensure user state is available
      if (!user?.state) {
        console.error("User state is missing.");
        return;
      }
  
      console.log("User state before sending:", user.state); // 🔍 Debugging step
  
      // ✅ Start the DLI and pass the state
      await startDLI({
        dliTemplateId: selectedDli as Id<"dli_templates">,
        state: user.state, // ✅ This matches the updated validator now
      });
      
  
      // ✅ Setup Steps
      await setupSteps({
        dliTemplateId: selectedDli as Id<"dli_templates">,
        steps: stepNames.map((title) => ({ title, completed: false })),
      });
  
      setShowSetupModal(false); // ✅ Close modal after confirmation
  
      // ✅ Redirect AFTER setup
      setTimeout(() => {
        router.push(`/saber_agent/dli/${selectedDli}`);
      }, 500);
    } catch (err) {
      console.error("Failed to start DLI:", err);
    }
  };
  
  
  
  
  
  
  const hasStartedDLI = (dliId: string) => {
    const progress = progressMap[dliId];
    return progress && (progress.status === "in_progress" || progress.completedSteps > 0);
  };
  


  // ✅ Complete step
  const handleCompleteStep = async (dliId: string, stepIndex: number, stepTitle: string) => {
    await completeStep({ dliTemplateId: dliId as Id<"dli_templates">, stepTitle });

    setActiveStep((prev) => ({
      ...prev,
      [dliId]: stepIndex + 1,
    }));
  };


  const [showECModal, setShowECModal] = useState(false);
  useEffect(() => {
    if (user && user.ecConfirmed === false) {
      setShowECModal(true);
    }
  }, [user]); // ✅ Updates when user data is available
  const [eligibilityChecks, setEligibilityChecks] = useState({
    ec1: false,
    ec2: false,
    ec3: false,
    ec4: false,
    ec5: false,
  });

  const allChecked = Object.values(eligibilityChecks).every(Boolean);

  const handleConfirm = async () => {
    if (!allChecked) return;
    await confirmEC();
    setShowECModal(false);
  };

  return (
    
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
       {/* ✅ Show EC Modal First */}
       {showECModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl shadow-lg">
            <button
              onClick={() => setShowECModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-center">
              SABER Eligibility Criteria (EC)
            </h2>

            <div className="space-y-4">
              {/* ✅ Improved Planning */}
              <div>
                <h3 className="font-semibold text-lg">
                  Improved Planning and Accountability of Business-Enabling Reforms
                </h3>
                <div className="flex items-center gap-2">
                <Checkbox
  checked={eligibilityChecks.ec1}
  onCheckedChange={(v) => setEligibilityChecks({ ...eligibilityChecks, ec1: Boolean(v) })}
/>
                  <span>
                    Annual State Business-Enabling Reforms Action Plan for 2026, published by{" "}
                    <strong>31 December 2025</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                <Checkbox
  checked={eligibilityChecks.ec2}
  onCheckedChange={(v) => setEligibilityChecks({ ...eligibilityChecks, ec2: Boolean(v) })}
/>
                  <span>
                    2024 State Business-Enabling Reforms Action Plan Progress report submitted by{" "}
                    <strong>31 July 2025</strong>
                  </span>
                </div>
              </div>

              {/* ✅ Fiscal Transparency */}
              <div>
                <h3 className="font-semibold text-lg">
                  Continuation of Selected Criteria from SFTAS
                </h3>
                <div className="flex items-center gap-2">
                <Checkbox
  checked={eligibilityChecks.ec3}
  onCheckedChange={(v) => setEligibilityChecks({ ...eligibilityChecks, ec3: Boolean(v) })}
/>
                  <span>
                    Annual FY25 state budget, published by{" "}
                    <strong>31 January 2025</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                <Checkbox
  checked={eligibilityChecks.ec4}
  onCheckedChange={(v) => setEligibilityChecks({ ...eligibilityChecks, ec4: Boolean(v) })}
/>
                  <span>
                    Annual FY24 audited financial statement, published by{" "}
                    <strong>31 July 2025</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                <Checkbox
  checked={eligibilityChecks.ec5}
  onCheckedChange={(v) => setEligibilityChecks({ ...eligibilityChecks, ec5: Boolean(v) })}
/>
                  <span>
                    Annual State Debt Sustainability Analysis and Debt Management Strategy Report, published by{" "}
                    <strong>31 December 2024</strong>
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-red-600 text-sm">
              <strong>N.B:</strong> Meeting <strong>ALL 5</strong> Eligibility Criteria above is a prerequisite for receiving disbursement. Failing to meet EC will result in{" "}
              <strong>NO DISBURSEMENT</strong>.
            </p>

            <Button
              onClick={handleConfirm}
              disabled={!allChecked}
              className={`w-full mt-4 ${allChecked ? "bg-green-600" : "bg-gray-400"} text-white`}
            >
              Confirm Eligibility
            </Button>
          </div>
        </div>
      )}
      
      {/* ✅ Show DLI Cards Only If EC is Confirmed */}
{user?.ecConfirmed && (
  <div>
    <h1 className="text-2xl font-bold text-center mb-10">Disbursement Linked Indicator</h1>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {dliTemplates.map((dli) => {
        const progress = progressMap[dli._id] || {
          totalSteps: dli.steps.length,
          completedSteps: 0,
          steps: dli.steps.map((s: string) => ({ title: s, completed: false })),
        };

        const isStarted = progress.status === "in_progress" || progress.completedSteps > 0;
        const isCompleted = progress.completedSteps === progress.totalSteps && progress.totalSteps > 0;
        const progressPercentage = Math.round((progress.completedSteps / progress.totalSteps) * 100);
        const currentStepIndex = activeStep[dli._id] || 0;
        const nextStep = progress.steps[currentStepIndex];

        return (
          <div key={dli._id} className="w-full max-w-md md:max-w-lg xl:max-w-xl h-full group relative">
            <div className="rounded-2xl bg-slate-950 shadow-2xl p-6 flex flex-col h-full relative overflow-hidden">
              {/* Header Section */}
              <div className="flex items-start gap-4">
                {/* DLI Image */}
                <div className="relative h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden">
                  <Image
                    src="/images/DLI.jpg"
                    alt="DLI Guide"
                    layout="intrinsic"
                    width={64}
                    height={64}
                    objectFit="cover"
                    className="rounded-xl"
                  />
                </div>
        
                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white md:whitespace-normal break-words leading-tight">
                    {dli.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 mt-1">
                    {dli.description}
                  </p>
                </div>
        
                {/* Info Icon */}
                <Popover>
                  <PopoverTrigger>
                    <Info className="w-5 h-5 text-white cursor-pointer absolute top-4 right-4 hover:text-blue-500" />
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="bg-white text-black p-3 rounded-md shadow-md w-72 text-sm">
                    <p>ℹ️ Review steps before starting the DLI. Once started, progress will be tracked.</p>
                  </PopoverContent>
                </Popover>
              </div>
        
              {/* Buttons Section */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a href={fileUrls[dli._id]} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-blue-600 text-white rounded-xl">
                    Download Guide
                  </Button>
                </a>
                <Button
  onClick={() => {
    if (!isStarted) {
      handleStart(dli._id, progress.steps); // Open modal if not started
    } else {
      router.push(`/saber_agent/dli/${dli._id}`); // Navigate if started
    }
  }}
  className="w-full sm:w-auto bg-yellow-500 text-white rounded-xl"
>
  {isStarted ? "View Progress" : "Start"}
</Button>


              </div>
        
              {/* Progress Section */}
              {isStarted && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <progress value={progress.completedSteps} max={progress.totalSteps} className="w-full" />
                    <span className="text-white text-sm">{progressPercentage}%</span>
                  </div>
        
                  {/* Steps Inside Motion Div */}
                  <AnimatePresence mode="popLayout">
                    {progress.steps.map((step, index) => {
                      if (index !== progress.completedSteps) return null;
                      return (
                        <motion.div
                          key={step.title}
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2 w-full flex justify-center items-center"
                        >
                          <Button
                                                      onClick={() => handleCompleteStep(dli._id, index, step.title)}

  className={`w-full text-sm text-center rounded-xl px-4 py-2 flex items-center justify-center ${
    step.completed ? "bg-green-700 text-white" : "bg-gray-800 text-white hover:bg-green-600"
  }`}
  title={step.title} // Shows full title on hover
  style={{
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "90%",  // Ensures text fits inside button
    display: "block",
    textAlign: "center",
  }}
>
  {step.title.length > 30 ? `${step.title.substring(0, 30)}...` : step.title}
</Button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        );
        
        
        
      })}
    </div>
  </div>
)}


      {/* ✅ Modal for Confirming Steps */}
      {showSetupModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl shadow-lg">
      <button
        onClick={() => setShowSetupModal(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-black"
      >
        <X size={20} />
      </button>

      <h2 className="text-2xl font-bold mb-4 text-center">Confirm DLI Steps</h2>

      <ul className="space-y-2 mb-4">
        {stepNames.map((step, index) => (
          <li key={index} className="bg-gray-100 px-4 py-2 rounded text-sm">
            Step {index + 1}: {step}
          </li>
        ))}
      </ul>

      <Button
        onClick={handleConfirmStart}
        className="bg-green-600 text-white w-full"
      >
        Confirm & Start DLI
      </Button>
    </div>
  </div>
)}

    </div>
  );
}
