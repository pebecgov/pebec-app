"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaBuilding } from "react-icons/fa";
import PEBECInfoCard from "./PebecCard";
import Link from "next/link";

export default function PEBECSection() {
  return (
    <section className="relative py-16 bg-gray-100 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left - Founded Card */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="w-full lg:w-1/2"
        >
          <PEBECInfoCard/>
        </motion.div>

        {/* Right - Text Content */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="w-full lg:w-1/2 text-center lg:text-left"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-green-700 leading-tight">PEBEC: Transforming Nigeria's Business Landscape</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm md:text-base">
            The Presidential Enabling Business Environment Council (PEBEC) was set up in July 2016 to drive Nigeria’s
            business environment reform. With a clear mandate, PEBEC focuses on eliminating bureaucratic constraints
            and improving Nigeria’s business perception worldwide.
          </p>
          <ul className="mt-4 space-y-2 text-gray-600 dark:text-gray-400 text-sm md:text-base">
            <li className="flex items-center gap-2">✅ Removing legislative barriers to doing business</li>
            <li className="flex items-center gap-2">✅ Improving ease of doing business rankings</li>
            <li className="flex items-center gap-2">✅ Enhancing business perception and global trust</li>
            <li className="flex items-center gap-2">✅ Driving sustainable reforms for economic growth</li>
          </ul>

          {/* Member Icons
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-6">
            <Image src="/images/members/member1.jpeg" width={40} height={40} alt="Member 1" className="rounded-full border-2 border-gray-200" />
            <Image src="/images/members/member2.png" width={40} height={40} alt="Member 2" className="rounded-full border-2 border-gray-200" />
            <Image src="/images/members/member3.png" width={40} height={40} alt="Member 3" className="rounded-full border-2 border-gray-200" />
            <Link href="/members" className="text-sm text-blue-600 hover:underline">
    + More Members
  </Link>          
  </div> */}
        </motion.div>
      </div>
    </section>
  );
}
