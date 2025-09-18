// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function useGlobalActivityTracker() {
  const trackActivity = useMutation(api.users.trackUserActivity);
  const pathname = usePathname();
  const sessionStartTime = useRef<number>(Date.now());
  const lastActivityTime = useRef<number>(Date.now());

  // Track page views
  useEffect(() => {
    if (!pathname) return;
    
    const timer = setTimeout(() => {
      trackActivity({
        activityType: "page_view",
        page: pathname,
        metadata: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
        }
      });
    }, 1000); // Wait 1 second to ensure user is actually viewing

    return () => clearTimeout(timer);
  }, [pathname, trackActivity]);

  // Track user actions (clicks, form submissions)
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
        
        trackActivity({
          activityType: "action",
          action: `click_${buttonText.toLowerCase().replace(/\s+/g, '_')}`,
          page: pathname,
          metadata: {
            elementType: target.tagName.toLowerCase(),
            elementText: buttonText,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
          }
        });
        
        lastActivityTime.current = Date.now();
      }
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formName = form.getAttribute('name') || 
                      form.getAttribute('id') || 
                      'unknown_form';
      
      trackActivity({
        activityType: "action",
        action: `submit_${formName}`,
        page: pathname,
        metadata: {
          formName,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
        }
      });
    };

    // Add global event listeners
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('submit', handleSubmit);
    };
  }, [pathname, trackActivity]);

  // Track session end on page unload (removed to prevent browser warnings)
  // Note: Session tracking is now handled by the login event and page views

  // Track login when component mounts (for new sessions)
  useEffect(() => {
    sessionStartTime.current = Date.now();
    trackActivity({
      activityType: "login",
      page: pathname,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });
  }, []); // Only run once on mount

  // Helper functions for manual tracking
  const trackUserAction = (action: string, additionalData?: any) => {
    trackActivity({
      activityType: "action",
      action,
      page: pathname,
      metadata: {
        ...additionalData,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });
    lastActivityTime.current = Date.now();
  };

  const trackLogin = () => {
    sessionStartTime.current = Date.now();
    trackActivity({
      activityType: "login",
      page: pathname,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }
    });
  };

  const trackLogout = () => {
    const sessionDuration = Date.now() - sessionStartTime.current;
    trackActivity({
      activityType: "logout",
      page: pathname,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        sessionDuration
      }
    });
  };

  return {
    trackUserAction,
    trackLogin,
    trackLogout
  };
}
