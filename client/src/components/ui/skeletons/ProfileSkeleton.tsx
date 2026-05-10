import { SkeletonBox, SkeletonCircle, SkeletonLine } from "../Skeleton";

/**
 * Skeleton mirroring the Profile page layout:
 * user card → personal info section → security section
 */
export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-base-black px-4 pb-8 pt-6 text-base-white">
    {/* Header */}
    <div className="mb-8 space-y-2">
      <SkeletonLine className="h-[32px] w-28" />
      <SkeletonLine className="h-[16px] w-64" />
    </div>

    {/* User profile card */}
    <div className="mb-8 rounded-[28px] border border-grey-700/50 bg-grey-900/50 p-6">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <SkeletonCircle className="h-20 w-20 shrink-0" />
        {/* Info */}
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-[24px] w-40" />
          <SkeletonLine className="h-[16px] w-52" />
          <SkeletonBox className="mt-1 h-7 w-24 rounded-full" />
        </div>
        {/* Logout button */}
        <SkeletonBox className="h-12 w-20 rounded-full" />
      </div>
    </div>

    {/* Personal info section */}
    <div className="mb-8 rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine className="h-[24px] w-40" />
          <SkeletonLine className="h-[14px] w-56" />
        </div>
        <SkeletonCircle className="h-12 w-12" />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine short className="h-[12px] w-16" />
            <SkeletonLine className="h-[18px] w-28" />
          </div>
        ))}
        {/* full-width medical conditions */}
        <div className="col-span-2 space-y-2">
          <SkeletonLine short className="h-[12px] w-28" />
          <SkeletonLine className="h-[18px] w-40" />
        </div>
      </div>
    </div>

    {/* Security section */}
    <div className="rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-6">
      <SkeletonLine className="h-[26px] w-40" />
    </div>
  </div>
);
