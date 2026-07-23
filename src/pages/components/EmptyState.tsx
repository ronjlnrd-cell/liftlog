type EmptyStateProps = {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  text,
  action,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="empty card">
      <h2>{title}</h2>
      <p>{text}</p>
      {action && onAction && (
        <button className="primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
