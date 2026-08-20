import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LAST_SPORT_COOKIE, resolveHomeSportSlug } from "@/lib/last-sport";

/** Fallback if middleware does not run; prefer remembered sport cookie. */
export default async function RootPage() {
  const jar = await cookies();
  const target = resolveHomeSportSlug(jar.get(LAST_SPORT_COOKIE)?.value);
  redirect(`/${target}`);
}
