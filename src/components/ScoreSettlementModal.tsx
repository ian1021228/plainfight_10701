import React from "react";
import { GameStats } from "../types";
import { Trophy, Award, CheckCircle2, RotateCcw, Zap, Target, Flame, ArrowRight } from "lucide-react";

interface ScoreSettlementModalProps {
  stats: GameStats;
  rank: number | null;
  isTop5: boolean;
  isSubmitting: boolean;
  submissionSuccess: boolean;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}

export const ScoreSettlementModal: React.FC<ScoreSettlementModalProps> = ({
  stats,
  rank,
  isTop5,
  isSubmitting,
  submissionSuccess,
  onPlayAgain,
  onViewLeaderboard,
}) => {
  return (
    <div
      id="settlement-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="settlement-card"
        className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl shadow-cyan-950/50 relative overflow-hidden"
      >
        {/* Background glow banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-rose-500 to-amber-500" />

        {/* Header: Mission Debrief */}
        <div className="text-center flex flex-col items-center gap-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-1">
            <Flame className="w-3.5 h-3.5" />
            20 秒計時結束 • 戰局即時結算
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-['Chakra_Petch'] text-white tracking-wide">
            MISSION COMPLETE
          </h2>
          <p className="text-sm text-slate-400 font-mono">
            戰機座號：<span className="text-cyan-400 font-bold font-['Orbitron']">NO. {stats.playerId}</span>
          </p>
        </div>

        {/* Top 5 Banner if reached */}
        {isTop5 && (
          <div
            id="top5-record-badge"
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border border-amber-500/50 flex items-center justify-center gap-3 animate-pulse"
          >
            <Trophy className="w-6 h-6 text-amber-400" />
            <div className="text-center">
              <div className="text-xs font-mono font-bold text-amber-300">🎉 恭喜登榜！</div>
              <div className="text-sm font-black font-['Orbitron'] text-white">
                榮登全域排行榜第 {rank || 1} 名！
              </div>
            </div>
          </div>
        )}

        {/* Score & Core Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center flex flex-col items-center justify-center">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              本局最終得分 FINAL SCORE
            </span>
            <span className="text-4xl sm:text-5xl font-black font-['Orbitron'] text-cyan-400 tracking-wider mt-1">
              {stats.score.toLocaleString()}
            </span>
            {rank && !isTop5 && (
              <span className="text-xs font-mono text-slate-400 mt-1">
                全域即時排名：第 <span className="text-white font-bold">{rank}</span> 名
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-400">擊墜數</div>
              <div className="text-xl font-black font-['Orbitron'] text-white">{stats.kills} 架</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-400">最高連擊</div>
              <div className="text-xl font-black font-['Orbitron'] text-amber-400">{stats.maxCombo}x</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-400">射擊命中率</div>
              <div className="text-xl font-black font-['Orbitron'] text-emerald-400">{stats.accuracy}%</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-400">作戰時長</div>
              <div className="text-xl font-black font-['Orbitron'] text-cyan-400">20.0s</div>
            </div>
          </div>
        </div>

        {/* Firebase & Google Sheets Asynchronous Sync Status */}
        <div
          id="sheets-sync-status-box"
          className="px-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs font-mono"
        >
          <div className="flex items-center gap-2 text-slate-300">
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : submissionSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            )}
            <span>
              {isSubmitting
                ? "非同步回傳 Firebase 雲端資料庫中..."
                : "已自動非同步寫入 Firebase (flydrop-691bb) 雲端資料庫"}
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            FIREBASE SYNC
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            id="play-again-btn"
            onClick={onPlayAgain}
            className="flex-1 py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-['Chakra_Petch'] text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 shadow-lg shadow-cyan-500/30 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再次出擊 (20s)</span>
          </button>

          <button
            id="modal-view-leaderboard-btn"
            onClick={onViewLeaderboard}
            className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-['Chakra_Petch'] text-sm tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-150 border border-slate-700 cursor-pointer"
          >
            <span>查看排行榜</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
