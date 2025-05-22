// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { FaInfoCircle, FaBusinessTime, FaMoneyBillWave, FaExclamationTriangle, FaEnvelope, FaPlay, FaRocket, FaPaperPlane } from "react-icons/fa";
import popupGif from "@/public/images/herogif1.gif";
import SendLetterModal from "../BusinessLetters/SubmitLetter";
import { Dialog } from "@headlessui/react";
import RotatingText from "../RotatingText";
import heroBg from "@/public/images/hero_test.jpg";
const placeholderVideo = "/pebechero.mp4";
const notifications = [{
  id: 1,
  text: "Check our reforms!",
  icon: <FaInfoCircle className="text-white text-lg" />,
  bgColor: "bg-green-600"
}, {
  id: 2,
  text: "How to Pay Taxes Easily",
  icon: <FaMoneyBillWave className="text-white text-lg" />,
  bgColor: "bg-green-600"
}, {
  id: 3,
  text: "How to register your business",
  icon: <FaBusinessTime className="text-white text-lg" />,
  bgColor: "bg-green-600"
}, {
  id: 4,
  text: "How to get permits",
  icon: <FaBusinessTime className="text-white text-lg" />,
  bgColor: "bg-green-600"
}, {
  id: 5,
  text: "Report a problem",
  icon: <FaExclamationTriangle className="text-white text-lg" />,
  bgColor: "bg-red-600"
}];
const Hero = () => {
  const [currentNotification, setCurrentNotification] = useState(0);
  const [hoveredLetter, setHoveredLetter] = useState(false);
  const [hoveredVideo, setHoveredVideo] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openVideo, setOpenVideo] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNotification(prev => (prev + 1) % notifications.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return <section className="overflow-hidden pb-20 pt-32 md:pt-40 xl:pb-25 xl:pt-46 relative">
      {}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white/80 z-10" />
        <Image src={heroBg} alt="Hero Background" fill quality={100} className="object-cover object-center" priority />
      </div>

      <motion.div initial={{
      x: -100,
      y: 0,
      opacity: 0
    }} animate={{
      x: [0, 400, -300, 0],
      y: [0, -100, 50, 0],
      opacity: [0, 1, 1, 0]
    }} transition={{
      duration: 5,
      ease: "easeInOut"
    }} className="absolute top-5 left-5 text-red-500 z-10">
        <FaRocket className="text-xl" />
      </motion.div>

      <div className="mx-auto max-w-c-1390 px-4 md:px-8 2xl:px-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8 xl:gap-32.5">
          <div className="md:w-1/2 text-center md:text-left">
            <div className="flex justify-center md:justify-start mb-4 gap-2">
              <span className="text-lg font-medium text-black dark:text-white">
              Transforming the Nigerian Business Landscape
              </span>
            </div>

            <h1 className="mb-5 text-3xl xl:text-5xl font-extrabold text-black dark:text-white leading-tight flex flex-wrap justify-center md:justify-start gap-2">
              <span>Making Business in</span>
              <span className="flex items-center gap-2">
                <span>Nigeria</span>
                <RotatingText texts={["Efficient", "Easy", "Digital", "Transparent"]} mainClassName="px-3 bg-green-300 text-black py-1 rounded-md font-bold" staggerFrom="last" initial={{
                y: "100%"
              }} animate={{
                y: 0
              }} exit={{
                y: "-120%"
              }} staggerDuration={0.025} splitLevelClassName="overflow-hidden" transition={{
                type: "spring",
                damping: 30,
                stiffness: 400
              }} rotationInterval={2000} />
              </span>
            </h1>

            <p className="text-gray-700 text-base md:text-lg leading-relaxed font-[Inter] tracking-wide max-w-2xl mx-auto md:mx-0">
            The Presidential Enabling
Business Environment Council
(PEBEC) is driving impactful reforms to make business in Nigeria Nigeria easier, more transparent, and less bureaucratic.  From simplified processes to digital innovations, we’re creating an environment where businesses can start, grow, and thrive with ease.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row sm:justify-center md:justify-start gap-4 w-full items-center">
            {}
              {}

            {}
            <button onClick={() => window.location.href = "/reforms"} className="group relative w-[90%] xs:w-[80%] sm:w-[50%] max-w-[250px] h-[60px] sm:h-[70px] overflow-hidden" onMouseEnter={() => setHoveredVideo(true)} onMouseLeave={() => setHoveredVideo(false)}>
  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-green-400 via-lime-500 to-emerald-500 opacity-20 blur-xl transition-all duration-500 group-hover:opacity-50 group-hover:blur-2xl" />
  <div className="relative flex justify-between items-center rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 w-full h-full">
    <div className="flex items-center gap-3">
      <FaInfoCircle className="text-green-400 w-4 h-4" />
      <div className="flex flex-col">
        <span className="text-sm font-bold text-white">Discover Our Reforms</span>
        <span className="text-[10px] font-medium text-slate-400">Explore key initiatives</span>
      </div>
    </div>
  </div>
            </button>

            </div>
          </div>

          {}
          <div className="relative w-full md:w-1/2 mt-10 lg:mt-0">
          {}

          <div className="relative w-full max-w-[720px] aspect-[16/9] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-black">
  {!openVideo ? <>
      <img src="https://img.youtube.com/vi/YT_nxv-kHN8/hqdefault.jpg" alt="Video preview" className="w-full h-full object-cover" />
      <button onClick={() => setOpenVideo(true)} className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition">
        <div className="bg-white bg-opacity-90 rounded-full p-6 shadow-xl hover:scale-105 transition-transform">
          <FaPlay className="text-green-600 text-4xl" />
        </div>
      </button>
    </> : <ReactPlayer url="https://www.youtube.com/watch?v=YT_nxv-kHN8" playing controls width="100%" height="100%" />}
          </div>


            <div className="absolute left-[50%] bottom-[-100px] transform -translate-x-1/2 w-full max-w-[350px] flex flex-col items-center">
              <AnimatePresence>
                <motion.div key={notifications[currentNotification].id} initial={{
                opacity: 0,
                y: 100
              }} animate={{
                opacity: 1,
                y: 0
              }} exit={{
                opacity: 0,
                y: -200
              }} transition={{
                duration: 2,
                ease: "easeInOut"
              }} className={`relative flex items-center gap-3 px-4 py-3 text-white rounded-lg shadow-lg border ${notifications[currentNotification].bgColor} border-opacity-70`}>
                  {notifications[currentNotification].icon}
                  <span className="text-sm">{notifications[currentNotification].text}</span>
                  <div className={`absolute bottom-[-10px] left-5 w-5 h-5 transform rotate-45 border-l border-b border-opacity-70 ${notifications[currentNotification].bgColor}`} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <SendLetterModal open={openModal} setOpen={setOpenModal} />

      {}
    </section>;
};
export default Hero;