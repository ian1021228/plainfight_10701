import { useState, useEffect, useCallback } from "react";
import { GameStats, ScoreEntry } from "./types";
import { ShooterCanvas } from "./components/ShooterCanvas";
import { Leaderboard } from "./components/Leaderboard";
import { ScoreSettlementModal } from "./components/ScoreSettlementModal";
import { GoogleSheetDocsModal } from "./components/GoogleSheetDocsModal";
import { sound } from "./utils/audio";
import {
  submitScoreToFirebase,
  subscribeToFirebaseLeaderboard,
  fetchTop5FromFirebase,
  firebaseConfig,
} from "./lib/firebase";
import {
  Rocket,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Trophy,
  Gamepad2,
  Zap,
  RotateCcw,
  Sparkles,
  Flame,
} from "lucide-react";

export default function App() {
  // Player Seat / Identifier State (Default to 107-01)
  const [playerId, setPlayerId] = useState<string>(() => {
    return localStorage.getItem("cadet_seat_number") || "107-01";
  });

  // Game flow states: 'lobby' | 'playing'
  const [gameMode, setGameMode] = useState<"lobby" | "playing">("lobby");
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isTop5, setIsTop5] = useState<boolean>(false);

  // Leaderboard data
  const [top5, setTop5] = useState<ScoreEntry[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(true);

  // Score submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  // Audio mute state
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Google Sheets Docs Modal
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);

  // Save seat number to localStorage
  const updateSeatNumber = (val: string) => {
    const cleaned = val.trim().slice(0, 10);
    setPlayerId(cleaned);
    localStorage.setItem("cadet_seat_number", cleaned);
  };

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
    if (!playerId.trim()) {
      updateSeatNumber("107-01");
    }
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

  // Quick seat numbers for 107 squad
  const quickSeatNumbers = ["107-01", "107-02", "107-03", "107-04", "107-05", "107-06", "107-07", "107-08"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Noto_Sans_TC',sans-serif]">
      {/* Top Navbar */}
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
                  座號戰機：20秒極限射擊
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  20s CADET SHOOTER
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Firebase: flydrop-691bb
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                座號核心視覺 • 20秒結算 • Firebase (flydrop-691bb) 雲端資料庫即時同步前 5 名
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <button
              id="header-sound-btn"
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isMuted ? "開啟音效" : "靜音"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              id="header-docs-btn"
              onClick={() => setIsDocsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">資料庫與架構手冊</span>
              <span className="sm:hidden">手冊</span>
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
              {/* Cadet Seat Number Input Card */}
              <div
                id="seat-config-card"
                className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-cyan-500/20 p-6 sm:p-7 flex flex-col gap-5 shadow-2xl shadow-cyan-950/30"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    核心視覺指定元素
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white">
                    請確認你的「座號 / 學號識別碼」
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                    指定之號碼將直接繪製於戰機機身與全息鎖定光環，並同步寫入 Firebase (<code className="text-amber-300">flydrop-691bb</code>) 與雲端排行榜。
                  </p>
                </div>

                {/* Seat Input & Visual Aircraft Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <div className="sm:col-span-7 flex flex-col gap-2">
                    <label
                      htmlFor="seat-input"
                      className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between"
                    >
                      <span>座號代碼 (SEAT / PILOT ID)</span>
                      <span className="text-[10px] text-cyan-400">目前預設: 107-01</span>
                    </label>
                    <div className="relative">
                      <input
                        id="seat-input"
                        type="text"
                        maxLength={12}
                        value={playerId}
                        onChange={(e) => updateSeatNumber(e.target.value)}
                        placeholder="例如 107-01"
                        className="w-full px-4 py-3 bg-slate-900 border border-cyan-500/40 rounded-xl text-white font-['Orbitron'] text-xl tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold">
                        ACTIVE
                      </div>
                    </div>

                    {/* Quick Select Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono text-slate-400">快速選擇:</span>
                      {quickSeatNumbers.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updateSeatNumber(num)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-['Orbitron'] font-bold transition-all duration-150 cursor-pointer ${
                            playerId === num
                              ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Fighter Preview Card */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 text-center">
                    <div className="text-[10px] font-mono text-cyan-400/90 mb-2">機體塗裝即時預覽</div>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      {/* Holographic Ring */}
                      <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/50 animate-[spin_8s_linear_infinite]" />
                      {/* Fighter Silhouette */}
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
                        {/* Seat Number on Preview Fuselage */}
                        <span className="absolute bottom-2 font-['Orbitron'] font-black text-[10px] text-white tracking-wider">
                          {playerId || "107-01"}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-300 mt-1">
                      NO. {playerId || "107-01"} 戰隼號
                    </div>
                  </div>
                </div>

                {/* 20-Second Game Feature Badges */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <div className="text-[11px] font-mono text-slate-400">極限時限</div>
                    <div className="text-base sm:text-lg font-black font-['Orbitron'] text-cyan-400">20.0s</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <div className="text-[11px] font-mono text-slate-400">Firebase 資料庫</div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-amber-400">flydrop-691bb</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <div className="text-[11px] font-mono text-slate-400">全域排行榜</div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-cyan-400">即時爭奪前 5 名</div>
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  id="launch-game-btn"
                  onClick={handleStartGame}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black font-['Chakra_Petch'] text-lg tracking-wider flex items-center justify-center gap-3 transition-all duration-200 active:scale-98 shadow-xl shadow-cyan-500/30 cursor-pointer"
                >
                  <Rocket className="w-5 h-5 animate-pulse" />
                  <span>立即啟動 20 秒出擊 (座號: NO. {playerId || "107-01"})</span>
                </button>
              </div>

              {/* Controls and Architecture Guide Card */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1.5 font-bold text-white font-['Chakra_Petch']">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    操作指南
                  </span>
                  <span className="text-slate-400">全平台相容</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>電腦端：滑鼠游標拖曳或 WASD 移動</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>手機/平板：手指直接按住滑動閃避射擊</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>戰機主砲：全自動疾速連發，專注閃避與殲滅</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>超導炸彈：E鍵或點擊 HUD 釋放全螢幕 EMP</span>
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

              {/* Quick Spec Card */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 text-xs font-mono text-slate-400 flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold flex items-center gap-1.5 text-white">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Google Sheets 資料庫規格規範
                  </span>
                  <button
                    onClick={() => setIsDocsOpen(true)}
                    className="text-cyan-400 hover:underline text-[11px] cursor-pointer"
                  >
                    查看完整 Schema
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed">
                  本系統 API 端點直接封裝於前端與後端，遊戲結束後以非同步傳遞分數、擊墜、命中率，確保無延遲結算。
                </p>
              </div>
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

      {/* Google Sheets Specifications & Deployment Documentation Modal */}
      <GoogleSheetDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs font-mono text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>座號戰機：20秒極限射擊 © 2026 • HTML5 Canvas & Google Sheets 雲端資料庫架構</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="hover:text-cyan-400 underline transition-colors cursor-pointer"
            >
              資料庫部署規格確認
            </button>
            <span>•</span>
            <span className="text-cyan-400/90 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> 全端點封裝免手動設定
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
