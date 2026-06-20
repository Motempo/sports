import Link from "next/link";
import { ReportBugLink } from "@/components/feedback/ReportBugLink";

export function SiteFooter() {
  return (
    <footer className="border-t border-border safe-bottom">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-6 sm:px-4 sm:py-8">
        <p className="shrink-0 text-center text-[13px] leading-none text-muted">
          © {new Date().getFullYear()} Sports by Motempo
        </p>

        <ReportBugLink variant="footer" className="shrink-0" />

        <nav
          aria-label="Legal"
          className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] leading-none"
        >
          <Link href="/privacy" className="text-muted transition-colors hover:text-link">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-muted transition-colors hover:text-link">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
