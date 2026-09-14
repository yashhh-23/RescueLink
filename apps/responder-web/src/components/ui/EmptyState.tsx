interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink-900">{title}</p>
      <p className="text-sm text-ink-500">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 rounded border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-canvas"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
