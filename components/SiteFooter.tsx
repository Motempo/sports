import Link from "next/link";
import { ReportBugLink } from "@/components/feedback/ReportBugLink";

export function SiteFooter() {
  return (
    <footer className="border-t border-border safe-bottom">
      <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 px-4 py-6 sm:px-4 sm:py-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-[13px] text-muted sm:text-left">
            © {new Date().getFullYear()} Sports by Motempo
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px]"
          >
            <Link href="/privacy" className="text-muted transition-colors hover:text-link">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted transition-colors hover:text-link">
              Terms of Service
            </Link>
          </nav>
        </div>
        <div className="flex justify-center">
          <ReportBugLink variant="footer" />
        </div>
      </div>
    </footer>
  );
}
