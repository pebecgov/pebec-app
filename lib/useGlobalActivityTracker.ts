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


  // Safe activity tracking wrapper
  const safeTrackActivity = async (activityData: any) => {
    try {
      await trackActivity(activityData);
    } catch (error) {
      // Silently handle tracking errors to prevent UI disruption
      console.log("Activity tracking failed:", error);
    }
  };

  // Track page views
  useEffect(() => {
    if (!pathname) return;
    
    const timer = setTimeout(() => {
      safeTrackActivity({
        activityType: "page_view",
        page: pathname,
        metadata: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
        }
      });
    }, 1000); // Wait 1 second to ensure user is actually viewing

    return () => clearTimeout(timer);
  }, [pathname, safeTrackActivity]);


  // Track page views - only for staff users, ONE page view per day regardless of which page
  useEffect(() => {

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Only track meaningful interactions
      if (target.tagName === 'BUTTON' || 
          target.tagName === 'A' || 
          target.closest('button') || 
          target.closest('a') ||
          target.getAttribute('role') === 'button') {
        
        const buttonText = target.textContent?.trim() || 
                          target.getAttribute('aria-label') || 
                          target.getAttribute('title') || 
                          'Unknown Action';
        
        safeTrackActivity({
          activityType: "action",
          action: `click_${buttonText.toLowerCase().replace(/\s+/g, '_')}`,

          page: pathname,
          action: "any_page_viewed", // Same action for all pages - counts as ONE per day
          metadata: {
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            staffStream: currentUser?.staffStream
          }
        });
      }, 1000); // Wait 1 second to ensure user is actually viewing

      return () => clearTimeout(timer);
    }
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

  }, [pathname, safeTrackActivity]);


  // Track session end on page unload (removed to prevent browser warnings)
  // Note: Session tracking is now handled by the login event and page views

  // Track login only once per session, not on every page refresh
  useEffect(() => {

    sessionStartTime.current = Date.now();
    safeTrackActivity({
      activityType: "login",
      page: pathname,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });
  }, []); // Only run once on mount


    // Only track login if this is a new session (not a page refresh)
    const sessionKey = `session_${currentUser?._id}`;
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
