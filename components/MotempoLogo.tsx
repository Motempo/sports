import Image from "next/image";
import { cn } from "@/lib/utils";

interface MotempoLogoProps {
  className?: string;
  priority?: boolean;
}

const logoClassName = "motempo-logo h-[42px] w-auto shrink-0 object-contain sm:h-[54px]";

export function MotempoLogo({ className, priority }: MotempoLogoProps) {
  return (
    <Image
      src="/logo-white.png"
      alt="Motempo"
      width={180}
      height={128}
      className={cn(logoClassName, className)}
      priority={priority}
      unoptimized
    />
  );
}
