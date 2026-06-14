import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { LEGAL_LAST_UPDATED, type LegalSection } from "@/lib/legal";
import { cn } from "@/lib/utils";

interface LegalPageShellProps {
  title: string;
  intro: string;
  sections: LegalSection[];
  className?: string;
}

export function LegalPageShell({ title, intro, sections, className }: LegalPageShellProps) {
  return (
    <div className="min-h-dvh">
      <Header />

      <main className={cn("mx-auto max-w-3xl px-3 py-8 sm:px-4 sm:py-10", className)}>
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-[32px]">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{intro}</p>

        <nav className="mt-6 rounded-2xl border border-border bg-surface/40 px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">On this page</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-[13px] text-link hover:underline"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-[18px] font-bold sm:text-[20px]">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-[15px] leading-relaxed text-foreground/90">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="text-[15px] leading-relaxed text-foreground/90">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
