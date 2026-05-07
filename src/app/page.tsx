"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Disc3, Plus, Settings, Search, Trash2, PauseCircle, PlayCircle } from "lucide-react";

// Types
type Watchlist = {
  id: string;
  artist: string;
  release: string;
  condition: string;
  maxPrice: string;
  active: boolean;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("watchlists");
  const [watchlists, setWatchlists] = useState<Watchlist[]>([
    {
      id: "1",
      artist: "Nirvana",
      release: "Nevermind",
      condition: "Near Mint (NM or M-)",
      maxPrice: "50",
      active: true,
    },
  ]);

  const [newArtist, setNewArtist] = useState("");
  const [newRelease, setNewRelease] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newMaxPrice, setNewMaxPrice] = useState("");

  // Simulated Telegram user data
  const [tgUser, setTgUser] = useState<any>(null);

  useEffect(() => {
    // Initialize Telegram Web App if available
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      setTgUser(tg.initDataUnsafe?.user);
      
      // Adapt theme
      if (tg.colorScheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const handleAddWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtist && !newRelease) return;

    const newWatch: Watchlist = {
      id: Math.random().toString(36).substring(7),
      artist: newArtist,
      release: newRelease,
      condition: newCondition || "Any",
      maxPrice: newMaxPrice || "Unlimited",
      active: true,
    };

    setWatchlists([newWatch, ...watchlists]);
    setNewArtist("");
    setNewRelease("");
    setNewCondition("");
    setNewMaxPrice("");
    setActiveTab("watchlists");
  };

  const toggleActive = (id: string) => {
    setWatchlists(watchlists.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  const deleteWatchlist = (id: string) => {
    setWatchlists(watchlists.filter(w => w.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans max-w-md mx-auto relative shadow-xl overflow-hidden">
      {/* Header */}
      <header className="px-4 py-4 border-b bg-white dark:bg-zinc-900 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Disc3 className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight">VinylSniper</h1>
        </div>
        {tgUser && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{tgUser.first_name}</span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          
          <TabsContent value="watchlists" className="mt-0 space-y-4 outline-none">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Мои отслеживания</h2>
              <Badge variant="secondary">{watchlists.length} активных</Badge>
            </div>

            {watchlists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Нет активных поисков.</p>
                <Button variant="link" onClick={() => setActiveTab("add")}>
                  Добавить первый
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {watchlists.map((w) => (
                  <Card key={w.id} className={`transition-opacity ${w.active ? 'opacity-100' : 'opacity-60'}`}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{w.artist || "Любой артист"}</CardTitle>
                          <CardDescription className="text-sm font-medium text-foreground">
                            {w.release || "Любой релиз"}
                          </CardDescription>
                        </div>
                        <Badge variant={w.active ? "default" : "outline"} className="ml-2 whitespace-nowrap">
                          {w.maxPrice !== "Unlimited" ? `до $${w.maxPrice}` : "Любая цена"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Состояние: <span className="font-medium">{w.condition}</span>
                      </p>
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0 flex justify-between border-t pt-3 mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleActive(w.id)}
                        className={w.active ? "text-amber-500" : "text-emerald-500"}
                      >
                        {w.active ? <PauseCircle className="w-4 h-4 mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                        {w.active ? "Пауза" : "Возобновить"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteWatchlist(w.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-0 outline-none">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Новый поиск</CardTitle>
                <CardDescription>
                  Укажи параметры пластинки. Как только она появится на Discogs, бот пришлет уведомление.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form onSubmit={handleAddWatchlist} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="artist">Артист / Группа</Label>
                    <Input 
                      id="artist" 
                      placeholder="Например: Pink Floyd" 
                      value={newArtist}
                      onChange={(e) => setNewArtist(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="release">Название релиза (Альбом)</Label>
                    <Input 
                      id="release" 
                      placeholder="Например: The Dark Side of the Moon" 
                      value={newRelease}
                      onChange={(e) => setNewRelease(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Минимальное состояние</Label>
                    <Select value={newCondition} onValueChange={(value) => setNewCondition(value || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Любое состояние" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mint (M)">Mint (M)</SelectItem>
                        <SelectItem value="Near Mint (NM or M-)">Near Mint (NM or M-)</SelectItem>
                        <SelectItem value="Very Good Plus (VG+)">Very Good Plus (VG+)</SelectItem>
                        <SelectItem value="Very Good (VG)">Very Good (VG)</SelectItem>
                        <SelectItem value="Good Plus (G+)">Good Plus (G+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Максимальная цена ($)</Label>
                    <Input 
                      id="price" 
                      type="number" 
                      placeholder="Например: 100" 
                      value={newMaxPrice}
                      onChange={(e) => setNewMaxPrice(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full mt-4" size="lg">
                    <Search className="w-4 h-4 mr-2" />
                    Начать отслеживание
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 outline-none">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Настройки</CardTitle>
                <CardDescription>Параметры уведомлений бота</CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                <div className="p-4 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">Telegram ID:</p>
                  <code className="text-xs">{tgUser?.id || "Не определен (вне Telegram)"}</code>
                </div>
                <Button variant="outline" className="w-full">
                  Протестировать уведомление
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
        </Tabs>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 border-t border-border flex justify-around p-2 pb-safe shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => setActiveTab("watchlists")}
          className={`flex flex-col items-center justify-center w-20 py-2 rounded-xl transition-colors ${activeTab === "watchlists" ? "text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Search className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Поиски</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("add")}
          className={`flex flex-col items-center justify-center w-20 py-2 rounded-xl transition-colors ${activeTab === "add" ? "text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <div className={`p-1.5 rounded-full mb-1 ${activeTab === "add" ? "bg-primary/10" : ""}`}>
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">Добавить</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center w-20 py-2 rounded-xl transition-colors ${activeTab === "settings" ? "text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Настройки</span>
        </button>
      </div>
    </div>
  );
}
