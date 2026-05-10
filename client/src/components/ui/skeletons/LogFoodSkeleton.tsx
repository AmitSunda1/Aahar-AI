import { SkeletonBox, SkeletonLine } from "../Skeleton";

/**
 * Skeleton mirroring the Log Food page layout:
 * header/mode-select card → input section card
 */
export const LogFoodSkeleton = () => (
  <div className="min-h-screen bg-base-black px-4 pb-8 pt-6 text-base-white">
    {/* Mode select card */}
    <div className="rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-5 space-y-4">
      {/* Eyebrow + heading */}
      <SkeletonBox className="h-7 w-24 rounded-full" />
      <SkeletonLine className="h-[32px] w-52" />
      <SkeletonLine className="h-[16px] w-40" />

      {/* Three mode cards */}
      <div className="grid gap-3 mt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[22px] border border-grey-700/40 bg-grey-900/40 p-4 space-y-2"
          >
            <SkeletonLine short className="h-[12px] w-10" />
            <SkeletonLine className="h-[22px] w-24" />
            <SkeletonLine className="h-[14px] w-48" />
          </div>
        ))}
      </div>
    </div>

    {/* Input section card */}
    <div className="mt-6 rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-5 space-y-4">
      <SkeletonLine short className="h-[12px] w-12" />
      <SkeletonLine className="h-[26px] w-24" />
      <SkeletonLine className="h-[16px] w-48" />

      {/* Textarea placeholder */}
      <SkeletonBox className="h-32 w-full rounded-[18px]" />

      {/* Qty + unit row */}
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <SkeletonBox className="h-14 w-full rounded-[16px]" />
        <SkeletonBox className="h-14 w-full rounded-[16px]" />
      </div>

      {/* Notes textarea */}
      <SkeletonBox className="h-24 w-full rounded-[18px]" />

      {/* Submit button */}
      <SkeletonBox className="h-14 w-full rounded-full" />
    </div>
  </div>
);
