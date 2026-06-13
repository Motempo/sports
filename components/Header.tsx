import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Motempo"
            width={120}
            height={85}
            className="h-9 w-auto object-contain"
            priority
            unoptimized
          />
          <div className="leading-tight">
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-[22px] font-extrabold tracking-tight">Sports</h1>
              <span className="text-[13px] font-medium text-muted">by Motempo</span>
            </div>
            <p className="text-[13px] text-muted">FIFA World Cup 2026</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
