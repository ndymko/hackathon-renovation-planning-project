import styles from "../Chat.module.css";

export default function ChatTopbar({ onToggleList }) {
  return (
    <header className={styles.topbar}>
      <button
        className={styles.iconButton}
        type="button"
        aria-label="Chat list"
        onClick={onToggleList}
      >
        <span className={styles.iconGlyph} />
      </button>
      <button className={styles.loginButton} type="button">
        Log in
      </button>
    </header>
  );
}
