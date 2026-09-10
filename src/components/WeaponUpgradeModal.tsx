import React, { useEffect } from "react";
import { WEAPONS_CATALOG, WeaponId } from "../data/weapons";
import { Sparkles, Zap, ChevronRight, Award } from "lucide-react";

export interface UpgradeOption {
  weaponId: WeaponId;
  targetLevel: number;
}

interface WeaponUpgradeModalProps {
  isOpen: boolean;
  options: UpgradeOption[];
  onSelect: (weaponId: WeaponId) => void;
  kills: number;
}

export const WeaponUpgradeModal: React.FC<WeaponUpgradeModalProps> = ({
  isOpen,
  options,
  onSelect,
  kills,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1" && options[0]) {
        onSelect(options[0].weaponId);
      } else if (e.key === "2" && options[1]) {
        onSelect(options[1].weaponId);
      } else if (e.key === "3" && options[2]) {
        onSelect(options[2].weaponId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, options, onSelect]);

  if (!isOpen || options.length === 0) return null;

  return (
    <div
      id="weapon-upgrade-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="weapon-upgrade-container"
        className="w-full max-w-2xl bg-slate-900/95 border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-7 flex flex-col gap-5 shadow-2xl shadow-cyan-500/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  KILL MILESTONE: {kills} 擊墜達成
                </span>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  LEVEL UPGRADE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white">
                武器戰術系統升級
              </h2>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>按鍵盤</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-bold">1</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-bold">2</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-bold">3</kbd>
            <span>快速選擇</span>
          </div>
        </div>

        {/* 3 Options Cards */}
        <div className="grid grid-cols-1 gap-3.5">
          {options.map((opt, idx) => {
            const def = WEAPONS_CATALOG[opt.weaponId];
            if (!def) return null;
            const levelInfo = def.levels[opt.targetLevel];

            return (
              <button
                key={opt.weaponId}
                id={`upgrade-option-${idx + 1}`}
                type="button"
                onClick={() => onSelect(opt.weaponId)}
                className="group w-full text-left p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-400/60 transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer shadow-lg hover:shadow-cyan-950/40 relative overflow-hidden"
              >
                {/* Accent glow bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 transition-colors"
                  style={{ backgroundColor: def.color }}
                />

                <div className="flex items-center gap-3.5 pl-2">
                  <div className="flex flex-col items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-black text-sm">
                    {idx + 1}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black font-['Chakra_Petch'] text-white group-hover:text-cyan-300 transition-colors">
                        {def.name}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border"
                        style={{
                          backgroundColor: `${def.color}20`,
                          color: def.color,
                          borderColor: `${def.color}40`,
                        }}
                      >
                        Lv.{opt.targetLevel} {opt.targetLevel === 5 ? "MAX 終極超頻" : ""}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      特性：{def.feature}
                    </div>

                    <div className="text-xs font-bold text-cyan-200 mt-0.5">
                      {levelInfo?.title || "升級"}
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed font-sans max-w-lg">
                      {levelInfo?.description}
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/20 transition-all shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-[11px] font-mono text-slate-400">
          擊墜敵機自動累積作戰經驗值 • 選擇升級將立即強化戰機武器陣列
        </div>
      </div>
    </div>
  );
};
