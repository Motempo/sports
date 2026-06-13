import { redirect } from "next/navigation";
import { CURRENT_SPORT_SLUG } from "@/lib/sports";

export default function RootPage() {
  redirect(`/${CURRENT_SPORT_SLUG}`);
}
