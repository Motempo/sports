import Image from "next/image";
import { cn } from "@/lib/utils";

interface MotempoLogoProps {
  className?: string;
  priority?: boolean;
}

const logoClassName = "h-7 w-auto shrink-0 object-contain sm:h-9";

export function MotempoLogo({ className, priority }: MotempoLogoProps) {
  return (
    <>
      <Image
        src="/logo-white.png"
        alt="Motempo"
        width={120}
        height={85}
        className={cn(logoClassName, "motempo-logo-light", className)}
        priority={priority}
        unoptimized
      />
      <Image
        src="/logo-black.png"
        alt="Motempo"
        width={120}
        height={85}
        className={cn(logoClassName, "motempo-logo-dark", className)}
        priority={priority}
        unoptimized
      />
    </>
  );
}
