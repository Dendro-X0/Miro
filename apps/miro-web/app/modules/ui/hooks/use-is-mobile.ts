"use client";

import { useEffect, useState } from "react";

interface UseIsMobileResult {
  readonly isMobile: boolean;
}

const mobileMaxWidth: number = 767;

/**
 * Detect whether the current viewport should be treated as mobile.
 */
export default function useIsMobile(): UseIsMobileResult {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect((): (() => void) | void => {
    if (typeof window === "undefined") {
      return undefined;
    }
    function updateIsMobile(): void {
      const nextIsMobile: boolean = window.innerWidth <= mobileMaxWidth;
      setIsMobile(nextIsMobile);
    }
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return (): void => {
      window.removeEventListener("resize", updateIsMobile);
    };
  }, []);

  const result: UseIsMobileResult = { isMobile };
  return result;
}
