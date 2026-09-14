interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-priority-criticalBg bg-priority-criticalBg/40 px-6 py-12 text-center"
    >
      <p className="text-sm font-medium text-priority-critical">Unable to load incidents.</p>
      {message ? <p className="text-sm text-ink-500">{message}</p> : null}
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded border border-priority-critical/30 px-3 py-1.5 text-sm font-medium text-priority-critical hover:bg-priority-criticalBg"
      >
        Retry
      </button>
    </div>
  );
}
