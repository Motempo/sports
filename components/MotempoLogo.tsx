"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MotempoLogoProps {
  className?: string;
  priority?: boolean;
}

export function MotempoLogo({ className, priority }: MotempoLogoProps) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const sync = () => {
      setLight(document.documentElement.classList.contains("light"));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Image
      src={light ? "/logo-black.png" : "/logo-white.png"}
      alt="Motempo"
      width={120}
      height={85}
      className={cn("h-7 w-auto shrink-0 object-contain sm:h-9", className)}
      priority={priority}
      unoptimized
    />
  );
}
