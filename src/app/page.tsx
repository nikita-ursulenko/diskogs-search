"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Disc3, Plus, RadioReceiver, BellRing, ChevronDown, ChevronUp } from "lucide-react";
import { 
  searchDiscogsAction, 
  getReleaseDetailsAction, 
  getRadarsAction, 
  saveRadarAction, 
  deleteRadarAction, 
  toggleRadarAction,
  getUserSettingsAction,
  updateUserSettingsAction,
  testNotificationAction,
  UserSettings
} from "./actions";
import { DiscogsSearchResult, Radar } from "@/lib/discogs/types";

// Extracted Components
import { BottomNav } from "@/components/vinyl/BottomNav";
import { RadarCard } from "@/components/vinyl/RadarCard";
import { ReleaseDrawer } from "@/components/vinyl/ReleaseDrawer";
import { SearchSection } from "@/components/vinyl/SearchSection";

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [isAdding, setIsAdding] = useState(false);
  const [initData, setInitData] = useState<string>("");
  const [userId, setUserId] = useState("default");
  
  const [watchlists, setWatchlists] = useState<Radar[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    notifications: true,
    autoSearch: true,
    currency: "USD"
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiscogsSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<DiscogsSearchResult | null>(null);
  const [releaseDetails, setReleaseDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"price_asc" | "relevance">("relevance");
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<{ id: number; first_name: string; last_name?: string; username?: string } | null>(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(true); // Default to true for demo
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [editingRadarId, setEditingRadarId] = useState<string | null>(null);
  const [safeAreaTop, setSafeAreaTop] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Release Setup Form State
  const [formState, setFormState] = useState({
    mediaCondition: "Near Mint (NM or M-)",
    sleeveCondition: "Very Good Plus (VG+)",
    maxPrice: "",
    notes: "",
    trackMaster: false,
    country: ""
  });

  // Init Telegram and Fetch Radars
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Set Theme Colors to blend UI
      tg.setHeaderColor('#0a0a0c');
      tg.setBackgroundColor('#0a0a0c');
      
      // Detect platform
      const platform = tg.platform;
      setIsMobile(platform === 'ios' || platform === 'android');
      
      // Handle Safe Areas (Bot API 8.0+)
      const updateSafeArea = () => {
        const top = tg.contentSafeAreaInset?.top || tg.safeAreaInset?.top || 0;
        const bottom = tg.contentSafeAreaInset?.bottom || tg.safeAreaInset?.bottom || 0;
        setSafeAreaTop(top);
        setSafeAreaBottom(bottom);
        
        // Smarter expanded detection: check both SDK flag and actual viewport height
        // In compact mode, viewportHeight is usually < 80% of screen height
        const isActuallyExpanded = tg.isExpanded || (tg.viewportHeight > window.innerHeight * 0.85);
        setIsExpanded(isActuallyExpanded);
        
        // Correct way: Set data attributes for CSS to pick up
        document.documentElement.setAttribute('data-app-expanded', isActuallyExpanded.toString());
        document.documentElement.style.setProperty('--tg-safe-area-top', `${top}px`);
      };

      updateSafeArea();
      
      // Listen for changes
      tg.onEvent('viewportChanged', updateSafeArea);
      tg.onEvent('safeAreaChanged', updateSafeArea);
      
      // Polling for first 3 seconds because Telegram events can be flaky during transition
      const interval = setInterval(updateSafeArea, 500);
      const timeout = setTimeout(() => clearInterval(interval), 3000);
      
      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser) {
        setInitData(tg.initData);
        setUserId(tgUser.id.toString());
        setUser(tgUser);
      }

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  // Fetch Radars and Settings from Redis
  useEffect(() => {
    async function loadData() {
      if (!initData) return;
      
      const [radarsRes, settingsRes] = await Promise.all([
        getRadarsAction(initData),
        getUserSettingsAction(initData)
      ]);
      
      if (radarsRes.success && radarsRes.data) {
        setWatchlists(radarsRes.data);
      }
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
    }
    loadData();
  }, [initData]);

  const handleUpdateSetting = async (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await updateUserSettingsAction(initData, { [key]: value });
  };

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
        const res = await getReleaseDetailsAction(selectedRelease.id, settings.currency);
        if (res.success) {
          setReleaseDetails(res.data);
          // Sync price back to search results so it's not "N/A" anymore
          setSearchResults(prev => prev.map(item => 
            item.id === selectedRelease.id 
              ? { ...item, lowest_price: res.data.lowest_price, num_for_sale: res.data.num_for_sale } 
              : item
          ));
        }
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedRelease]);

  const performSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setSearchResults([]);
    const res = await searchDiscogsAction(searchQuery, { onlyInStock, currency: settings.currency });
    if (res.success && res.data) {
      let results = res.data.results;
      if (onlyInStock) {
        results = results.filter(r => (r.num_for_sale ?? 0) > 0 || (r.lowest_price !== undefined && r.lowest_price !== null));
      }
      setSearchResults(results);
    }
    setIsSearching(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  // Auto-update search when filters or currency change
  useEffect(() => {
    if (searchQuery) {
      performSearch();
    }
  }, [onlyInStock, settings.currency]);
  useEffect(() => {
    if (searchQuery && searchResults.length > 0) {
      performSearch();
    }
  }, [onlyInStock]);

  const handleSaveRadar = async (data: any) => {
    if (!selectedRelease) return;

    const id = editingRadarId || Date.now().toString();
    const newWatch: Radar = {
      id,
      releaseId: selectedRelease.id,
      masterId: data.trackMaster ? (selectedRelease as any).master_id : undefined,
      artist: selectedRelease.title.split(' - ')[0],
      release: selectedRelease.title.split(' - ')[1] || selectedRelease.title,
      thumb: selectedRelease.thumb,
      year: selectedRelease.year || "",
      format: selectedRelease.format?.[0] || "Vinyl",
      maxPrice: data.maxPrice,
      mediaCondition: data.mediaCondition,
      sleeveCondition: data.sleeveCondition,
      notes: data.notes,
      active: true,
      country: data.country,
      createdAt: Date.now(),
    };

    // Optimistic update
    if (editingRadarId) {
      setWatchlists(watchlists.map(w => w.id === editingRadarId ? newWatch : w));
    } else {
      setWatchlists([newWatch, ...watchlists]);
    }
    setIsDrawerOpen(false);
    setEditingRadarId(null);
    
    // Persistent save
    await saveRadarAction(initData, newWatch);

    setTimeout(() => {
      setSelectedRelease(null);
      setReleaseDetails(null);
      setFormState({ 
        mediaCondition: "Near Mint (NM or M-)", 
        sleeveCondition: "Very Good Plus (VG+)", 
        maxPrice: "", 
        notes: "", 
        trackMaster: false,
        country: "" 
      });
    }, 300);
  };

  const handleToggleActive = async (id: string) => {
    setWatchlists(watchlists.map(w => w.id === id ? { ...w, active: !w.active } : w));
    await toggleRadarAction(initData, id);
  };

  const handleDeleteRadar = async (id: string) => {
    setWatchlists(watchlists.filter(w => w.id !== id));
    await deleteRadarAction(initData, id);
  };

  const handleEditRadar = (radar: Radar) => {
    setEditingRadarId(radar.id);
    setSelectedRelease({
      id: radar.releaseId,
      title: `${radar.artist} - ${radar.release}`,
      thumb: radar.thumb || "",
      year: radar.year,
      format: [radar.format],
      country: radar.country
    } as any);
    setFormState({
      maxPrice: radar.maxPrice,
      mediaCondition: radar.mediaCondition,
      sleeveCondition: radar.sleeveCondition,
      notes: radar.notes || "",
      trackMaster: !!radar.masterId,
      country: radar.country || ""
    });
    setIsDrawerOpen(true);
  };

  if (typeof window !== "undefined" && !initData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0c] p-10 text-center">
        <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-600 shadow-[0_0_30px_rgba(251,191,36,0.2)] mb-8">
          <Disc3 className="w-10 h-10 text-black animate-[spin_8s_linear_infinite]" />
        </div>
        <h1 className="text-2xl font-black text-white mb-4 tracking-tighter">VinylSniper</h1>
        <p className="text-zinc-500 text-sm max-w-[240px] mb-8 leading-relaxed">
          Это приложение доступно только через официальный клиент Telegram.
        </p>
        <a 
          href="https://t.me/VinylHunterBot" 
          className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-amber-500 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Открыть в Telegram
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-[#0a0a0c] text-zinc-100 font-sans relative pb-[calc(80px+env(safe-area-inset-bottom,20px))]">
      
      {/* Premium Header */}
      <header className="px-6 pb-4 fixed top-0 left-0 right-0 z-50 flex items-center justify-between backdrop-blur-xl bg-[#0a0a0c]/80 border-b border-white/10 shadow-lg transition-all duration-300 ease-in-out telegram-header">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-600 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            <Disc3 className="w-5 h-5 text-black animate-[spin_4s_linear_infinite]" />
          </div>
          <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
            VinylSniper
          </h1>
        </div>
          <button 
            onClick={() => {
              setActiveTab("inbox");
              setHasNewNotifications(false);
            }}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center relative active:scale-90 transition-transform"
          >
            <BellRing className="w-5 h-5 text-zinc-400" />
            {hasNewNotifications && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#0d0d0f]" />
            )}
          </button>
      </header>

      <main className="flex-1 p-5 overflow-y-auto telegram-main">
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
                    currency={settings.currency}
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
                      onToggleActive={handleToggleActive}
                      onDelete={handleDeleteRadar}
                      onEdit={handleEditRadar}
                      currency={settings.currency}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "inbox" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BellRing className="w-12 h-12 text-zinc-700 mb-6" />
              <h3 className="text-xl font-black text-white">Уведомления</h3>
              <p className="text-zinc-500 text-sm max-w-[200px] mx-auto">Здесь появятся сообщения о находках.</p>
            </div>

            <div className="bg-[#141417] border border-white/10 rounded-3xl p-6 text-center">
              <p className="text-zinc-400 text-xs mb-4">Хочешь проверить работу бота?</p>
              <button 
                onClick={async () => {
                  setIsTestingNotification(true);
                  const res = await testNotificationAction(initData);
                  if (res.success) {
                    // Show some feedback maybe?
                  }
                  setIsTestingNotification(false);
                }}
                disabled={isTestingNotification}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 text-xs"
              >
                {isTestingNotification ? "Отправляю..." : "Прислать тестовый пуш"}
              </button>
            </div>
          </div>
        )}
        
        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 p-5 bg-[#141417] border border-white/10 rounded-3xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-black text-black">
                {user?.first_name?.charAt(0) || "U"}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{user ? `${user.first_name} ${user.last_name || ""}` : "Vinyl Hunter"}</h3>
                <p className="text-xs text-zinc-500">{user?.id ? `ID: ${user.id}` : "Pro Plan • Active"} {user?.username ? `• @${user.username}` : ""}</p>
              </div>
            </div>
            
            <div className="bg-[#141417] border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Конфигурация Радара</h4>
              </div>
              <div className="divide-y divide-white/5">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer active:bg-white/5 transition-colors"
                  onClick={() => handleUpdateSetting('notifications', !settings.notifications)}
                >
                  <span className="text-sm font-medium text-zinc-300">Push-уведомления</span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.notifications ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.notifications ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer active:bg-white/5 transition-colors"
                  onClick={() => handleUpdateSetting('autoSearch', !settings.autoSearch)}
                >
                  <span className="text-sm font-medium text-zinc-300">Авто-поиск (раз в 15 мин)</span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.autoSearch ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.autoSearch ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300">Валюта</span>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {['USD', 'EUR', 'GBP'].map((c) => (
                      <button
                        key={c}
                        onClick={() => handleUpdateSetting('currency', c)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          settings.currency === c 
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#141417] border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Аккаунт Discogs</h4>
              </div>
              <div className="p-5 text-center">
                <p className="text-xs text-zinc-500 mb-4">Ваш токен API активен и готов к работе.</p>
                <div className="py-2 px-4 bg-black/20 border border-white/5 rounded-xl text-[10px] font-mono text-zinc-600 truncate">
                  ••••••••••••••••••••••••••••••••
                </div>
              </div>
            </div>
            
            <p className="text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest pt-4">
              VinylSniper v1.0.4
            </p>
          </div>
        )}
      </main>

      <ReleaseDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRadarId(null);
        }} 
        release={selectedRelease}
        releaseDetails={releaseDetails}
        isLoading={isLoadingDetails}
        onSave={handleSaveRadar}
        formState={formState}
        setFormState={setFormState}
        isEditing={!!editingRadarId}
        currency={settings.currency}
      />

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === "inbox") setHasNewNotifications(false);
        }} 
        hasNotifications={hasNewNotifications}
        safeAreaBottom={safeAreaBottom}
      />
    </div>
  );
}
