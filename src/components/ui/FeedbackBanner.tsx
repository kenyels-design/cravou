interface FeedbackBannerProps {
  message: string;
  tone: 'error' | 'success' | 'info';
}

const toneClasses = {
  error: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  success: 'border-primary/30 bg-primary/10 text-primary',
  info: 'border-secondary/30 bg-secondary/10 text-secondary',
};

export function FeedbackBanner({ message, tone }: FeedbackBannerProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]}`} role="status">
      {message}
    </div>
  );
}
