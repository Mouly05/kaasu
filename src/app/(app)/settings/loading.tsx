import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6" aria-busy aria-label="Loading settings">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
      ))}
    </div>
  );
}
