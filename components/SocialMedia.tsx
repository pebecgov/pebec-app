"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  FaInstagram,
  FaTwitter,
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
  FaTiktok,
} from "react-icons/fa";

const socials = [
  {
    icon: <FaInstagram />,
    label: "Instagram",
    href: "https://www.instagram.com/businessmadeeasyng",
    color: "bg-pink-500 border-pink-500",
  },
  {
    icon: <FaTwitter />,
    label: "Twitter (X)",
    href: "https://x.com/pebecgovng",
    color: "bg-blue-500 border-blue-500",
  },
  {
    icon: <FaFacebookF />,
    label: "Facebook",
    href: "https://www.facebook.com/pebecgovng",
    color: "bg-blue-700 border-blue-700",
  },
  {
    icon: <FaLinkedinIn />,
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/pebecgovng/",
    color: "bg-blue-800 border-blue-800",
  },
  {
    icon: <FaYoutube />,
    label: "YouTube",
    href: "https://www.youtube.com/@pebecgovng",
    color: "bg-red-600 border-red-600",
  },
  {
    icon: <FaTiktok />,
    label: "TikTok",
    href: "https://www.tiktok.com/@pebecgovng",
    color: "bg-black border-black",
  },
];

const getHandleFromUrl = (url: string) => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);

    // Special case: LinkedIn company URLs
    if (u.hostname.includes("linkedin.com") && parts.length >= 2) {
      return `@${parts[1]}`;
    }

    const handle = parts.at(-1) || u.hostname;
    return handle.startsWith("@") ? handle : `@${handle}`;
  } catch {
    return "";
  }
};

export default function SocialMedia() {
  return (
    <section className="my-16 px-4 max-w-6xl mx-auto">
      <motion.div
        className="flex flex-col-reverse md:flex-row items-center gap-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
      >
        {/* Text & Buttons */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-semibold text-green-700 mb-3">
            Follow PEBEC
          </h2>
          <p className="text-gray-700 text-sm md:text-base max-w-xl leading-relaxed mx-auto md:mx-0">
            Please kindly follow and engage with our social media handles to
            stay updated and help spread awareness of our work. Let’s make{" "}
            <strong className="text-green-700">#PEBECWorks</strong> reach every
            Nigerian citizen! 💪
          </p>

          {/* Social Icons */}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
            {socials.map((social, idx) => (
              <a
                key={idx}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center justify-center w-36 h-32 rounded-lg ${social.color} text-white shadow hover:shadow-lg transition-shadow p-3`}
              >
                <div className="text-2xl">{social.icon}</div>
                <p className="mt-2 text-sm font-semibold">{social.label}</p>
                <p className="text-xs font-light break-words text-center leading-tight">
                  {getHandleFromUrl(social.href)}
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* Illustration */}
        <div className="flex-1">
          <Image
            src="/images/social.svg"
            alt="Social Media Illustration"
            width={400}
            height={300}
            className="mx-auto"
          />
        </div>
      </motion.div>
    </section>
  );
}
