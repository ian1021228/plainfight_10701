import React, { useEffect } from "react";
import { WEAPONS_CATALOG, WeaponId } from "../data/weapons";
import { Zap, ChevronRight, ShieldCheck, Flame, Bomb } from "lucide-react";

export type OverdriveType = "repair" | "nuke" | "overdrive";

export interface UpgradeOption {
  weaponId?: WeaponId;
  targetLevel?: number;
  isOverdrive?: boolean;
  overdriveType?: OverdriveType;
  title?: string;
  description?: string;
  color?: string;
}

interface WeaponUpgradeModalProps {
  isOpen: boolean;
  options: UpgradeOption[];
  onSelect: (choice: string) => void;
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
      const getChoiceKey = (opt?: UpgradeOption) => {
        if (!opt) return null;
        if (opt.isOverdrive && opt.overdriveType) {
          return `overdrive:${opt.overdriveType}`;
        }
        return opt.weaponId || "resume";
      };

      if (e.key === "1" && options[0]) {
        const choice = getChoiceKey(options[0]);
        if (choice) onSelect(choice);
      } else if (e.key === "2" && options[1]) {
        const choice = getChoiceKey(options[1]);
        if (choice) onSelect(choice);
      } else if (e.key === "3" && options[2]) {
        const choice = getChoiceKey(options[2]);
        if (choice) onSelect(choice);
      } else if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        if (options.length === 0) {
          onSelect("resume");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, options, onSelect]);

  if (!isOpen) return null;

  // Graceful fallback if options are empty
  if (options.length === 0) {
    return (
      <div
        id="weapon-upgrade-overlay-fallback"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      >
        <div className="w-full max-w-md bg-slate-900/95 border-2 border-cyan-500/50 rounded-3xl p-6 text-center flex flex-col gap-4 shadow-2xl">
          <div className="p-3 mx-auto rounded-full bg-cyan-500/20 text-cyan-400 w-fit">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black font-['Chakra_Petch'] text-white">
            武器庫已全部升至滿等！
          </h2>
          <p className="text-xs text-slate-300 font-mono">
            所有 10 大戰術武器系統已達到最高等級，戰機進入全功率狂暴狀態。
          </p>
          <button
            type="button"
            onClick={() => onSelect("resume")}
            className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-['Chakra_Petch'] text-sm tracking-wider cursor-pointer shadow-lg shadow-cyan-500/30"
          >
            繼續戰鬥 (SPACE / 點擊)
          </button>
        </div>
      </div>
    );
  }

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
            if (opt.isOverdrive) {
              const optionKey = `overdrive:${opt.overdriveType}`;
              const optColor = opt.color || "#38bdf8";

              return (
                <button
                  key={optionKey}
                  id={`upgrade-option-${idx + 1}`}
                  type="button"
                  onClick={() => onSelect(optionKey)}
                  className="group w-full text-left p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-400/60 transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer shadow-lg hover:shadow-cyan-950/40 relative overflow-hidden"
                >
                  {/* Accent glow bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 transition-colors"
                    style={{ backgroundColor: optColor }}
                  />

                  <div className="flex items-center gap-3.5 pl-2">
                    <div className="flex flex-col items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-black text-sm">
                      {idx + 1}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black font-['Chakra_Petch'] text-white group-hover:text-cyan-300 transition-colors">
                          {opt.title}
                        </span>
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border"
                          style={{
                            backgroundColor: `${optColor}20`,
                            color: optColor,
                            borderColor: `${optColor}40`,
                          }}
                        >
                          MAX 終極過載
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed font-sans max-w-lg">
                        {opt.description}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/20 transition-all shrink-0">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              );
            }

            if (!opt.weaponId) return null;
            const def = WEAPONS_CATALOG[opt.weaponId];
            if (!def) return null;
            const targetLvl = opt.targetLevel || 1;
            const levelInfo = def.levels[targetLvl];

            return (
              <button
                key={opt.weaponId}
                id={`upgrade-option-${idx + 1}`}
                type="button"
                onClick={() => onSelect(opt.weaponId!)}
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
                        Lv.{targetLvl} {targetLvl === 5 ? "MAX 終極超頻" : ""}
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
