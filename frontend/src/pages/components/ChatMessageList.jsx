import { Link } from "react-router-dom";
import styles from "../Chat.module.css";

const authorLabel = {
  user: "You",
  assistant: "End Frame",
};

export default function ChatMessageList({ messages, bottomRef, onViewPlan }) {
  const isEmpty = messages.length === 0;

  return (
    <div className={styles.messagesPanel}>
      {isEmpty ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Start the conversation</p>
          <p className={styles.emptyText}>
            Ask about your room layout, materials, or anything else. The
            assistant will reply here.
          </p>
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${
              msg.role === "user"
                ? styles.messageRowUser
                : styles.messageRowAssistant
            }`}
          >
            <div
              className={`${styles.messageBubble} ${
                msg.role === "user" ? styles.userBubble : styles.assistantBubble
              } ${msg.error ? styles.errorBubble : ""}`}
            >
              <div className={styles.messageMeta}>
                <span className={styles.messageAuthor}>
                  {authorLabel[msg.role] || "Message"}
                </span>
                {msg.pending && (
                  <span className={styles.pendingDot} aria-label="Pending" />
                )}
              </div>
              <p className={styles.messageText}>{msg.content}</p>
              {msg.planData && onViewPlan && (
                <button
                  type="button"
                  className={styles.viewButton}
                  // onClick={() => onViewPlan(msg.planData)}
                  onClick={() => <Link to="/" />}
                >
                  Увидеть в 3D
                </button>
              )}
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
