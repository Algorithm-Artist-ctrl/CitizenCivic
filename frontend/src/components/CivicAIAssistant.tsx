import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ShieldCheck,
  Bot,
  User,
} from 'lucide-react';
import apiClient from '../api/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedPrompts?: string[];
  suggestedCategory?: string;
}

export const CivicAIAssistant: React.FC = () => {
  const { i18n } = useTranslation();
  const isHi = i18n.language === 'hi';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = isHi ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, [isHi]);

  // Seed initial greeting message based on language
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: ChatMessage = {
        id: 'initial',
        role: 'assistant',
        content: isHi
          ? 'नमस्ते! मैं **CitizenCivic** का आधिकारिक नागरिक सहायता मार्गदर्शक हूँ।\n\nमैं आपकी नागरिक समस्याओं (कचरा, सड़क के गड्ढे, जलभराव, स्ट्रीटलाइट) को दर्ज करने, नगर निगम कार्यप्रणाली को समझने और **सामुदायिक कर्म अंक** प्राप्त करने में सहायता कर सकता हूँ।'
          : 'Hello! I am your **CitizenCivic** civic assistant.\n\nI can help you report civic issues (potholes, garbage dumps, drainage, streetlights), understand municipal dispatch steps, and learn how to earn **Community Karma points**.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: isHi
          ? [
              'कचरा डंप की शिकायत कैसे दर्ज करें?',
              'कर्म अंक कैसे कमाएं?',
              'शिकायत निवारण प्रक्रिया क्या है?',
            ]
          : [
              'How do I report a pothole?',
              'How do I earn Karma points?',
              'What is the case resolution process?',
            ],
      };
      setMessages([initialGreeting]);
    }
  }, [isHi]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Text to Speech playback
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop current speech
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isHi ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      speechRecognitionRef.current.lang = isHi ? 'hi-IN' : 'en-IN';
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Build conversation payload for backend
      const payloadMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiClient.post('/ai/assistant', {
        messages: payloadMessages,
        language: isHi ? 'hi' : 'en',
      });

      const data = res.data;
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || (isHi ? 'मैं आपकी समस्या में सहायता कर सकता हूँ।' : 'I can assist you with your civic questions.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: data.suggested_prompts || [],
        suggestedCategory: data.suggested_category,
      };

      setMessages((prev) => [...prev, botMsg]);

      if (ttsEnabled) {
        speakText(botMsg.content);
      }
    } catch (err: any) {
      console.warn('[CivicAIAssistant] Error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: isHi
          ? 'वर्तमान में एआई सेवा अनुपलब्ध है। कृपया अपनी समस्या सीधे **"समस्या दर्ज करें"** पृष्ठ से दर्ज करें।'
          : 'The AI assistant is temporarily unavailable. You can still report issues directly through the **"Report an Issue"** page.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: isHi
          ? ['समस्या कैसे दर्ज करें?', 'कर्म अंक क्या हैं?']
          : ['How to report an issue?', 'What are karma points?'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={isHi ? 'नागरिक एआई सहायक खोलें' : 'Open Civic AI Assistant'}
            className="group relative flex items-center gap-2.5 rounded-full bg-slate-950 px-4 py-3 text-white shadow-xl hover:bg-slate-900 hover:shadow-2xl active:scale-95 transition-all duration-200 border border-emerald-500/30"
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4 animate-pulse text-emerald-200" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-xs font-bold leading-tight tracking-wide">
                {isHi ? 'नागरिक सहायक' : 'Civic AI Guide'}
              </span>
              <span className="block text-[10px] text-emerald-400 font-mono">
                {isHi ? '24x7 ऑनलाइन' : '24x7 Online'}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Assistant Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-x-4 bottom-4 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-96 h-[540px] max-h-[85vh] z-50 flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden font-sans animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 text-white border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-xs">
                <Bot className="h-4 w-4 text-emerald-200" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white leading-tight">
                  {isHi ? 'CitizenCivic नागरिक सहायक' : 'CitizenCivic AI Guide'}
                </h3>
                <p className="text-[10px] text-emerald-400 font-mono">
                  {isHi ? 'सत्यापित नगर निगम सहायता' : 'Verified Municipal Support'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* TTS Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !ttsEnabled;
                  setTtsEnabled(nextState);
                  if (!nextState && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                }}
                title={ttsEnabled ? 'Mute auto-speech' : 'Enable voice read-aloud'}
                className={`p-1.5 rounded-lg transition-colors ${
                  ttsEnabled ? 'bg-emerald-800 text-emerald-200' : 'text-slate-400 hover:text-white'
                }`}
              >
                {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line text-[11.5px]">
                    {msg.content}
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => speakText(msg.content)}
                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>{isHi ? 'सुनें' : 'Listen'}</span>
                      </button>
                    </div>
                  )}

                  {/* Suggested Prompts below assistant response */}
                  {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.suggestedPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(prompt)}
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70 transition-colors text-left"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="h-6 w-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-emerald-700 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-bl-xs bg-white border border-slate-200/80 p-3 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px] text-slate-400 pl-1 font-mono">
                      {isHi ? 'सोच रहा है...' : 'Formulating response...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl border transition-colors ${
                  isListening
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title={isListening ? 'Stop listening' : 'Speak message'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isHi ? 'अपना प्रश्न यहाँ लिखें या बोलें...' : 'Ask a civic question or speak...'}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 bg-white"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition-colors shrink-0"
              aria-label="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default CivicAIAssistant;