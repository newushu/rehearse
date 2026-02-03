"use client";

import { useEffect, useState } from "react";

interface AppLogoProps {
  size?: number;
  className?: string;
  imgClassName?: string;
}

export function AppLogo({
  size = 36,
  className = "",
  imgClassName = "",
}: AppLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/app-logo");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setLogoUrl(data.logoUrl || null);
      } catch {
        // ignore logo fetch errors
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: 8 }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="App logo"
          className={`max-w-full max-h-full object-contain ${imgClassName}`}
        />
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          Logo
        </span>
      )}
    </div>
  );
}
