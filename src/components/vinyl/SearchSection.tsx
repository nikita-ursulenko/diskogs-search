"use client";

import { useState } from "react";
import { Search, Loader2, SlidersHorizontal, Disc3, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DiscogsSearchResult } from "@/lib/discogs/types";

interface SearchSectionProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isSearching: boolean;
  onlyInStock: boolean;
  setOnlyInStock: (b: boolean) => void;
  sortBy: "price_asc" | "relevance";
  setSortBy: (s: any) => void;
  results: DiscogsSearchResult[];
  onSelectRelease: (r: DiscogsSearchResult) => void;
}

export function SearchSection({
  query,
  setQuery,
  onSearch,
  isSearching,
  onlyInStock,
  setOnlyInStock,
  sortBy,
  setSortBy,
  results,
  onSelectRelease
}: SearchSectionProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <form onSubmit={onSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Артист или Альбом..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onFocus={() => setIsSettingsOpen(false)}
              className="bg-[#1a1a1f] border-white/10 h-12 pl-10 flex-1 rounded-xl focus:border-amber-500/50 transition-all" 
              autoFocus
            />
          </div>
          <Button type="submit" disabled={isSearching || !query} className="bg-amber-500 hover:bg-amber-600 text-black h-12 px-6 rounded-xl font-bold transition-all active:scale-95">
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Найти"}
          </Button>
        </form>

        <div className="flex items-center justify-between px-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`h-8 gap-2 rounded-xl border transition-all ${isSettingsOpen ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/5 text-zinc-400'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">Настройки поиска</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isSettingsOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {results.length > 0 && !isSettingsOpen && (
            <Badge variant="outline" className="bg-white/5 border-white/5 text-zinc-500 text-[10px] h-6">
              {results.length} найденных
            </Badge>
          )}
        </div>

        {/* Expandable Search Settings */}
        {isSettingsOpen && (
          <div className="bg-[#1a1a1f] border border-white/10 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
              <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Фильтрация</Label>
              <div 
                onClick={() => setOnlyInStock(!onlyInStock)}
                className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:border-amber-500/30 transition-all"
              >
                <span className="text-xs font-medium text-zinc-300">Только в наличии (Discogs Market)</span>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${onlyInStock ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-white/20'}`}>
                  {onlyInStock && <Check className="w-3.5 h-3.5 text-black font-bold" />}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Сортировка результатов</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSortBy("relevance")}
                  className={`h-10 text-[10px] uppercase font-bold rounded-xl border transition-all ${sortBy === "relevance" ? 'bg-amber-500 border-amber-500/50 text-black' : 'bg-black/20 border-white/5 text-zinc-500'}`}
                >
                  По релевантности
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSortBy("price_asc")}
                  className={`h-10 text-[10px] uppercase font-bold rounded-xl border transition-all ${sortBy === "price_asc" ? 'bg-amber-500 border-amber-500/50 text-black' : 'bg-black/20 border-white/5 text-zinc-500'}`}
                >
                  Сначала дешевле
                </Button>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => setIsSettingsOpen(false)}
              className="w-full text-[10px] text-zinc-600 uppercase font-bold h-8 hover:text-zinc-400"
            >
              Закрыть настройки
            </Button>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-3 mt-4 max-h-[60dvh] overflow-y-auto pr-1 custom-scrollbar pb-10">
          {results
            .slice()
            .sort((a, b) => {
              if (sortBy === "relevance") return 0;
              const priceA = a.lowest_price || 999999;
              const priceB = b.lowest_price || 999999;
              return priceA - priceB;
            })
            .map((result) => (
            <div 
              key={result.id} 
              onClick={() => onSelectRelease(result)}
              className="flex flex-col p-4 bg-[#141417]/40 hover:bg-amber-500/[0.03] border border-white/5 hover:border-amber-500/30 rounded-2xl cursor-pointer transition-all duration-300 group relative overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {result.thumb ? (
                    <img src={result.thumb} alt={result.title} className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/5" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                      <Disc3 className="w-8 h-8 text-zinc-700" />
                    </div>
                  )}
                  {result.num_for_sale !== undefined && result.num_for_sale > 0 && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#0a0a0c]"></span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 z-10">
                  <p className="text-sm font-black text-white truncate group-hover:text-amber-400 transition-colors duration-300">
                    {result.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                      {result.year || "????"} • {result.format?.[0] || "RELEASE"}
                    </span>
                    {result.country && (
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-white/5 border-white/10 text-zinc-400 font-bold uppercase">
                        {result.country}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Community Stats */}
                  <div className="flex items-center gap-3 mt-1.5 opacity-60">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-[9px] text-zinc-400 font-bold">{result.community?.have || 0} в колл.</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                      <span className="text-[9px] text-zinc-400 font-bold">{result.community?.want || 0} хотят</span>
                    </div>
                  </div>
                </div>

                <div className="text-right z-10 shrink-0 flex flex-col justify-center">
                  {result.lowest_price ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5">от</span>
                      <span className="text-base font-black text-amber-400 leading-none">
                        ${result.lowest_price}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end opacity-30">
                      <span className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter mb-0.5">от</span>
                      <span className="text-sm font-black text-zinc-600 leading-none">N/A</span>
                    </div>
                  )}
                </div>
              </div>

              {/* In Stock Highlight */}
              {result.num_for_sale !== undefined && result.num_for_sale > 0 && (
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.03] pt-3">
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-black uppercase">
                      В наличии: {result.num_for_sale} шт.
                    </Badge>
                  </div>
                  <span className="text-[9px] text-zinc-600 font-bold uppercase">Магазин Discogs</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
