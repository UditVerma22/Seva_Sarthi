/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';

// ── Typing Indicator ──────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="w-2 h-2 rounded-full bg-teal-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────
function MessageBubble({ msg, onAction }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[10px]">auto_awesome</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seva AI</span>
          </div>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-br-md shadow-md'
            : 'bg-white text-slate-700 rounded-bl-md shadow-sm border border-slate-100'
        }`}>
          {msg.content}
        </div>

        {/* Image preview */}
        {msg.image && (
          <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 shadow-sm max-w-[200px]">
            <img src={msg.image} alt="Uploaded" className="w-full h-auto" />
          </div>
        )}

        {/* Analysis Card */}
        {msg.analysis && (
          <div className="mt-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Analysis</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                msg.analysis.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                msg.analysis.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                msg.analysis.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>{msg.analysis.urgency} urgency</span>
            </div>
            <p className="text-sm text-slate-700 font-medium">{msg.analysis.issue}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-teal-50 text-teal-700 font-semibold px-2.5 py-1 rounded-lg border border-teal-100">
                📋 {msg.analysis.category}
              </span>
              <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-lg border border-amber-100">
                💰 {msg.analysis.estimatedCost}
              </span>
            </div>
            {msg.analysis.recommendations?.length > 0 && (
              <ul className="space-y-1">
                {msg.analysis.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                    <span className="text-teal-500 mt-0.5">•</span>{r}
                  </li>
                ))}
              </ul>
            )}
            {msg.analysis.diyTip && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-xs text-blue-700"><span className="font-bold">💡 DIY Tip:</span> {msg.analysis.diyTip}</p>
              </div>
            )}
            <button onClick={() => onAction({ action: 'navigate', path: '/services' })}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl hover:shadow-md transition-all active:scale-[0.98]">
              🔍 Find a {msg.analysis.category} Professional
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {msg.actions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {msg.actions.map((a, i) => (
              <button key={i} onClick={() => onAction(a)}
                className="text-xs font-semibold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        )}
        <span className={`text-[10px] mt-1 block ${isUser ? 'text-right text-slate-400' : 'text-slate-300 ml-1'}`}>
          {msg.time}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main SevaAI Widget ────────────────────────────────────────────
export default function SevaAI() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const timeStr = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'model',
        content: "Hello! 👋 I'm Seva AI, your smart assistant.\n\nI can help you find services, answer questions, and even analyze photos of household problems!\n\nHow can I help you today?",
        time: timeStr(),
        actions: [],
      }]);
    }
  }, [isOpen, messages.length]);

  const handleAction = useCallback((action) => {
    if (action.action === 'navigate') {
      setIsOpen(false);
      navigate(action.path);
    }
  }, [navigate]);

  // ── Send Message ──────────────────────────────────────────
  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    const userMsg = { role: 'user', content: text.trim(), time: timeStr() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowQuickActions(false);
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => !m.analysis && !m.image)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.post('/ai/chat', { message: text.trim(), history });
      setMessages(prev => [...prev, {
        role: 'model',
        content: res.data.response,
        time: timeStr(),
        actions: res.data.actions || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: "Sorry, I couldn't process that right now. Please try again! 🙏",
        time: timeStr(),
        actions: [],
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle Image Upload ───────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setMessages(prev => [...prev, {
        role: 'model', content: "Please upload a valid image (JPEG, PNG, or WebP). 📷", time: timeStr(), actions: [],
      }]);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessages(prev => [...prev, {
        role: 'model', content: "Image is too large. Please use an image under 10MB. 📦", time: timeStr(), actions: [],
      }]);
      return;
    }

    setShowQuickActions(false);
    setIsLoading(true);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Full = reader.result;
      const base64Data = base64Full.split(',')[1];

      // Add user message with image
      setMessages(prev => [...prev, {
        role: 'user', content: '📷 Analyzing this image...', image: base64Full, time: timeStr(),
      }]);

      try {
        const res = await api.post('/ai/analyze-image', { image: base64Data, mimeType: file.type });
        setMessages(prev => [...prev, {
          role: 'model',
          content: "Here's what I found! 🔍",
          time: timeStr(),
          analysis: res.data,
          actions: [],
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          role: 'model',
          content: "I couldn't analyze that image. Try a clearer photo or describe the problem in text! 📝",
          time: timeStr(), actions: [],
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const quickActions = [
    { text: '🔍 Find a service', msg: 'I need help finding a service' },
    { text: '📸 Scan a problem', action: 'upload' },
    { text: '💰 Check pricing', msg: 'What are your service prices?' },
    { text: '❓ How it works', msg: 'How does Seva Sarthi work?' },
  ];

  return (
    <>
      {/* ── FAB Button ───────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-500/30 flex items-center justify-center group"
            aria-label="Open Seva AI Chat"
            id="seva-ai-fab"
          >
            <span className="material-symbols-outlined text-2xl sm:text-3xl transition-transform group-hover:rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Window ──────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[9999] w-full sm:w-[400px] h-[100dvh] sm:h-[600px] sm:max-h-[80vh] flex flex-col bg-slate-50 sm:rounded-3xl shadow-2xl shadow-black/20 border border-slate-200/60 overflow-hidden"
            id="seva-ai-window"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">Seva AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-teal-100 text-[11px] font-medium">Online • Ready to help</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setMessages([]); setShowQuickActions(true); }}
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  title="Clear chat"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 no-scrollbar">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} onAction={handleAction} />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-3">
                  <div className="bg-white rounded-2xl rounded-bl-md shadow-sm border border-slate-100">
                    <TypingDots />
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {showQuickActions && messages.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  {quickActions.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (qa.action === 'upload') {
                          fileInputRef.current?.click();
                        } else {
                          sendMessage(qa.msg);
                        }
                      }}
                      className="text-left bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all active:scale-[0.97]"
                    >
                      {qa.text}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-200 bg-white px-3 py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* Image Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  id="seva-ai-image-input"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-40 flex-shrink-0"
                  title="Upload image for analysis"
                >
                  <span className="material-symbols-outlined text-xl">photo_camera</span>
                </button>

                {/* Text Input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    disabled={isLoading}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white transition-all disabled:opacity-60"
                    id="seva-ai-input"
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm disabled:opacity-40 disabled:shadow-none hover:shadow-md transition-all active:scale-95 flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </form>
              </div>
              <p className="text-center text-[10px] text-slate-300 mt-2 font-medium">Powered by Google Gemini AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
