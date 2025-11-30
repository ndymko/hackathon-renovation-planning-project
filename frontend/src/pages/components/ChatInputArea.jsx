import AttachmentPreview from "./AttachmentPreview.jsx";
import styles from "../Chat.module.css";

export default function ChatInputArea({
  inputValue,
  onChange,
  onSend,
  onAddClick,
  textareaRef,
  fileInputRef,
  onFileChange,
  attachment,
  onRemoveAttachment,
  isSending = false,
}) {
  return (
    <div className={styles.inputCard}>
      <button
        className={styles.addButton}
        type="button"
        aria-label="Add item"
        onClick={onAddClick}
      >
        +
      </button>
      <input
        type="file"
        accept="image/jpeg"
        ref={fileInputRef}
        className={styles.fileInput}
        onChange={onFileChange}
      />
      <textarea
        className={styles.input}
        placeholder="Let's talk about layout..."
        rows={2}
        maxLength={2000}
        ref={textareaRef}
        value={inputValue}
        onChange={onChange}
      />
      <button
        className={styles.sendButton}
        type="button"
        onClick={onSend}
        disabled={isSending}
      >
        {isSending ? "..." : "Send"}
      </button>
      {attachment && (
        <div className={styles.inputAttachment}>
          <AttachmentPreview attachment={attachment} onRemove={onRemoveAttachment} />
        </div>
      )}
    </div>
  );
}
