import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { SITE_LEGAL_NAME, SITE_URL, TERMS_SECTIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_LEGAL_NAME} at ${SITE_URL}.`,
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      intro={`Please read these terms carefully before using ${SITE_LEGAL_NAME}.`}
      sections={TERMS_SECTIONS}
    />
  );
}
