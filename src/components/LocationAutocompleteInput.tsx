"use client";

import { useEffect, useRef, useState } from "react";
import { loadGooglePlaces } from "@/lib/googlePlaces";

interface LocationAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationAutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: LocationAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "";
    if (!apiKey || !inputRef.current) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGooglePlaces(apiKey)
      .then(() => {
        if (!inputRef.current) return;
        const instance = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode"],
          fields: ["formatted_address", "name"],
        });
        autocomplete = instance;
        instance.addListener("place_changed", () => {
          const place = instance.getPlace();
          const next = place?.formatted_address || place?.name || "";
          if (next) {
            onChange(next);
          }
        });
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load Google Places");
      });

    return () => {
      if (autocomplete) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [onChange]);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      {loadError && (
        <div className="text-xs text-amber-700 mt-1">
          Location autocomplete unavailable.
        </div>
      )}
    </div>
  );
}
