import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1 h-4 w-32" />
      </div>
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
