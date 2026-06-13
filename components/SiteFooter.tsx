import { ReportBugLink } from "@/components/feedback/ReportBugLink";

export function SiteFooter() {
  return (
    <footer className="border-t border-border safe-bottom">
      <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-3 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-8">
        <p className="text-center text-[13px] text-muted sm:text-left">
          © {new Date().getFullYear()} Sports by Motempo · Experiment
        </p>
        <div className="flex justify-center sm:justify-end">
          <ReportBugLink variant="footer" />
        </div>
      </div>
    </footer>
  );
}
