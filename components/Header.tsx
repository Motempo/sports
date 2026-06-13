import { MotempoLogo } from "@/components/MotempoLogo";
import { SportSelector } from "@/components/SportSelector";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <MotempoLogo priority />
          <h1 className="text-[18px] font-extrabold tracking-tight sm:text-[22px]">Sports</h1>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SportSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
