// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { motion } from "framer-motion";
import { FaBuilding, FaCheckCircle } from "react-icons/fa";
export default function PEBECInfoCard() {
  return <motion.div initial={{
    opacity: 0,
    y: 30
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.6,
    ease: "easeOut"
  }} className="relative max-w-md mx-auto p-6 bg-gradient-to-b from-green-800 to-green-900 text-white rounded-2xl shadow-2xl border border-green-600 overflow-hidden">
      {}
      <div className="absolute inset-0 bg-green-700 opacity-30 blur-[50px] -z-10"></div>

      {}
      <div className="flex items-center space-x-3">
        <div className="bg-green-600 p-3 rounded-full">
          <FaBuilding className="text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold">PEBEC</h2>
      </div>
      <p className="mt-2 text-gray-300">Founded in 2016</p>

      {}
      <p className="mt-4 text-sm text-gray-300">
        The Presidential Enabling Business Environment Council (PEBEC) was
        established in July 2016 by His Excellency, President Muhammadu Buhari,
        GCFR, to make Nigeria an easier place to do business.
      </p>

      {}
      <div className="mt-4 space-y-2">
        <p className="flex items-center gap-2 text-sm">
          <FaCheckCircle className="text-green-400" /> Improving Nigeria’s
          business climate
        </p>
        <p className="flex items-center gap-2 text-sm">
          <FaCheckCircle className="text-green-400" /> Strengthening investor
          confidence
        </p>
        <p className="flex items-center gap-2 text-sm">
          <FaCheckCircle className="text-green-400" /> Promoting economic growth
        </p>
      </div>

 
    </motion.div>;
}