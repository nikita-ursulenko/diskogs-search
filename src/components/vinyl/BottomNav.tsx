"use client";

import { RadioReceiver, BellRing, Settings } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasNotifications?: boolean;
  safeAreaBottom?: number;
}

export function BottomNav({ activeTab, setActiveTab, hasNotifications, safeAreaBottom }: BottomNavProps) {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 min-h-[80px] bg-[#0d0d0f]/90 backdrop-blur-2xl border-t border-white/5 px-6 flex items-center justify-around z-50" 
      style={{ 
        paddingBottom: safeAreaBottom && safeAreaBottom > 0 
          ? `${safeAreaBottom + 10}px` 
          : 'calc(1rem + env(safe-area-inset-bottom, 0px))' 
      }}
    >
      <button 
        onClick={() => setActiveTab("home")} 
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === "home" ? "text-amber-400 scale-110" : "text-zinc-500 hover:text-zinc-300"}`}
      >
        <div className={`p-2 rounded-xl ${activeTab === "home" ? "bg-amber-400/10" : ""}`}>
          <RadioReceiver className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-tighter">Радары</span>
      </button>
      
      <button 
        onClick={() => setActiveTab("inbox")} 
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === "inbox" ? "text-amber-400 scale-110" : "text-zinc-500 hover:text-zinc-300"}`}
      >
        <div className={`p-2 rounded-xl ${activeTab === "inbox" ? "bg-amber-400/10" : ""}`}>
          <BellRing className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-tighter">События</span>
      </button>

      <button 
        onClick={() => setActiveTab("settings")} 
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === "settings" ? "text-amber-400 scale-110" : "text-zinc-500 hover:text-zinc-300"}`}
      >
        <div className={`p-2 rounded-xl ${activeTab === "settings" ? "bg-amber-400/10" : ""}`}>
          <Settings className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-tighter">Настройки</span>
      </button>
    </nav>
  );
}
