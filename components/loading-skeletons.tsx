import { cn } from "@/lib/utils";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

const panelClass =
  "rounded-lg border border-grey-300 bg-grey-50 p-4 shadow-[0_10px_28px_rgba(20,26,33,0.05)] md:p-5";

function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div
      className={cn(
        panelClass,
        "flex flex-col justify-between gap-4 md:flex-row md:items-end",
      )}
    >
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-full max-w-sm" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-2 h-4 w-3/4 max-w-md" />
      </div>
      {action ? <Skeleton className="h-11 w-full md:w-44" /> : null}
    </div>
  );
}

function RecordRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-grey-300 bg-grey-100 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="mt-2 h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonRegion className="space-y-4" label="Loading dashboard">
      {/* Quarter summary hero. */}
      <div className="rounded-xl bg-primary-50 p-4 ring-1 ring-primary-200 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-20 rounded-full bg-primary-100" />
          <Skeleton className="h-3 w-24 bg-primary-100" />
        </div>
        <Skeleton className="mt-4 h-3.5 w-40 bg-primary-100" />
        <Skeleton className="mt-2 h-10 w-56 bg-primary-100" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-14 w-full bg-primary-100" key={index} />
          ))}
        </div>
        <Skeleton className="mt-4 h-15 w-full bg-primary-100" />
        <Skeleton className="mt-3 h-3 w-3/4 bg-primary-100" />
      </div>

      {/* Next action. */}
      <div className="rounded-xl border border-grey-300 bg-white p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0">
            <Skeleton className="h-7 w-full max-w-sm" />
            <Skeleton className="mt-2 h-4 w-full max-w-xl" />
          </div>
          <Skeleton className="h-11 w-full md:w-40" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className={panelClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <RecordRowSkeleton key={index} />
            ))}
          </div>
        </div>
        <div className={panelClass}>
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function RecordsSkeleton() {
  return (
    <SkeletonRegion className="space-y-4" label="Loading income records">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-2 h-8 w-52" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-full md:w-48" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-11 w-14" key={index} />
        ))}
      </div>
      <Skeleton className="h-5 w-56" />
      {Array.from({ length: 3 }, (_, index) => (
        <div className={panelClass} key={index}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Skeleton className="aspect-[4/3] w-full sm:w-[104px] sm:shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="mt-3 h-5 w-2/5" />
              <Skeleton className="mt-2 h-4 w-3/5" />
            </div>
            <Skeleton className="h-20 w-full sm:w-[260px] sm:shrink-0" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

function ListCardSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className={panelClass}>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-3/5 max-w-lg" />
        </div>
        {withAction ? <Skeleton className="h-11 w-full md:w-32" /> : null}
      </div>
    </div>
  );
}

export function DocumentsSkeleton() {
  return (
    <SkeletonRegion className="space-y-5" label="Loading documents">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <ListCardSkeleton key={index} withAction />
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function DeadlinesSkeleton() {
  return (
    <SkeletonRegion className="space-y-5" label="Loading deadlines">
      <PageHeaderSkeleton />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div className={panelClass} key={index}>
            <div className="flex items-start gap-3">
              <Skeleton className="size-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-4 w-3/5" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
                <Skeleton className="mt-4 h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function ProfileSkeleton() {
  return (
    <SkeletonRegion className="space-y-5" label="Loading taxpayer profile">
      <PageHeaderSkeleton />
      <div className={panelClass}>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 9 }, (_, index) => (
            <div
              className="rounded-lg border border-grey-300 bg-grey-100 p-4"
              key={index}
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-5 w-3/5" />
            </div>
          ))}
        </div>
      </div>
      <ListCardSkeleton withAction />
    </SkeletonRegion>
  );
}

export function FilingSkeleton() {
  return (
    <SkeletonRegion className="space-y-4" label="Loading filing tracker">
      <div className="border-b border-grey-300 pb-4">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-8 w-full max-w-sm" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <div className="scrollbar-hidden overflow-hidden px-3 py-1 md:px-0">
        <div className="grid min-w-[680px] grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-16 w-full" key={index} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 border-y border-grey-300 py-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="grid justify-items-center gap-2" key={index}>
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border-l-4 border-primary-300 bg-primary-50 p-4">
        <Skeleton className="h-3 w-24 bg-primary-100" />
        <Skeleton className="mt-3 h-6 w-2/5 bg-primary-100" />
        <Skeleton className="mt-3 h-4 w-4/5 bg-primary-100" />
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-grey-300 bg-grey-100 p-1">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-12 w-full bg-grey-300" key={index} />
        ))}
      </div>
      <div className={`${panelClass} overflow-hidden`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <svg
                aria-hidden="true"
                className="size-4 animate-spin text-primary-700 motion-reduce:animate-none"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-20"
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </svg>
              <p className="text-xs font-bold uppercase text-primary-700">
                Preparing tax computation
              </p>
            </div>
            <Skeleton className="mt-3 h-7 w-48" />
            <Skeleton className="mt-3 h-4 w-4/5" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {["Income", "Reduction", "Credits", "Payable"].map((label, index) => (
            <div
              className="calculation-reveal rounded-lg border border-grey-300 bg-white p-3"
              key={label}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-28 bg-primary-100" />
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              className="calculation-reveal flex items-center justify-between gap-4 border-b border-grey-200 pb-2"
              key={index}
              style={{ animationDelay: `${260 + index * 70}ms` }}
            >
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-24 bg-primary-100" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-11 w-full sm:w-40" />
      </div>
    </SkeletonRegion>
  );
}

export function AgenticTimelineSkeleton() {
  return (
    <SkeletonRegion
      className="mt-6 space-y-6"
      label="Loading filing workflow"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg bg-primary-100" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mt-1 h-4 w-4/5" />
          <Skeleton className="mt-2 h-4 w-3/5" />
          <div className="mt-3 overflow-hidden rounded-xl border border-grey-300 bg-white">
            <div className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid gap-3 border-t border-grey-300 bg-grey-50 px-4 py-4 sm:grid-cols-2">
              <Skeleton className="h-20 w-full bg-grey-300" />
              <Skeleton className="h-20 w-full bg-grey-300" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg bg-primary-100" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mt-1 h-4 w-2/3" />
          <div className="mt-3 overflow-hidden rounded-xl border border-grey-300 bg-white">
            <div className="border-b border-grey-300 bg-primary-50 px-4 py-4">
              <Skeleton className="h-3 w-24 bg-primary-100" />
              <Skeleton className="mt-3 h-6 w-48 bg-primary-100" />
              <Skeleton className="mt-3 h-4 w-3/4 bg-primary-100" />
            </div>
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-11 w-full sm:w-40" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function AgenticSessionListSkeleton() {
  return (
    <SkeletonRegion className="flex min-h-0 flex-1 flex-col" label="Loading filing chats">
      <Skeleton className="h-11 w-full bg-grey-300" />
      <Skeleton className="mb-3 mt-6 h-3 w-14" />
      <div className="space-y-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="rounded-lg px-3 py-2.5" key={index}>
            <Skeleton className="h-4 w-4/5 bg-grey-300" />
            <Skeleton className="mt-2 h-3 w-3/5 bg-grey-300" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-3 mt-5 h-3 w-16" />
      <div className="space-y-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="rounded-lg px-3 py-2.5" key={index}>
            <Skeleton className="h-4 w-3/4 bg-grey-300" />
            <Skeleton className="mt-2 h-3 w-1/2 bg-grey-300" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-auto h-24 w-full bg-primary-100" />
    </SkeletonRegion>
  );
}
