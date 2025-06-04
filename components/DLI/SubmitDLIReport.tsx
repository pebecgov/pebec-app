// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/convex/_generated/dataModel";
import ImageUploader from "../image-uploader";
import FileUploader from "../file-uploader-comments";
import Stepper, { Step } from "../Stepper";
interface Answer {
  question: string;
  answer?: string | string[] | Id<"_storage">;
}
interface StepAnswer {
  stepTitle: string;
  responses: Answer[];
}
export default function SubmitDLIReport({
  templateId
}: {
  templateId: Id<"dli_templates">;
}) {
  const dliTemplate = useQuery(api.dli.getDliTemplateById, {
    id: templateId
  });
  const submitDliReport = useMutation(api.dli.submitDliReport);
  const [answers, setAnswers] = useState<StepAnswer[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  if (!dliTemplate) return <p>Loading...</p>;
  const steps = dliTemplate.steps;
  const handleAnswerChange = (stepIndex: number, qIndex: number, value: string | Id<"_storage">) => {
    setAnswers(prevAnswers => {
      const newAnswers = [...prevAnswers];
      if (!newAnswers[stepIndex]) {
        newAnswers[stepIndex] = {
          stepTitle: steps[stepIndex].title || "",
          responses: []
        };
      }
      newAnswers[stepIndex].responses[qIndex] = {
        question: steps[stepIndex].questions[qIndex].question || "",
        answer: value
      };
      return newAnswers;
    });
  };
  const handleSubmit = async () => {
    await submitDliReport({
      dliTemplateId: templateId,
      answers
    });
    alert("✅ DLI Report Submitted Successfully!");
  };
  return <div className="p-6 bg-white shadow-md rounded-lg max-w-4xl mx-auto">
      {}
      <Stepper initialStep={0} onStepChange={step => setCurrentStep(step)} onFinalStepCompleted={handleSubmit} backButtonText="Previous" nextButtonText="Next">
        {steps.map((step, stepIndex) => <Step key={stepIndex}>
            <h3 className="text-xl font-semibold mb-4">{step.title}</h3>

            {step.questions.map((q, qIndex) => <div key={qIndex} className="mb-4">
                <label className="font-semibold">{q.question}</label>

                {}
                {q.type === "text" && <Input onChange={e => handleAnswerChange(stepIndex, qIndex, e.target.value)} />}
                {q.type === "textarea" && <Textarea onChange={e => handleAnswerChange(stepIndex, qIndex, e.target.value)} />}
                {q.type === "dropdown" && <select onChange={e => handleAnswerChange(stepIndex, qIndex, e.target.value)} className="w-full p-2 border rounded-md">
                    {q.options?.map((option, index) => <option key={index} value={option}>
                        {option}
                      </option>)}
                  </select>}
                {q.type === "checkbox" && <div className="flex flex-wrap gap-2">
                    {q.options?.map((option, index) => <label key={index} className="flex items-center gap-2">
                        <input type="checkbox" value={option} onChange={e => handleAnswerChange(stepIndex, qIndex, e.target.value)} />
                        {option}
                      </label>)}
                  </div>}
                {q.type === "upload" && <>
                    <p className="text-sm text-gray-500">Upload a file or image</p>
                    <ImageUploader setImageId={id => handleAnswerChange(stepIndex, qIndex, id)} />
                    <FileUploader setFileId={id => handleAnswerChange(stepIndex, qIndex, id)} />
                  </>}
              </div>)}
          </Step>)}
      </Stepper>
    </div>;
}