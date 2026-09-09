import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface ScoreEntry {
  id: string;
  timestamp: string;
  playerId: string;
  score: number;
  kills: number;
  combo: number;
  accuracy: number;
}

// Ensure data directory exists for local persistent score caching
const DATA_DIR = path.join(process.cwd(), "data");
const SCORES_FILE = path.join(DATA_DIR, "scores.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial mock high scores if empty, representing cadet squad records
const DEFAULT_SCORES: ScoreEntry[] = [
  { id: "seed-1", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), playerId: "07", score: 8450, kills: 24, combo: 18, accuracy: 92 },
  { id: "seed-2", timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), playerId: "15", score: 7120, kills: 21, combo: 14, accuracy: 88 },
  { id: "seed-3", timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), playerId: "03", score: 6300, kills: 18, combo: 12, accuracy: 85 },
  { id: "seed-4", timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), playerId: "22", score: 5540, kills: 16, combo: 10, accuracy: 79 },
  { id: "seed-5", timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), playerId: "09", score: 4890, kills: 14, combo: 9, accuracy: 74 },
];

function loadScores(): ScoreEntry[] {
  try {
    if (fs.existsSync(SCORES_FILE)) {
      const raw = fs.readFileSync(SCORES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading scores file:", err);
  }
  // Initialize with default seeds
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(DEFAULT_SCORES, null, 2));
  } catch (err) {
    console.error("Error writing default scores file:", err);
  }
  return [...DEFAULT_SCORES];
}

function saveScores(scores: ScoreEntry[]) {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
  } catch (err) {
    console.error("Failed to save scores:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GET: Fetch global Leaderboard (Top 5 + total count)
  app.get("/api/leaderboard", async (_req, res) => {
    try {
      // If Google Sheets WebApp URL is configured, try querying it
      const gasUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
      if (gasUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const response = await fetch(`${gasUrl}?action=getTop5`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.top5)) {
              return res.json({
                source: "google_sheets",
                top5: data.top5.slice(0, 5),
                total: data.total || data.top5.length,
              });
            }
          }
        } catch (gasErr) {
          console.warn("GAS endpoint fetch timed out or failed, falling back to local store:", gasErr);
        }
      }

      // Fallback to local persistent store
      const allScores = loadScores();
      const sorted = [...allScores].sort((a, b) => b.score - a.score || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const top5 = sorted.slice(0, 5);

      res.json({
        source: "local_cache",
        top5,
        total: sorted.length,
      });
    } catch (err) {
      console.error("Error retrieving leaderboard:", err);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // POST: Asynchronously submit score after game ends
  app.post("/api/score", async (req, res) => {
    try {
      const { playerId, score, kills, combo, accuracy } = req.body;

      if (!playerId || typeof score !== "number") {
        return res.status(400).json({ error: "Invalid score submission payload" });
      }

      const cleanPlayerId = String(playerId).trim().slice(0, 16) || "CADET";
      const cleanScore = Math.max(0, Math.floor(score));
      const cleanKills = Math.max(0, Math.floor(kills || 0));
      const cleanCombo = Math.max(0, Math.floor(combo || 0));
      const cleanAccuracy = Math.min(100, Math.max(0, Math.round(accuracy || 0)));

      const newEntry: ScoreEntry = {
        id: `score-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        playerId: cleanPlayerId,
        score: cleanScore,
        kills: cleanKills,
        combo: cleanCombo,
        accuracy: cleanAccuracy,
      };

      // 1. Save to local persistent storage immediately
      const allScores = loadScores();
      allScores.push(newEntry);
      saveScores(allScores);

      // Compute rank
      const sorted = [...allScores].sort((a, b) => b.score - a.score);
      const playerRank = sorted.findIndex((s) => s.id === newEntry.id) + 1;
      const top5 = sorted.slice(0, 5);

      // 2. Asynchronously forward to Google Sheets Web App if configured (fire & forget to prevent blocking player UI)
      const gasUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
      if (gasUrl) {
        fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submitScore",
            ...newEntry,
          }),
        }).catch((err) => {
          console.warn("Async Google Sheets forward warning:", err);
        });
      }

      res.json({
        success: true,
        record: newEntry,
        rank: playerRank,
        isTop5: playerRank <= 5,
        top5,
        syncedToGoogleSheet: Boolean(gasUrl),
      });
    } catch (err) {
      console.error("Error submitting score:", err);
      res.status(500).json({ error: "Internal error processing score" });
    }
  });

  // GET: Specifications, Schema documentation and Google Apps Script Code
  app.get("/api/docs/schema", (_req, res) => {
    res.json({
      evaluation: {
        canAutoCreateSheets: false,
        reason:
          "Google 安全規範要求呼叫 Google Drive / Sheets API 建立實體試算表時，必須由使用者透過 OAuth 登入授權（或配置 GCP Service Account 憑證金鑰）。為了達成『資料串接端點封裝於前端、終端用戶免手動設定』之目標，最穩健輕量之架構為由開發者/主辦方手動建立一次 Google Sheet 並發布 Google Apps Script (GAS) Web App，前端直接對接此 API 端點，所有玩家無需登入 Google 即可秒玩秒結算。",
      },
      schema: [
        { field: "timestamp", header: "遊玩時間戳記", type: "String (ISO 8601)", example: "2026-09-09T08:50:00.000Z" },
        { field: "player_id", header: "座號/識別碼", type: "String", example: "07 或 Cadet-X" },
        { field: "score", header: "最終結算得分", type: "Integer (Number)", example: "8450" },
        { field: "kills", header: "擊墜總數", type: "Integer (Number)", example: "24" },
        { field: "combo", header: "最高連擊數", type: "Integer (Number)", example: "18" },
        { field: "accuracy", header: "射擊命中率", type: "Integer (%)", example: "92" },
        { field: "id", header: "紀錄唯一標籤 (UUID)", type: "String", example: "score-17888923-a1b2" },
      ],
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cadet Shooter Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
