"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";

interface AppBrandProps {
  href?: string;
  textClassName?: string;
  logoClassName?: string;
}

export function AppBrand({
  href = "/",
  textClassName = "text-2xl font-bold",
  logoClassName = "",
}: AppBrandProps) {
  const content = (
    <div className="flex items-center gap-3">
      <AppLogo
        className={`border border-white/30 bg-white/10 text-white/60 ${logoClassName}`}
      />
      <span className={textClassName}>Performance Tool</span>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="flex items-center gap-3">
      {content}
    </Link>
  );
}
