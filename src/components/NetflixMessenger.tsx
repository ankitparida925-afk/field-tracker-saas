import React, { useState, useEffect, useRef } from 'react';
import { useAppState, Message } from '../context/AppState';
import { MessageSquare, Send, X, ShieldAlert, Sparkles, User, UserCheck } from 'lucide-react';

export const NetflixMessenger: React.FC = () => {
  const {
    messages,
    employees,
    currentUser,
    sendMessage,
    markMessageAsRead
  } = useAppState();

  const [isOpen, setIsOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat thread when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeThreadId, isOpen]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const tenantEmployees = employees.filter(
    e => e.organizationId === currentUser.organizationId && e.id !== currentUser.employeeId
  );

  // Filter messages scoped to this tenant
  const tenantMessages = messages.filter(
    m => m.organizationId === currentUser.organizationId
  );

  // Helper to clean prefixes from IDs
  const cleanId = (id: string) => id.replace(/^user-|^admin-/, '');

  // Compute unread message count
  const unreadCount = tenantMessages.filter(
    m => !m.isRead && cleanId(m.recipientId) === (isAdmin ? 'admin' : cleanId(currentUser.employeeId || ''))
  ).length;

  // Filter messages for active chat thread
  const threadMessages = tenantMessages.filter(m => {
    const cleanSenderId = cleanId(m.senderId);
    const cleanRecipientId = cleanId(m.recipientId);
    const cleanActiveThreadId = activeThreadId ? cleanId(activeThreadId) : null;
    const cleanCurrentUserId = cleanId(currentUser.id);
    const cleanEmployeeId = currentUser.employeeId ? cleanId(currentUser.employeeId) : '';

    if (isAdmin) {
      // Admin thread with a specific employee
      return (
        (cleanSenderId === cleanActiveThreadId && cleanRecipientId === 'admin') ||
        (m.senderRole === 'admin' && cleanRecipientId === cleanActiveThreadId)
      );
    } else {
      // Employee thread with admin
      return (
        (cleanSenderId === cleanEmployeeId && cleanRecipientId === 'admin') ||
        (m.senderRole === 'admin' && cleanRecipientId === cleanEmployeeId)
      );
    }
  });

  // Mark incoming messages in this thread as read
  useEffect(() => {
    if (isOpen && activeThreadId) {
      threadMessages.forEach(m => {
        const cleanRecipientId = cleanId(m.recipientId);
        const cleanEmployeeId = currentUser.employeeId ? cleanId(currentUser.employeeId) : '';
        if (!m.isRead && (cleanRecipientId === cleanEmployeeId || (cleanRecipientId === 'admin' && isAdmin))) {
          markMessageAsRead(m.id);
        }
      });
    }
  }, [isOpen, activeThreadId, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    let targetRecipientId = 'admin';
    if (isAdmin) {
      if (!activeThreadId) {
        alert('Please select an employee thread first.');
        return;
      }
      targetRecipientId = activeThreadId;
    }

    await sendMessage(targetRecipientId, chatInput.trim());
    setChatInput('');
  };

  // Get active chat name
  const getActiveThreadName = () => {
    if (isAdmin) {
      const emp = tenantEmployees.find(e => e.id === activeThreadId);
      return emp ? emp.name : 'Select Operative';
    }
    return 'HQ Administrator';
  };

  return (
    <>
      {/* FLOATING NETFLIX-STYLE TRIGGER BUBBLE */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isAdmin) {
            // For employee, default active thread is always "admin"
            setActiveThreadId('admin');
          }
        }}
        className="fixed bottom-24 right-6 z-[1999] bg-[#dc2626] hover:bg-[#b91c1c] text-white p-4 rounded-full shadow-2xl transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center border border-rose-500/30 group shadow-rose-900/40"
        title="Open Live Chat Hub"
      >
        <div className="relative">
          <MessageSquare size={22} className="group-hover:rotate-6 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-6 -right-6 bg-yellow-400 text-stone-950 text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-stone-950 animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* NETFLIX-STYLE MESSENGER PANEL */}
      {isOpen && (
        <div className="fixed bottom-40 right-6 z-[1999] w-80 md:w-96 h-[480px] bg-stone-950/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in slide-in-from-bottom duration-250 font-sans flex-col md:flex-row shadow-rose-950/20">
          
          {/* LEFT SIDEBAR (Admin Thread Selector) */}
          {isAdmin && (
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/5 flex flex-col bg-black/45">
              <div className="p-3 border-b border-white/5 select-none bg-stone-900/20">
                <h4 className="text-[9px] text-stone-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Chats Hub
                </h4>
              </div>
              <div className="flex-grow overflow-y-auto divide-y divide-white/5 pr-1">
                {tenantEmployees.map(emp => {
                  const empUnreads = tenantMessages.filter(
                    m => !m.isRead && cleanId(m.senderId) === cleanId(emp.id) && cleanId(m.recipientId) === 'admin'
                  ).length;
                  const isSelected = activeThreadId === emp.id;

                  return (
                    <button
                      key={emp.id}
                      onClick={() => setActiveThreadId(emp.id)}
                      className={`w-full p-2.5 flex items-center gap-2.5 transition text-left cursor-pointer ${
                        isSelected ? 'bg-stone-900 border-l-2 border-rose-600' : 'hover:bg-stone-900/40'
                      }`}
                    >
                      <img
                        src={emp.avatar || 'https://via.placeholder.com/150'}
                        alt={emp.name}
                        className="w-7 h-7 rounded-full object-cover border border-white/10 bg-stone-950"
                      />
                      <div className="min-w-0 flex-grow">
                        <p className={`text-xs truncate font-bold ${isSelected ? 'text-white font-extrabold' : 'text-stone-400'}`}>
                          {emp.name}
                        </p>
                        <p className="text-[9px] text-stone-500 uppercase font-bold truncate leading-none mt-0.5">{emp.role}</p>
                      </div>
                      {empUnreads > 0 && (
                        <span className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {empUnreads}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT SIDECHAT (Messages Thread) */}
          <div className="flex-grow flex flex-col min-w-0 h-full">
            
            {/* Thread Header */}
            <div className="bg-stone-900 p-3.5 border-b border-white/5 flex justify-between items-center select-none flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20 text-rose-500 flex-shrink-0 flex items-center justify-center">
                  <UserCheck size={14} />
                </span>
                <div className="min-w-0 text-left">
                  <h4 className="text-xs font-black text-stone-100 truncate">{getActiveThreadName()}</h4>
                  <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-black flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" /> Real-time active
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-500 hover:text-white transition p-1 hover:bg-white/5 rounded-lg cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-stone-950/20 pr-2">
              {activeThreadId ? (
                <>
                  {threadMessages.map((msg, i) => {
                    const isSelf = msg.senderId === (isAdmin ? currentUser.id : currentUser.employeeId);
                    return (
                      <div
                        key={msg.id || i}
                        className={`flex flex-col max-w-[80%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[8px] text-stone-500 font-bold mb-0.5 select-none">{msg.senderName}</span>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-xs font-bold leading-relaxed border ${
                            isSelf
                              ? 'bg-rose-600 border-rose-500 text-white shadow shadow-rose-900/10 rounded-br-none'
                              : 'bg-stone-900 border-white/5 text-stone-200 rounded-bl-none'
                          }`}
                        >
                          <p className="text-left whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <span className="text-[7.5px] text-stone-600 font-semibold mt-0.5 select-none">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />

                  {threadMessages.length === 0 && (
                    <div className="text-center py-20 text-stone-600 flex flex-col items-center justify-center gap-1.5 select-none">
                      <Sparkles size={20} className="text-stone-700 animate-pulse" />
                      <p className="text-xs">OBSIDIAN ENCRYPTED CHAT</p>
                      <p className="text-[9.5px]">Type a message below to securely start the conversation thread.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-32 text-stone-600 flex flex-col items-center justify-center gap-2 select-none">
                  <ShieldAlert size={22} className="text-stone-700 animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-wider">Secure Operator Inbox</p>
                  <p className="text-[9.5px] max-w-[200px] leading-relaxed mx-auto">Select a registered employee from the contact sidebar to load active messaging history.</p>
                </div>
              )}
            </div>

            {/* Thread input */}
            {activeThreadId && (
              <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-stone-900/10 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Type secure message..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-grow bg-stone-950 border border-white/10 text-xs px-3 py-2 rounded-xl outline-none focus:border-rose-500 text-stone-250 font-bold"
                />
                <button
                  type="submit"
                  className="bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-xl px-4 py-2 flex items-center justify-center cursor-pointer transition active:scale-95 shadow shadow-rose-900/10 border border-rose-500/20"
                >
                  <Send size={13} />
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default NetflixMessenger;
