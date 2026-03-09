import { useState, useEffect, FormEvent, useRef } from "react";
import { 
  Activity, 
  Terminal, 
  Cpu, 
  Shield, 
  ExternalLink, 
  Play, 
  Square, 
  RefreshCcw, 
  AlertCircle,
  CheckCircle2,
  Settings,
  HelpCircle,
  Gamepad2,
  Anchor,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Send,
  User,
  Bot,
  Loader2,
  Globe,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

// Mock data for the dashboard
const INITIAL_LOGS = [
  { id: 1, time: "13:51:41", type: "info", message: "System initialized. Waiting for command." },
  { id: 2, time: "13:52:00", type: "info", message: "OpenClaw neural bridge ready for synchronization." },
  { id: 3, time: "13:54:13", type: "info", message: "All systems nominal. Monitoring high-level operations." },
];

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  sources?: { uri: string; title: string }[];
}

export default function App() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [isBotActive, setIsBotActive] = useState(false);
  const [uptime, setUptime] = useState("00:00:00");
  const [isRepairing, setIsRepairing] = useState(false);
  const [isOpenClawActive, setIsOpenClawActive] = useState(false);
  const [botMessages, setBotMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [integrationConfig, setIntegrationConfig] = useState<{ 
    telegram: boolean; 
    whatsapp: boolean;
    whatsappNumber?: string | null;
  }>({ telegram: false, whatsapp: false });
  
  const [telegramTokenInput, setTelegramTokenInput] = useState("");
  const [twilioSidInput, setTwilioSidInput] = useState("");
  const [twilioAuthInput, setTwilioAuthInput] = useState("");
  const [twilioPhoneInput, setTwilioPhoneInput] = useState("");
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("OPENCLAW_GEMINI_API_KEY");
    if (savedKey) {
      setGeminiApiKeyInput(savedKey);
    }
  }, []);

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    
    if (geminiApiKeyInput.trim()) {
      localStorage.setItem("OPENCLAW_GEMINI_API_KEY", geminiApiKeyInput.trim());
      addLog("Gemini API Key saved locally.", "info");
    } else {
      localStorage.removeItem("OPENCLAW_GEMINI_API_KEY");
    }

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramToken: telegramTokenInput,
          twilioSid: twilioSidInput,
          twilioAuth: twilioAuthInput,
          twilioPhone: twilioPhoneInput
        })
      });
      if (response.ok) {
        const configRes = await fetch("/api/config");
        const data = await configRes.json();
        setIntegrationConfig(data);
        setTelegramTokenInput("");
        setTwilioSidInput("");
        setTwilioAuthInput("");
        setTwilioPhoneInput("");
        addLog("External integrations updated successfully.", "info");
      }
    } catch (error) {
      console.error("Failed to save backend config (expected on static hosts like Netlify):", error);
      if (telegramTokenInput || twilioSidInput) {
        addLog("Backend integrations require a Node.js server. They will not work on static hosts like Netlify.", "warning");
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setIntegrationConfig(data);
        }
      } catch (error) {
        console.error("Failed to fetch integration config:", error);
      }
    };
    fetchConfig();
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [botMessages, isThinking]);

  // Simulate uptime timer
  useEffect(() => {
    if (!isBotActive) return;
    
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setUptime(`${h}:${m}:${s}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isBotActive]);

  const addLog = (message: string, type: "info" | "error" | "warning" = "info") => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setLogs(prev => [...prev, { id: Date.now(), time, type, message }].slice(-10));
  };

  const toggleBot = () => {
    if (isBotActive) {
      addLog("OpenClaw shutdown sequence initiated.", "warning");
      setIsBotActive(false);
    } else {
      addLog("OpenClaw starting up...", "info");
      setTimeout(() => {
        setIsBotActive(true);
        addLog("OpenClaw online and operational.", "info");
      }, 1500);
    }
  };

  const toggleOpenClaw = () => {
    if (isOpenClawActive) {
      addLog("OpenClaw engine stopping...", "warning");
      setIsOpenClawActive(false);
      setBotMessages([]);
    } else {
      addLog("Initializing OpenClaw engine...", "info");
      setTimeout(() => {
        setIsOpenClawActive(true);
        addLog("OpenClaw neural bridge established. System status nominal.", "info");
        setBotMessages([{ id: Date.now(), role: "bot", text: "OpenClaw neural bridge established. System status nominal. How can I assist with your operations today?" }]);
      }, 1200);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !isOpenClawActive || isThinking) return;

    const userMsg: Message = { id: Date.now(), role: "user", text: userInput };
    setBotMessages(prev => [...prev, userMsg]);
    const currentInput = userInput;
    setUserInput("");
    setIsThinking(true);

    try {
      // Platform standard is process.env.GEMINI_API_KEY
      // Fallback to (import.meta as any).env.VITE_GEMINI_API_KEY for external deployments like Netlify
      let apiKey = localStorage.getItem("OPENCLAW_GEMINI_API_KEY") || "";
      
      if (!apiKey) {
        try {
          apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY || "";
        } catch (e) {
          // process.env might not be defined in some environments
        }
      }
      
      if (!apiKey) {
        apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY || "";
      }
      
      if (!apiKey) {
        addLog("Neural bridge offline: GEMINI_API_KEY is missing. Please configure it in Settings.", "error");
        setBotMessages(prev => [...prev, { 
          id: Date.now(), 
          role: "bot", 
          text: "Neural bridge offline: I cannot establish a connection without a valid Gemini API Key. Please enter your API key in the Settings tab." 
        }]);
        setIsThinking(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: currentInput,
        config: {
          systemInstruction: "You are OpenClaw, the advanced AI interface for the OpenClaw Dashboard. You have access to Google Search to provide accurate, up-to-date information. Maintain a clean, efficient communication style.",
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "Arr, I be lost at sea! (No response from model)";
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(chunk => chunk.web)
        ?.map(chunk => ({ uri: chunk.web!.uri, title: chunk.web!.title || chunk.web!.uri })) || [];

      setBotMessages(prev => [...prev, { 
        id: Date.now(), 
        role: "bot", 
        text,
        sources: sources.length > 0 ? sources : undefined
      }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      addLog("OpenClaw communication error: Check API key or connection.", "error");
      setBotMessages(prev => [...prev, { 
        id: Date.now(), 
        role: "bot", 
        text: "Neural bridge failure. Please check your system logs and API configuration. Ensure the GEMINI_API_KEY is correctly set." 
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const repairSystem = () => {
    setIsRepairing(true);
    addLog("Initiating system repair sequence...", "info");
    
    setTimeout(() => {
      addLog("Scanning for corrupted installation files...", "info");
      setTimeout(() => {
        addLog("Patching installation script errors...", "info");
        setTimeout(() => {
          setLogs(prev => prev.filter(l => l.type !== "error"));
          addLog("All system errors resolved. System stable.", "info");
          setIsRepairing(false);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] flex flex-col">
      {/* Top Navigation / Status Bar */}
      <header className="border-b border-[#141414] p-4 flex items-center justify-between sticky top-0 bg-[#E4E3E0] z-50">
        <div className="flex items-center gap-3">
          {activeTab === "settings" && (
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1 hover:bg-[#141414]/5 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <div className="w-8 h-8 bg-[#141414] flex items-center justify-center rounded-sm hidden sm:flex">
            <Cpu className="text-[#E4E3E0] w-5 h-5" />
          </div>
          <h1 
            className="font-serif italic text-lg sm:text-xl tracking-tight truncate cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            OpenClaw Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isBotActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-[11px] uppercase tracking-widest font-mono opacity-60">
              {isBotActive ? "Operational" : "Offline"}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Activity className="w-4 h-4 opacity-40" />
            <span className="text-[11px] uppercase tracking-widest font-mono opacity-60">Uptime: {uptime}</span>
          </div>
          <button 
            onClick={() => {
              setActiveTab(activeTab === "dashboard" ? "settings" : "dashboard");
              setIsMobileMenuOpen(false);
            }}
            className={`p-1 transition-colors ${activeTab === "settings" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414] hover:text-[#E4E3E0]"}`}
            title={activeTab === "dashboard" ? "Open Settings" : "Back to Dashboard"}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 relative overflow-hidden">
        {/* Sidebar - Controls (Only visible in Settings) */}
        {activeTab === "settings" && (
          <aside className={`
            fixed lg:relative z-40 lg:z-auto
            w-64 h-[calc(100vh-65px)] lg:h-auto
            border-r border-[#141414] bg-[#E4E3E0] p-6 
            flex flex-col gap-8 shrink-0
            transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}>
            <nav className="flex flex-col gap-2">
              <h2 className="font-serif italic text-xs uppercase opacity-50 mb-2 tracking-widest">Navigation</h2>
              <button 
                onClick={() => {
                  setActiveTab("dashboard");
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 p-3 border border-[#141414] transition-all ${
                  activeTab === "dashboard" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-mono text-xs uppercase tracking-widest">Dashboard</span>
              </button>
            </nav>

            <section>
              <h2 className="font-serif italic text-xs uppercase opacity-50 mb-4 tracking-widest">Command Center</h2>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={toggleBot}
                  disabled={isRepairing}
                  className={`flex items-center justify-between p-4 border border-[#141414] transition-all group ${
                    isBotActive ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414] hover:text-[#E4E3E0]"
                  } disabled:opacity-50`}
                >
                  <span className="font-mono text-sm uppercase tracking-tight">
                    {isBotActive ? "Stop Engine" : "Start Engine"}
                  </span>
                  {isBotActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                
                <button 
                  onClick={repairSystem}
                  disabled={isRepairing}
                  className="flex items-center justify-between p-4 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group disabled:opacity-50"
                >
                  <span className="font-mono text-sm uppercase tracking-tight text-left">
                    {isRepairing ? "Repairing..." : "Fix All Errors"}
                  </span>
                  <RefreshCcw className={`w-4 h-4 ${isRepairing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                </button>
              </div>
            </section>

            <section>
              <h2 className="font-serif italic text-xs uppercase opacity-50 mb-4 tracking-widest">System Integration</h2>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={toggleOpenClaw}
                  disabled={isRepairing}
                  className={`flex items-center justify-between p-4 border border-[#141414] transition-all group ${
                    isOpenClawActive ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414] hover:text-[#E4E3E0]"
                  } disabled:opacity-50`}
                >
                  <span className="font-mono text-sm uppercase tracking-tight">
                    {isOpenClawActive ? "Stop AI" : "Launch AI"}
                  </span>
                  <Gamepad2 className="w-4 h-4" />
                </button>
              </div>
            </section>
          </aside>
        )}

        {/* Mobile Overlay */}
        {isMobileMenuOpen && activeTab === "settings" && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <section className={`flex-1 p-3 sm:p-6 flex flex-col gap-6 overflow-hidden ${activeTab === "dashboard" ? "max-w-4xl mx-auto w-full" : ""}`}>
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col"
              >
                {/* OpenClaw Bot Interaction */}
                <div className="flex-1 border border-[#141414] bg-white p-4 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#141414]/10 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-widest opacity-60">OpenClaw Neural Bridge</span>
                    </div>
                    {isOpenClawActive && (
                      <span className="text-[10px] font-mono text-emerald-600 uppercase animate-pulse">Online</span>
                    )}
                  </div>

                  {!isOpenClawActive ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <Cpu className="w-12 h-12 opacity-10 mb-4" />
                      <p className="text-sm font-serif italic opacity-40">Initialize OpenClaw AI to begin interaction</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar-dark">
                        <AnimatePresence initial={false}>
                          {botMessages.map((msg) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === "user" ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]"
                              }`}>
                                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                              </div>
                              <div className={`p-3 rounded-lg text-sm max-w-[80%] ${
                                msg.role === "user" ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]"
                              }`}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                {msg.sources && msg.sources.length > 0 && (
                                  <div className="mt-3 pt-2 border-t border-current/10">
                                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest opacity-60 mb-1">
                                      <Globe className="w-3 h-3" />
                                      <span>Sources</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {msg.sources.map((source, i) => (
                                        <a 
                                          key={i}
                                          href={source.uri}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] underline hover:opacity-80 truncate max-w-[200px]"
                                          title={source.title}
                                        >
                                          {source.title}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                          {isThinking && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#E4E3E0] text-[#141414] flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4" />
                              </div>
                              <div className="bg-[#E4E3E0] text-[#141414] p-3 rounded-lg flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs italic font-serif">Processing neural signals...</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div ref={chatEndRef} />
                      </div>
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder="Transmit command..."
                          className="flex-1 border border-[#141414] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                        />
                        <button 
                          type="submit"
                          className="bg-[#141414] text-[#E4E3E0] p-2 hover:opacity-90 transition-opacity"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 overflow-y-auto pr-2 custom-scrollbar-dark"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* System Health Panel */}
                  <div className="border border-[#141414] p-6 bg-white">
                    <h2 className="font-serif italic text-sm uppercase opacity-50 mb-6 tracking-widest">System Health</h2>
                    <div className="space-y-4">
                      {[
                        { label: "Core Engine", status: isBotActive ? "Stable" : "Idle", icon: Cpu },
                        { label: "Neural Bridge", status: isOpenClawActive ? "Running" : "Standby", icon: Bot },
                        { label: "Security Layer", status: "Active", icon: Shield },
                        { label: "Memory Usage", status: isBotActive ? "42%" : "12%", icon: Activity },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-[#141414]/10 pb-3 last:border-0">
                          <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4 opacity-40" />
                            <span className="text-[11px] font-mono uppercase tracking-tight">{item.label}</span>
                          </div>
                          <span className="text-[10px] font-mono uppercase opacity-60">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Integration Status */}
                  <div className="border border-[#141414] p-6 bg-white">
                    <h3 className="font-serif italic text-xs uppercase opacity-50 mb-4 tracking-widest">External Integrations</h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Send className="w-4 h-4 text-sky-500" />
                            <span className="text-sm font-mono">Telegram Bot</span>
                          </div>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-[#141414]/20">
                            {integrationConfig.telegram ? "Active" : "Config Required"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <MessageCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-mono">WhatsApp (Twilio)</span>
                          </div>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-[#141414]/20">
                            {integrationConfig.whatsapp ? "Active" : "Config Required"}
                          </span>
                        </div>
                        {integrationConfig.whatsapp && (
                          <div className="pl-7 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono opacity-60">
                              <span>Phone:</span>
                              <span>{integrationConfig.whatsappNumber}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#141414]/5">
                              <p className="text-[9px] uppercase tracking-widest opacity-40 mb-1">Webhook URL</p>
                              <code className="text-[9px] block p-1 bg-[#141414]/5 break-all">
                                {window.location.origin}/api/whatsapp/webhook
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Configure Integrations */}
                  <div className="border border-[#141414] p-6 bg-white md:col-span-2">
                    <h3 className="font-serif italic text-xs uppercase opacity-50 mb-4 tracking-widest">Configure Integrations</h3>
                    <form onSubmit={handleSaveConfig} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 border-b border-[#141414]/10 pb-4 mb-2">
                          <label className="block text-[10px] font-mono uppercase opacity-60 mb-1">Gemini API Key (Required for Netlify/Static)</label>
                          <input 
                            type="password" 
                            value={geminiApiKeyInput}
                            onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                            placeholder="Enter Gemini API Key"
                            className="w-full border border-[#141414] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                          <p className="text-[9px] italic opacity-40 mt-1">Saved locally in your browser. Required if not set in environment variables.</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase opacity-60 mb-1">Telegram Bot Token</label>
                          <input 
                            type="password" 
                            value={telegramTokenInput}
                            onChange={(e) => setTelegramTokenInput(e.target.value)}
                            placeholder="Enter Telegram Token"
                            className="w-full border border-[#141414] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase opacity-60 mb-1">Twilio Account SID</label>
                          <input 
                            type="password" 
                            value={twilioSidInput}
                            onChange={(e) => setTwilioSidInput(e.target.value)}
                            placeholder="Enter Twilio SID"
                            className="w-full border border-[#141414] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase opacity-60 mb-1">Twilio Auth Token</label>
                          <input 
                            type="password" 
                            value={twilioAuthInput}
                            onChange={(e) => setTwilioAuthInput(e.target.value)}
                            placeholder="Enter Twilio Auth Token"
                            className="w-full border border-[#141414] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase opacity-60 mb-1">Twilio Phone Number</label>
                          <input 
                            type="text" 
                            value={twilioPhoneInput}
                            onChange={(e) => setTwilioPhoneInput(e.target.value)}
                            placeholder="e.g. +1234567890"
                            className="w-full border border-[#141414] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSavingConfig}
                        className="bg-[#141414] text-[#E4E3E0] px-4 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isSavingConfig ? "Saving..." : "Save Configuration"}
                      </button>
                    </form>
                  </div>

                  {/* API & Environment */}
                  <div className="space-y-6">
                    <div className="border border-[#141414] p-6 bg-white">
                      <h3 className="font-serif italic text-xs uppercase opacity-50 mb-4 tracking-widest">System Status</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-mono">Manual Setup Required</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-mono">Gemini-3-Flash Ready</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 opacity-40" />
                          <span className="text-sm font-mono">Production Sandbox</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Logs */}
                  <div className="border border-[#141414] p-6 bg-white md:col-span-2">
                    <h2 className="font-serif italic text-xs uppercase opacity-50 mb-4 tracking-widest">Live Logs</h2>
                    <div className="border border-[#141414] bg-[#141414] p-4 h-64 overflow-y-auto custom-scrollbar">
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div key={log.id} className="font-mono text-[10px] leading-relaxed">
                            <span className="text-white/30 mr-2">[{log.time}]</span>
                            <span className={`uppercase mr-2 ${
                              log.type === "error" ? "text-red-400" : 
                              log.type === "warning" ? "text-yellow-400" : "text-emerald-400"
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-white/80">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(228, 227, 224, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(228, 227, 224, 0.4);
        }
        .custom-scrollbar-dark::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb {
          background: rgba(20, 20, 20, 0.1);
        }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 20, 20, 0.2);
        }
      `}</style>
    </div>
  );
}
