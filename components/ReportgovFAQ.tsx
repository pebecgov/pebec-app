'use client';

import React, { useState } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';

const faqs = [
  {
    question: "What kind of complaint can I report?",
    answer:
      "You can make any business-related complaint around services rendered by Ministries, Departments and Agencies (MDAs).",
  },
  {
    question: "Can I attach a document relevant to my complaint?",
    answer:
      "Yes, you can attach any document relevant to your complaint.",
  },
  {
    question: "How do I send additional documentation for my complaint?",
    answer:
      "To send multiple documents, please combine these in a single file (pdf, docx, etc.) and submit it.",
  },
  {
    question: "Will my complaint be followed up?",
    answer:
      "Yes, your report goes to PEBEC, after which PEBEC assigns your complaint to the MDA. If unresolved in a given time, PEBEC finds out why.",
  },
  {
    question: "How can I know my complaint has been resolved or not?",
    answer:
      "You will get an email once your complaint is resolved or not. You can also check the status of your complaint on this website.",
  },
  {
    question: "Can I report a public servant for any misconduct in the course of rendering service?",
    answer:
      "Yes, you can report any misconduct such as bribes, mischievous delays, among others, by any public servant during service.",
  },
  {
    question: "Is any fee required for filing a complaint?",
    answer: "No fee is required to process a complaint on ReportGov.",
  },
  {
    question: "What are MDAs?",
    answer: "MDAs mean Ministries, Departments, and Agencies.",
  },
  {
    question: "What MDAs can I complain about?",
    answer:
      "You can complain about MDAs like the Nigerian Police, Federal Airports Authority, Immigration Services, CAC, Port Authority, NAFDAC and more.",
  },
];

export default function ReportGovFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 px-6 max-w-6xl mx-auto flex flex-col md:flex-row gap-12">
      {/* Left text */}
      <div className="flex flex-col text-left basis-1/2">
        <p className="text-green-600 font-semibold mb-4">ReportGov FAQ</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
          Frequently Asked Questions
        </h2>
      </div>

      {/* FAQ Items */}
      <ul className="basis-1/2">
        {faqs.map((faq, i) => (
          <li key={i}>
            <button
              onClick={() => toggle(i)}
              className="relative flex items-center w-full py-5 text-left text-base md:text-lg font-semibold border-t border-gray-300"
              aria-expanded={openIndex === i}
            >
              <span className="flex-1 text-gray-900">{faq.question}</span>
              <span className="ml-3">
                {openIndex === i ? (
                  <FaMinus className="w-4 h-4" />
                ) : (
                  <FaPlus className="w-4 h-4" />
                )}
              </span>
            </button>
            <div
              className={`transition-all overflow-hidden duration-300 ease-in-out ${
                openIndex === i ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div className="pb-5 pr-4 text-sm text-gray-600 leading-relaxed">
                {faq.answer}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
