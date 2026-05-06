"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { SendIcon, PlusIcon, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

type Language = "en" | "ur";
type Personality = "friendly" | "teacher" | "storyteller";

const STORAGE_KEY = "chat-conversations";

const translations = {
  en: {
    title: "AI GATEWAY",
    chatHistory: "Chat History",
    noConversations: "No conversations yet. Start chatting!",
    placeholder: "Ask a question...",
    thinking: "Thinking...",
    footer: "Powered by Groq — llama-3.3-70b-versatile",
    langButton: "اردو",
    tryAsking: "Try asking:",
  },
  ur: {
    title: "AI گیٹ وے",
    chatHistory: "گفتگو کی تاریخ",
    noConversations: "ابھی تک کوئی گفتگو نہیں۔ بات شروع کریں!",
    placeholder: "سوال پوچھیں...",
    thinking: "سوچ رہا ہوں...",
    footer: "Groq کے ذریعے — llama-3.3-70b-versatile",
    langButton: "English",
    tryAsking: "یہ پوچھیں:",
  },
};

const predefinedPrompts = {
  en: [
    { emoji: "📝", label: "Explain a topic", prompt: "Explain the concept of artificial intelligence in simple words." },
    { emoji: "📄", label: "Summarize text", prompt: "Summarize the following text for me: " },
    { emoji: "📖", label: "Generate a story", prompt: "Write a short creative story about a robot who discovers emotions." },
    { emoji: "💡", label: "Fun fact", prompt: "Tell me an interesting and surprising fun fact." },
  ],
  ur: [
    { emoji: "📝", label: "موضوع سمجھائیں", prompt: "مصنوعی ذہانت کا تصور آسان الفاظ میں سمجھائیں۔" },
    { emoji: "📄", label: "خلاصہ کریں", prompt: "درج ذیل متن کا خلاصہ کریں: " },
    { emoji: "📖", label: "کہانی لکھیں", prompt: "ایک روبوٹ کے بارے میں مختصر تخلیقی کہانی لکھیں جو جذبات دریافت کرتا ہے۔" },
    { emoji: "💡", label: "دلچسپ حقیقت", prompt: "مجھے ایک دلچسپ اور حیران کن حقیقت بتائیں۔" },
  ],
};

const personalities: Record<Personality, { label: string; emoji: string; prompt: string }> = {
  friendly: {
    label: "Friendly",
    emoji: "😊",
    prompt: "You are a friendly and helpful assistant. Be warm, casual, and supportive in your responses.",
  },
  teacher: {
    label: "Teacher",
    emoji: "🎓",
    prompt: "You are an educational teacher. Explain concepts clearly with examples, break down complex topics step by step, and encourage learning.",
  },
  storyteller: {
    label: "Storyteller",
    emoji: "📖",
    prompt: "You are a creative storyteller. Be imaginative, vivid, and engaging. Use descriptive language and narrative style in all your responses.",
  },
};

const urduSystemSuffix = " Always respond in Urdu language.";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function Chat({ modelId: _modelId = "llama-3.3-70b-versatile" }: { modelId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [personality, setPersonality] = useState<Personality>("friendly");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = translations[language];
  const isUrdu = language === "ur";
  const prompts = predefinedPrompts[language];

  useEffect(() => {
    const saved = loadConversations();
    setConversations(saved);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setInput("");
  };

  const handleSelectConversation = (conv: Conversation) => {
    setCurrentConvId(conv.id);
    setMessages(conv.messages);
    setInput("");
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    saveConversations(updated);
    if (currentConvId === id) {
      setCurrentConvId(null);
      setMessages([]);
    }
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ur" : "en"));
  };

  const handleSend = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt =
        personalities[personality].prompt + (isUrdu ? urduSystemSuffix : "");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
      });

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      const title =
        userMessage.content.slice(0, 40) +
        (userMessage.content.length > 40 ? "..." : "");

      if (currentConvId) {
        const updated = conversations.map((c) =>
          c.id === currentConvId ? { ...c, messages: finalMessages } : c
        );
        setConversations(updated);
        saveConversations(updated);
      } else {
        const newConv: Conversation = {
          id: Date.now().toString(),
          title,
          messages: finalMessages,
          createdAt: Date.now(),
        };
        const updated = [newConv, ...conversations];
        setConversations(updated);
        saveConversations(updated);
        setCurrentConvId(newConv.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={isUrdu ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-muted/40 border-r transition-all duration-300 overflow-hidden shrink-0",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        <div className="p-3 flex items-center justify-between border-b">
          <span className="font-semibold text-sm">{t.chatHistory}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewChat}>
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4 px-2">
              {t.noConversations}
            </p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group hover:bg-muted transition-colors",
                currentConvId === conv.id && "bg-muted"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs flex-1 truncate">{conv.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={(e) => handleDeleteConversation(conv.id, e)}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Top bar */}
        <div className="absolute top-3 left-3 z-10 flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-background/80 backdrop-blur-sm border-0 hover:bg-background transition-all"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <Button
            onClick={handleNewChat}
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-background/80 backdrop-blur-sm border-0 hover:bg-background transition-all"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <ThemeToggle />

          {/* Language Toggle */}
          <Button
            onClick={toggleLanguage}
            variant="outline"
            className="h-9 px-3 bg-background/80 backdrop-blur-sm border-0 hover:bg-background transition-all text-sm font-semibold"
          >
            {t.langButton}
          </Button>

          {/* Personality Buttons */}
          {(Object.keys(personalities) as Personality[]).map((p) => (
            <Button
              key={p}
              onClick={() => setPersonality(p)}
              variant="outline"
              className={cn(
                "h-9 px-3 text-sm transition-all border-0 bg-background/80 backdrop-blur-sm hover:bg-background",
                personality === p && "bg-foreground text-background hover:bg-foreground/90"
              )}
            >
              {personalities[p].emoji} {personalities[p].label}
            </Button>
          ))}
        </div>

        {!hasMessages && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8">
            <div className="w-full max-w-2xl text-center space-y-6">
              <h1 className="text-3xl md:text-6xl font-light tracking-tight text-foreground">
                <span className="font-mono font-semibold tracking-tight bg-foreground text-background px-4 py-3 rounded-2xl">
                  {t.title}
                </span>
              </h1>

              <p className="text-sm text-muted-foreground">
                {personalities[personality].emoji} {personalities[personality].label} mode active
              </p>

              {/* Predefined Prompt Buttons */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t.tryAsking}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {prompts.map((p, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-9 px-4 text-sm rounded-xl border hover:bg-muted transition-all"
                      onClick={() => handleSend(p.prompt)}
                    >
                      {p.emoji} {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="w-full">
                <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-2xl border shadow-sm">
                  <div className="flex flex-1 items-center">
                    <Input
                      placeholder={t.placeholder}
                      onChange={(e) => setInput(e.target.value)}
                      value={input}
                      autoFocus
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                      style={{ textAlign: isUrdu ? "right" : "left" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend(input);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl"
                      disabled={!input.trim() || loading}
                      onClick={() => handleSend(input)}
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4">
              <div className="flex flex-col gap-4 md:gap-6 pb-4 pt-20">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      m.role === "user" &&
                        "bg-foreground text-background rounded-2xl p-3 md:p-4 ml-auto max-w-[90%] md:max-w-[75%] font-medium text-sm md:text-base",
                      m.role === "assistant" &&
                        "max-w-[95%] md:max-w-[85%] text-foreground/90 leading-relaxed text-sm md:text-base"
                    )}
                    style={{ textAlign: isUrdu ? "right" : "left" }}
                  >
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="max-w-[95%] text-foreground/50 text-sm italic">
                    {t.thinking}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="w-full px-4 md:px-8 pb-6 md:pb-8">
              <div className="flex items-center gap-3 p-4 rounded-2xl border shadow-sm">
                <div className="flex flex-1 items-center">
                  <Input
                    placeholder={t.placeholder}
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-medium"
                    style={{ textAlign: isUrdu ? "right" : "left" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend(input);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-xl"
                    disabled={!input.trim() || loading}
                    onClick={() => handleSend(input)}
                  >
                    <SendIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="pb-4 text-center">
          <p className="text-xs text-muted-foreground">{t.footer}</p>
        </footer>
      </div>
    </div>
  );
}
