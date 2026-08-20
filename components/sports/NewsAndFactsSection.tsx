import { FunFactsWidget } from "@/components/widgets/FunFactsWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";

export function NewsAndFactsSection({ sportSlug }: { sportSlug: string }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="h-full">
            <NewsWidget sportSlug={sportSlug} />
          </div>
          <div className="h-full">
            <FunFactsWidget sportSlug={sportSlug} />
          </div>
        </div>
      </div>
    </section>
  );
}
