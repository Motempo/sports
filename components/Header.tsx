import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/logo.png"
            alt="Motempo"
            width={120}
            height={85}
            className="h-7 w-auto shrink-0 object-contain sm:h-9"
            priority
            unoptimized
          />
          <div className="min-w-0 leading-tight">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <h1 className="text-[18px] font-extrabold tracking-tight sm:text-[22px]">Sports</h1>
              <span className="text-[12px] font-medium text-muted sm:text-[13px]">by Motempo</span>
            </div>
            <p className="truncate text-[12px] text-muted sm:text-[13px]">FIFA World Cup 2026</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
