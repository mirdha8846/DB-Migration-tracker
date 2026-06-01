"use client";

import { useEffect } from "react";

export function Spotlight() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  }, []);

  return <div id="spotlight" aria-hidden />;
}
