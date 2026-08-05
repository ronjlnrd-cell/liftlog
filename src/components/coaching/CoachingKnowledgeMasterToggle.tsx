type CoachingKnowledgeMasterToggleProps = {
  visible: boolean;
  onToggle: () => void;
};

export function CoachingKnowledgeMasterToggle({
  visible,
  onToggle,
}: CoachingKnowledgeMasterToggleProps) {
  return (
    <div className="coaching-knowledge-master-toggle">
      <span className="coaching-knowledge-master-label">Advanced Notes</span>
      <button
        type="button"
        className="text-button coaching-knowledge-master-button"
        onClick={onToggle}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
