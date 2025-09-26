// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function useGlobalActivityTracker() {
  const trackDailyActivity = useMutation(api.users.trackDailyActivity);
  const currentUser = useQuery(api.users.current); // Get current user data
  const pathname = usePathname();
  const sessionStartTime = useRef<number>(Date.now());
  const lastActivityTime = useRef<number>(Date.now());

  // Check if user is staff
  const isStaffUser = currentUser?.role === "staff";

  // Safe activity tracking wrapper
  const safeTrackActivity = async (activityData: any) => {
    try {
      // Validate activity data before sending
      console.log("🔍 Validating activity data:", {
        activityType: activityData.activityType,
        action: activityData.action,
        actionType: typeof activityData.action,
        actionLength: activityData.action?.length,
        page: activityData.page,
        metadata: activityData.metadata
      });

      // Clean up invalid action values
      if (activityData.action === undefined || activityData.action === null || activityData.action === '') {
        console.warn("⚠️ Invalid action detected, setting to null:", activityData.action);
        activityData.action = null;
      }

      await trackDailyActivity(activityData);
    } catch (error) {
      // Silently handle tracking errors to prevent UI disruption
      console.error("❌ Activity tracking failed:", {
        error: error,
        activityData: activityData
      });
    }
  };

  // Track page views - only for staff users, ONE page view per day regardless of which page
  useEffect(() => {
    if (!isStaffUser || !pathname) return; // Exit if not staff or no pathname

    const timer = setTimeout(() => {
      safeTrackActivity({
        activityType: "page_view",
        page: pathname,
        action: "any_page_viewed", // Same action for all pages - counts as ONE per day
        metadata: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          staffStream: currentUser?.staffStream
        }
      });
    }, 1000); // Wait 1 second to ensure user is actually viewing

    return () => clearTimeout(timer);
  }, [pathname, trackDailyActivity, isStaffUser, currentUser?.staffStream, currentUser?._id]);

  // Track only meaningful form submissions - letters, announcements, etc.
  useEffect(() => {
    if (!isStaffUser) return; // Exit if not staff

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formName = form.getAttribute('name') || 
                      form.getAttribute('id') || 
                      'unknown_form';
      
      safeTrackActivity({
        activityType: "action",
        action: `form_submitted_${formName}`,
        page: pathname,
        metadata: {
          formName,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          staffStream: currentUser?.staffStream
        }
      });
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

    console.log("🎯 trackUserAction called:", {
      action,
      actionType: typeof action,
      actionLength: action?.length,
      additionalData,
      pathname
    });

    // Validate action parameter
    if (!action || typeof action !== 'string' || action.trim() === '') {
      console.error("❌ Invalid action provided to trackUserAction:", action);
      return;
    }

    safeTrackActivity({
      activityType: "action",
      action: action.trim(),
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