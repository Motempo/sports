import Link from "next/link";
import { MotempoLogo } from "@/components/MotempoLogo";
import { SportSelector } from "@/components/SportSelector";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  activeSportSlug?: string;
}

export function Header({ activeSportSlug }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
          <MotempoLogo priority />
          <span className="text-[18px] font-extrabold tracking-tight sm:text-[22px]">Sports</span>
        </Link>

        <SportSelector activeSportSlug={activeSportSlug} />
        <ThemeToggle />
      </div>
    </header>
  );
}
