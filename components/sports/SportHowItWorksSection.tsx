import type { ReactNode } from "react";

interface SportHowItWorksSectionProps {
  children: ReactNode;
}

export function SportHowItWorksSection({ children }: SportHowItWorksSectionProps) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">{children}</div>
    </section>
  );
}
