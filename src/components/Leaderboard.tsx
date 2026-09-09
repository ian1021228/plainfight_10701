import React from "react";
import { ScoreEntry } from "../types";
import { Trophy, RefreshCw, Award, Zap, Crosshair } from "lucide-react";

interface LeaderboardProps {
  top5: ScoreEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  currentPlayerId?: string;
  totalRecords?: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  top5,
  isLoading,
  onRefresh,
  currentPlayerId,
  totalRecords = 0,
}) => {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/30 text-sm font-['Orbitron']">
            1
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black flex items-center justify-center shadow-md shadow-slate-400/20 text-sm font-['Orbitron']">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 font-black flex items-center justify-center shadow-md shadow-amber-800/20 text-sm font-['Orbitron']">
            3
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-800/80 text-slate-400 font-bold flex items-center justify-center text-sm font-['Orbitron'] border border-slate-700/60">
            {rank}
          </div>
        );
    }
  };

  return (
    <div
      id="global-leaderboard-card"
      className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col gap-4 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-['Chakra_Petch'] tracking-wide text-white">
                全域前 5 名王牌排行榜
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                TOP 5 LEADERBOARD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              即時同步 Firebase (flydrop-691bb) 雲端資料庫
            </p>
          </div>
        </div>

        <button
          id="refresh-leaderboard-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="重新整理雲端排行榜"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="flex flex-col gap-2">
        {top5.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm font-mono flex flex-col items-center gap-2">
            <Crosshair className="w-8 h-8 text-slate-600 animate-pulse" />
            <span>暫無排行數據，立即啟動 20 秒戰局挑戰首位！</span>
          </div>
        ) : (
          top5.slice(0, 5).map((entry, index) => {
            const isCurrent = currentPlayerId && entry.playerId === currentPlayerId;
            const rank = index + 1;
            const formattedTime = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={entry.id || `${entry.playerId}-${index}`}
                id={`leaderboard-row-${rank}`}
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isCurrent
                    ? "bg-cyan-950/40 border border-cyan-500/50 shadow-md shadow-cyan-950/50"
                    : rank === 1
                    ? "bg-amber-950/20 border border-amber-500/30"
                    : "bg-slate-950/50 border border-slate-800/60 hover:border-slate-700"
                }`}
              >
                {/* Left: Rank + Seat Number */}
                <div className="flex items-center gap-3">
                  {getRankBadge(rank)}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-slate-400">座號</span>
                      <span className="font-['Orbitron'] font-black text-sm text-white tracking-wider">
                        {entry.playerId}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                      <span>擊墜: {entry.kills}</span>
                      <span>•</span>
                      <span>連擊: {entry.combo}x</span>
                      <span>•</span>
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Score */}
                <div className="text-right">
                  <div className="text-lg font-black font-['Orbitron'] text-cyan-400 tracking-wider">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>命中 {entry.accuracy}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/60">
        <span className="flex items-center gap-1 text-cyan-400/90">
          <Award className="w-3.5 h-3.5 text-cyan-400" />
          全域前 5 名即時更新
        </span>
        <span className="text-slate-400">每局 20 秒極限結算</span>
      </div>
    </div>
  );
};
