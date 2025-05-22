// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { FaPlay } from "react-icons/fa";
import { motion } from "framer-motion";
export default function GettingElectricity() {
  const [videoOpen, setVideoOpen] = useState(false);
  return <div className="max-w-5xl mx-auto p-8 bg-white rounded-lg shadow-lg text-gray-800">
      <h2 className="text-4xl font-extrabold text-green-700 text-center mb-6">Getting Electricity</h2>
      <p className="text-lg text-gray-700 mb-6 text-center">
        The Nigerian government has implemented significant reforms to streamline the process of connecting new customers to the electricity grid, enhancing efficiency and transparency.
      </p>

      {}
      <div className="relative flex justify-center items-center w-full h-72 bg-gray-300 rounded-xl overflow-hidden cursor-pointer shadow-md" onClick={() => setVideoOpen(true)}>
        {!videoOpen ? <motion.div initial={{
        scale: 0.9,
        opacity: 0
      }} animate={{
        scale: 1,
        opacity: 1
      }} transition={{
        duration: 0.5
      }} className="flex flex-col items-center justify-center">
            <div className="p-6 bg-gray-900 bg-opacity-75 rounded-full flex items-center justify-center">
              <FaPlay className="text-white text-4xl" />
            </div>
            <span className="absolute bottom-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-md text-sm">Click to Play</span>
          </motion.div> : <iframe className="w-full h-full" src="https://www.youtube.com/embed/YOUR_VIDEO_ID" title="Getting Electricity Reform" allowFullScreen></iframe>}
      </div>

      {}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Key Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-100 rounded-lg shadow-md flex items-center">
            <span className="text-lg font-semibold">🔹 Connection time reduced from 176 to 30 days.</span>
          </div>
          <div className="p-4 bg-green-100 rounded-lg shadow-md flex items-center">
            <span className="text-lg font-semibold">🔹 Online application process for new electricity connections.</span>
          </div>
          <div className="p-4 bg-yellow-100 rounded-lg shadow-md flex items-center">
            <span className="text-lg font-semibold">🔹 Reduction of procedures required for connection from 9 to 5 steps.</span>
          </div>
          <div className="p-4 bg-red-100 rounded-lg shadow-md flex items-center">
            <span className="text-lg font-semibold">🔹 Automated connection tracking system introduced.</span>
          </div>
        </div>
      </div>

      {}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Steps for New Connection</h3>
        <ul className="space-y-4">
          <li className="p-4 bg-gray-100 rounded-lg shadow-md flex items-start">
            <span className="font-semibold text-lg">1.</span>
            <p className="ml-3">Submit an application form along with necessary documents online.</p>
          </li>
          <li className="p-4 bg-gray-100 rounded-lg shadow-md flex items-start">
            <span className="font-semibold text-lg">2.</span>
            <p className="ml-3">Receive and accept a cost estimate provided by the electricity distribution company.</p>
          </li>
          <li className="p-4 bg-gray-100 rounded-lg shadow-md flex items-start">
            <span className="font-semibold text-lg">3.</span>
            <p className="ml-3">Make the required payment as per the provided estimate.</p>
          </li>
          <li className="p-4 bg-gray-100 rounded-lg shadow-md flex items-start">
            <span className="font-semibold text-lg">4.</span>
            <p className="ml-3">Undergo a technical inspection conducted by the distribution company.</p>
          </li>
          <li className="p-4 bg-gray-100 rounded-lg shadow-md flex items-start">
            <span className="font-semibold text-lg">5.</span>
            <p className="ml-3">Obtain meter installation and final connection to the electricity grid.</p>
          </li>
        </ul>
      </div>

      {}
      <div className="mt-8 text-center">
        <a href="https://pebec.gov.ng/reforms-implemented/getting-electricity/" target="_blank" className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-lg font-semibold transition duration-300 shadow-lg">
          Learn More
        </a>
      </div>
    </div>;
}