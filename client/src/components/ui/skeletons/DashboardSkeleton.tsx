import { SkeletonBox, SkeletonCircle, SkeletonLine } from "../Skeleton";

/**
 * Skeleton that mirrors the HomeDashboard layout:
 * greeting → calorie card → macro rings → steps/exercise → today's plan
 */
export const DashboardSkeleton = () => (
  <div className="bg-base-black px-4 pb-8 pt-4 text-base-white">
    {/* Greeting row */}
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-[32px] w-3/4" />
        <SkeletonLine short className="h-[16px] w-2/3" />
      </div>
      {/* Theme toggle placeholder */}
      <SkeletonCircle className="h-10 w-10 shrink-0" />
    </div>

    {/* Calorie ring card */}
    <div className="mb-0 rounded-[26px] border border-grey-700/50 bg-grey-900/50 p-5">
      <div className="flex items-start justify-between">
        {/* Left: eaten */}
        <div className="space-y-2">
          <SkeletonLine className="h-[14px] w-16" />
          <SkeletonBox className="h-[36px] w-[56px]" />
          <SkeletonLine short className="h-[12px] w-10" />
        </div>

        {/* Center: ring */}
        <SkeletonCircle className="h-[136px] w-[136px]" />

        {/* Right: burned */}
        <div className="space-y-2 text-right">
          <SkeletonLine className="ml-auto h-[14px] w-16" />
          <SkeletonBox className="ml-auto h-[36px] w-[56px]" />
          <SkeletonLine short className="ml-auto h-[12px] w-10" />
        </div>
      </div>
    </div>

    {/* Macros section */}
    <div className="mt-6 space-y-3">
      <SkeletonLine className="h-[24px] w-24" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <SkeletonCircle className="h-24 w-24" />
            <SkeletonLine short className="h-[12px] w-16" />
            <SkeletonLine short className="h-[12px] w-12" />
          </div>
        ))}
      </div>
    </div>

    {/* Steps + Exercise cards */}
    <div className="mt-7 grid grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="min-h-[250px] rounded-[24px] border border-grey-700/50 bg-grey-900/50 p-4 space-y-3"
        >
          <SkeletonLine className="h-[20px] w-16" />
          <SkeletonBox className="h-[36px] w-24" />
          <SkeletonLine short className="h-[12px] w-20" />
          <SkeletonBox className="mt-4 h-2 w-full rounded-full" />
          <SkeletonBox className="mt-auto h-11 w-full rounded-full" />
        </div>
      ))}
    </div>

    {/* Today's plan card */}
    <div className="mt-7 rounded-[20px] border border-grey-700/50 bg-grey-900/40 p-4 space-y-4">
      <SkeletonLine className="h-[24px] w-32" />
      <SkeletonLine className="h-[16px] w-full" />
      <SkeletonLine className="h-[16px] w-5/6" />
      {[0, 1].map((i) => (
        <SkeletonBox key={i} className="h-[64px] w-full rounded-[12px]" />
      ))}
    </div>

    {/* Weight chart card */}
    <div className="mt-4 rounded-[24px] border border-grey-700/50 bg-grey-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-[22px] w-20" />
        <SkeletonCircle className="h-10 w-10" />
      </div>
      <SkeletonBox className="h-36 w-full rounded-[12px]" />
      <SkeletonLine short className="h-[14px] w-24" />
    </div>
  </div>
);
