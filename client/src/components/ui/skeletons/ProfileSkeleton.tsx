import { SkeletonBox, SkeletonCircle, SkeletonLine } from "../Skeleton";

/**
 * Skeleton mirroring the Profile page layout:
 * page heading → user card → personal info section → security section
 */
export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-base-black px-4 pb-safe pb-8 pt-5 text-base-white">
    <div className="mb-5 space-y-3">
      <SkeletonLine short className="h-[12px] w-20" />
      <SkeletonLine className="h-[32px] w-28" />
      <SkeletonLine className="h-[16px] w-64" />
    </div>

    <div className="mb-5 rounded-[28px] border border-grey-700/50 bg-grey-900/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <SkeletonCircle className="h-[72px] w-[72px] shrink-0" />
          <div className="space-y-2">
            <SkeletonLine short className="h-[12px] w-16" />
            <SkeletonLine className="h-[24px] w-40" />
            <SkeletonLine className="h-[16px] w-52" />
          </div>
        </div>
        <SkeletonBox className="h-8 w-20 rounded-full" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <SkeletonBox className="h-24 w-full rounded-[22px]" />
        <SkeletonBox className="h-24 w-full rounded-[22px]" />
      </div>
    </div>

    <div className="mb-5 rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine short className="h-[12px] w-16" />
          <SkeletonLine className="h-[24px] w-40" />
        </div>
        <SkeletonCircle className="h-12 w-12" />
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBox key={i} className="h-20 w-full rounded-[20px]" />
        ))}
        <SkeletonBox className="col-span-2 h-24 w-full rounded-[20px]" />
        <SkeletonBox className="col-span-2 h-24 w-full rounded-[20px]" />
      </div>
    </div>

    <div className="rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-6 space-y-2">
      <SkeletonLine short className="h-[12px] w-16" />
      <SkeletonLine className="h-[26px] w-32" />
      <SkeletonLine className="h-[16px] w-52" />
    </div>
  </div>
);
