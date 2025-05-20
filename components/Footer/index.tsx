"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import SocialMedia from "../SocialMedia";

const Footer = () => {

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = useMutation(api.newsletters.subscribeToNewsletter);
  const [error, setError] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await subscribe({ email });
      if (res?.success) {
        setSubscribed(true);
        setEmail("");
        setTimeout(() => setSubscribed(false), 5000);
      }
    } catch (err) {
      console.error("Subscription failed", err);
    }
  };


  return (
    <footer className=" bg-white md:mb-5 mb-30 dark:bg-black text-black dark:text-white border-t border-stroke dark:border-strokedark">
      <div className="mx-auto max-w-c-1390 px-4 md:px-8 2xl:px-0">
        {/* Footer Top */}
        <div className="py-20 lg:py-25">
  <div className="flex flex-col lg:flex-row lg:justify-between lg:gap-20 gap-12">
    {/* Logo & Description */}
    <motion.div
      variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
      initial="hidden"
      whileInView="visible"
      transition={{ duration: 1, delay: 0.3 }}
      viewport={{ once: true }}
      className="w-full lg:w-1/4 flex flex-col items-center lg:items-start text-center lg:text-left"
    >
      <Link href="/" className="mb-4">
        <Image
          width={160}
          height={80}
          src="/images/logo/logo_pebec1.PNG"
          alt="PEBEC Logo"
          className="dark:hidden mx-auto lg:mx-0"
        />
        <Image
          width={140}
          height={90}
          src="/images/logo/logo-dark.svg"
          alt="PEBEC Logo"
          className="hidden dark:block mx-auto lg:mx-0"
        />
      </Link>

      <p className="mb-6 mt-2 text-sm max-w-md">
        The PEBEC Secretariat is committed to removing bureaucratic and legislative constraints to doing business and improving the ease of doing business in Nigeria.
      </p>
      <p className="mb-1.5 text-green-700 uppercase tracking-[5px] text-sm">Contact</p>
      <a href="mailto:info@pebec.gov.ng" className="font-medium text-black dark:text-white text-sm">
        info@pebec.gov.ng
      </a>
    </motion.div>

    {/* Links Section */}
    <div className="w-full lg:flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 text-center sm:text-left">
      {/* About */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
        initial="hidden"
        whileInView="visible"
        transition={{ duration: 1, delay: 0.1 }}
        viewport={{ once: true }}
      >
        <h4 className="mb-4 text-green-700 font-medium text-lg">About PEBEC</h4>
        <ul>
          <li><Link href="/overview" className="block mb-3 hover:text-primary">Overview</Link></li>
          <li><Link href="/vision-mission" className="block mb-3 hover:text-primary">Our Milestones</Link></li>
          <li><Link href="/members" className="block mb-3 hover:text-primary">PEBEC Members</Link></li>
          <li><Link href="/reportgov-ng" className="block mb-3 hover:text-primary">Reportgov</Link></li>
        </ul>
      </motion.div>

      {/* Resources */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
        initial="hidden"
        whileInView="visible"
        transition={{ duration: 1, delay: 0.2 }}
        viewport={{ once: true }}
      >
        <h4 className="mb-4 text-green-700 font-medium text-lg">Resources</h4>
        <ul>
          <li><Link href="/reports" className="block mb-3 hover:text-primary">Our Reports</Link></li>
          <li><Link href="/portal" className="block mb-3 hover:text-primary">E-Portal</Link></li>
          <li><Link href="/media" className="block mb-3 hover:text-primary">Media</Link></li>
          <li><Link href="/faq" className="block mb-3 hover:text-primary">FAQ</Link></li>
        </ul>
      </motion.div>

      {/* Newsletter */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
        initial="hidden"
        whileInView="visible"
        transition={{ duration: 1, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <h4 className="mb-4 text-green-700 font-medium text-lg">Newsletter</h4>
        <p className="mb-4 text-sm">Subscribe to receive future updates</p>
        <form onSubmit={handleSubmit}>
          <div className="relative w-full">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-full border border-stroke px-6 py-3 shadow focus:border-primary focus:outline-none dark:border-strokedark dark:bg-black"
            />
            <button type="submit" aria-label="Signup to newsletter" className="absolute right-0 top-0 p-4">
              <svg className="fill-[#757693] hover:fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 20 20">
                <path d="M3.1175 1.17318L18.5025 9.63484...Z" />
              </svg>
            </button>
          </div>
          {subscribed && <p className="text-green-600 text-sm mt-2">Subscribed successfully ✅</p>}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      </motion.div>
    </div>
  </div>
</div>


        <div className="max-w-c-1390 mx-auto px-4 md:px-8 2xl:px-0">
  <SocialMedia />
</div>


        {/* Footer Bottom */}
         {/* Footer Bottom */}
<div className="border-t border-stroke py-6 dark:border-strokedark">
  <motion.div
    className="text-center"
    variants={{
      hidden: { opacity: 0, y: -10 },
      visible: { opacity: 1, y: 0 },
    }}
    initial="hidden"
    whileInView="visible"
    transition={{ duration: 0.6 }}
    viewport={{ once: true }}
  >
    <p className="text-sm text-gray-600 dark:text-gray-300">
      &copy; {new Date().getFullYear()} PEBEC. All rights reserved.
    </p>
  </motion.div>
</div>


        

         
        </div>
    </footer>
  );
};

export default Footer;
