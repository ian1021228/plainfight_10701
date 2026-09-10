import React, { useState } from "react";
import { WEAPONS_CATALOG, WeaponId } from "../data/weapons";
import { X, ShieldCheck, Crosshair, Zap, Flame, Disc, Radio, Biohazard, Atom, Target, ShieldAlert } from "lucide-react";

interface WeaponCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStartingWeapon: WeaponId;
  onSelectStartingWeapon?: (id: WeaponId) => void;
}

const WEAPON_ICONS: Record<WeaponId, React.ReactNode> = {
  pulse_pistol: <Crosshair className="w-5 h-5" />,
  scatter_shotgun: <ShieldAlert className="w-5 h-5" />,
  assault_rifle: <Flame className="w-5 h-5" />,
  charged_sniper: <Target className="w-5 h-5" />,
  orbiting_blades: <Disc className="w-5 h-5" />,
  tesla_arc: <Zap className="w-5 h-5" />,
  flamethrower: <Flame className="w-5 h-5" />,
  seeker_pod: <Radio className="w-5 h-5" />,
  toxic_mine: <Biohazard className="w-5 h-5" />,
  vortex_cannon: <Atom className="w-5 h-5" />,
};

export const WeaponCatalogModal: React.FC<WeaponCatalogModalProps> = ({
  isOpen,
  onClose,
  selectedStartingWeapon,
  onSelectStartingWeapon,
}) => {
  const [activeTab, setActiveTab] = useState<WeaponId>(selectedStartingWeapon || "pulse_pistol");

  if (!isOpen) return null;

  const currentWeapon = WEAPONS_CATALOG[activeTab] || WEAPONS_CATALOG.pulse_pistol;

  return (
    <div
      id="weapon-catalog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="weapon-catalog-container"
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-cyan-500/30 rounded-3xl p-5 sm:p-7 flex flex-col gap-5 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white flex items-center gap-2">
                10 大戰術武器系統研發檔案庫
              </h2>
              <p className="text-xs font-mono text-slate-400">
                擊墜敵機自動升級 • Lv.1 至 Lv.5 完整性能數值與超頻終極技
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Left Column: 10 Weapons Tab List */}
          <div className="md:col-span-4 flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              武器列表（共 10 款）
            </span>
            {(Object.keys(WEAPONS_CATALOG) as WeaponId[]).map((wId, index) => {
              const item = WEAPONS_CATALOG[wId];
              const isSelected = activeTab === wId;
              const isStarting = selectedStartingWeapon === wId;

              return (
                <button
                  key={wId}
                  onClick={() => setActiveTab(wId)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-slate-800 border-cyan-400 text-white shadow-md shadow-cyan-950/50"
                      : "bg-slate-950/60 hover:bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-slate-500 w-4">
                      {index + 1}.
                    </span>
                    <div
                      className="p-1.5 rounded-lg text-xs"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {WEAPON_ICONS[wId]}
                    </div>
                    <div>
                      <div className="text-xs font-bold font-['Chakra_Petch']">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 line-clamp-1">
                        特性：{item.feature}
                      </div>
                    </div>
                  </div>

                  {isStarting && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                      首發
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Weapon Detail & Lv 1-5 Stats */}
          <div className="md:col-span-8 flex flex-col gap-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 overflow-y-auto">
            {/* Title & Set as Starting Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-2xl border"
                  style={{
                    backgroundColor: `${currentWeapon.color}20`,
                    borderColor: `${currentWeapon.color}40`,
                    color: currentWeapon.color,
                  }}
                >
                  {WEAPON_ICONS[currentWeapon.id]}
                </div>
                <div>
                  <h3 className="text-xl font-black font-['Chakra_Petch'] text-white">
                    {currentWeapon.name}
                  </h3>
                  <div className="text-xs font-mono text-slate-400">
                    特性：{currentWeapon.feature}
                  </div>
                </div>
              </div>

              {onSelectStartingWeapon && (
                <button
                  type="button"
                  onClick={() => onSelectStartingWeapon(currentWeapon.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedStartingWeapon === currentWeapon.id
                      ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  }`}
                >
                  {selectedStartingWeapon === currentWeapon.id ? "✓ 當前預設首發武器" : "設為首發武器"}
                </button>
              )}
            </div>

            {/* Feature summary */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed">
              <strong className="text-cyan-400">功能特性：</strong> {currentWeapon.feature}
            </div>

            {/* Level 1 to 5 breakdown */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                各級升級強化細節（LV.1 ~ LV.5）
              </span>

              {[1, 2, 3, 4, 5].map((lvl) => {
                const info = currentWeapon.levels[lvl];
                const isMax = lvl === 5;

                return (
                  <div
                    key={lvl}
                    className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                      isMax
                        ? "bg-amber-950/20 border-amber-500/40"
                        : "bg-slate-900/60 border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isMax
                              ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          Lv.{lvl} {isMax ? "★ 終極超頻" : ""}
                        </span>
                        <span className="text-sm font-bold text-white font-['Chakra_Petch']">
                          {info.title}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed pl-1 pt-0.5">
                      {info.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
          <span>單局戰役內擊墜指定數量敵機即可無縫升級，多種武器可並行開火！</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
