import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-[20px] font-extrabold">Motempo Sports</h1>
          <p className="text-[13px] text-muted">FIFA World Cup 2026</p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
