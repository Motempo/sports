export const LEGAL_ENTITY = "Motempo";
export const SITE_LEGAL_NAME = "Sports by Motempo";
export const SITE_URL = "https://sports.motempo.com";
export const LEGAL_LAST_UPDATED = "June 14, 2026";
export const PRIVACY_EMAIL = "privacy@motempo.com";
export const LEGAL_EMAIL = "legal@motempo.com";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      `${SITE_LEGAL_NAME} (“we”, “us”) operates ${SITE_URL}. This Privacy Policy explains what information we collect, how we use it, and your choices. By using the site, you agree to this policy.`,
      "We do not require an account to browse schedules, standings, news, or fun facts. If you submit feedback, we process the information you choose to send.",
    ],
  },
  {
    id: "collect",
    title: "Information we collect",
    paragraphs: ["We may collect the following categories of information:"],
    bullets: [
      "Usage and device data — browser type, pages viewed, approximate location (from IP address), and referral source. Our host (Vercel) and any analytics or advertising partners we enable may process standard server and cookie data.",
      "Preferences — theme choice (light/dark) stored in your browser’s local storage.",
      "Cookie notice choice — whether you dismissed our cookie banner, stored in local storage.",
      "Feedback you submit — text, optional screenshot or attachment, page URL, and browser metadata needed to investigate reports. Feedback is sent to our issue tracker (Linear).",
      "We do not knowingly collect payment information or government ID on this site.",
    ],
  },
  {
    id: "use",
    title: "How we use information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Operate and improve the site (match data, brackets, news, and fun facts).",
      "Respond to bug reports and product feedback.",
      "Measure performance and fix errors.",
      "Comply with law and protect the service from abuse.",
      "If we enable advertising, to serve and measure ads and comply with ad-network policies (including consent where required).",
    ],
  },
  {
    id: "sources",
    title: "Third-party content and services",
    paragraphs: [
      "Sports data, news, images, and facts come from third-party APIs and RSS feeds (for example football-data.org, news outlets, Wikipedia, and avatar services). Those providers have their own privacy practices. Links on the site may take you to external websites we do not control.",
    ],
    bullets: [
      "Vercel — hosting and edge delivery.",
      "Linear — feedback and issue tracking when you submit a report.",
      "football-data.org — match and tournament data when configured.",
      "News & media RSS — headlines and summaries from configured publishers.",
      "Future advertising partners — if we display ads, partners such as Google may use cookies or similar technologies as described in their policies and your consent choices.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    paragraphs: [
      "We use essential cookies and local storage needed for basic functionality (for example theme and cookie-banner state). If we add analytics or advertising, we may use additional cookies or identifiers subject to applicable consent requirements.",
      "You can control cookies through your browser settings. Blocking essential storage may affect how the site works.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "Feedback records are kept as long as needed to resolve issues and improve the product. Server logs are retained according to our hosting provider’s defaults. You may request deletion of feedback tied to you where applicable.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, delete, or restrict processing of your personal information, or to opt out of certain uses (including “sale” or “sharing” under California law).",
      `To exercise these rights, contact ${PRIVACY_EMAIL}. We will respond within a reasonable time and as required by law.`,
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "The site is intended for a general audience and is not directed at children under 13 (or 16 in the EEA/UK). We do not knowingly collect personal information from children. Contact us if you believe a child has provided personal information.",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do. Continued use after changes means you accept the updated policy.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      `Privacy questions: ${PRIVACY_EMAIL}`,
      `Legal questions: ${LEGAL_EMAIL}`,
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    paragraphs: [
      `These Terms of Service (“Terms”) govern your use of ${SITE_URL} operated by ${LEGAL_ENTITY} (“we”, “us”). By accessing or using the site, you agree to these Terms. If you do not agree, do not use the site.`,
    ],
  },
  {
    id: "service",
    title: "The service",
    paragraphs: [
      `${SITE_LEGAL_NAME} provides sports schedules, standings, brackets, news summaries, and related content for informational and entertainment purposes. We may add, change, or remove features at any time.`,
      "Match times, scores, and news may be delayed or inaccurate. Always verify critical information with official sources.",
    ],
  },
  {
    id: "no-betting",
    title: "Not gambling or financial advice",
    paragraphs: [
      "Nothing on this site constitutes betting, gambling, or financial advice. We do not operate a sportsbook. Any decisions you make based on site content are your own responsibility.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: ["You agree not to:"],
    bullets: [
      "Use the site unlawfully or to harm others.",
      "Attempt to disrupt, scrape at abusive rates, or reverse engineer the service.",
      "Submit feedback that contains malware, illegal content, or others’ private information without permission.",
      "Misrepresent affiliation with Motempo or impersonate others.",
    ],
  },
  {
    id: "ip",
    title: "Intellectual property",
    paragraphs: [
      "Motempo branding, site design, and original content are owned by us or our licensors. Third-party logos, team crests, news text, and trademarks belong to their respective owners and are used for identification and reporting.",
      "You may share links to our pages. You may not copy or republish substantial portions of the site without permission.",
    ],
  },
  {
    id: "third-party",
    title: "Third-party links and content",
    paragraphs: [
      "The site links to external news stories, streaming search pages, and social profiles. We are not responsible for third-party sites or services. Their terms and privacy policies apply when you leave our site.",
    ],
  },
  {
    id: "ads",
    title: "Advertising",
    paragraphs: [
      "We may display advertisements from third-party ad networks. Ads may be personalized where permitted by law and your consent choices. Ad partners are responsible for their ad content subject to their policies.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer of warranties",
    paragraphs: [
      'THE SITE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, MOTEMPO AND ITS AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SITE.",
      "Our total liability for any claim relating to the site will not exceed the greater of (a) USD $100 or (b) the amount you paid us to use the site in the twelve months before the claim (typically zero for free use).",
    ],
  },
  {
    id: "indemnity",
    title: "Indemnity",
    paragraphs: [
      "You agree to indemnify and hold harmless Motempo from claims arising out of your misuse of the site or violation of these Terms.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    paragraphs: [
      "We may suspend or stop providing the site at any time. Sections that by nature should survive (disclaimers, limitations, indemnity) will survive termination.",
    ],
  },
  {
    id: "law",
    title: "Governing law",
    paragraphs: [
      "These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law rules, except where mandatory consumer protection laws in your country apply.",
      "Disputes will be resolved in the state or federal courts located in Delaware, unless applicable law requires otherwise.",
    ],
  },
  {
    id: "changes-terms",
    title: "Changes",
    paragraphs: [
      "We may update these Terms. Material changes will be reflected by updating the “Last updated” date. Continued use after changes constitutes acceptance.",
    ],
  },
  {
    id: "contact-terms",
    title: "Contact",
    paragraphs: [
      `Questions about these Terms: ${LEGAL_EMAIL}`,
      `Privacy questions: ${PRIVACY_EMAIL}`,
    ],
  },
];
