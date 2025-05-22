// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect } from "react";
const ChatbaseScript = () => {
  useEffect(() => {
    const script = document.createElement("script") as any;
    script.src = "https://www.chatbase.co/embed.min.js";
    script.id = "C5LZF-i6kWhTsgmp451so";
    script.domain = "www.chatbase.co";
    document.body.appendChild(script);
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
          }
        });
      }
    })();
  }, []);
  return null;
};
export default ChatbaseScript;