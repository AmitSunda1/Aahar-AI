/** Base skeleton shimmer box — use className for sizing/shape. */
export const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-[14px] ${className}`} />
);

/** Skeleton circle (avatar, ring etc.) */
export const SkeletonCircle = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-full ${className}`} />
);

/** Skeleton text line — thin, wide. */
export const SkeletonLine = ({
  className = "",
  short = false,
}: {
  className?: string;
  short?: boolean;
}) => (
  <div
    className={`skeleton-shimmer h-[14px] rounded-full ${short ? "w-2/5" : "w-4/5"} ${className}`}
  />
);
