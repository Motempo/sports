import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { PRIVACY_SECTIONS, SITE_LEGAL_NAME, SITE_URL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${SITE_LEGAL_NAME} at ${SITE_URL}.`,
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      intro={`This policy describes how ${SITE_LEGAL_NAME} handles information when you use ${SITE_URL}.`}
      sections={PRIVACY_SECTIONS}
    />
  );
}
