"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureSourceFromSearch } from "@/lib/sourceTracking";

// Speichert den ?source=-Parameter bei jeder Navigation im localStorage,
// damit die Partner-/Einladungsquelle bis zur Registrierung erhalten bleibt –
// auch wenn der Nutzer vorher auf der Plattform herumklickt.
export default function SourceTracker() {
  const pathname = usePathname();
  useEffect(() => {
    captureSourceFromSearch(window.location.search);
  }, [pathname]);
  return null;
}
