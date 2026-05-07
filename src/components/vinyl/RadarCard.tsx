"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Disc3, RadioReceiver, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Radar } from "@/lib/discogs/types";

interface RadarCardProps {
  radar: Radar;
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RadarCard({ radar, onToggleActive, onDelete }: RadarCardProps) {
  return (
    <Card className={`bg-[#141417] border-white/10 overflow-hidden transition-all duration-300 ${radar.active ? 'hover:border-amber-500/30' : ''}`}>
      <CardContent className="p-0">
        <div className={`flex p-4 gap-4 transition-all duration-300 ${!radar.active ? 'opacity-40 grayscale' : ''}`}>
          <div className="relative shrink-0">
            {radar.thumb ? (
              <img src={radar.thumb} alt={radar.release} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center">
                <Disc3 className="w-10 h-10 text-zinc-800" />
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#141417] ${radar.active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`}>
              <RadioReceiver className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-xs text-amber-500 font-bold truncate uppercase tracking-tighter mb-0.5">{radar.artist}</p>
            <h4 className="text-lg font-black text-white truncate leading-tight">{radar.release}</h4>
            <p className="text-[10px] text-zinc-500 mt-1 font-medium">{radar.year} • {radar.format}</p>
            <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                   <span>до ${radar.maxPrice}</span>
                </div>
                <span className="text-[10px] text-zinc-600 uppercase font-black">{radar.mediaCondition}</span>
            </div>
          </div>
        </div>
        <div className="flex border-t border-white/5 bg-black/20 p-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onToggleActive(radar.id)} 
            className={`flex-1 gap-2 text-xs font-bold transition-all ${radar.active ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 active:scale-95'}`}
          >
            {radar.active ? <><PauseCircle className="w-4 h-4" /> Пауза</> : <><PlayCircle className="w-4 h-4" /> Запустить</>}
          </Button>
          <div className="w-px h-8 bg-white/5 self-center"></div>
          <Button variant="ghost" size="sm" onClick={() => onDelete(radar.id)} className="flex-1 gap-2 text-xs font-bold text-red-500/70 hover:text-red-500 hover:bg-red-500/5 transition-all">
            <Trash2 className="w-4 h-4" /> Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
