"use client";
import { motion } from "framer-motion";
import { FaBuilding, FaPassport, FaFileInvoiceDollar, FaExchangeAlt, FaBolt, FaBalanceScale } from "react-icons/fa";
import SectionHeader from "../Common/SectionHeader";
import Link from "next/link";

const PEBECReforms = () => {
  return (
    <>
      <section>
        <div className="mx-auto max-w-c-1390 px-4 md:px-8 2xl:px-0">
          {/* <!-- Section Title Start --> */}
          <SectionHeader
            headerInfo={{
              title: `PEBEC REFORMS`,
              subtitle: `See Our List of Implemented Reforms`,
              description: `The Presidential Enabling Business Environment Council (PEBEC) has been working tirelessly to improve the ease of doing business in Nigeria. Explore the reforms that have transformed the business landscape, making it easier for businesses to thrive and grow.`,
            }}
          />
          {/* <!-- Section Title End --> */}
        </div>

        <div className="pattern-dots pattern-blue-500 pattern-bg-white pattern-size-4 pattern-opacity-10 relative z-50 mx-auto mt-15 max-w-c-1154 px-4 md:px-8 xl:mt-20 xl:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-10">
            {[
              { title: "Business Registration", description: "Simplified and expedited company registration process with CAC integration.", icon: <FaBuilding size={50} className="text-green-800" /> },
              { title: "Visa Reforms", description: "Implementation of an e-visa system for ease of travel and business operations.", icon: <FaPassport size={50} className="text-green-800" /> },
              { title: "Tax Payment System", description: "Digitized tax payment processes, making compliance seamless and transparent.", icon: <FaFileInvoiceDollar size={50} className="text-green-800" /> },
              { title: "Trade Facilitation", description: "Modernized port clearance and import/export procedures for efficiency.", icon: <FaExchangeAlt size={50} className="text-green-800" /> },
              { title: "Electricity Access", description: "Improved policies to ensure better access to power for businesses.", icon: <FaBolt size={50} className="text-green-800" /> },
              { title: "Regulatory Transparency", description: "Standardized procedures across agencies for business registration and compliance.", icon: <FaBalanceScale size={50} className="text-green-800" /> },
            ].map((reform, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: -20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                  },
                }}
                initial="hidden"
                whileInView="visible"
                transition={{ duration: 1, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="animate_top bg-white p-6 rounded-lg shadow-md dark:bg-btndark flex flex-col items-center text-center"
              >
                <div className="mb-4">{reform.icon}</div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{reform.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{reform.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
  <Link href="/reforms">
    <button className="px-6 py-3 text-lg font-semibold text-white bg-black rounded-lg shadow-md hover:bg-gray-950">
      Discover All
    </button>
  </Link>
</div>
      </section>
    </>
  );
};  

export default PEBECReforms;
