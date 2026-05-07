"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Disc3, Plus, RadioReceiver, BellRing, ChevronDown, ChevronUp } from "lucide-react";
import { searchDiscogsAction, getReleaseDetailsAction } from "./actions";
import { DiscogsSearchResult, Radar } from "@/lib/discogs/types";

// Extracted Components
import { BottomNav } from "@/components/vinyl/BottomNav";
import { RadarCard } from "@/components/vinyl/RadarCard";
import { ReleaseDrawer } from "@/components/vinyl/ReleaseDrawer";
import { SearchSection } from "@/components/vinyl/SearchSection";

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [isAdding, setIsAdding] = useState(false);
  
  const [watchlists, setWatchlists] = useState<Radar[]>([
    {
      id: "1",
      releaseId: 28715,
      artist: "Daft Punk",
      release: "Discovery",
      year: "2001",
      format: "2xLP, Album",
      mediaCondition: "Near Mint (NM or M-)",
      sleeveCondition: "Very Good Plus (VG+)",
      maxPrice: "150",
      notes: "Только оригинальный пресс (не ремастер).",
      active: true,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiscogsSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<DiscogsSearchResult | null>(null);
  const [releaseDetails, setReleaseDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"price_asc" | "relevance">("relevance");

  // Release Setup Form State
  const [formState, setFormState] = useState({
    mediaCondition: "",
    sleeveCondition: "",
    maxPrice: "",
    notes: ""
  });

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.expand();
    }
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isDrawerOpen]);

  useEffect(() => {
    async function fetchDetails() {
      if (selectedRelease?.id) {
        setIsLoadingDetails(true);
        const res = await getReleaseDetailsAction(selectedRelease.id);
        if (res.success) setReleaseDetails(res.data);
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedRelease]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setSearchResults([]);
    const res = await searchDiscogsAction(searchQuery, { onlyInStock });
    if (res.success && res.data) setSearchResults(res.data.results);
    setIsSearching(false);
  };

  const handleSaveWatchlist = (data: typeof formState) => {
    if (!selectedRelease) return;

    const newWatch: Radar = {
      id: Math.random().toString(36).substr(2, 9),
      releaseId: selectedRelease.id,
      artist: selectedRelease.title.split(" - ")[0],
      release: selectedRelease.title.split(" - ")[1] || selectedRelease.title,
      thumb: selectedRelease.thumb,
      year: selectedRelease.year,
      format: selectedRelease.format?.[0],
      mediaCondition: data.mediaCondition || "Any",
      sleeveCondition: data.sleeveCondition || "Any",
      maxPrice: data.maxPrice,
      notes: data.notes,
      active: true,
    };

    setWatchlists([newWatch, ...watchlists]);
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedRelease(null);
      setReleaseDetails(null);
      setFormState({ mediaCondition: "", sleeveCondition: "", maxPrice: "", notes: "" });
    }, 300);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-[#0a0a0c] text-zinc-100 font-sans relative pb-[80px]">
      
      {/* Premium Header */}
      <header className="px-5 py-4 sticky top-0 z-10 flex items-center justify-between backdrop-blur-xl bg-[#0a0a0c]/80 border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-600 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            <Disc3 className="w-5 h-5 text-black animate-[spin_4s_linear_infinite]" />
          </div>
          <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
            VinylSniper
          </h1>
        </div>
        <button onClick={() => setActiveTab("inbox")} className="relative p-2 bg-white/5 rounded-full border border-white/10">
          <BellRing className="w-4 h-4 text-amber-400" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0c]"></span>
        </button>
      </header>

      <main className="flex-1 p-5 overflow-y-auto">
        {activeTab === "home" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* SEARCH SECTION WRAPPER */}
            <div className="bg-[#141417] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-white/[0.02] to-transparent hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full transition-colors ${isAdding ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-zinc-400'}`}>
                    <Plus className={`w-5 h-5 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white">Добавить Радар</h2>
                    <p className="text-xs text-zinc-500">Поиск по базе Discogs</p>
                  </div>
                </div>
                {isAdding ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
              </button>

              {isAdding && (
                <div className="p-5 border-t border-white/5 bg-[#101013] animate-in slide-in-from-top-2">
                  <SearchSection 
                    query={searchQuery}
                    setQuery={setSearchQuery}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                    onlyInStock={onlyInStock}
                    setOnlyInStock={setOnlyInStock}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    results={searchResults}
                    onSelectRelease={(r) => { setSelectedRelease(r); setIsDrawerOpen(true); }}
                  />
                </div>
              )}
            </div>

            {/* RADARS LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Твои Радары</h3>
                <Badge variant="outline" className="text-amber-500 border-amber-500/20">{watchlists.length}</Badge>
              </div>

              {watchlists.length === 0 ? (
                <div className="py-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <RadioReceiver className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-500">У тебя пока нет активных радаров.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {watchlists.map((radar) => (
                    <RadarCard 
                      key={radar.id} 
                      radar={radar} 
                      onToggleActive={(id) => setWatchlists(watchlists.map(w => w.id === id ? { ...w, active: !w.active } : w))}
                      onDelete={(id) => setWatchlists(watchlists.filter(w => w.id !== id))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "inbox" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BellRing className="w-12 h-12 text-zinc-700 mb-6" />
            <h3 className="text-xl font-black text-white">Уведомления</h3>
            <p className="text-zinc-500 text-sm">Здесь появятся сообщения о находках.</p>
          </div>
        )}
      </main>

      <ReleaseDrawer 
        selectedRelease={selectedRelease}
        releaseDetails={releaseDetails}
        isLoadingDetails={isLoadingDetails}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSaveWatchlist}
        formState={formState}
        setFormState={setFormState}
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
