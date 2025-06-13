// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FaPlay, FaUserAlt, FaSignInAlt, FaRegCommentDots, FaCheckSquare, FaCheckDouble } from "react-icons/fa";
import { MdAppRegistration, MdDashboard } from "react-icons/md";
import Image from "next/image";
import TopMDAs from "./TopMDAS";
import ReportGovFAQ from "../ReportgovFAQ";
export default function ReportGovPage() {
  const router = useRouter();
  const {
    isSignedIn
  } = useAuth();
  const [showVideo, setShowVideo] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const {
    user
  } = useUser();
  const isUserRole = user?.publicMetadata?.role === "user";
  const handleGuestClick = () => {
    if (isSignedIn && user?.publicMetadata?.role === "user") {
      router.push("/reportgov");
    } else {
      router.push("/reportgov-guest");
    }
  };
  const handleSignInClick = () => router.push("/sign-in");
  const handleSignUpClick = () => router.push("/sign-up");
  const handleStatusCheckClick = () => router.push("/reportgov-check-status");
  const handleFeedbackClick = () => router.push("/feedback");
  const {
    signOut
  } = useClerk();
  const handleSubmitComplaintClick = async () => {
    if (isSignedIn) {
      const primaryEmail = user?.primaryEmailAddress?.emailAddress;
      const currentSignedInEmail = user?.emailAddresses[0]?.emailAddress;
      if (primaryEmail && currentSignedInEmail && primaryEmail !== currentSignedInEmail) {
        await signOut();
        router.push("/reportgov-ng");
        return;
      }
      router.push("/reportgov");
    } else {
      setShowSignInModal(true);
    }
  };
  return <div className="font-sans bg-white mt-20">
      {}
      <section className="flex flex-col md:flex-row items-center justify-between gap-8 px-6 py-16 max-w-7xl mx-auto">
        <div className="md:w-1/2 space-y-6">
          <h2 className="text-green-800 text-2xl font-semibold">Welcome to <span className="text-red-700 font-bold">ReportGov</span></h2>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            The Official Nigerian Public Complaint Portal
          </h1>
          <p className="text-gray-600 max-w-xl">
            ReportGov is a centralized platform where citizens and businesses can file complaints about government MDAs. Complaints are handled within 72 hours by the appropriate authority.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative group">
            <button onClick={handleSubmitComplaintClick} disabled={!!user && user.publicMetadata?.role !== "user"} className={`relative inline-block p-px font-semibold leading-6 text-white bg-green-900 shadow-2xl rounded-2xl transition-all duration-300 ease-in-out ${!!user && user.publicMetadata?.role !== "user" ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95 hover:shadow-green-700"}`}>

                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-600 via-emerald-500 to-lime-500 p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
                <span className="relative z-10 block px-6 py-3 rounded-2xl bg-green-950">
                  <div className="relative z-10 flex items-center space-x-3">
                    <span className="transition-all duration-500 group-hover:translate-x-1.5 group-hover:text-lime-300">
                      Submit Your Complaint
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 transition-all duration-500 group-hover:translate-x-1.5 group-hover:text-lime-300">
                      <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" />
                    </svg>
                  </div>
                </span>
              </button>
            </div>

            {}
          </div>
        </div>

        <div className="md:w-1/2 flex flex-col items-center justify-center">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">Choose How You'd Like to Proceed</h3>
            <p className="text-gray-600 text-sm">Select one of the options below to get started</p>
          </div>

      {}
      <div className="grid grid-cols-2 gap-6 text-white">
        <div className="flex flex-col items-center">
        <button onClick={handleFeedbackClick} disabled={!!user && user.publicMetadata?.role !== "user"} className={`w-[140px] h-[140px] bg-green-800 rounded-[140px_10px_10px_10px] shadow-xl flex items-center justify-center transition-all ${!!user && user.publicMetadata?.role !== "user" ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:bg-green-700"}`}>

            <FaRegCommentDots className="text-white text-5xl" />
          </button>
          <span className="mt-2 text-green-900 font-semibold text-sm">Share Feedback</span>
        </div>

        <div className="flex flex-col items-center">
        <button onClick={handleGuestClick} disabled={!!user && user.publicMetadata?.role !== "user"} className={`w-[140px] h-[140px] bg-green-800 rounded-[10px_140px_10px_10px] shadow-xl flex items-center justify-center transition-all ${!!user && user.publicMetadata?.role !== "user" ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:bg-green-700"}`}>

            <FaUserAlt className="text-white text-5xl" />
          </button>
          <span className="mt-2 text-green-900 font-semibold text-sm">Complain as Guest</span>
        </div>

        <div className="flex flex-col items-center">
          <button onClick={handleStatusCheckClick} className="w-[140px] h-[140px] bg-green-800 rounded-[10px_10px_10px_140px] shadow-xl hover:scale-105 hover:bg-green-700 transition-all flex items-center justify-center">
            <FaCheckDouble className="text-white text-5xl" />
          </button>
          <span className="mt-2 text-green-900 font-semibold text-sm">Check Complaint Status</span>
        </div>

       {}
          <div className="flex flex-col items-center">
  <button onClick={() => {
              if (!isSignedIn) return handleSignInClick();
              const role = user?.publicMetadata?.role;
              if (role === "admin") router.push("/admin");
              else if (role === "staff") router.push("/staff");
              else if (role === "mda") router.push("/mda");
              else if (role === "reform_champion") router.push("/reform_champion");
              else if (role === "saber_agent") router.push("/saber_agent");
              else if (role === "president") router.push("/president");
              else if (role === "vice_president") router.push("/vice_president");
              else if (role === "world_bank") router.push("/world_bank");
              else if (role === "user") router.push("/reportgov");
              else router.push("/");
            }} className="w-[140px] h-[140px] bg-green-800 rounded-[10px_10px_140px_10px] shadow-xl hover:scale-105 hover:bg-green-700 transition-all flex items-center justify-center">
    {isSignedIn ? <MdDashboard className="text-white text-5xl" /> : <FaSignInAlt className="text-white text-5xl" />}
  </button>
  <span className="mt-2 text-green-900 font-semibold text-sm">
    {isSignedIn ? "My Dashboard" : "Sign In"}
  </span>
          </div>
      </div>
        </div>
      </section>

      {}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">How ReportGov Works</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <p className="text-gray-700">
                Citizens or Businesses can file complaints through two options: as a guest or as a registered user.
              </p>
              <ul className="list-disc ml-6 text-gray-600 space-y-2">
                <li><strong>Guest:</strong> Submit a complaint and receive updates via email. Track complaint using ticket number.</li>
                <li><strong>Registered User:</strong> Access your dashboard, comment, cancel or reopen complaints within 24hrs, auto-fill forms, and receive notifications.</li>
              </ul>
              <p className="mt-4 text-gray-700 font-medium">4 Easy Steps:</p>
              <ol className="list-decimal ml-6 text-gray-600">
                <li>Fill in Personal Information</li>
                <li>Provide Report Details</li>
                <li>Select MDA and Incident Date</li>
                <li>Upload Documents (optional)</li>
              </ol>
              <p className="text-green-600 font-semibold mt-4">Expected resolution time: <span className="underline">72 hours</span></p>
            </div>
            <div className="hidden md:block">
              <Image src="/images/reportworkflow.svg" alt="Workflow Illustration" width={500} height={500} className="rounded-xl mx-auto" />
            </div>
          </div>
        </div>
      </section>

      <TopMDAs />

      {}
      {showVideo && <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-start pt-16 sm:pt-24">
    <div className="relative w-[95%] max-w-3xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
      <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
      <button onClick={() => setShowVideo(false)} className="absolute top-3 right-3 text-white text-lg bg-black bg-opacity-70 rounded-full w-8 h-8 flex items-center justify-center">
        &times;
      </button>
    </div>
  </div>}

    <ReportGovFAQ />



      {}
      {showSignInModal && <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-start pt-24">
    <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
      <h2 className="text-lg font-semibold mb-4">Sign In to Continue</h2>
      <SignInButton mode="modal">
        <Button className="w-full">Sign In</Button>
      </SignInButton>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => setShowSignInModal(false)}>
        Cancel
      </Button>
    </div>
  </div>}

    </div>;
}