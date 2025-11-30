import styles from "../Chat.module.css";

export default function AttachmentPreview({ attachment, onRemove }) {
  if (!attachment) return null;

  return (
    <div className={styles.attachmentPreview}>
      <img src={attachment.url} alt={attachment.name} />
      <button
        type="button"
        className={styles.removeBadge}
        aria-label="Remove attachment"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}
