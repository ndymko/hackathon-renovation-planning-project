import { useEffect, useRef, useState } from "react";
import styles from "./Chat.module.css";
import ChatTopbar from "./components/ChatTopbar.jsx";
import ChatInputArea from "./components/ChatInputArea.jsx";
import ChatMessageList from "./components/ChatMessageList.jsx";
import { sendChatMessage, sendFloorPlanImage } from "../App_services";
import { useNavigate } from "react-router-dom";

export default function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [showChatList, setShowChatList] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const makeId = () =>
    crypto.randomUUID?.() ??
    `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const maxRows = 20;
    const lineHeight = 24; // 16px * 1.5 line-height
    const maxHeight = maxRows * lineHeight;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
  }, [inputValue]);

  useEffect(
    () => () => {
      if (attachment?.url) {
        URL.revokeObjectURL(attachment.url);
      }
    },
    [attachment]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    const userMessage = { id: makeId(), role: "user", content: text };
    const pendingId = makeId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: pendingId, role: "assistant", content: "Thinking...", pending: true },
    ]);
    setInputValue("");
    setIsSending(true);

    try {
      const reply = (await sendChatMessage(text)) || "Empty reply";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingId
            ? { ...msg, content: reply, pending: false }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingId
            ? {
                ...msg,
                content: "Failed to get a reply. Please try again.",
                pending: false,
                error: true,
              }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === "string" ? result.split(",")[1] || result : "";
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "image/jpeg") return;
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    const url = URL.createObjectURL(file);
    setAttachment({ url, name: file.name });
    event.target.value = "";

    const pendingId = makeId();
    setIsUploading(true);
    setMessages((prev) => [
      ...prev,
      {
        id: pendingId,
        role: "assistant",
        content: "Отправляем изображение...",
        pending: true,
      },
    ]);

    try {
      const base64 = await readFileAsBase64(file);
      const response = await sendFloorPlanImage(base64);
      const planPayload =
        typeof response === "string"
          ? response
          : response?.vector || response?.plan || response?.data || response;

      let parsedPlan = null;
      let textResult = "";

      if (typeof planPayload === "string") {
        try {
          parsedPlan = JSON.parse(planPayload);
          textResult = "План получен. Можно открыть в 3D.";
        } catch (parseErr) {
          textResult = planPayload;
        }
      } else if (planPayload) {
        parsedPlan = planPayload;
        textResult = "План получен. Можно открыть в 3D.";
      }

      const ctaMessage = {
        id: pendingId,
        role: "assistant",
        content: textResult || "Изображение отправлено.",
        pending: false,
        planData: parsedPlan,
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === pendingId ? ctaMessage : msg))
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingId
            ? {
                ...msg,
                content: "Не удалось отправить изображение. Попробуйте снова.",
                pending: false,
                error: true,
              }
            : msg
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewPlan = (planData) => {
    if (!planData) return;
    navigate("/", { state: { planData } });
  };

  const removeAttachment = () => {
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <ChatTopbar onToggleList={() => setShowChatList((prev) => !prev)} />
        <main className={styles.body}>
          <div
            className={`${styles.chatListPanel} ${
              showChatList ? styles.chatListOpen : ""
            }`}
          >
            <button
              className={styles.chatListClose}
              type="button"
              onClick={() => setShowChatList(false)}
            >
              Close
            </button>
            <h4 className={styles.chatListTitle}>Saved chats</h4>
            <button className={styles.chatListItem} type="button">
              Current chat
            </button>
            <button className={styles.chatListItem} type="button">
              Design ideas
            </button>
            <button className={styles.chatListItem} type="button">
              Materials list
            </button>
          </div>
          <div className={styles.chatLayout}>
            <ChatMessageList
              messages={messages}
              bottomRef={messagesEndRef}
              onViewPlan={handleViewPlan}
            />
            <ChatInputArea
              inputValue={inputValue}
              onChange={handleChange}
              onSend={handleSend}
              onAddClick={handleAddClick}
              textareaRef={textareaRef}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              attachment={attachment}
              onRemoveAttachment={removeAttachment}
              isSending={isSending}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
