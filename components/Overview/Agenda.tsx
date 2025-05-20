"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaGavel, FaShieldAlt, FaHandshake, FaBolt, FaFileContract, FaChevronUp, FaChevronDown, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const reforms = [
  {
    title: "Resolving Insolvency",
    content: "Business rescue alternatives are now available.",
    bgColor: "bg-blue-100",
    icon: <FaGavel className="h-12 w-12 text-blue-700" />, 
    details: "Full details about resolving insolvency with resources, case studies, and video."
  },
  {
    title: "Protecting Minority Investors",
    content: "Increased transparency in corporate governance.",
    bgColor: "bg-green-100",
    icon: <FaShieldAlt className="h-12 w-12 text-green-700" />, 
    details: "Details on investor protection, laws, and testimonials."
  },
  {
    title: "Enforcing Contracts",
    content: "Small Claims Courts now operational.",
    bgColor: "bg-purple-100",
    icon: <FaHandshake className="h-12 w-12 text-purple-700" />, 
    details: "Legal processes for contract enforcement with case examples."
  },
  {
    title: "Getting Electricity",
    content: "Faster connection times for new customers.",
    bgColor: "bg-yellow-100",
    icon: <FaBolt className="h-12 w-12 text-yellow-700" />, 
    details: "Guidelines for new electricity connections, regulatory changes, and video tutorials."
  },
  {
    title: "Paying Taxes",
    content: "Online tax filing and payment available.",
    bgColor: "bg-red-100",
    icon: <FaFileContract className="h-12 w-12 text-red-700" />, 
    details: "Tax payment processes, e-filing guides, and links to tax portals."
  },
];

export default function ReformSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nextSlide = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % reforms.length);
  };

  const prevSlide = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + reforms.length) % reforms.length);
  };

  return (
    <section className="relative w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h2 className="text-center text-4xl font-extrabold text-green-700 mb-10">The Reform Agenda</h2>
      
      {/* Mobile Dropdown Menu */}
      <div className="md:hidden flex justify-center mb-6">
        <button
          className="border p-2 rounded-lg bg-gray-200 text-gray-700 flex items-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          Select Reform
        </button>
        {mobileMenuOpen && (
          <div className="absolute top-20 bg-white shadow-lg rounded-lg p-4 z-50 w-60">
            {reforms.map((reform, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveIndex(index);
                  setMobileMenuOpen(false);
                }}
                className="block text-left w-full p-2 hover:bg-gray-200 rounded-md"
              >
                {reform.title}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="relative flex flex-col md:flex-row gap-6 items-center">
        {/* Left Sidebar for Desktop */}
        <div className="hidden md:flex flex-col items-center gap-2 w-40 relative overflow-hidden">
          <button onClick={prevSlide} className="text-gray-700 hover:text-gray-900">
            <FaChevronUp className="h-5 w-5" />
          </button>
          <div className="flex flex-col gap-2 w-full h-[250px] overflow-hidden">
            {reforms.map((reform, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`border p-3 rounded-md w-full flex items-center cursor-pointer transition-all ${activeIndex === index ? "border-blue-500 bg-blue-200 scale-105 shadow-lg" : "border-gray-200 bg-white"}`}
              >
                {reform.icon}
                <span className="ml-2 text-sm font-semibold">{reform.title}</span>
              </button>
            ))}
          </div>
          <button onClick={nextSlide} className="text-gray-700 hover:text-gray-900">
            <FaChevronDown className="h-5 w-5" />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="relative grow min-h-96 bg-white rounded-lg flex items-center justify-center w-full p-6 shadow-md md:ml-10 overflow-hidden">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col items-center p-8 rounded-lg ${reforms[activeIndex].bgColor} shadow-lg relative before:content-[''] before:absolute before:-left-8 before:top-1/2 before:w-0 before:h-0 before:border-t-[12px] before:border-b-[12px] before:border-r-[12px] before:border-transparent before:border-r-${reforms[activeIndex].bgColor}`}
          >
            {reforms[activeIndex].icon}
            <h3 className="text-2xl font-semibold text-gray-800 mt-4">{reforms[activeIndex].title}</h3>
            <p className="text-gray-700 mt-2 text-center">{reforms[activeIndex].details}</p>
          </motion.div>
          <button onClick={prevSlide} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-3 rounded-full text-white hover:bg-gray-900">
            <FaChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={nextSlide} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-3 rounded-full text-white hover:bg-gray-900">
            <FaChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}