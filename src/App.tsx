import { useState, useEffect, useCallback } from "react";
import { GameStats, ScoreEntry } from "./types";
import { ShooterCanvas } from "./components/ShooterCanvas";
import { Leaderboard } from "./components/Leaderboard";
import { ScoreSettlementModal } from "./components/ScoreSettlementModal";
import { WeaponCatalogModal } from "./components/WeaponCatalogModal";
import { WEAPONS_CATALOG, WeaponId } from "./data/weapons";
import { sound } from "./utils/audio";
import {
  submitScoreToFirebase,
  subscribeToFirebaseLeaderboard,
  fetchTop5FromFirebase,
} from "./lib/firebase";
import {
  Rocket,
  Volume2,
  VolumeX,
  Gamepad2,
  Zap,
  RotateCcw,
  Sparkles,
  Swords,
  ShieldAlert,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export default function App() {
  // Player Seat / Identifier State (Strictly fixed to 107-01)
  const playerId = "107-01";

  // Selected starting weapon
  const [selectedStartingWeapon, setSelectedStartingWeapon] = useState<WeaponId>("pulse_pistol");
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);

  // Game flow states: 'lobby' | 'playing'
  const [gameMode, setGameMode] = useState<"lobby" | "playing">("lobby");
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isTop5, setIsTop5] = useState<boolean>(false);

  // Leaderboard data
  const [top5, setTop5] = useState<ScoreEntry[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
  const [, setIsFirebaseSynced] = useState<boolean>(true);

  // Score submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  // Audio mute state
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Fetch Leaderboard (from Firebase + fallback local API)
  const fetchLeaderboard = useCallback(async () => {
    setIsLeaderboardLoading(true);
    try {
      // 1. Try fetching from Firebase Firestore first
      const fbTop5 = await fetchTop5FromFirebase();
      if (fbTop5 && fbTop5.length > 0) {
        setTop5(fbTop5);
        setIsFirebaseSynced(true);
        setIsLeaderboardLoading(false);
        return;
      }

      // 2. Fallback to Express backend API
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.top5)) {
          setTop5(data.top5);
          setTotalRecords(data.total || data.top5.length);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch leaderboard:", err);
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, []);

  // Real-time Firestore subscription & periodic fallback
  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to real-time Firebase Firestore leaderboard updates
    const unsubscribe = subscribeToFirebaseLeaderboard((fbTop5) => {
      if (fbTop5 && fbTop5.length > 0) {
        setTop5(fbTop5);
        setIsFirebaseSynced(true);
      }
    });

    const interval = setInterval(fetchLeaderboard, 12000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchLeaderboard]);

  // Audio mute toggle
  const toggleSound = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
  };

  // Start 20-Second Game
  const handleStartGame = () => {
    setLastStats(null);
    setPlayerRank(null);
    setIsTop5(false);
    setGameMode("playing");
  };

  // 20 Seconds Game Over & Score Settlement
  const handleGameOver = async (stats: GameStats) => {
    setLastStats(stats);
    setIsSubmitting(true);
    setSubmissionSuccess(false);

    try {
      // 1. Non-blocking async submission directly to Firebase Firestore
      submitScoreToFirebase({
        playerId: stats.playerId,
        score: stats.score,
        kills: stats.kills,
        combo: stats.maxCombo,
        accuracy: stats.accuracy,
      }).then((fbResult) => {
        if (fbResult.success) {
          setIsFirebaseSynced(true);
        }
      });

      // 2. Submit to local Express backend + Google Sheets pipeline
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionSuccess(true);
        setPlayerRank(data.rank);
        setIsTop5(data.isTop5);
        if (Array.isArray(data.top5)) {
          setTop5(data.top5);
        }
      } else {
        setSubmissionSuccess(true);
      }
    } catch (err) {
      console.warn("Error submitting score:", err);
      setSubmissionSuccess(true);
    } finally {
      setIsSubmitting(false);
      fetchLeaderboard();
    }
  };

  const activeWeaponData = WEAPONS_CATALOG[selectedStartingWeapon];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Noto_Sans_TC',sans-serif]">
      {/* ========================================================
          VERY TOP AUTHOR BANNER (Created by 107-01_王禹硯)
          ======================================================== */}
      <div
        id="top-author-banner"
        className="w-full bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-cyan-500/40 py-2.5 px-4 text-center shadow-lg shadow-cyan-950/40 z-50"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="text-xs sm:text-sm font-black font-['Chakra_Petch'] tracking-widest text-cyan-300">
              Created by 107-01_王禹硯
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
              座號代碼: 107-01 (唯一指定)
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold hidden sm:inline-block">
              敵軍戰機彈幕武裝強化
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        id="app-header"
        className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/50">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black font-['Chakra_Petch'] tracking-wide text-white">
                  座號戰機：極限生存射擊
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                  NO. 107-01
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                10 大戰術武器庫 • 敵機彈幕射擊機制 • 無限時間生存挑戰
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <button
              id="header-catalog-btn"
              onClick={() => setIsCatalogOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="查看 10 大武器研發檔案庫"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">武器檔案庫</span>
            </button>

            <button
              id="header-sound-btn"
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isMuted ? "開啟音效" : "靜音"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {gameMode === "lobby" ? (
          /* ========================================================
             LOBBY VIEW: Seat Assignment & Mission Briefing
             ======================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Player Seat Configuration & Launch Pad */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Cadet Seat Number & Visual Fighter Card */}
              <div
                id="seat-config-card"
                className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-cyan-500/20 p-6 sm:p-7 flex flex-col gap-5 shadow-2xl shadow-cyan-950/30"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    核心視覺指定元素 • 唯一指派座號
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white">
                    出擊戰機編號：107-01
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                    指定座號代碼 107-01 刻印於戰機機翼中央與全息鎖定環，出擊擊墜敵機可解鎖 10 大武器升級。
                  </p>
                </div>

                {/* Seat Display & Aircraft Visual Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <div className="sm:col-span-7 flex flex-col gap-2">
                    <div className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
                      <span>座號代碼 (SEAT / PILOT ID)</span>
                      <span className="text-[10px] text-cyan-400 font-bold">唯一指定代碼</span>
                    </div>

                    <div className="relative">
                      <input
                        id="seat-input"
                        type="text"
                        readOnly
                        value={playerId}
                        className="w-full px-4 py-3 bg-slate-900/80 border border-cyan-500/50 rounded-xl text-cyan-400 font-['Orbitron'] text-xl tracking-wider font-bold cursor-default select-none"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        LOCKED
                      </div>
                    </div>

                    <p className="text-[11px] font-mono text-slate-400 pt-1">
                      本機代號已由指揮部指派為 107-01，結算成績將自動回傳全域資料庫。
                    </p>
                  </div>

                  {/* Visual Fighter Preview Card */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 text-center">
                    <div className="text-[10px] font-mono text-cyan-400/90 mb-2">107-01 戰機塗裝即時預覽</div>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/50 animate-[spin_8s_linear_infinite]" />
                      <div className="w-14 h-16 relative flex items-center justify-center">
                        <svg viewBox="0 0 48 54" className="w-full h-full drop-shadow-[0_0_10px_#38bdf8]">
                          <polygon
                            points="24,2 46,38 34,38 30,48 18,48 14,38 2,38"
                            fill="#0284c7"
                            stroke="#38bdf8"
                            strokeWidth="2"
                          />
                          <ellipse cx="24" cy="20" rx="4" ry="10" fill="#e0f2fe" />
                        </svg>
                        <span className="absolute bottom-2 font-['Orbitron'] font-black text-[10px] text-white tracking-wider">
                          {playerId}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-300 mt-1">
                      NO. {playerId} 戰隼號
                    </div>
                  </div>
                </div>

                {/* Starting Weapon Selector */}
                <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white uppercase">
                      <Swords className="w-4 h-4 text-cyan-400" />
                      <span>選擇初始主武器 (擊墜敵機可進一步升級全 10 款武器)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCatalogOpen(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold underline cursor-pointer"
                    >
                      查看 10 大武器百科
                    </button>
                  </div>

                  {/* Weapon Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {(Object.keys(WEAPONS_CATALOG) as WeaponId[]).map((wId) => {
                      const w = WEAPONS_CATALOG[wId];
                      const isSelected = selectedStartingWeapon === wId;
                      return (
                        <button
                          key={wId}
                          type="button"
                          onClick={() => setSelectedStartingWeapon(wId)}
                          className={`p-2.5 rounded-xl text-left border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? "bg-slate-800 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02] ring-1 ring-cyan-400/40"
                              : "bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300"
                          }`}
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-lg">{w.icon}</span>
                              {isSelected && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950">
                                  首發
                                </span>
                              )}
                            </div>
                            {/* 武器名（上方絕無英文） */}
                            <div
                              className="text-xs sm:text-sm font-black font-['Chakra_Petch'] leading-tight"
                              style={{ color: isSelected ? w.color : "#ffffff" }}
                            >
                              {w.name}
                            </div>
                            {/* 下方標注特性 */}
                            <div className="text-[10px] sm:text-[11px] text-slate-400 leading-snug line-clamp-2">
                              特性：{w.feature}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Weapon Detail */}
                  <div className="text-xs font-mono p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <span className="text-2xl">{activeWeaponData.icon}</span>
                      <div>
                        <div className="font-bold text-white text-sm">
                          {activeWeaponData.name}
                        </div>
                        <div className="text-slate-300 text-xs mt-0.5">
                          特性：{activeWeaponData.feature}
                        </div>
                      </div>
                    </div>
                    <span className="self-start sm:self-center px-2.5 py-1 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      已指定初始主武器 (Lv.1)
                    </span>
                  </div>
                </div>

                {/* Enemy Threat & Increased Difficulty Warning Banner */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono text-rose-200">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/50 flex items-center justify-center shrink-0 text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-rose-300 flex items-center gap-2">
                      <span>高難度戰場：敵機彈幕射擊 • 無限時間極限生存！</span>
                      {/* FontAwesome Jet Fighter Up SVG */}
                      <svg className="w-4 h-4 fill-rose-400" viewBox="0 0 512 512">
                        <path d="M256 0c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7 27.9-.7 40.1s-21.3 19.9-35.8 20.1l-142 2-24 62H208l-24-62-142-2c-14.5-.2-28.1-7.9-35.8-20.1s-8-27.7-.7-40.1l216-368C228.7 7.5 241.8 0 256 0z" />
                      </svg>
                    </div>
                    <p className="text-rose-300/80 mt-0.5 leading-relaxed">
                      取消 20 秒時限！戰機將持續作戰直到裝甲歸零。敵機會射擊彈幕，擊墜敵機可掉落急救包與升級武器庫！
                    </p>
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  id="launch-game-btn"
                  onClick={handleStartGame}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black font-['Chakra_Petch'] text-lg tracking-wider flex items-center justify-center gap-3 transition-all duration-200 active:scale-98 shadow-xl shadow-cyan-500/30 cursor-pointer"
                >
                  <Rocket className="w-5 h-5 animate-pulse" />
                  <span>立即啟動極限生存出擊 • 無限時間直到死亡 (座號: NO. {playerId})</span>
                </button>
              </div>

              {/* Controls and Architecture Guide Card */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1.5 font-bold text-white font-['Chakra_Petch']">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    作戰操作指南
                  </span>
                  <span className="text-slate-400">Created by 107-01_王禹硯</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>電腦端：滑鼠游標拖曳或 WASD 移動</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>手機/平板：手指按住螢幕直接滑動</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>武器升級：擊墜達標彈出 3 選 1 強化</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>超導炸彈：E鍵或點擊 HUD 釋放 EMP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Global Top 5 Leaderboard */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <Leaderboard
                top5={top5}
                isLoading={isLeaderboardLoading}
                onRefresh={fetchLeaderboard}
                currentPlayerId={playerId}
                totalRecords={totalRecords}
              />
            </div>
          </div>
        ) : (
          /* ========================================================
             PLAYING VIEW: 20-Second Active Canvas Shooter
             ======================================================== */
          <div className="flex flex-col gap-4">
            {/* Top In-Game Bar */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">目前出擊座號:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-['Orbitron'] font-black text-sm border border-cyan-500/30">
                  NO. {playerId}
                </span>
                <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                  • Created by 107-01_王禹硯
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGameMode("lobby")}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>結束並返回大廳</span>
                </button>
              </div>
            </div>

            {/* Game Canvas Container */}
            <div className="w-full flex justify-center">
              <div className="w-full max-w-3xl aspect-[4/5] sm:aspect-[3/4] max-h-[720px]">
                <ShooterCanvas
                  playerId={playerId}
                  onGameOver={handleGameOver}
                  isAudioMuted={isMuted}
                  initialWeaponId={selectedStartingWeapon}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Post-Game Settlement Modal */}
      {lastStats && (
        <ScoreSettlementModal
          stats={lastStats}
          rank={playerRank}
          isTop5={isTop5}
          isSubmitting={isSubmitting}
          submissionSuccess={submissionSuccess}
          onPlayAgain={() => {
            setLastStats(null);
            setGameMode("playing");
          }}
          onViewLeaderboard={() => {
            setLastStats(null);
            setGameMode("lobby");
            fetchLeaderboard();
          }}
        />
      )}

      {/* 10-Weapon Encyclopedia Catalog Modal */}
      <WeaponCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs font-mono text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>座號戰機：20秒極限射擊 • Created by 107-01_王禹硯</span>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>10 大戰術武器系統 • Firebase 即時同步</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
