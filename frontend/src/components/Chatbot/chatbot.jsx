
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import 'tailwindcss/tailwind.css'

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [useExternalApi, setUseExternalApi] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackMessageId, setFeedbackMessageId] = useState(null)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)

  const toggleChat = () => setIsOpen(!isOpen)
  const toggleGuide = () => setIsGuideOpen(!isGuideOpen)
  const toggleFeedback = (messageId = null) => {
    setFeedbackMessageId(messageId)
    setFeedbackInput('')
    setIsFeedbackOpen(!isFeedbackOpen)
  }

  const sendMessage = async (text = input, retryCount = 0) => {
    if (!text.trim()) return

    const userMessage = { text, sender: 'user', timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setInput('')

    try {
      const history = messages
        .filter(msg => msg.sender === 'user' || (msg.sender === 'bot' && !msg.text.includes('Bạn muốn hỏi thêm')))
        .map(msg => ({
          sentence: msg.text,
          timestamp: msg.timestamp.toISOString()
        }))

      const response = await fetch('http://localhost:8080/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: text,
          use_external_api: useExternalApi,
          history
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const responseText = data.response || '⚠️ Không nhận được phản hồi từ server.'

      // Extract suggested questions
      const [mainResponse, ...suggestions] = responseText.split('\nBạn muốn hỏi thêm: ')
      const suggestionList = suggestions.length > 0 
        ? suggestions[0].split(' hoặc ').map(s => s.replace(' 😄', '').trim())
        : []

      setSuggestedQuestions(suggestionList)

      const botMessage = { 
        text: mainResponse, 
        sender: 'bot', 
        timestamp: new Date() 
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      if (retryCount < 2) {
        setTimeout(() => sendMessage(text, retryCount + 1), 1000)
        return
      }
      const botMessage = {
        text: '⚠️ Không thể kết nối máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const submitFeedback = async () => {
    if (!feedbackInput.trim() || feedbackMessageId === null) return

    setIsFeedbackLoading(true)
    try {
      const question = messages[feedbackMessageId].text
      const response = await fetch('http://localhost:8080/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          corrected_answer: feedbackInput
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setMessages(prev => [...prev, {
        text: data.response || '✅ Phản hồi đã được ghi nhận!',
        sender: 'bot',
        timestamp: new Date()
      }])
      toggleFeedback()
    } catch (error) {
      setMessages(prev => [...prev, {
        text: '⚠️ Lỗi khi gửi phản hồi. Vui lòng thử lại.',
        sender: 'bot',
        timestamp: new Date()
      }])
    } finally {
      setIsFeedbackLoading(false)
    }
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Trình duyệt không hỗ trợ nhận dạng giọng nói')
      return
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
    recognitionRef.current = recognition
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = false
    
    setIsRecording(true)
    recognition.start()

    const timeout = setTimeout(() => {
      recognition.stop()
      setIsRecording(false)
      alert('Hết thời gian ghi âm. Vui lòng thử lại.')
    }, 10000)

    recognition.onresult = event => {
      clearTimeout(timeout)
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsRecording(false)
      setTimeout(() => sendMessage(transcript), 100)
    }
    
    recognition.onerror = () => {
      clearTimeout(timeout)
      setIsRecording(false)
      alert('Lỗi nhận dạng giọng nói. Vui lòng thử lại.')
    }
    
    recognition.onend = () => {
      clearTimeout(timeout)
      setIsRecording(false)
    }
  }

  const QuickReplies = ({ onSelect }) => {
    const defaultOptions = [
      { 
        label: '📷 Vị trí camera', 
        value: 'Camera ở Cần Thơ',
        icon: '📷',
        color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
      },
      { 
        label: '📊 Thống kê vi phạm', 
        value: 'Số vụ vi phạm ở Cần Thơ 2023',
        icon: '📊',
        color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
      },
      { 
        label: '🛑 Tra cứu biển số', 
        value: 'Xe 30A-12345 có vi phạm không?',
        icon: '🛑',
        color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      }
    ]

    const options = suggestedQuestions.length > 0 
      ? suggestedQuestions.map((q, idx) => ({
          label: q,
          value: q,
          icon: '❓',
          color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
        }))
      : defaultOptions

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-wrap gap-2 mt-3 mb-2'
      >
        {options.map((opt, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.value)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${opt.color}`}
          >
            <span className='mr-1'>{opt.icon}</span>
            {opt.label}
          </motion.button>
        ))}
      </motion.div>
    )
  }

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          { 
            text: '👋 Xin chào! Tôi là trợ lý ảo hỗ trợ thông tin giao thông Cần Thơ. Hãy hỏi tôi bất cứ điều gì bạn muốn biết!', 
            sender: 'bot',
            timestamp: new Date()
          }
        ])
        setHasGreeted(true)
      }, 500)
    }
  }, [isOpen, hasGreeted, messages])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Auto-resize textarea and manage scrollbar
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to compute scrollHeight accurately
      textarea.style.height = '2.5rem' // h-10 = 40px
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(scrollHeight, 5 * 16) // Max height ~5rem (80px)
      textarea.style.height = `${newHeight}px`
      
      // Hide scrollbar when empty, show when content exceeds height
      textarea.style.overflowY = input.trim() && scrollHeight > 40 ? 'auto' : 'hidden'
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
            @apply bg-teal-500 hover:bg-teal-600;
            border-radius: 8px;
            border: 1px solid transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            @apply bg-teal-600;
          }
        `}
      </style>
      <div className='fixed bottom-6 right-6 z-50'>
        {/* Floating Action Button */}
        <div className='relative'>
          <motion.button
            onClick={toggleChat}
            className='relative w-16 h-16 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-300'
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                '0 20px 35px -5px rgba(16, 185, 129, 0.6)',
                '0 10px 25px -5px rgba(16, 185, 129, 0.4)'
              ]
            }}
            transition={{
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? (
                <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              ) : (
                <svg className='h-7 w-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' />
                </svg>
              )}
            </motion.div>
            
            {!isOpen && messages.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className='absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center'
              >
                <span className='text-xs text-white font-bold'>{messages.filter(m => m.sender === 'bot').length}</span>
              </motion.div>
            )}
          </motion.button>
        </div>

        {/* Chat Window */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
              className='absolute bottom-20 right-0 w-96 h-[36rem] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden backdrop-blur-sm'
            >
              {/* Header */}
              <div className='bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-4 relative overflow-hidden'>
                <div className='absolute inset-0 bg-black bg-opacity-10'></div>
                <div className='relative z-10 flex justify-between items-center'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center'>
                      <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z' clipRule='evenodd' />
                      </svg>
                    </div>
                    <div>
                      <h2 className='text-lg font-bold'>Trợ lý Giao thông</h2>
                      <p className='text-xs opacity-90'>Cần Thơ Traffic Assistant</p>
                    </div>
                  </div>
                  
                  <div className='flex items-center space-x-2'>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleGuide}
                      className='p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors'
                      title='Hướng dẫn sử dụng'
                    >
                      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setMessages([])
                        setHasGreeted(false)
                        setSuggestedQuestions([])
                      }}
                      className='p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors'
                      title='Xóa cuộc trò chuyện'
                    >
                      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m9 7h6m2 0H7' />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Messages Container */}
              <div
                ref={chatContainerRef}
                className='flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white space-y-4'
              >
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-md'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                          }`}
                        >
                          <p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>
                            {msg.text}
                          </p>
                        </div>
                        <div className={`text-xs text-gray-500 mt-1 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} space-x-2`}>
                          <span>{formatTime(msg.timestamp)}</span>
                          {msg.sender === 'bot' && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleFeedback(index)}
                              className='text-gray-400 hover:text-gray-600'
                              title='Gửi phản hồi'
                            >
                              <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </motion.button>
                          )}
                        </div>
                      </div>
                      
                      {msg.sender === 'bot' && (
                        <div className='w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mr-2 mt-1 order-0'>
                          <svg className='h-4 w-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z' clipRule='evenodd' />
                          </svg>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {messages.length > 0 && !isLoading && (
                    <QuickReplies
                      onSelect={value => {
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
                      className='flex items-start space-x-2'
                    >
                      <div className='w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center'>
                        <svg className='h-4 w-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z' clipRule='evenodd' />
                        </svg>
                      </div>
                      <div className='bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'>
                        <div className='flex items-center space-x-2'>
                          <div className='flex space-x-1'>
                            <motion.div
                              className='w-2 h-2 bg-emerald-500 rounded-full'
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                              className='w-2 h-2 bg-emerald-500 rounded-full'
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div
                              className='w-2 h-2 bg-emerald-500 rounded-full'
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                            />
                          </div>
                          <span className='text-sm text-gray-600'>Đang trả lời...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Area */}
              <div className='p-4 bg-white border-t border-gray-100'>
                <div className='flex items-center space-x-2 mb-3'>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    rows='1'
                    className='flex-1 px-4 py-2 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-10 max-h-20 transition-all duration-200 custom-scrollbar'
                    placeholder='Nhập câu hỏi của bạn...'
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVoiceInput}
                    disabled={isRecording}
                    className={`p-3 rounded-2xl transition-all duration-200 ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title={isRecording ? 'Đang ghi âm...' : 'Nhấn để nói'}
                  >
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' />
                    </svg>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className='p-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
                  >
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8' />
                    </svg>
                  </motion.button>
                </div>
                
                <label className='flex items-center text-xs text-gray-600 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={useExternalApi}
                    onChange={e => setUseExternalApi(e.target.checked)}
                    className='mr-2 text-emerald-600 focus:ring-emerald-500 rounded'
                  />
                  <span className='select-none'>🌐 Sử dụng API chatbot bên ngoài</span>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Modal */}
        <AnimatePresence>
          {isFeedbackOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4'
              onClick={() => toggleFeedback()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className='bg-white rounded-2xl shadow-2xl w-full max-w-md p-6'
              >
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-xl font-bold text-gray-800'>Gửi phản hồi</h3>
                  <button
                    onClick={() => toggleFeedback()}
                    className='p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors'
                  >
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
                <textarea
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  className='w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm'
                  placeholder='Nhập câu trả lời đúng hoặc phản hồi của bạn...'
                />
                <div className='mt-4 flex justify-end space-x-2'>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleFeedback()}
                    className='px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={submitFeedback}
                    disabled={!feedbackInput.trim() || isFeedbackLoading}
                    className='px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {isFeedbackLoading ? (
                      <div className='flex items-center space-x-2'>
                        <motion.div
                          className='w-2 h-2 bg-white rounded-full'
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <span>Gửi...</span>
                      </div>
                    ) : (
                      'Gửi phản hồi'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Guide Modal */}
        <AnimatePresence>
          {isGuideOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4'
              onClick={toggleGuide}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto'
              >
                <div className='p-6'>
                  <div className='flex items-center justify-between mb-6'>
                    <h3 className='text-xl font-bold text-gray-800 flex items-center'>
                      <span className='mr-2'>📖</span>
                      Hướng dẫn sử dụng
                    </h3>
                    <button
                      onClick={toggleGuide}
                      className='p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors'
                    >
                      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                      </svg>
                    </button>
                  </div>
                  
                  <div className='space-y-4 text-sm text-gray-700'>
                    <div className='bg-emerald-50 border border-emerald-200 rounded-lg p-4'>
                      <h4 className='font-semibold text-emerald-800 mb-2'>🚀 Bắt đầu nhanh</h4>
                      <ul className='space-y-1 text-emerald-700'>
                        <li>• Nhập câu hỏi trực tiếp vào khung chat (Enter để gửi, Shift+Enter để xuống dòng)</li>
                        <li>• Nhấn nút mic để sử dụng giọng nói</li>
                        <li>• Chọn các gợi ý nhanh bên dưới</li>
                        <li>• Gửi phản hồi nếu câu trả lời chưa chính xác</li>
                      </ul>
                    </div>
                    
                    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                      <h4 className='font-semibold text-blue-800 mb-2'>💡 Các chức năng chính</h4>
                      <ul className='space-y-2 text-blue-700'>
                        <li><strong>📷 Tra cứu camera:</strong><br/>"Camera ở đường Hùng Vương"</li>
                        <li><strong>🛑 Kiểm tra vi phạm:</strong><br/>"Xe 30A-12345 có vi phạm không?"</li>
                        <li><strong>📊 Thống kê giao thông:</strong><br/>"Số vụ tai nạn tháng này"</li>
                        <li><strong>🚨 Báo cáo sự cố:</strong><br/>"Báo cáo tai nạn tại ngã tư ABC"</li>
                        <li><strong>📝 Gửi phản hồi:</strong><br/>Nhấn biểu tượng bút để sửa câu trả lời</li>
                      </ul>
                    </div>
                    
                    <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                      <h4 className='font-semibold text-yellow-800 mb-2'>⚡ Mẹo sử dụng</h4>
                      <ul className='space-y-1 text-yellow-700'>
                        <li>• Nói rõ ràng khi sử dụng mic</li>
                        <li>• Cung cấp thông tin cụ thể (địa điểm, thời gian)</li>
                        <li>• Sử dụng biển số xe đầy đủ khi tra cứu</li>
                        <li>• Bật API ngoài để có thêm thông tin</li>
                        <li>• Gửi phản hồi để cải thiện trợ lý</li>
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
