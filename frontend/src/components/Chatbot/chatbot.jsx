"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Info, Trash2, Edit, Mic, Send, X, BookOpen } from "lucide-react"

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [lang, setLang] = useState("vi")
  const [isLoading, setIsLoading] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackMessageId, setFeedbackMessageId] = useState(null)
  const [feedbackInput, setFeedbackInput] = useState("")
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)

  const toggleChat = () => setIsOpen(!isOpen)
  const toggleGuide = () => setIsGuideOpen(!isGuideOpen)
  const toggleFeedback = (messageId = null) => {
    setFeedbackMessageId(messageId)
    setFeedbackInput("")
    setIsFeedbackOpen(!isFeedbackOpen)
  }

  const sendMessage = async (text = input, retryCount = 0) => {
    if (!text.trim() || text.length > 500) {
      setMessages((prev) => [
        ...prev,
        {
          text: lang === "vi" ? "⚠️ Câu hỏi phải từ 1-500 ký tự." : "⚠️ Question must be 1-500 characters.",
          sender: "bot",
          timestamp: new Date(),
          type: "error",
          lang,
        },
      ])
      return
    }
    if (lang !== "vi" && lang !== "en") {
      setMessages((prev) => [
        ...prev,
        {
          text: lang === "vi" ? "⚠️ Ngôn ngữ không hợp lệ." : "⚠️ Invalid language.",
          sender: "bot",
          timestamp: new Date(),
          type: "error",
          lang,
        },
      ])
      return
    }

    const history = messages
      .filter((msg) => msg.sender === "user" || (msg.sender === "bot" && !msg.text.includes("Hỏi thêm nhé")))
      .slice(-5) // Ensure max 5 history items
      .map((msg) => ({
        sentence: msg.text,
        response: msg.sender === "bot" ? msg.text : "",
        type: msg.type || "general",
        lang: msg.lang || "vi",
      }))

    if (history.length > 5) {
      setMessages((prev) => [
        ...prev,
        {
          text: lang === "vi" ? "⚠️ Lịch sử hội thoại vượt quá 5 lượt." : "⚠️ Chat history exceeds 5 turns.",
          sender: "bot",
          timestamp: new Date(),
          type: "error",
          lang,
        },
      ])
      return
    }

    const userMessage = { text, sender: "user", timestamp: new Date(), type: "general", lang }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setInput("")

    try {
      const response = await fetch("http://localhost:8000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: text,
          lang,
          history,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail?.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const responseText = data.response || (lang === "vi" ? "⚠️ Không nhận được phản hồi từ server." : "⚠️ No response from server.")
      const suggestionText = data.suggestion || (lang === "vi" ? "Hỏi về SurTraff hoặc giao thông nhé!" : "Ask about SurTraff or traffic!")
      const suggestionList = suggestionText.split(" hoặc ").map((s) => s.replace(" 😄", "").trim())

      setSuggestedQuestions(suggestionList)

      const botMessage = {
        text: responseText,
        sender: "bot",
        timestamp: new Date(data.timestamp),
        type: data.type || "general",
        lang: data.lang || lang,
      }
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      if (retryCount < 2) {
        setTimeout(() => sendMessage(text, retryCount + 1), 1000)
        return
      }
      setMessages((prev) => [
        ...prev,
        {
          text: lang === "vi" ? `⚠️ Lỗi: ${error.message}. Vui lòng thử lại sau.` : `⚠️ Error: ${error.message}. Please try again later.`,
          sender: "bot",
          timestamp: new Date(),
          type: "error",
          lang,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const submitFeedback = async () => {
    if (!feedbackInput.trim() || feedbackInput.length > 1000 || feedbackMessageId === null) {
      setMessages((prev) => [
        ...prev,
        {
          text: lang === "vi" ? "⚠️ Phản hồi phải từ 1-1000 ký tự." : "⚠️ Feedback must be 1-1000 characters.",
          sender: "bot",
          timestamp: new Date(),
          type: "error",
          lang,
        },
      ])
      return
    }

    setIsFeedbackLoading(true)
    try {
      const question = messages[feedbackMessageId].text
      const response = await fetch("http://localhost:8000/api/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          corrected_answer: feedbackInput,
          lang,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail?.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        {
          text: data.response || (lang === "vi" ? "✅ Phản hồi đã được ghi nhận!" : "✅ Feedback recorded!"),
          sender: "bot",
          timestamp: new Date(data.timestamp),
          type: "feedback",
          lang,
        },
      ])
      toggleFeedback()
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: lang === "vi" ? `⚠️ Lỗi khi gửi phản hồi: ${error.message}. Vui lòng thử lại.` : `⚠️ Error sending feedback: ${error.message}. Please try again.`,
          sender: "bot",
          timestamp: new Date(),
          type: "error",
          lang,
        },
      ])
    } finally {
      setIsFeedbackLoading(false)
    }
  }

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert(lang === "vi" ? "Trình duyệt không hỗ trợ nhận dạng giọng nói" : "Browser does not support speech recognition")
      return
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
    recognitionRef.current = recognition
    recognition.lang = lang === "vi" ? "vi-VN" : "en-US"
    recognition.continuous = false
    recognition.interimResults = false

    setIsRecording(true)
    recognition.start()

    const timeout = setTimeout(() => {
      recognition.stop()
      setIsRecording(false)
      alert(lang === "vi" ? "Hết thời gian ghi âm (15 giây). Vui lòng thử lại." : "Recording timeout (15 seconds). Please try again.")
    }, 15000)

    recognition.onresult = (event) => {
      clearTimeout(timeout)
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsRecording(false)
      setTimeout(() => sendMessage(transcript), 100)
    }

    recognition.onerror = () => {
      clearTimeout(timeout)
      setIsRecording(false)
      alert(lang === "vi" ? "Lỗi nhận dạng giọng nói. Vui lòng thử lại." : "Speech recognition error. Please try again.")
    }

    recognition.onend = () => {
      clearTimeout(timeout)
      setIsRecording(false)
    }
  }

  const QuickReplies = ({ onSelect }) => {
    const defaultOptions = [
      {
        label: lang === "vi" ? "📷 Vị trí camera" : "📷 Camera locations",
        value: lang === "vi" ? "Camera ở Cần Thơ" : "Where are cameras in Can Tho?",
        icon: "📷",
        style: {
          backgroundColor: "#EEF2FF", // Indigo-50
          color: "#4F46E5", // Indigo-700
          borderColor: "#C7D2FE", // Indigo-200
        },
        hoverStyle: { backgroundColor: "#E0E7FF" }, // Indigo-100
      },
      {
        label: lang === "vi" ? "📊 Thống kê vi phạm" : "📊 Violation stats",
        value: lang === "vi" ? "Số vụ vi phạm ở Cần Thơ 2023" : "Number of violations in Can Tho 2023",
        icon: "📊",
        style: {
          backgroundColor: "#FDF2F8", // Pink-50
          color: "#BE185D", // Pink-700
          borderColor: "#FBCFE8", // Pink-200
        },
        hoverStyle: { backgroundColor: "#FCE7F3" }, // Pink-100
      },
      {
        label: lang === "vi" ? "🛑 Tra cứu biển số" : "🛑 Check plate",
        value: lang === "vi" ? "Xe 30A-12345 có vi phạm không?" : "Does plate 30A-12345 have violations?",
        icon: "🛑",
        style: {
          backgroundColor: "#FFF7ED", // Orange-50
          color: "#C2410C", // Orange-700
          borderColor: "#FED7AA", // Orange-200
        },
        hoverStyle: { backgroundColor: "#FFEDD5" }, // Orange-100
      },
    ]

    const options = suggestedQuestions.length > 0
      ? suggestedQuestions.map((q, idx) => ({
          label: q,
          value: q,
          icon: "❓",
          style: {
            backgroundColor: "#ECFDF5", // Green-50
            color: "#047857", // Green-700
            borderColor: "#A7F3D0", // Green-200
          },
          hoverStyle: { backgroundColor: "#D1FAE5" }, // Green-100
        }))
      : defaultOptions

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginTop: "0.75rem",
          marginBottom: "0.5rem",
        }}
      >
        {options.map((opt, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.02, ...opt.hoverStyle }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.value)}
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.75rem",
              lineHeight: "1rem",
              fontWeight: "500",
              borderRadius: "0.5rem",
              border: "1px solid",
              transition: "all 0.2s ease-in-out",
              ...opt.style,
            }}
            aria-label={opt.label}
          >
            <span style={{ marginRight: "0.25rem" }}>{opt.icon}</span>
            {opt.label}
          </motion.button>
        ))}
      </motion.div>
    )
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            text: lang === "vi" 
              ? "👋 Xin chào! Tôi là trợ lý ảo hỗ trợ thông tin giao thông Cần Thơ. Hãy hỏi tôi bất cứ điều gì bạn muốn biết!"
              : "👋 Hello! I'm a virtual assistant for Can Tho traffic info. Ask me anything!",
            sender: "bot",
            timestamp: new Date(),
            type: "greeting",
            lang,
          },
        ])
        setHasGreeted(true)
      }, 500)
    }
  }, [isOpen, hasGreeted, messages, lang])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "2.5rem"
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(scrollHeight, 5 * 16)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = input.trim() && scrollHeight > 40 ? "auto" : "hidden"
    }
  }, [input])

  return (
    <>
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #8B5CF6; /* violet-500 */
            border-radius: 8px;
            border: 1px solid transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #7C3AED; /* violet-600 */
          }

          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }

          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          .focus-ring-indigo-500:focus {
            box-shadow: 0 0 0 2px #6366F1; /* indigo-500 */
            border-color: transparent;
          }
          .focus-ring-indigo-200:focus {
            box-shadow: 0 0 0 4px #C7D2FE; /* indigo-200 */
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 50,
        }}
      >
        <div style={{ position: "relative" }}>
          <motion.button
            onClick={toggleChat}
            aria-label={isOpen ? (lang === "vi" ? "Đóng chatbot" : "Close chatbot") : (lang === "vi" ? "Mở chatbot" : "Open chatbot")}
            style={{
              position: "relative",
              width: "64px",
              height: "64px",
              background: "linear-gradient(to right, #6366F1, #8B5CF6)",
              color: "white",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              outline: "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease-in-out",
            }}
            whileHover={{
              scale: 1.1,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
                "0 20px 35px -5px rgba(139, 92, 246, 0.6)",
                "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
              ],
            }}
            transition={{
              boxShadow: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
            }}
            className="focus-ring-indigo-200"
          >
            <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.3 }}>
              {isOpen ? <X size={28} /> : <Bot size={32} />}
            </motion.div>

            {!isOpen && messages.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "16px",
                  height: "16px",
                  backgroundColor: "#EF4444",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "0.75rem", lineHeight: "1rem", color: "white", fontWeight: "bold" }}>
                  {messages.filter((m) => m.sender === "bot").length}
                </span>
              </motion.div>
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
              style={{
                position: "absolute",
                bottom: "80px",
                right: "0",
                width: "24rem",
                height: "36rem",
                backgroundColor: "white",
                borderRadius: "1rem",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "1px solid #F3F4F6",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                  color: "white",
                  padding: "1rem",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "0",
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                  }}
                ></div>
                <div
                  style={{
                    position: "relative",
                    zIndex: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        background: "linear-gradient(to right, #C7D2FE, #E0E7FF)",
                        borderRadius: "9999px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Bot size={20} color="#4F46E5" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: "1.125rem", lineHeight: "1.75rem", fontWeight: "bold" }}>
                        {lang === "vi" ? "Trợ lý Giao thông" : "Traffic Assistant"}
                      </h2>
                      <p style={{ fontSize: "0.75rem", lineHeight: "1rem", opacity: 0.9 }}>
                        {lang === "vi" ? "Cần Thơ Traffic Assistant" : "Can Tho Traffic Assistant"}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleGuide}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "0.5rem",
                        transition: "background-color 0.2s ease-in-out",
                        backgroundColor: "transparent",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                      title={lang === "vi" ? "Hướng dẫn sử dụng" : "User Guide"}
                      aria-label={lang === "vi" ? "Mở hướng dẫn sử dụng" : "Open user guide"}
                    >
                      <Info size={20} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setMessages([])
                        setHasGreeted(false)
                        setSuggestedQuestions([])
                      }}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "0.5rem",
                        transition: "background-color 0.2s ease-in-out",
                        backgroundColor: "transparent",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                      title={lang === "vi" ? "Xóa cuộc trò chuyện" : "Clear Chat"}
                      aria-label={lang === "vi" ? "Xóa cuộc trò chuyện" : "Clear chat"}
                    >
                      <Trash2 size={20} />
                    </motion.button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#F3F4F6",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.75rem",
                    color: "#4B5563",
                    outline: "none",
                  }}
                  className="focus-ring-indigo-500"
                  aria-label={lang === "vi" ? "Chọn ngôn ngữ" : "Select language"}
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇺🇳 English</option>
                </select>
              </div>

              <div
                ref={chatContainerRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "1rem",
                  background: "linear-gradient(to bottom, #F9FAFB, white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
                className="custom-scrollbar"
              >
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      style={{
                        display: "flex",
                        justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "85%",
                          order: msg.sender === "user" ? 2 : 1,
                        }}
                      >
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: "1rem",
                            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                            background: msg.sender === "user" ? "linear-gradient(to right, #6366F1, #8B5CF6)" : "white",
                            color: msg.sender === "user" ? "white" : "#1F2937",
                            border: msg.sender === "user" ? "none" : "1px solid #E5E7EB",
                            borderBottomRightRadius: msg.sender === "user" ? "0.375rem" : "1rem",
                            borderBottomLeftRadius: msg.sender === "user" ? "1rem" : "0.375rem",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "0.875rem",
                              lineHeight: "1.625",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.text}
                          </p>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            lineHeight: "1rem",
                            color: "#6B7280",
                            marginTop: "0.25rem",
                            display: "flex",
                            justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                            gap: "0.5rem",
                          }}
                        >
                          <span>{formatTime(msg.timestamp)}</span>
                          {msg.sender === "bot" && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleFeedback(index)}
                              style={{
                                color: "#9CA3AF",
                                transition: "color 0.2s ease-in-out",
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                              title={lang === "vi" ? "Gửi phản hồi" : "Send Feedback"}
                              aria-label={lang === "vi" ? "Gửi phản hồi cho tin nhắn này" : "Send feedback for this message"}
                            >
                              <Edit size={16} />
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {msg.sender === "bot" && (
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "9999px",
                            background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: "0.5rem",
                            marginTop: "0.25rem",
                            order: 0,
                          }}
                        >
                          <Bot size={16} color="white" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {messages.length > 0 && !isLoading && (
                    <QuickReplies
                      onSelect={(value) => {
                        setInput(value)
                        setTimeout(() => sendMessage(value), 100)
                      }}
                    />
                  )}

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "9999px",
                          background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Bot size={16} color="white" />
                      </div>
                      <div
                        style={{
                          backgroundColor: "white",
                          border: "1px solid #E5E7EB",
                          borderRadius: "1rem",
                          borderBottomLeftRadius: "0.375rem",
                          padding: "0.75rem 1rem",
                          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "0.25rem",
                            }}
                          >
                            <motion.div
                              style={{
                                width: "8px",
                                height: "8px",
                                backgroundColor: "#6366F1",
                                borderRadius: "9999px",
                              }}
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                            />
                            <motion.div
                              style={{
                                width: "8px",
                                height: "8px",
                                backgroundColor: "#6366F1",
                                borderRadius: "9999px",
                              }}
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                            />
                            <motion.div
                              style={{
                                width: "8px",
                                height: "8px",
                                backgroundColor: "#6366F1",
                                borderRadius: "9999px",
                              }}
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
                            />
                          </div>
                          <span style={{ fontSize: "0.875rem", lineHeight: "1.25rem", color: "#4B5563" }}>
                            {lang === "vi" ? "Đang trả lời..." : "Replying..."}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "white",
                  borderTop: "1px solid #F3F4F6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    rows="1"
                    style={{
                      flex: 1,
                      padding: "0.5rem 1rem",
                      border: "1px solid #D1D5DB",
                      borderRadius: "1rem",
                      fontSize: "0.875rem",
                      lineHeight: "1.25rem",
                      outline: "none",
                      resize: "none",
                      height: "2.5rem",
                      maxHeight: "5rem",
                      transition: "all 0.2s ease-in-out",
                    }}
                    className="custom-scrollbar focus-ring-indigo-500"
                    placeholder={lang === "vi" ? "Nhập câu hỏi của bạn..." : "Enter your question..."}
                    aria-label={lang === "vi" ? "Nhập câu hỏi giao thông" : "Enter traffic question"}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVoiceInput}
                    disabled={isRecording}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "1rem",
                      transition: "all 0.2s ease-in-out",
                      backgroundColor: isRecording ? "#EF4444" : "#F3F4F6",
                      color: isRecording ? "white" : "#4B5563",
                      border: "none",
                      cursor: "pointer",
                    }}
                    className={isRecording ? "animate-pulse" : ""}
                    title={isRecording ? (lang === "vi" ? "Đang ghi âm..." : "Recording...") : (lang === "vi" ? "Nhấn để nói" : "Click to speak")}
                    aria-label={isRecording ? (lang === "vi" ? "Đang ghi âm" : "Recording") : (lang === "vi" ? "Bắt đầu ghi âm" : "Start recording")}
                  >
                    <Mic size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    style={{
                      padding: "0.75rem",
                      background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                      color: "white",
                      borderRadius: "1rem",
                      transition: "all 0.2s ease-in-out",
                      outline: "none",
                      border: "none",
                      cursor: "pointer",
                      opacity: !input.trim() || isLoading ? 0.5 : 1,
                      pointerEvents: !input.trim() || isLoading ? "none" : "auto",
                    }}
                    className="focus-ring-indigo-500"
                    aria-label={lang === "vi" ? "Gửi câu hỏi" : "Send question"}
                  >
                    <Send size={20} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isFeedbackOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: "0",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 60,
                padding: "1rem",
              }}
              onClick={() => toggleFeedback()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  width: "100%",
                  maxWidth: "28rem",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      lineHeight: "1.75rem",
                      fontWeight: "bold",
                      color: "#1F2937",
                    }}
                  >
                    {lang === "vi" ? "Gửi phản hồi" : "Send Feedback"}
                  </h3>
                  <button
                    onClick={() => toggleFeedback()}
                    style={{
                      padding: "0.5rem",
                      color: "#9CA3AF",
                      borderRadius: "0.5rem",
                      transition: "background-color 0.2s ease-in-out, color 0.2s ease-in-out",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F3F4F6"
                      e.currentTarget.style.color = "#4B5563"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                      e.currentTarget.style.color = "#9CA3AF"
                    }}
                    aria-label={lang === "vi" ? "Đóng cửa sổ phản hồi" : "Close feedback window"}
                  >
                    <X size={20} />
                  </button>
                </div>
                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  style={{
                    width: "100%",
                    height: "8rem",
                    padding: "0.75rem",
                    border: "1px solid #D1D5DB",
                    borderRadius: "0.5rem",
                    outline: "none",
                    fontSize: "0.875rem",
                    lineHeight: "1.25rem",
                  }}
                  className="focus-ring-indigo-500"
                  placeholder={lang === "vi" ? "Nhập câu trả lời đúng hoặc phản hồi của bạn..." : "Enter the correct answer or your feedback..."}
                  aria-label={lang === "vi" ? "Nhập phản hồi" : "Enter feedback"}
                />
                <div
                  style={{
                    marginTop: "1rem",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleFeedback()}
                    style={{
                      padding: "0.5rem 1rem",
                      color: "#4B5563",
                      backgroundColor: "#F3F4F6",
                      borderRadius: "0.5rem",
                      transition: "background-color 0.2s ease-in-out",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E5E7EB")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
                    aria-label={lang === "vi" ? "Hủy phản hồi" : "Cancel feedback"}
                  >
                    {lang === "vi" ? "Hủy" : "Cancel"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={submitFeedback}
                    disabled={!feedbackInput.trim() || isFeedbackLoading}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                      color: "white",
                      borderRadius: "0.5rem",
                      transition: "all 0.2s ease-in-out",
                      border: "none",
                      cursor: "pointer",
                      opacity: !feedbackInput.trim() || isFeedbackLoading ? 0.5 : 1,
                      pointerEvents: !feedbackInput.trim() || isFeedbackLoading ? "none" : "auto",
                    }}
                    aria-label={lang === "vi" ? "Gửi phản hồi" : "Send feedback"}
                  >
                    {isFeedbackLoading ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <motion.div
                          style={{
                            width: "8px",
                            height: "8px",
                            backgroundColor: "white",
                            borderRadius: "9999px",
                          }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                        />
                        <span>{lang === "vi" ? "Gửi..." : "Sending..."}</span>
                      </div>
                    ) : (
                      lang === "vi" ? "Gửi phản hồi" : "Send Feedback"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isGuideOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: "0",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 60,
                padding: "1rem",
              }}
              onClick={toggleGuide}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  width: "100%",
                  maxWidth: "28rem",
                  maxHeight: "80vh",
                  overflowY: "auto",
                }}
              >
                <div style={{ padding: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        lineHeight: "1.75rem",
                        fontWeight: "bold",
                        color: "#1F2937",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ marginRight: "0.5rem" }}>
                        <BookOpen size={20} />
                      </span>
                      {lang === "vi" ? "Hướng dẫn sử dụng" : "User Guide"}
                    </h3>
                    <button
                      onClick={toggleGuide}
                      style={{
                        padding: "0.5rem",
                        color: "#9CA3AF",
                        borderRadius: "0.5rem",
                        transition: "background-color 0.2s ease-in-out, color 0.2s ease-in-out",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#F3F4F6"
                        e.currentTarget.style.color = "#4B5563"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent"
                        e.currentTarget.style.color = "#9CA3AF"
                      }}
                      aria-label={lang === "vi" ? "Đóng hướng dẫn sử dụng" : "Close user guide"}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      fontSize: "0.875rem",
                      lineHeight: "1.25rem",
                      color: "#374151",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#EEF2FF",
                        border: "1px solid #C7D2FE",
                        borderRadius: "0.5rem",
                        padding: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          fontWeight: "600",
                          color: "#4F46E5",
                          marginBottom: "0.5rem",
                        }}
                      >
                        🚀 {lang === "vi" ? "Bắt đầu nhanh" : "Quick Start"}
                      </h4>
                      <ul
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          color: "#4338CA",
                          listStyle: "none",
                          padding: 0,
                        }}
                      >
                        <li>{lang === "vi" ? "• Nhập câu hỏi trực tiếp vào khung chat (Enter để gửi, Shift+Enter để xuống dòng)" : "• Enter question in chat box (Enter to send, Shift+Enter for new line)"}</li>
                        <li>{lang === "vi" ? "• Nhấn nút mic để sử dụng giọng nói" : "• Click mic for voice input"}</li>
                        <li>{lang === "vi" ? "• Chọn các gợi ý nhanh bên dưới" : "• Select quick suggestions below"}</li>
                        <li>{lang === "vi" ? "• Gửi phản hồi nếu câu trả lời chưa chính xác" : "• Send feedback if answer is incorrect"}</li>
                      </ul>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#FDF2F8",
                        border: "1px solid #FBCFE8",
                        borderRadius: "0.5rem",
                        padding: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          fontWeight: "600",
                          color: "#BE185D",
                          marginBottom: "0.5rem",
                        }}
                      >
                        💡 {lang === "vi" ? "Các chức năng chính" : "Main Features"}
                      </h4>
                      <ul
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                          color: "#9D174D",
                          listStyle: "none",
                          padding: 0,
                        }}
                      >
                        <li>
                          <strong>{lang === "vi" ? "📷 Tra cứu camera:" : "📷 Camera lookup:"}</strong>
                          <br />
                          {lang === "vi" ? "Camera ở đường Hùng Vương" : "Cameras on Hung Vuong street"}
                        </li>
                        <li>
                          <strong>{lang === "vi" ? "🛑 Kiểm tra vi phạm:" : "🛑 Check violations:"}</strong>
                          <br />
                          {lang === "vi" ? "Xe 30A-12345 có vi phạm không?" : "Does plate 30A-12345 have violations?"}
                        </li>
                        <li>
                          <strong>{lang === "vi" ? "📊 Thống kê giao thông:" : "📊 Traffic stats:"}</strong>
                          <br />
                          {lang === "vi" ? "Số vụ tai nạn tháng này" : "Number of accidents this month"}
                        </li>
                        <li>
                          <strong>{lang === "vi" ? "🚨 Báo cáo sự cố:" : "🚨 Report incidents:"}</strong>
                          <br />
                          {lang === "vi" ? "Báo cáo tai nạn tại ngã tư ABC" : "Report accident at ABC intersection"}
                        </li>
                        <li>
                          <strong>{lang === "vi" ? "📝 Gửi phản hồi:" : "📝 Send feedback:"}</strong>
                          <br />
                          {lang === "vi" ? "Nhấn biểu tượng bút để sửa câu trả lời" : "Click pen icon to edit response"}
                        </li>
                      </ul>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#FFF7ED",
                        border: "1px solid #FED7AA",
                        borderRadius: "0.5rem",
                        padding: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          fontWeight: "600",
                          color: "#C2410C",
                          marginBottom: "0.5rem",
                        }}
                      >
                        ⚡ {lang === "vi" ? "Mẹo sử dụng" : "Usage Tips"}
                      </h4>
                      <ul
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          color: "#9A3412",
                          listStyle: "none",
                          padding: 0,
                        }}
                      >
                        <li>{lang === "vi" ? "• Nói rõ ràng khi sử dụng mic" : "• Speak clearly when using mic"}</li>
                        <li>{lang === "vi" ? "• Cung cấp thông tin cụ thể (địa điểm, thời gian)" : "• Provide specific info (location, time)"}</li>
                        <li>{lang === "vi" ? "• Sử dụng biển số xe đầy đủ khi tra cứu" : "• Use full plate number for lookups"}</li>
                        <li>{lang === "vi" ? "• Chọn ngôn ngữ phù hợp (Tiếng Việt/English)" : "• Select appropriate language (Vietnamese/English)"}</li>
                        <li>{lang === "vi" ? "• Gửi phản hồi để cải thiện trợ lý" : "• Send feedback to improve assistant"}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default Chatbot