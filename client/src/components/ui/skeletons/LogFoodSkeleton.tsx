import { SkeletonBox, SkeletonLine } from "../Skeleton";

/**
 * Skeleton mirroring the Log Food page layout:
 * page heading → active mode card
 */
export const LogFoodSkeleton = () => (
  <div className="min-h-screen bg-base-black px-4 pb-8 pt-6 text-base-white">
    <div className="mb-5 space-y-3">
      <SkeletonLine short className="h-[12px] w-20" />
      <SkeletonLine className="h-[32px] w-52" />
      <SkeletonLine className="h-[16px] w-44" />
    </div>

    <div className="rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-5 space-y-4">
      <SkeletonLine short className="h-[12px] w-12" />
      <SkeletonLine className="h-[26px] w-28" />
      <SkeletonLine className="h-[16px] w-48" />

      <SkeletonBox className="h-32 w-full rounded-[18px]" />

      <div className="grid grid-cols-[1fr_100px] gap-3">
        <SkeletonBox className="h-14 w-full rounded-[16px]" />
        <SkeletonBox className="h-14 w-full rounded-[16px]" />
      </div>

      <SkeletonBox className="h-24 w-full rounded-[18px]" />

      <SkeletonBox className="h-14 w-full rounded-full" />
    </div>
  </div>
);
