import React, { useState } from "react";
import { SchemaField } from "../types";
import { Copy, Check, ExternalLink, Database, X, HelpCircle, FileSpreadsheet, ShieldCheck } from "lucide-react";

interface GoogleSheetDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCHEMA_FIELDS: SchemaField[] = [
  {
    field: "timestamp",
    header: "A: 遊玩時間 (timestamp)",
    type: "Date / ISO String",
    example: "2026-09-09T08:50:00.000Z",
    description: "遊戲結算時間戳記，可使用試算表格式化為日期時間",
  },
  {
    field: "player_id",
    header: "B: 座號/識別碼 (player_id)",
    type: "String",
    example: "07",
    description: "玩家於進入遊戲時指定之座號、班級學號或自訂呼號",
  },
  {
    field: "score",
    header: "C: 最終得分 (score)",
    type: "Integer (Number)",
    example: "8450",
    description: "20秒限定戰局內累計之最終擊墜得分",
  },
  {
    field: "kills",
    header: "D: 擊墜數 (kills)",
    type: "Integer (Number)",
    example: "24",
    description: "成功消滅之敵機、巡航機與隕石總數",
  },
  {
    field: "combo",
    header: "E: 最高連擊 (combo)",
    type: "Integer (Number)",
    example: "18",
    description: "連續擊中未中斷之最高 Combo 連擊乘數",
  },
  {
    field: "accuracy",
    header: "F: 命中率 (accuracy)",
    type: "Number (%)",
    example: "92",
    description: "子彈有效命中率（命中數 ÷ 開火總數 × 100）",
  },
  {
    field: "id",
    header: "G: 戰局ID (id)",
    type: "String (UUID)",
    example: "score-17888923-a1b2",
    description: "每次結算之唯一辨識碼，防止非同步重試造成重複計分",
  },
];

const GAS_SCRIPT_CODE = `/**
 * Google Apps Script 輕量資料庫後端
 * 部署方式：Google 試算表 > 擴充功能 > Apps Script > 貼上本程式碼 > 部署為「網頁應用程式 (Web App)」
 * 執行身分：我 (Me) | 存取權限：任何人 (Anyone)
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // 初始化標題行 (若第一行為空)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "player_id", "score", "kills", "combo", "accuracy", "id"]);
    }
    
    // 寫入成績
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      String(data.playerId || data.player_id || "CADET"),
      Number(data.score || 0),
      Number(data.kills || 0),
      Number(data.combo || 0),
      Number(data.accuracy || 0),
      String(data.id || "")
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Score recorded" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ top5: [], total: 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 排除標題列，解析資料
  var scores = [];
  for (var i = 1; i < rows.length; i++) {
    scores.push({
      timestamp: rows[i][0],
      playerId: String(rows[i][1]),
      score: Number(rows[i][2]),
      kills: Number(rows[i][3]),
      combo: Number(rows[i][4]),
      accuracy: Number(rows[i][5]),
      id: String(rows[i][6])
    });
  }
  
  // 依分數由高至低排序
  scores.sort(function(a, b) { return b.score - a.score; });
  var top5 = scores.slice(0, 5);
  
  return ContentService.createTextOutput(JSON.stringify({ top5: top5, total: scores.length }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const GoogleSheetDocsModal: React.FC<GoogleSheetDocsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="googlesheet-docs-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="googlesheet-docs-card"
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-['Chakra_Petch'] text-white">
                資料庫部署規格確認與手冊
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Google Sheets 輕量資料庫架構評估與欄位規範說明
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

        {/* Active Firebase Connection Status */}
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-['Chakra_Petch'] text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>已連線之 Firebase 雲端資料庫 (Firestore)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              ONLINE
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Project ID:</span> <span className="text-amber-300 font-bold">flydrop-691bb</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Auth Domain:</span> <span className="text-slate-200">flydrop-691bb.firebaseapp.com</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">目標集合 (Collection):</span> <span className="text-cyan-400 font-bold">scores</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">座號格式 (Seat / Pilot ID):</span> <span className="text-emerald-400 font-bold">107-01</span>
            </div>
          </div>
        </div>

        {/* Evaluation Section */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold font-['Chakra_Petch'] text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>規格評估：能否由系統自動建立 Google Sheets 實體？</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong className="text-cyan-400">評估結論：需由開發者（或主辦方）手動佈建一次 Google Sheet 實體。</strong>
            </p>
            <p className="text-slate-400">
              <strong>原因分析：</strong> Google Drive / Sheets API 的安全性架構要求所有「新建檔案」操作必須具備 Google 帳號的 OAuth 2.0 授權或 GCP 服務帳號（Service Account）私鑰。若要求系統純由終端玩家在瀏覽器端自動建立 Google Sheet，每位玩家進入遊戲時都必須彈出 Google 帳號登入授權視窗，這將直接破壞「<strong>免手動設定、即開即玩</strong>」的射擊遊戲體驗。
            </p>
            <p className="text-slate-400">
              <strong>最佳實踐架構：</strong> 開發者僅需建立一份試算表，並部署 Google Apps Script (GAS) Web App 作為公共免驗證 API。前端（或內建代理後端）直接封裝該端點，結算時非同步 POST 寫入成績，同時 GET 抓取全域前 5 名，達成 100% 零阻礙玩家體驗。
            </p>
          </div>
        </div>

        {/* Schema Table */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-['Chakra_Petch'] text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>資料表結構（Schema）與欄位命名建議</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Google Sheet 第 1 行欄位名稱</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">試算表欄位 (Field)</th>
                  <th className="p-3">資料型態 (Type)</th>
                  <th className="p-3">數值範例 (Example)</th>
                  <th className="p-3">欄位說明 (Description)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {SCHEMA_FIELDS.map((row) => (
                  <tr key={row.field} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-cyan-400 whitespace-nowrap">{row.header}</td>
                    <td className="p-3 text-amber-400 whitespace-nowrap">{row.type}</td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">{row.example}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Google Apps Script Code */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold font-['Chakra_Petch'] text-white">
                Google Apps Script (GAS) 部署程式碼
              </span>
            </div>
            <button
              id="copy-gas-code-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "已複製到剪貼簿" : "一鍵複製程式碼"}</span>
            </button>
          </div>

          <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 overflow-x-auto text-[11px] font-mono text-slate-300 max-h-56 leading-relaxed">
            <pre>{GAS_SCRIPT_CODE}</pre>
          </div>
        </div>

        {/* Deployment 3 Steps */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-2">
          <div className="font-bold text-white text-sm font-['Chakra_Petch']">
            🚀 3 步驟快速佈建教學：
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
            <li>
              開啟 <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">Google 試算表 <ExternalLink className="w-3 h-3 inline" /></a>，點選上方選單<strong>「擴充功能」&gt;「Apps Script」</strong>。
            </li>
            <li>
              刪除編輯器原有內容，貼上上方提供的程式碼並存檔（Ctrl+S）。
            </li>
            <li>
              點選右上角<strong>「部署」&gt;「新增部署作業」</strong>，類型選擇<strong>「網頁應用程式」</strong>，將「誰可以存取」設為<strong>「所有人 (Anyone)」</strong>，複製產生的網頁應用程式網址即可！
            </li>
          </ol>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-['Chakra_Petch'] text-sm tracking-wider transition-colors cursor-pointer"
        >
          關閉說明視窗
        </button>
      </div>
    </div>
  );
};
