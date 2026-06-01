"use client";

import { useEffect } from "react";

export function RevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("reveal-active");
            }, index * 100);
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".reveal-section").forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
