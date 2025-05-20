"use client";

import { useEffect } from "react";

const ChatbaseScript = () => {
  useEffect(() => {
    // Create the script element
    const script = document.createElement("script") as any; // Cast to `any`

    // Set the required properties
    script.src = "https://www.chatbase.co/embed.min.js";
    script.id = "C5LZF-i6kWhTsgmp451so"; // Your script id
    script.domain = "www.chatbase.co"; // Your domain

    // Append the script to the body
    document.body.appendChild(script);

    // Initialize Chatbase if not already initialized
    (function () {
      if (!window.chatbase || window.chatbase("getState") !== "initialized") {
        window.chatbase = (...args: any[]) => {
          if (!window.chatbase.q) {
            window.chatbase.q = [];
          }
          window.chatbase.q.push(args);
        };
        window.chatbase = new Proxy(window.chatbase, {
          get(target, prop) {
            if (prop === "q") {
              return target.q;
            }
            return (...args: any[]) => target(prop, ...args);
          },
        });
      }
    })();
  }, []); // The effect runs only once when the component is mounted

  return null; // This component doesn't need to render anything
};

export default ChatbaseScript;
