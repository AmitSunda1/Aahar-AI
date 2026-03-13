export const Loader = () => (
  <div className="flex items-center justify-center min-h-screen bg-base-black">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-grey-700 border-t-accent-primary rounded-full animate-spin" />
      <p className="text-body-sm text-grey-500">Loading...</p>
    </div>
  </div>
);
