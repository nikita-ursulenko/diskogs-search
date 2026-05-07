"use client";

import { useState, useRef, useEffect } from "react";
import { Disc3, Loader2, Settings, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiscogsSearchResult } from "@/lib/discogs/types";

interface ReleaseDrawerProps {
  selectedRelease: DiscogsSearchResult | null;
  releaseDetails: any;
  isLoadingDetails: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { mediaCondition: string; sleeveCondition: string; maxPrice: string; notes: string }) => void;
  formState: {
    mediaCondition: string;
    sleeveCondition: string;
    maxPrice: string;
    notes: string;
  };
  setFormState: (state: any) => void;
}

export function ReleaseDrawer({
  selectedRelease,
  releaseDetails,
  isLoadingDetails,
  isOpen,
  onClose,
  onSave,
  formState,
  setFormState
}: ReleaseDrawerProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartY = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setOffsetY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!selectedRelease) return null;

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
                {selectedRelease.thumb ? (
                  <img src={selectedRelease.thumb} alt="cover" className="w-20 h-20 rounded-2xl shadow-2xl border border-white/10 object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Disc3 className="w-10 h-10 text-zinc-800" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">Выбран</Badge>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">{selectedRelease.year} • {selectedRelease.country || "Int"}</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight mb-1">{selectedRelease.title}</h3>
                <p className="text-xs text-zinc-400 font-medium">{selectedRelease.format?.[0]}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/5 h-8 w-8">
                <Plus className="w-4 h-4 text-zinc-400 rotate-45" />
              </Button>
            </div>

            {/* Stats & Market Data */}
            <div className="space-y-6">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-xs text-zinc-500 font-medium">Анализируем рынок Discogs...</p>
                </div>
              ) : releaseDetails ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#141417] p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">В продаже</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-400">{releaseDetails.num_for_sale}</span>
                        <span className="text-xs text-zinc-500 font-medium">шт.</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">от <span className="text-emerald-400/80 font-bold">{typeof releaseDetails.lowest_price === 'object' ? `${releaseDetails.lowest_price.value} ${releaseDetails.lowest_price.currency}` : `$${releaseDetails.lowest_price}`}</span></p>
                    </div>
                    <div className="bg-[#141417] p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Рейтинг</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{releaseDetails.community?.rating?.average || "—"}</span>
                        <span className="text-[10px] text-zinc-500 font-bold">/ 5</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">⭐ {releaseDetails.community?.rating?.count || 0} оценок</p>
                    </div>
                  </div>

                  {releaseDetails.stats && (
                    <div className="bg-[#141417] p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-3">История продаж</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-black/20 p-2 rounded-xl">
                          <span className="text-[8px] text-zinc-600 block uppercase mb-1">Low</span>
                          <span className="text-[10px] text-zinc-300 font-black">{releaseDetails.stats.lowest_price?.value || "—"}</span>
                        </div>
                        <div className="text-center bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                          <span className="text-[8px] text-amber-500/60 block uppercase mb-1">Median</span>
                          <span className="text-[10px] text-amber-400 font-black">{releaseDetails.stats.median?.value || "—"}</span>
                        </div>
                        <div className="text-center bg-black/20 p-2 rounded-xl">
                          <span className="text-[8px] text-zinc-600 block uppercase mb-1">High</span>
                          <span className="text-[10px] text-zinc-300 font-black">{releaseDetails.stats.highest_price?.value || "—"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      <Settings className="w-3.5 h-3.5" /> Настройка Радара
                    </div>
                    
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
                      <Label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Твоя макс. цена ($)</Label>
                      <Input type="number" placeholder="Например: 150" value={formState.maxPrice} onChange={(e) => setFormState({ ...formState, maxPrice: e.target.value })} className="bg-[#1a1a1f] border-emerald-500/20 focus-visible:ring-emerald-500/50 text-emerald-400 font-black h-12 rounded-xl" />
                    </div>
                    
                    <Button onClick={() => onSave(formState)} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black h-14 rounded-2xl shadow-[0_10px_20px_rgba(245,158,11,0.2)]">
                      Активировать Радар
                    </Button>
                    
                    <div className="flex justify-center pt-2 pb-6">
                      <a href={releaseDetails.uri} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors text-[10px] flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3" /> Открыть на Discogs
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
