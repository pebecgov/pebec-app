// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
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
import {
  INITIAL_EC_CHECKS,
  ProgrammeEligibilityCriteriaModal,
  type EcChecksState,
  type SaberEcCriterionId,
} from "@/components/Saber/ProgrammeEligibilityCriteria";
export default function ViewDLIPage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUsers);
  const dliTemplates = useQuery(api.dli.getDliTemplatesBasic) || [];
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const dliProgressList = useQuery(api.dli.getAllUserDLIProgress, shouldRefetch ? {} : undefined);
  // No longer needed because guideUrl is precomputed on server
  const startDLI = useMutation(api.dli.startDLI);
  const setupSteps = useMutation(api.dli.setupSteps);
  const completeStep = useMutation(api.dli.completeStep);
  const confirmEC = useMutation(api.dli.confirmEC);
  // Guide URLs are now fetched on-demand in specific DLI pages
  const [selectedDli, setSelectedDli] = useState<string | null>(null);
  const [stepNames, setStepNames] = useState<string[]>([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showBERAPModal, setShowBERAPModal] = useState(false);
  const [activeStep, setActiveStep] = useState<{
    [key: string]: number;
  }>({});
  const [dliProgressLists, setDliProgressLists] = useState(dliProgressList || []);
  
  // Update dliProgressLists when dliProgressList changes
  useEffect(() => {
    if (dliProgressList) {
      setDliProgressLists(dliProgressList);
    }
  }, [dliProgressList]);
  
  // Note: Guide URLs are now fetched on-demand in the specific DLI page
  // This reduces initial page load time significantly
  const progressMap = (dliProgressList || []).filter(progress => progress.state === user?.state).reduce((map, progress) => {
    map[progress.dliTemplateId] = progress;
    return map;
  }, {} as Record<string, any>);

  const handleStart = (dliId: string, steps: {
    title: string;
  }[], dliTitle: string) => {
    if (!steps || steps.length === 0) return;
    setSelectedDli(dliId);
    setStepNames(steps.map(s => s.title));
    
    // Check if this is the BERAP ELIGIBLITY CRITERIA DLI
    if (dliTitle === "BERAP ELIGIBLITY CRITERIA") {
      setShowBERAPModal(true);
    } else {
      setShowSetupModal(true);
    }
  };

  const handleConfirmStart = async () => {
    if (!selectedDli || stepNames.length === 0) return;
    try {
      if (!user?.state) {
        console.error("User state is missing.");
        return;
      }
      console.log("User state before sending:", user.state);
      await startDLI({
        dliTemplateId: selectedDli as Id<"dli_templates">,
        state: user.state
      });
      await setupSteps({
        dliTemplateId: selectedDli as Id<"dli_templates">,
        steps: stepNames.map(title => ({
          title,
          completed: false
        }))
      });
      setShowSetupModal(false);
      setShowBERAPModal(false);
      router.push(`/saber_agent/dli/${selectedDli}`);
    } catch (err) {
      console.error("Failed to start DLI:", err);
    }
  };
  const hasStartedDLI = (dliId: string) => {
    const progress = progressMap[dliId];
    return progress && (progress.status === "in_progress" || progress.completedSteps > 0);
  };
  const handleCompleteStep = async (dliId: string, stepIndex: number, stepTitle: string) => {
    await completeStep({
      dliTemplateId: dliId as Id<"dli_templates">,
      stepTitle
    });
    setActiveStep(prev => ({
      ...prev,
      [dliId]: stepIndex + 1
    }));
  };
  const [showECModal, setShowECModal] = useState(false);
  useEffect(() => {
    if (user && user.ecConfirmed === false) {
      setShowECModal(true);
    }
  }, [user]);
  const [eligibilityChecks, setEligibilityChecks] = useState<EcChecksState>(INITIAL_EC_CHECKS);
  const allChecked = Object.values(eligibilityChecks).every(Boolean);
  const handleConfirm = async () => {
    if (!allChecked) return;
    await confirmEC();
    setShowECModal(false);
  };
  return <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
       {}
       {showECModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl shadow-lg">
            <button onClick={() => setShowECModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-center pr-8">
              Programme Eligibility Criteria (EC)
            </h2>

            <ProgrammeEligibilityCriteriaModal
              checks={eligibilityChecks}
              onCheckChange={(id: SaberEcCriterionId, checked: boolean) =>
                setEligibilityChecks((prev) => ({ ...prev, [id]: checked }))
              }
              onConfirm={handleConfirm}
              confirmDisabled={!allChecked}
            />
          </div>
        </div>}
      
      {}
    {user?.ecConfirmed && <div>

    <h1 className="text-2xl font-bold text-center mb-10">Disbursement Linked Indicator <br /> <span className="text-gray-600">Please click start on the DLI your state is currently working on to begin</span></h1>


    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {dliTemplates.map(dli => {
          const progress = progressMap[dli._id] || {
            totalSteps: dli.steps.length,
            completedSteps: 0,
            steps: dli.steps.map((s: string) => ({
              title: s,
              completed: false
            }))
          };
          const isStarted = progress.status === "in_progress" || progress.completedSteps > 0;
          const isCompleted = progress.completedSteps === progress.totalSteps && progress.totalSteps > 0;
          const progressPercentage = Math.round(progress.completedSteps / progress.totalSteps * 100);
          const currentStepIndex = activeStep[dli._id] || 0;
          const nextStep = progress.steps[currentStepIndex];
          return <div key={dli._id} className="w-full max-w-md md:max-w-lg xl:max-w-xl h-full group relative">
            <div className="rounded-2xl bg-slate-950 shadow-2xl p-6 flex flex-col h-full relative overflow-hidden">
              {}
              <div className="flex items-start gap-4">
                {}
                <div className="relative h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden">
                  <Image src="/images/DLI.jpg" alt="DLI Guide" layout="intrinsic" width={64} height={64} objectFit="cover" className="rounded-xl" />
                </div>
        
                {}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white md:whitespace-normal break-words leading-tight">
                    {dli.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 mt-1">
                    {dli.description}
                  </p>
                </div>
        
                {}
                <Popover>
                  <PopoverTrigger>
                    <Info className="w-5 h-5 text-white cursor-pointer absolute top-4 right-4 hover:text-blue-500" />
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="bg-white text-black p-3 rounded-md shadow-md w-72 text-sm">
                    <p>ℹ️ Review steps before starting the DLI. Once started, progress will be tracked.</p>
                  </PopoverContent>
                </Popover>
              </div>
        
              {}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">

               

                <Button onClick={() => {
                  if (!isStarted) {
                    handleStart(dli._id, progress.steps, dli.title);
                  } else {
                    router.push(`/saber_agent/dli/${dli._id}`);
                  }
                }} className="w-full sm:w-auto bg-yellow-500 text-white rounded-xl">
  {isStarted ? "View Progress" : "Start"}
                </Button>


              </div>
        
              {}
              {isStarted && <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <progress value={progress.completedSteps} max={progress.totalSteps} className="w-full" />
                    <span className="text-white text-sm">{progressPercentage}%</span>
                  </div>
        
                  {}
                  <AnimatePresence mode="popLayout">
                    {progress.steps.map((step, index) => {
                    if (index !== progress.completedSteps) return null;
                    return <motion.div key={step.title} initial={{
                      opacity: 0,
                      x: 100
                    }} animate={{
                      opacity: 1,
                      x: 0
                    }} exit={{
                      opacity: 0,
                      x: -100
                    }} transition={{
                      duration: 0.3
                    }} className="mt-2 w-full flex justify-center items-center">
                          <Button onClick={() => handleCompleteStep(dli._id, index, step.title)} className={`w-full text-sm text-center rounded-xl px-4 py-2 flex items-center justify-center ${step.completed ? "bg-green-700 text-white" : "bg-gray-800 text-white hover:bg-green-600"}`} title={step.title} style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "90%",
                        display: "block",
                        textAlign: "center"
                      }}>
  {step.title.length > 30 ? `${step.title.substring(0, 30)}...` : step.title}
                      </Button>
                        </motion.div>;
                  })}
                  </AnimatePresence>
                </div>}
            </div>
          </div>;
        })}
    </div>
  </div>}


      {}
      {showSetupModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl shadow-lg">
      <button onClick={() => setShowSetupModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">
        <X size={20} />
      </button>


      <h2 className="text-2xl font-bold mb-4 text-center">Important Notice<span className="text-red-600">!!</span></h2>

      <div className="space-y-2 mb-4">
        <p className="py-1"> Please read this carefully before proceeding.</p>
   

<p className="py-2">Once you tick a box, it cannot be undone. Ensure you have fully and accurately completed the step before ticking the box.
</p>

<b>You will not be able to uncheck it afterwards.</b>
      </div>

      <Button onClick={handleConfirmStart} className="bg-green-600 text-white w-full">
       OK, I understand

      </Button>
    </div>
  </div>}

      {/* BERAP ELIGIBLITY CRITERIA Modal */}
      {showBERAPModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-8 rounded-xl shadow-lg">
          <button onClick={() => setShowBERAPModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">
            <X size={20} />
          </button>

                     <h2 className="text-2xl font-bold mb-6 text-center text-green-600">BERAP ELIGIBLITY CRITERIA</h2>

           <div className="space-y-6 text-sm leading-relaxed">
             <div>
               <h3 className="font-semibold text-lg mb-3 text-green-600">1. Improved planning and accountability of business-enabling reforms</h3>
              <p className="mb-3">
                State Business-Enabling Reform Action Plans (BERAP) are annual documents prepared by the state, approved by the State 
                Executive Council, and published on an official State website, outlining the state's 12-month detailed plan to improve the 
                business-enabling environment. The BERAPs, at a minimum, must include:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>list of contributing entities</li>
                <li>summary of private sector consultations (except for the Annual State BERAP for 2023)</li>
                <li>Reform objective and defined actions</li>
                <li>timelines</li>
                <li>list of responsible entities for the actions</li>
                <li>targets (quantifiable impact of reform actions to the private sector)</li>
              </ul>
              <p className="mb-3">
                The Progress Report of the BERAP is a document prepared by the state that shows the progress that has been made by the 
                State towards achieving the targets set forth in the BERAP, or—in the case the state did not produce a BERAP the previous 
                year–other state documents. The Progress Report should, at a minimum, include:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>the status of each action in the BERAP, or other state documents, and its resulting impact</li>
                <li>explanation for actions not completed by the expected end-date</li>
                <li>next steps</li>
              </ul>
              <p>
                The approved BERAP will be made available on an official State website that can be accessed by the deadline defined  
                in the Eligibility Criteria table.
              </p>
            </div>

                         <div>
               <h3 className="font-semibold text-lg mb-3 text-green-600">2. Continued transparency of annual State Budget and Audited Financial Statements</h3>
              <p className="mb-3">
                The following disclosures will be made on the official website of the State that can be accessed by the deadline 
                defined in the Eligibility Criteria Table:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Annual state budget approved by the State Assembly:</strong> This means that the annual state budget has been passed by 
                  the State Assembly and has obtained the Governor's assent by the specified date in the Eligibility Criteria Table. The 
                  approved budget shall include appropriations according to the functional/organizational and detailed economic 
                  classifications of expenditures.
                </li>
                <li>
                  <strong>Annual state budget prepared under national Chart of Accounts (GFS compliant):</strong> The national Chart of Accounts 
                  (CoA) is the approved FAAC CoA/budget classification system, domesticated to the State requirement in terms of 
                  elements without varying the structure and segments.
                </li>
                <li>
                  <strong>Audited financial statements:</strong> The annual audited financial statements should contain a complete set of financial 
                  statements including, at a minimum: the sources and uses of funds statements (or receipts and payments of funds 
                  statement); the appropriation for the year in review as well as the actual spending and balances against the 
                  appropriation; comparative actual expenditures of the preceding year; a summary statement of the state's debt 
                  stock and debt servicing; accounting policies applied; and all disclosure notes to the accounts required under the 
                  selected financial reporting framework.
                </li>
                <li>
                  <strong>International Public Sector Accounting Standards (IPSAS).</strong> IPSAS-compliant annual audited financial statements: 
                  At the minimum, Part 1 of the IPSAS Cash Basis of reporting should be applied by each state.
                </li>
              </ul>
            </div>

                         <div>
               <h3 className="font-semibold text-lg mb-3 text-green-600">3. Strengthened and transparent debt management</h3>
              <p>
                States publish an annual State Debt Sustainability Analysis and Debt Management Strategy Report (SDSA-DMSR) by 
                December 31 of the relevant year. The SDSA-DMSR must include the following: (1) medium-term budget forecasts; 
                (2) detailed description of the debt portfolio and borrowing options; including a summary analysis of the 
                projections of performance indicators used to assess Debt Management Strategy, and their implications for cost
                risk profile of State debt portfolio for the 4th year ahead (i.e., t+4); and (3) analysis of the debt and fiscal figures in 
                the preceding calendar year. The SDSA-DMSR must be published on a state official website.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
                         <Button onClick={handleConfirmStart} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-xl">
               Proceed
             </Button>
          </div>
        </div>
      </div>}

      {/* Advisory and Disclaimer */}
      <div className="mt-12">
        <div className="rounded-xl border border-yellow-400 bg-yellow-50 p-6 text-gray-800 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Advisory and Disclaimer</h2>
          <p className="mb-2">
            The Presidential Enabling Business Environment Council (PEBEC), serving as a technical assistance partner under the World Bank (WB) funded SABER Program, has issued the foregoing advisory pursuant to its technical expertise in relation to the program’s Verification Protocol, reform obligations, and established international best practices. For the avoidance of doubt, the views and recommendations expressed herein shall not, whether in whole or in part, be construed as representing the position of the World Bank or the Independent Verification Agent (IVA). States are hereby enjoined to undertake an independent review of the Verification Protocols (VP) and to exercise the requisite due diligence as mandated under the program.
          </p>
          <p className="mb-0">
            PEBEC hereby disclaims any liability, whether direct, indirect, consequential, or otherwise, arising from reliance on this advisory. The responsibility for compliance with the program’s requirements rests exclusively with the respective State.
          </p>
        </div>
      </div>

    </div>;
}