/** Ergast/Jolpica nationality strings → ISO 3166-1 alpha-2 for flagcdn. */
const NATIONALITY_ISO2: Record<string, string> = {
  american: "us",
  argentine: "ar",
  australian: "au",
  austrian: "at",
  belgian: "be",
  brazilian: "br",
  british: "gb",
  canadian: "ca",
  chinese: "cn",
  danish: "dk",
  dutch: "nl",
  finnish: "fi",
  french: "fr",
  german: "de",
  hungarian: "hu",
  indian: "in",
  indonesian: "id",
  irish: "ie",
  italian: "it",
  japanese: "jp",
  malaysian: "my",
  mexican: "mx",
  monegasque: "mc",
  "new zealander": "nz",
  polish: "pl",
  portuguese: "pt",
  russian: "ru",
  spanish: "es",
  swedish: "se",
  swiss: "ch",
  thai: "th",
  venezuelan: "ve",
};

export function nationalityToIso2(nationality?: string): string | undefined {
  if (!nationality) return undefined;
  return NATIONALITY_ISO2[nationality.trim().toLowerCase()];
}

export function ageFromDateOfBirth(dateOfBirth: string, now = new Date()): number | undefined {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return undefined;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const month = now.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
}

export function formatBirthDate(dateOfBirth: string): string {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return dateOfBirth;
  return dob.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
