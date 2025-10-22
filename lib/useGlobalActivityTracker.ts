// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function useGlobalActivityTracker() {
  const trackDailyActivity = useMutation(api.users.trackUserActivity);
  const currentUser = useQuery(api.users.current); // Get current user data
  const pathname = usePathname();
  const sessionStartTime = useRef<number>(Date.now());
  const lastActivityTime = useRef<number>(Date.now());

  // Check if user is staff
  const isStaffUser = currentUser?.role === "staff";

  // Safe activity tracking wrapper
  const safeTrackActivity = async (activityData: any) => {
    try {
      console.log("Tracking activity:", activityData);
      const result = await trackDailyActivity(activityData);
      console.log("Activity tracking result:", result);
    } catch (error) {
      // Silently handle tracking errors to prevent UI disruption
      console.log("Activity tracking failed:", error);
    }
  };

  // Track page views - only for staff users, ONE page view per day
  useEffect(() => {
    if (!isStaffUser || !pathname) return; // Exit if not staff or no pathname

    const timer = setTimeout(() => {
      safeTrackActivity({
        activityType: "page_view",
        page: "daily_page_view", // Same page for all views - counts as ONE per day
        action: "daily_page_view", // Same action for all pages - counts as ONE per day
        metadata: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          staffStream: currentUser?.staffStream
        }
      });
    }, 1000); // Wait 1 second to ensure user is actually viewing

    return () => clearTimeout(timer);
  }, [pathname, trackDailyActivity, isStaffUser, currentUser?.staffStream, currentUser?._id]);

  // Track letter submissions - count every letter submission
  useEffect(() => {
    if (!isStaffUser) return; // Exit if not staff

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formName = form.getAttribute('name') || 
                      form.getAttribute('id') || 
                      'unknown_form';
      
      // Only track letter submissions, not all forms
      if (formName.toLowerCase().includes('letter') || 
          formName.toLowerCase().includes('send') ||
          pathname?.includes('/send-letters') ||
          pathname?.includes('/letters')) {
        
        safeTrackActivity({
          activityType: "action",
          action: "letter_submission", // Track actual letter submission
          page: pathname, // Track actual page where letter was submitted
          metadata: {
            formName,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            staffStream: currentUser?.staffStream
          }
        });
      }
    };

    // Only listen for form submissions
    document.addEventListener('submit', handleSubmit);
    
    return () => {
      document.removeEventListener('submit', handleSubmit);
    };
  }, [pathname, safeTrackActivity, isStaffUser, currentUser?.staffStream]);

  // Track login only once per session, not on every page refresh
  useEffect(() => {
    if (!isStaffUser || !currentUser?._id) return; // Exit if not staff or no user ID

    // Only track login if this is a new session (not a page refresh)
    const sessionKey = `session_${currentUser._id}`;
    const hasTrackedLogin = sessionStorage.getItem(sessionKey);
    
    if (!hasTrackedLogin) {
      sessionStartTime.current = Date.now();
      sessionStorage.setItem(sessionKey, 'true');
      
      trackDailyActivity({
        activityType: "login",
        page: pathname,
        action: "daily_login",
        metadata: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          staffStream: currentUser?.staffStream
        }
      });
    }
  }, [isStaffUser, currentUser?._id, pathname, trackDailyActivity, currentUser?.staffStream]);

  // Helper functions for manual tracking - only for staff users
  const trackUserAction = (action: string, additionalData?: any) => {
    if (!isStaffUser) return; // Exit if not staff

    safeTrackActivity({
      activityType: "action",
      action,
      page: pathname,
      metadata: {
        ...additionalData,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        staffStream: currentUser?.staffStream
      }
    });
    lastActivityTime.current = Date.now();
  };

  const trackLogin = () => {
    if (!isStaffUser) return; // Exit if not staff

    sessionStartTime.current = Date.now();

    safeTrackActivity({
      activityType: "login",
      page: pathname,
      action: "manual_login",
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        staffStream: currentUser?.staffStream
      }
    });
  };

  const trackLogout = () => {
    if (!isStaffUser) return; // Exit if not staff

    const sessionDuration = Date.now() - sessionStartTime.current;

    safeTrackActivity({
      activityType: "logout",
      page: pathname,
      action: "user_logout",
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        sessionDuration,
        staffStream: currentUser?.staffStream
      }
    });
  };

  return {
    trackUserAction,
    trackLogin,
    trackLogout,
    isStaffUser // Export this so components can check if tracking is active
  };
}