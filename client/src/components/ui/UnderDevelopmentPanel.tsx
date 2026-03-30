interface UnderDevelopmentPanelProps {
  title: string;
  description: string;
}

export const UnderDevelopmentPanel = ({
  title,
  description,
}: UnderDevelopmentPanelProps) => {
  return (
    <div className="min-h-[calc(100vh-116px)] bg-base-black px-4 pb-8 pt-6 text-base-white">
      <div className="rounded-[24px] border border-grey-700/60 bg-gradient-to-b from-grey-900/80 to-base-black p-6 shadow-card-lg">
        <p className="mb-3 inline-flex rounded-full border border-accent-primary/40 bg-accent-primary/10 px-3 py-1 text-label-sm text-accent-primary">
          Under development
        </p>
        <h1 className="text-h2">{title}</h1>
        <p className="mt-3 text-body text-grey-300">{description}</p>
      </div>
    </div>
  );
};
