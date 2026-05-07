"use client";

import { useState, useRef, useEffect } from "react";
import { Disc3, Loader2, Settings, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiscogsSearchResult } from "@/lib/discogs/types";

interface ReleaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  release: DiscogsSearchResult | null;
  releaseDetails: any;
  isLoading: boolean;
  onSave: (data: any) => void;
  formState: any;
  setFormState: (state: any) => void;
  isEditing?: boolean;
  currency?: string;
}

export function ReleaseDrawer({ 
  isOpen, 
  onClose, 
  release, 
  releaseDetails, 
  isLoading, 
  onSave,
  formState,
  setFormState,
  isEditing = false,
  currency = 'USD'
}: ReleaseDrawerProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartY = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  const currencyMap: any = { 'USD': '$', 'EUR': '€', 'GBP': '£' };
  const symbol = currencyMap[currency] || '$';

  useEffect(() => {
    if (!isOpen) {
      setOffsetY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!release) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointerStartY.current = e.clientY - offsetY;
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      const newOffset = e.clientY - pointerStartY.current;
      // Only allow pulling down (positive offset)
      if (newOffset >= 0) {
        setOffsetY(newOffset);
      }
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);

    if (rafId.current) cancelAnimationFrame(rafId.current);

    // Decision: Close if pulled down more than 150px
    if (offsetY > 150) {
      onClose();
    } else {
      setOffsetY(0);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
        style={{ opacity: Math.max(0, 1 - offsetY / 500) }}
      ></div>

      {/* Drawer Container */}
      <div 
        style={{ 
          transform: isOpen ? `translate3d(0, ${offsetY}px, 0)` : `translate3d(0, 100%, 0)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
          touchAction: 'none',
          top: '40px' // ADDED TOP MARGIN
        }}
        className="absolute bottom-0 left-0 right-0 bg-[#0d0d0f] rounded-t-[32px] border-t border-white/10 shadow-2xl flex flex-col overflow-hidden select-none"
      >
        
        {/* DRAG HANDLE AREA */}
        <div 
          className="w-full py-5 flex-shrink-0 cursor-grab active:cursor-grabbing group"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="w-12 h-1.5 bg-white/20 group-active:bg-white/40 rounded-full mx-auto transition-colors shadow-inner"></div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6 pt-0 overflow-y-auto custom-scrollbar">
          <div onPointerDown={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="relative shrink-0">
                {release.thumb ? (
                  <img src={release.thumb} alt="cover" className="w-20 h-20 rounded-2xl shadow-2xl border border-white/10 object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Disc3 className="w-10 h-10 text-zinc-800" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">Выбран</Badge>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">{release?.title.split(' - ')[0] || release?.title || "???"}</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight mb-1">{release?.title.split(' - ')[1] || ""}</h3>
                <p className="text-xs text-zinc-400 font-medium">{release.format?.[0]}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/5 h-8 w-8">
                <Plus className="w-4 h-4 text-zinc-400 rotate-45" />
              </Button>
            </div>

            {/* Stats & Market Data */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-xs text-zinc-500 font-medium">Анализируем рынок Discogs...</p>
                </div>
              ) : releaseDetails ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    {releaseDetails.num_for_sale !== undefined && (
                      <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-2">В продаже</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-emerald-500">{releaseDetails.num_for_sale}</span>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">шт.</span>
                        </div>
                        {releaseDetails.lowest_price && (
                          <p className="text-[10px] text-emerald-500/60 font-bold mt-1">
                            от {(releaseDetails.stats?.lowest_price?.value || (typeof releaseDetails.lowest_price === 'object' ? releaseDetails.lowest_price.value : releaseDetails.lowest_price))}
                            {(() => {
                              return currencyMap[currency] || currencyMap[releaseDetails.stats?.currency] || symbol;
                            })()}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="bg-[#141417] p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Рейтинг</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{releaseDetails.community?.rating?.average || "—"}</span>
                        <span className="text-[10px] text-zinc-500 font-bold">/ 5</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">⭐ {releaseDetails.community?.rating?.count || 0} оценок</p>
                    </div>
                  </div>

                  {(releaseDetails.stats || releaseDetails.lowest_price || releaseDetails.suggestions) && (
                    <div className="bg-[#141417] p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-3">История продаж</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(() => {
                          const displaySymbol = currencyMap[releaseDetails.stats?.currency] || symbol;
                          
                          const formatPrice = (val: any) => {
                            if (!val) return "—";
                            return `${val}${displaySymbol}`;
                          };

                          return (
                            <>
                              <div className="text-center bg-black/20 p-2 rounded-xl">
                                <span className="text-[8px] text-zinc-600 block uppercase mb-1">Current Low</span>
                                <span className="text-[10px] text-zinc-300 font-black">
                                  {formatPrice(releaseDetails.stats?.lowest_price?.value || 
                                   (releaseDetails.lowest_price && typeof releaseDetails.lowest_price === 'object' ? releaseDetails.lowest_price.value : releaseDetails.lowest_price) || 
                                   releaseDetails.suggestions?.["Very Good (VG)"]?.value)}
                                </span>
                              </div>
                              <div className="text-center bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                                <span className="text-[8px] text-amber-500/60 block uppercase mb-1">Median</span>
                                <span className="text-[10px] text-amber-400 font-black">
                                  {formatPrice(releaseDetails.stats?.median?.value || 
                                   releaseDetails.suggestions?.["Very Good Plus (VG+)"]?.value)}
                                </span>
                              </div>
                              <div className="text-center bg-black/20 p-2 rounded-xl">
                                <span className="text-[8px] text-zinc-600 block uppercase mb-1">High</span>
                                <span className="text-[10px] text-zinc-300 font-black">
                                  {formatPrice(releaseDetails.stats?.highest_price?.value || 
                                   releaseDetails.suggestions?.["Near Mint (NM)"]?.value)}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        <Settings className="w-3.5 h-3.5" /> Настройка Радара
                      </div>
                      
                      {release.master_id && (
                        <div className="space-y-3">
                          <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Область поиска</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div 
                              onClick={() => setFormState({ ...formState, trackMaster: false })}
                              className={cn(
                                "flex flex-col gap-2 p-3 rounded-2xl border transition-all cursor-pointer",
                                !formState.trackMaster 
                                  ? "bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                                  : "bg-[#1a1a1f] border-white/5 opacity-60 hover:opacity-100"
                              )}
                            >
                              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", !formState.trackMaster ? "border-amber-500" : "border-zinc-700")}>
                                {!formState.trackMaster && <div className="w-2 h-2 bg-amber-500 rounded-full" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">Это издание</p>
                                <p className="text-[9px] text-zinc-500 leading-tight">Только этот пресс</p>
                              </div>
                            </div>

                            <div 
                              onClick={() => setFormState({ ...formState, trackMaster: true })}
                              className={cn(
                                "flex flex-col gap-2 p-3 rounded-2xl border transition-all cursor-pointer",
                                formState.trackMaster 
                                  ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                                  : "bg-[#1a1a1f] border-white/5 opacity-60 hover:opacity-100"
                              )}
                            >
                              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", formState.trackMaster ? "border-blue-500" : "border-zinc-700")}>
                                {formState.trackMaster && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">Весь альбом</p>
                                <p className="text-[9px] text-zinc-500 leading-tight">Любая версия (Master)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Мин. Винил</Label>
                          <Select value={formState.mediaCondition} onValueChange={(v) => v && setFormState({ ...formState, mediaCondition: v })}>
                            <SelectTrigger className="bg-[#1a1a1f] border-white/5 h-11 rounded-xl">
                              <SelectValue placeholder="Любое" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1f] border-white/10 text-white">
                              <SelectItem value="Mint (M)">Mint (M)</SelectItem>
                              <SelectItem value="Near Mint (NM or M-)">Near Mint (NM)</SelectItem>
                              <SelectItem value="Very Good Plus (VG+)">VG+</SelectItem>
                              <SelectItem value="Very Good (VG)">VG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Мин. Конверт</Label>
                          <Select value={formState.sleeveCondition} onValueChange={(v) => v && setFormState({ ...formState, sleeveCondition: v })}>
                            <SelectTrigger className="bg-[#1a1a1f] border-white/5 h-11 rounded-xl">
                              <SelectValue placeholder="Любое" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1f] border-white/10 text-white">
                              <SelectItem value="Mint (M)">Mint (M)</SelectItem>
                              <SelectItem value="Near Mint (NM or M-)">Near Mint (NM)</SelectItem>
                              <SelectItem value="Very Good Plus (VG+)">VG+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                        <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Регион продавца (Откуда доставка)</Label>
                        <Select value={formState.country || "Any"} onValueChange={(v) => setFormState({ ...formState, country: v === "Any" ? "" : v })}>
                          <SelectTrigger className="bg-[#1a1a1f] border-white/5 h-11 rounded-xl">
                            <SelectValue placeholder="Весь мир" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1f] border-white/10 text-white">
                            <SelectItem value="Any">🌍 Весь мир</SelectItem>
                            <SelectItem value="Germany">🇩🇪 Германия</SelectItem>
                            <SelectItem value="United Kingdom">🇬🇧 Великобритания</SelectItem>
                            <SelectItem value="France">🇫🇷 Франция</SelectItem>
                            <SelectItem value="United States">🇺🇸 США</SelectItem>
                            <SelectItem value="Japan">🇯🇵 Япония</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Твоя макс. цена</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder={`Цена в ${currency}...`}
                            value={formState.maxPrice}
                            onChange={(e) => setFormState({ ...formState, maxPrice: e.target.value })}
                            className="bg-[#1a1a1f] border-white/5 h-12 pl-4 pr-10 rounded-xl focus:border-amber-500/50 transition-all text-amber-400 font-bold"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-sm">
                            {symbol}
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => onSave(formState)}
                        disabled={!formState.maxPrice}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
                      >
                        {isEditing ? "Сохранить изменения" : "Создать радар"}
                      </Button>
                      
                      <div className="pt-2 pb-6">
                        <a 
                          href={releaseDetails.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "w-full h-14 rounded-2xl border-amber-500/20 bg-amber-500/5 text-amber-200 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500 transition-all gap-3 group flex items-center justify-center"
                          )}
                        >
                          <ExternalLink className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" /> 
                          <span className="font-bold text-base">Открыть на Discogs</span>
                        </a>
                      </div>
                    </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
