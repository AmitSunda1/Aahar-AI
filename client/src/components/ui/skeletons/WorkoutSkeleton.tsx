import { SkeletonBox, SkeletonLine } from "../Skeleton";

/**
 * Skeleton mirroring the Workout page layout:
 * page heading → stats grid → timer/session card
 */
export const WorkoutSkeleton = () => (
  <div className="min-h-screen bg-base-black px-4 pb-8 pt-6 text-base-white">
    <div className="mb-5 space-y-3">
      <SkeletonLine short className="h-[12px] w-16" />
      <SkeletonLine className="h-[32px] w-28" />
      <SkeletonLine short className="h-[16px] w-32" />
    </div>

    <div className="mb-6 rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-5">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine short className="h-[12px] w-12" />
            <SkeletonBox className="h-[36px] w-14 rounded-[8px]" />
            <SkeletonLine short className="h-[12px] w-10" />
          </div>
        ))}
      </div>
    </div>

    <div className="mb-6 rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-5 space-y-4">
      <SkeletonLine short className="h-[12px] w-16" />
      <SkeletonLine className="h-[26px] w-40" />
      <SkeletonLine className="h-[18px] w-full" />

      <div className="rounded-[24px] border border-grey-700/30 bg-grey-900/40 p-6 text-center">
        <SkeletonLine short className="mx-auto h-[14px] w-24" />
        <SkeletonLine className="mx-auto mt-4 h-[48px] w-44" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SkeletonBox className="h-14 w-full rounded-full" />
        <SkeletonBox className="h-14 w-full rounded-full" />
      </div>
    </div>

    <div className="rounded-[24px] border border-grey-700/50 bg-grey-900/45 p-5 space-y-2">
      <SkeletonLine short className="h-[12px] w-20" />
      <SkeletonLine className="h-[18px] w-32" />
      <SkeletonLine className="h-[14px] w-40" />
    </div>
  </div>
);
