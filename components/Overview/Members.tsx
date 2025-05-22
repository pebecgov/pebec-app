// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaUsers, FaArrowRight } from "react-icons/fa";
import CountUp from "@/components/countup";
const memberImages = ["/images/members/member1.jpeg", "/images/members/member2.png", "/images/members/member3.png"];
export default function Members() {
  const [startCount, setStartCount] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) setStartCount(true);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return <section className="relative bg-white dark:bg-gray-900 py-16 px-6 overflow-hidden">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        {}
        <div className="w-full md:w-1/2 text-center md:text-left">
          <h3 className="text-2xl text-green-600 font-bold ">
            PEBEC Members
          </h3>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
            {" "}
            <CountUp from={0} to={23} separator="," direction="up" duration={2} startWhen={startCount} className="text-green-600" />{" "}
            Members & Counting
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            PEBEC is composed of 23 members, including high-ranking government
            officials, ministers, and key representatives from the judiciary,
            legislature, and private sector, working together to drive business
            reforms in Nigeria.
          </p>

          {}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6,
          delay: 0.2
        }} className="mt-6 p-4 bg-green-100 dark:bg-green-800 rounded-lg shadow-md">
            <h4 className="text-lg font-semibold text-green-700 dark:text-green-300">
              The PEBEC Secretariat
            </h4>
            <p className="text-gray-700 dark:text-gray-200 text-sm mt-2">
              The Presidential Enabling Business Environment Secretariat (PEBEC
              Secretariat) is responsible for implementing the council’s reform
              agenda, ensuring smoother business processes and improved
              governance.
            </p>
          </motion.div>

          {}
          <motion.a href="/members" whileHover={{
          scale: 1.05
        }} whileTap={{
          scale: 0.95
        }} className="mt-6 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition duration-300">
            See All Members <FaArrowRight />
          </motion.a>
        </div>

        {}
        <motion.div initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} transition={{
        duration: 0.6
      }} className="w-full md:w-1/3 flex justify-center mt-10 md:mt-0 relative">
          {}
          <AnimatePresence>
            {memberImages.map((image, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 40
          }} animate={{
            opacity: [0, 1, 0],
            y: [40, -90, -150]
          }} transition={{
            duration: 5,
            repeat: Infinity,
            delay: index * 1.5
          }} className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10" style={{
            left: `${20 + index * 50}px`
          }}>
                <Image src={image} width={50} height={50} className="rounded-full border-4 border-white shadow-lg" alt={`Member ${index + 1}`} />
              </motion.div>)}
          </AnimatePresence>

          {}
          <div className="relative p-8 bg-gradient-to-b from-green-700 to-green-900 text-white rounded-2xl shadow-xl flex flex-col items-center z-0">
            <FaUsers className="text-6xl mb-4" />
            <h3 className="text-3xl font-bold">
              <CountUp from={0} to={23} separator="," direction="up" duration={2} startWhen={startCount} className="text-white" />
              
            </h3>
            <p className="text-lg">High-Level Members</p>
          </div>
        </motion.div>
      </div>
    </section>;
}