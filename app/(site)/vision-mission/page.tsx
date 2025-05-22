// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { motion, useAnimation } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { FaCheckCircle } from "react-icons/fa";
import RotatingText from "@/components/RotationText";
import { useInView } from "react-intersection-observer";
const milestones = [{
  year: "2016",
  title: "Establishment of PEBEC",
  description: "PEBEC was created to oversee Nigeria's business environment reforms.",
  date: "08/01/2016"
}, {
  year: "2018",
  title: "Global Recognition",
  description: "Nigeria recognized as one of the top 10 most improved economies globally.",
  date: "10/05/2018"
}, {
  year: "2019",
  title: "Ease of Doing Business Index",
  description: "Nigeria moved up 39 places in the Doing Business Index.",
  date: "12/08/2019"
}, {
  year: "2020",
  title: "150+ Business Reforms",
  description: "More than 150 reforms implemented to ease business processes.",
  date: "06/12/2020"
}, {
  year: "2021",
  title: "State-Level Reforms",
  description: "32 Nigerian states implemented 43 business reforms.",
  date: "04/09/2021"
}, {
  year: "2022",
  title: "National Action Plan 5.0",
  description: "Launch of NAP 5.0 to enhance business reforms nationwide.",
  date: "07/03/2022"
}, {
  year: "2023",
  title: "Global Competitiveness",
  description: "Improvements in 3 out of 4 business enabling environments.",
  date: "11/10/2023"
}];
const MissionVisionMilestones = () => {
  const milestonesRef = useRef<HTMLDivElement | null>(null);
  const scrollToMilestones = () => {
    if (milestonesRef.current) {
      milestonesRef.current.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  return <main className="font-[sans-serif] mt-25">
      {}
      <section className="relative bg-cover bg-center h-[350px] flex flex-col justify-center items-center text-white text-center px-6" style={{
      backgroundImage: "url('/images/reforms/reformshero.svg')"
    }}>
        <motion.div initial={{
        opacity: 0,
        y: -20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.8
      }} className="text-4xl md:text-5xl font-extrabold flex items-center gap-2">
          <span>PEBEC</span>
          <RotatingText texts={["Mission", "Vision", "Milestones"]} mainClassName="text-4xl md:text-5xl font-extrabold text-white" staggerFrom={"last"} initial={{
          y: "100%"
        }} animate={{
          y: 0
        }} exit={{
          y: "-120%"
        }} staggerDuration={0.025} splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1" transition={{
          type: "spring",
          damping: 30,
          stiffness: 400
        }} rotationInterval={2000} />
        </motion.div>
        <motion.p initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.8,
        delay: 0.3
      }} className="mt-3 text-lg text-gray-200 max-w-2xl">
          Discover how we are making Nigeria a better place to do business.
        </motion.p>
        <button onClick={scrollToMilestones} className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all">
          Explore Milestones ↓
        </button>
      </section>

      {}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        {}
        <motion.div initial={{
        opacity: 0,
        x: -50
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        duration: 0.8
      }}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 border-l-4 border-green-500 pl-4">Our Mission</h2>
          <p className="mt-4 text-lg text-gray-700 leading-relaxed">
            To make Nigeria a progressively easier place to do business by removing bureaucratic constraints 
            and improving the perception of the Nigerian business environment.
          </p>
        </motion.div>
        <motion.div initial={{
        opacity: 0,
        x: 50
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        duration: 0.8
      }} className="flex justify-center">
          <Image src="/images/mission.jpg" alt="Mission" width={450} height={350} className="rounded-lg shadow-lg object-cover border-4 border-green-500" />
        </motion.div>

        {}
        <motion.div initial={{
        opacity: 0,
        x: -50
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        duration: 0.8
      }}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 border-l-4 border-green-500 pl-4">Our Vision</h2>
          <p className="mt-4 text-lg text-gray-700 leading-relaxed">
            To create an enabling business environment that fosters innovation, growth, and global competitiveness.
          </p>
        </motion.div>
        <motion.div initial={{
        opacity: 0,
        x: 50
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        duration: 0.8
      }} className="flex justify-center">
          <Image src="/images/vision.jpg" alt="Vision" width={450} height={350} className="rounded-lg shadow-lg object-cover border-4 border-green-500" />
        </motion.div>
      </section>

      {}
   {}
    <section ref={milestonesRef} className="relative py-16 px-6 bg-cover bg-center" style={{
      backgroundImage: "url('/images/milestone.svg')",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat"
    }}>
  {}
  <div className="absolute inset-0 bg-white opacity-[0.8]"></div>

  <div className="relative max-w-6xl mx-auto text-center">
    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Our Milestones</h2>
    <p className="mt-4 text-lg text-gray-700">
      A journey of impactful reforms and progress in Nigeria's business environment.
    </p>
  </div>

  <div className="relative mt-12 max-w-4xl mx-auto">
    {}
    <div className="border-l-4 border-green-500 absolute left-1/2 transform -translate-x-1/2 h-full"></div>

    {milestones.map((milestone, index) => {
          const {
            ref,
            inView
          } = useInView({
            triggerOnce: true,
            threshold: 0.2
          });
          return <motion.div key={index} ref={ref} initial={{
            opacity: 0,
            x: index % 2 === 0 ? -50 : 50
          }} animate={inView ? {
            opacity: 1,
            x: 0
          } : {}} transition={{
            duration: 0.8,
            delay: index * 0.1
          }} className={`relative flex items-center w-full md:w-1/2 mx-auto py-6 ${index % 2 === 0 ? "justify-start text-right" : "justify-end text-left"}`}>
          {}
          <div className="bg-white shadow-lg rounded-lg p-6 w-72 relative">
            {}
            <FaCheckCircle className="text-green-500 text-2xl absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white p-1 rounded-full shadow-md" />

            <h3 className="text-lg font-bold text-gray-900">{milestone.title}</h3>
            <p className="text-gray-600 mt-2">{milestone.description}</p>
            <p className="text-sm text-green-600 mt-2 font-semibold">{milestone.date}</p>
          </div>
        </motion.div>;
        })}
  </div>
    </section>

    </main>;
};
export default MissionVisionMilestones;