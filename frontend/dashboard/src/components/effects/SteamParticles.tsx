"use client";

import { useEffect, useRef } from "react";

export function SteamParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createSteam = () => {
      const particle = document.createElement("div");
      particle.className = "steam-particle";
      const size = Math.random() * 250 + 150;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.animationDuration = `${Math.random() * 8 + 12}s`;
      particle.style.opacity = String(Math.random() * 0.4);
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 20000);
    };

    for (let i = 0; i < 10; i++) createSteam();
    const interval = setInterval(createSteam, 1000);
    return () => clearInterval(interval);
  }, []);

  return <div ref={containerRef} className="steam-container" aria-hidden />;
}
