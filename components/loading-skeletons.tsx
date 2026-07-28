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

function MetricSkeleton({ emphasized = false }: { emphasized?: boolean }) {
  return (
    <div className={cn(panelClass, emphasized ? "border-primary-200" : "")}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="size-7 rounded-lg" />
        {emphasized ? <Skeleton className="h-6 w-20 rounded-full" /> : null}
      </div>
      <Skeleton className="mt-5 h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-28" />
    </div>
  );
}

function RecordRowSkeleton() {
  return (
    <div className="rounded-lg border border-grey-300 bg-grey-100 p-4">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonRegion className="space-y-5" label="Loading dashboard">
      <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-24 bg-primary-100" />
            <Skeleton className="mt-3 h-7 w-full max-w-md bg-primary-100" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl bg-primary-100" />
          </div>
          <Skeleton className="hidden h-11 w-36 bg-primary-100 md:block" />
        </div>
      </div>
      <PageHeaderSkeleton action />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <MetricSkeleton emphasized={index === 0} key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className={panelClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="mt-3 h-4 w-3/4" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="mt-5 h-24 w-full bg-primary-100" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 2 }, (_, index) => (
              <RecordRowSkeleton key={index} />
            ))}
          </div>
        </div>
        <div className={panelClass}>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="mt-6 h-6 w-24 rounded-full" />
          <Skeleton className="mt-4 h-7 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-6 h-28 w-full" />
        </div>
      </div>
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
      <div className={panelClass}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-7 w-48" />
            <Skeleton className="mt-3 h-4 w-4/5" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-6 h-12 w-full" />
        <Skeleton className="mt-3 h-12 w-full" />
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
