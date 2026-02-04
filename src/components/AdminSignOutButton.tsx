"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface AdminSignOutButtonProps {
  className?: string;
}

export function AdminSignOutButton({ className }: AdminSignOutButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
      }}
      disabled={loading}
      className={className}
    >
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
