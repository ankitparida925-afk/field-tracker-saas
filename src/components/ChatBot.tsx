import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../context/AppState';
import { parseAIChatQuery } from '../utils/aiEngine';
import { Send, Bot, User, Sparkles, MessageSquare, ArrowRight, CornerDownLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const ChatBot: React.FC = () => {
  const {
    employees,
    activeTracking,
    attendance,
    visits,
    alerts,
    tasks
  } = useAppState();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'ai',
      text: "Hello! I am your AI Field Tracking Assistant. I can help you analyze employee routes, track compliance, optimize travel paths, and discover operational anomalies.\n\n**Try asking me:**\n• *\"Who is online right now?\"*\n• *\"Are there any active alerts?\"*\n• *\"Optimize routes\"*",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate localized AI thinking latency
    setTimeout(() => {
      const responseText = parseAIChatQuery(
        textToSend,
        employees,
        activeTracking,
        attendance,
        visits,
        alerts,
        tasks
      );

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="w-[360px] h-[480px] bg-stone-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between mb-4 animate-in slide-in-from-bottom-5 duration-300">
          
          {/* HEADER */}
          <div className="bg-gradient-to-r from-amber-900 to-stone-900 px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg border border-amber-500/30">
                <Sparkles size={14} className="animate-pulse" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-stone-100 flex items-center gap-1">AI Field Intelligence</h4>
                <p className="text-[9px] text-amber-300 font-semibold uppercase tracking-wider">Spatial Analyst Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-200 text-xs font-bold p-1 hover:bg-white/5 rounded"
            >
              ✕
            </button>
          </div>

          {/* MESSAGES BODY */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar Icon */}
                <div className={`p-1.5 rounded-lg h-7 w-7 flex-shrink-0 flex items-center justify-center border ${
                  msg.sender === 'user'
                    ? 'bg-stone-800 border-white/10 text-stone-300'
                    : 'bg-amber-950/40 border-amber-500/25 text-amber-400'
                }`}>
                  {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>

                {/* Bubble */}
                <div className={`p-3 rounded-xl max-w-[80%] text-xs leading-relaxed space-y-1 ${
                  msg.sender === 'user'
                    ? 'bg-stone-900 border border-white/5 text-stone-200 rounded-tr-none'
                    : 'bg-stone-900/40 border border-amber-500/10 text-stone-300 rounded-tl-none whitespace-pre-wrap'
                }`}>
                  {/* Quick markdown helper formatting for AI bold lists */}
                  {msg.text.split('\n').map((line, idx) => {
                    let formatted = line;
                    // Detect bold titles
                    if (line.startsWith('• ') || line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                      const listPrefix = line.match(/^(• |\d+\. )/)?.[0] || '';
                      const remaining = line.substring(listPrefix.length);
                      
                      // Highlight headers with double stars
                      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
                      if (boldMatch) {
                        const before = remaining.split('**')[0];
                        const after = remaining.split('**')[2];
                        return (
                          <div key={idx} className="pl-3 relative">
                            <span className="absolute left-0 text-amber-400 font-bold">{listPrefix}</span>
                            <span>{before}</span>
                            <strong className="text-amber-300 font-extrabold">{boldMatch[1]}</strong>
                            <span>{after}</span>
                          </div>
                        );
                      }
                    }

                    // Standard rendering
                    if (line.startsWith('👤') || line.startsWith('📊') || line.startsWith('🚗') || line.startsWith('⚠️')) {
                      return <p key={idx} className="font-bold text-amber-200 mt-2 mb-1">{line}</p>;
                    }

                    return <p key={idx}>{line}</p>;
                  })}
                  <span className="block text-[8px] text-stone-500 font-semibold font-mono text-right mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* TYPING SHIMMER LOADER */}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="p-1.5 rounded-lg h-7 w-7 flex-shrink-0 flex items-center justify-center border bg-amber-950/40 border-amber-500/25 text-amber-400">
                  <Bot size={13} className="animate-spin" />
                </div>
                <div className="p-3.5 rounded-xl border border-amber-500/10 bg-stone-900/20 max-w-[120px] rounded-tl-none space-y-1">
                  <div className="h-2 bg-amber-400/20 rounded shimmer-loader w-10"></div>
                  <div className="h-1.5 bg-amber-400/10 rounded shimmer-loader w-16"></div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* QUICK PROMPTS CHIPS */}
          <div className="px-4 py-2 border-t border-white/5 bg-stone-950 flex gap-1.5 overflow-x-auto whitespace-nowrap">
            {[
              'Who is online?',
              'Are there active alerts?',
              'Optimize routes'
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                className="text-[9.5px] font-semibold text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1 transition cursor-pointer flex items-center gap-0.5"
              >
                {p} <ArrowRight size={8} />
              </button>
            ))}
          </div>

          {/* INPUT FORM */}
          <form onSubmit={handleFormSubmit} className="p-3 border-t border-white/5 bg-stone-900 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask anything about field status..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-grow bg-stone-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-xl border border-amber-500/20 transition flex items-center justify-center"
            >
              <Send size={13} />
            </button>
          </form>

        </div>
      )}

      {/* FLOAT ACTION BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-2xl p-4 shadow-2xl border border-amber-500/30 flex items-center justify-center gap-2 transition duration-300 transform hover:scale-105"
      >
        <MessageSquare size={18} className={isOpen ? 'rotate-90 transition' : ''} />
        {!isOpen && <span className="text-xs font-bold uppercase tracking-wider pr-1">Ask AI Analyst</span>}
      </button>

    </div>
  );
};
