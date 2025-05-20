"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaChevronUp, FaQuestionCircle, FaBuilding, FaBalanceScale, FaCheckCircle } from "react-icons/fa";
import { Link as ScrollLink } from "react-scroll";

const faqCategories = [
  { id: "pebec-role", label: "PEBEC Role", icon: <FaQuestionCircle className="text-green-600 text-xl" /> },
  { id: "business-env", label: "Improving Business Environment", icon: <FaBuilding className="text-green-600 text-xl" /> },
  { id: "reform-benefits", label: "Reform Impact & Benefits", icon: <FaCheckCircle className="text-green-600 text-xl" /> },
  { id: "legal", label: "Legal & Regulatory", icon: <FaBalanceScale className="text-green-600 text-xl" /> },
];

const faqData = {
  "pebec-role": [
    { question: "What is PEBEC and its role?", answer: "PEBEC (Presidential Enabling Business Environment Council) drives reforms to simplify regulations, boost transparency, and improve Nigeria’s business environment." },
    { question: "How does PEBEC improve the business environment?", answer: "By implementing policies that reduce bureaucratic bottlenecks, streamlining business registration, and promoting ease of doing business." },
    { question: "How can I contact PEBEC?", answer: "You can reach PEBEC via their official website, email, or visit their office for inquiries." },
  ],
  "business-env": [
    { question: "What reforms have improved business registration?", answer: "PEBEC has streamlined company registration through online platforms, reducing processing times significantly." },
    { question: "Are there incentives for businesses under PEBEC?", answer: "Yes, businesses can benefit from tax reductions, easier access to credit, and streamlined licensing." },
  ],
  "reform-benefits": [
    { question: "How do businesses benefit from PEBEC’s reforms?", answer: "Businesses experience fewer delays, reduced costs, and improved regulatory transparency." },
    { question: "What are the key achievements of PEBEC?", answer: "PEBEC has successfully improved Nigeria's ranking in the World Bank Ease of Doing Business index through digitalization and policy changes." },
  ],
  "legal": [
    { question: "How has PEBEC changed business registration?", answer: "Business registration is now faster, requiring fewer steps and is accessible online." },
    { question: "What happens if businesses don’t comply with PEBEC regulations?", answer: "Non-compliance can lead to penalties, fines, or business operation restrictions." },
  ],
};

export default function FAQPage() {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const toggle = (question: string) => {
    setActiveQuestion((prev) => (prev === question ? null : question));
  };

  return (
    <section className="py-24 mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-gray-900">Frequently asked questions</h2>
          <p className="text-gray-600 mt-2">Everything you need to know about PEBEC and the reforms</p>
        </div>

        {/* Category Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {faqCategories.map(({ id, label, icon }) => (
            <ScrollLink
              key={id}
              to={id}
              smooth
              duration={500}
              className="cursor-pointer bg-white shadow-sm rounded-full flex items-center gap-2 px-5 py-2 text-sm font-semibold border border-gray-200 hover:bg-green-50 transition"
            >
              {icon}
              {label}
            </ScrollLink>
          ))}
        </div>

        {/* FAQ Accordion */}
        {faqCategories.map(({ id, label }) => (
          <div key={id} id={id} className="mb-10">
            <h3 className="text-2xl font-bold text-green-700 mb-4">{label}</h3>
            <div className="space-y-4">
              {faqData[id].map(({ question, answer }) => {
                const isOpen = activeQuestion === question;

                return (
                  <div
                    key={question}
                    className={`rounded-xl border p-4 transition-all duration-300 ${
                      isOpen ? "bg-indigo-50 border-indigo-500" : "border-gray-300"
                    }`}
                  >
                    <button
                      className="w-full flex items-center justify-between text-left font-medium text-gray-900 text-lg"
                      onClick={() => toggle(question)}
                    >
                      <span>{question}</span>
                      {isOpen ? (
                        <FaChevronUp className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <FaChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden text-sm text-gray-800 mt-3 leading-relaxed pr-2"
                        >
                          {answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
