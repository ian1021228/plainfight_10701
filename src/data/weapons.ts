export type WeaponId =
  | "pulse_pistol"
  | "scatter_shotgun"
  | "assault_rifle"
  | "charged_sniper"
  | "orbiting_blades"
  | "tesla_arc"
  | "flamethrower"
  | "seeker_pod"
  | "toxic_mine"
  | "vortex_cannon";

export interface WeaponLevelDef {
  level: number;
  title: string;
  description: string;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  nameEn: string;
  category: "ballistic" | "energy" | "tech" | "tactical";
  feature: string;
  color: string;
  icon: string;
  levels: Record<number, WeaponLevelDef>;
}

export const WEAPONS_CATALOG: Record<WeaponId, WeaponDef> = {
  pulse_pistol: {
    id: "pulse_pistol",
    name: "脈衝手槍",
    nameEn: "Pulse Pistol",
    category: "energy",
    feature: "高精準度的單發能量武器，適合單點突破與走位點射。",
    color: "#38bdf8",
    icon: "Crosshair",
    levels: {
      1: {
        level: 1,
        title: "單發高能脈衝",
        description: "單發傷害 15，彈夾容量 12 發，換彈時間 1.2 秒。",
      },
      2: {
        level: 2,
        title: "超導增幅線圈",
        description: "單發傷害提升至 22，彈夾容量增至 15 發。",
      },
      3: {
        level: 3,
        title: "快速反應快門",
        description: "換彈時間縮短至 0.8 秒，暴擊率提升 10%。",
      },
      4: {
        level: 4,
        title: "離子穿刺彈芯",
        description: "子彈獲得「穿透 1 名敵人」效果，單發傷害提升至 30。",
      },
      5: {
        level: 5,
        title: "解鎖【超頻射擊】",
        description: "最後一發子彈造成 300% 範圍爆炸傷害。",
      },
    },
  },

  scatter_shotgun: {
    id: "scatter_shotgun",
    name: "擴散散彈槍",
    nameEn: "Scatter Shotgun",
    category: "ballistic",
    feature: "近距離大範圍扇形攻擊，具備強擊退效果。",
    color: "#fb923c",
    icon: "ShieldAlert",
    levels: {
      1: {
        level: 1,
        title: "四重重力散彈",
        description: "每次射出 4 顆彈丸，每顆傷害 8，射程短，附帶微弱擊退。",
      },
      2: {
        level: 2,
        title: "扼流圈校正",
        description: "彈丸數量增至 6 顆，散佈角度略微集中。",
      },
      3: {
        level: 3,
        title: "震波推撞彈頭",
        description: "擊退力道增加 50%，近距離命中額外造成 20% 增傷。",
      },
      4: {
        level: 4,
        title: "快速裝填機構",
        description: "彈丸數量增至 8 顆，換彈間隔縮短 25%。",
      },
      5: {
        level: 5,
        title: "解鎖【破甲彈幕】",
        description: "彈丸命中時撕裂敵方護甲，使其受傷加深 30%，持續 3 秒。",
      },
    },
  },

  assault_rifle: {
    id: "assault_rifle",
    name: "連續突擊步槍",
    nameEn: "Assault Rifle",
    category: "ballistic",
    feature: "高射速的全自動中距離壓制武器。",
    color: "#eab308",
    icon: "Flame",
    levels: {
      1: {
        level: 1,
        title: "全自動火力網",
        description: "射速 8 發/秒，單發傷害 10，彈夾容量 30 發。",
      },
      2: {
        level: 2,
        title: "氣體平衡導軌",
        description: "射速提升至 10 發/秒，後座力抖動降低 20%。",
      },
      3: {
        level: 3,
        title: "加長彈鼓升級",
        description: "彈夾容量擴充至 45 發，單發傷害提升至 14。",
      },
      4: {
        level: 4,
        title: "動能推進充能",
        description: "連續射擊超過 1 秒後，自身移動速度提升 15%。",
      },
      5: {
        level: 5,
        title: "解鎖【狂暴連射】",
        description: "連擊命中同一目標時，每發子彈逐步遞增 5% 傷害（最高疊加 50%）。",
      },
    },
  },

  charged_sniper: {
    id: "charged_sniper",
    name: "聚能狙擊槍",
    nameEn: "Charged Sniper",
    category: "energy",
    feature: "超遠射程與超高單發爆發，射速極慢。",
    color: "#6366f1",
    icon: "Target",
    levels: {
      1: {
        level: 1,
        title: "聚能電磁重砲",
        description: "單發傷害 80，射速 0.8 發/秒，子彈初速極高。",
      },
      2: {
        level: 2,
        title: "高斯貫穿透鏡",
        description: "單發傷害提升至 120，子彈必定穿透首名敵人。",
      },
      3: {
        level: 3,
        title: "光子散熱回路",
        description: "暴擊倍率由 200% 提升至 250%，開火硬直減少 20%。",
      },
      4: {
        level: 4,
        title: "重力質量彈芯",
        description: "穿透數量提升至 3 名敵人，後續目標不衰減傷害。",
      },
      5: {
        level: 5,
        title: "解鎖【極光貫通】",
        description: "子彈路徑上殘留 1.5 秒的電離光束，持續對路徑上的敵人造成灼燒。",
      },
    },
  },

  orbiting_blades: {
    id: "orbiting_blades",
    name: "旋轉飛刃",
    nameEn: "Orbiting Blades",
    category: "tech",
    feature: "環繞自身旋轉的防禦型近身武器，阻擋並傷害貼身近戰怪。",
    color: "#10b981",
    icon: "Disc",
    levels: {
      1: {
        level: 1,
        title: "單軌磁浮護刃",
        description: "1 把飛刃以固定半徑環繞玩家旋轉，每次碰撞造成 12 傷害。",
      },
      2: {
        level: 2,
        title: "雙聯防禦陣列",
        description: "飛刃數量增至 2 把，旋轉速度提升 20%。",
      },
      3: {
        level: 3,
        title: "奈米強化鋒刃",
        description: "旋轉半徑微幅擴大，每把飛刃傷害提升至 20。",
      },
      4: {
        level: 4,
        title: "排斥力場塗層",
        description: "飛刃數量增至 3 把，有 20% 機率將敵方微弱推開。",
      },
      5: {
        level: 5,
        title: "解鎖【金屬風暴】",
        description: "飛刃數量增至 4 把，每隔 5 秒向外擴散一圈衝擊波後迅速回縮。",
      },
    },
  },

  tesla_arc: {
    id: "tesla_arc",
    name: "磁暴發射器",
    nameEn: "Tesla Arc",
    category: "energy",
    feature: "自動索敵並在群怪之間彈跳的連鎖閃電武器。",
    color: "#a855f7",
    icon: "Zap",
    levels: {
      1: {
        level: 1,
        title: "特斯拉單弧引雷",
        description: "每次攻擊發射 1 條電弧，造成 18 傷害，最多彈跳 2 次。",
      },
      2: {
        level: 2,
        title: "連鎖共振倍增",
        description: "彈跳次數增至 4 次，每次彈跳傷害不衰減。",
      },
      3: {
        level: 3,
        title: "高壓麻痺電頻",
        description: "攻擊頻率提升 30%，附帶 0.2 秒麻痺緩速。",
      },
      4: {
        level: 4,
        title: "雙生電漿分流",
        description: "初始發射電弧數量增至 2 條，彈跳次數各為 4 次。",
      },
      5: {
        level: 5,
        title: "解鎖【超導鏈結】",
        description: "受電弧波及的敵人彼此產生磁場共振，額外承受 40% 連鎖電擊傷害。",
      },
    },
  },

  flamethrower: {
    id: "flamethrower",
    name: "烈焰投射器",
    nameEn: "Flamethrower",
    category: "tactical",
    feature: "持續扇形火焰噴射，施加不可阻擋的持續性 DoT 傷害。",
    color: "#f43f5e",
    icon: "Flame",
    levels: {
      1: {
        level: 1,
        title: "凝固汽油炎流",
        description: "持續噴出錐形火焰，每 0.25 秒造成 4 點火焰傷害，範圍 150px。",
      },
      2: {
        level: 2,
        title: "廣角噴嘴增幅",
        description: "火焰噴射射程增至 220px，扇形角度增加 15 度。",
      },
      3: {
        level: 3,
        title: "白磷附著燃燒",
        description: "命中時附加 2 秒「灼燒」狀態，離開火焰區域仍持續扣血。",
      },
      4: {
        level: 4,
        title: "連鎖引燃爆震",
        description: "灼燒目標死亡時會產生小爆炸，點燃周圍敵人。",
      },
      5: {
        level: 5,
        title: "解鎖【地獄藍焰】",
        description: "傷害全面提升 60%，並降低受燃燒敵人 30% 移動速度。",
      },
    },
  },

  seeker_pod: {
    id: "seeker_pod",
    name: "智能追蹤飛彈",
    nameEn: "Seeker Pod",
    category: "tactical",
    feature: "自動鎖定視野內血量最高目標的制導火箭。",
    color: "#06b6d4",
    icon: "Radio",
    levels: {
      1: {
        level: 1,
        title: "紅外尋標火箭",
        description: "每 2.5 秒發射 1 枚追蹤飛彈，命中造成 45 範圍傷害。",
      },
      2: {
        level: 2,
        title: "向量噴嘴調整",
        description: "填裝冷卻縮短至 2.0 秒，飛行轉向靈敏度提升。",
      },
      3: {
        level: 3,
        title: "雙聯發射巢",
        description: "每次發射數量增至 2 枚，爆炸範圍半徑擴大 30%。",
      },
      4: {
        level: 4,
        title: "震盪破片彈頭",
        description: "填裝冷卻縮短至 1.5 秒，命中附加短暫眩暈效果。",
      },
      5: {
        level: 5,
        title: "解鎖【集束轟炸】",
        description: "每次發射 4 枚微型飛彈，命中目標後各自分裂出 2 顆小型子母彈。",
      },
    },
  },

  toxic_mine: {
    id: "toxic_mine",
    name: "劇毒地雷",
    nameEn: "Toxic Mine",
    category: "tactical",
    feature: "沿玩家移動路徑放置陷阱，控制走位與拉打聚怪。",
    color: "#84cc16",
    icon: "Biohazard",
    levels: {
      1: {
        level: 1,
        title: "化學毒氣感應雷",
        description: "每 3 秒在角色身後放下 1 顆地雷，踩中觸發 30 傷害並留下持續 2 秒毒霧。",
      },
      2: {
        level: 2,
        title: "耐用外殼與濃縮毒液",
        description: "地雷存在時間延長至 10 秒，毒霧傷害每秒提升 50%。",
      },
      3: {
        level: 3,
        title: "雙聯自動佈雷系統",
        description: "每次放置 2 顆地雷，毒霧範圍擴大 25%。",
      },
      4: {
        level: 4,
        title: "黏滯腐蝕性毒劑",
        description: "踩踏毒霧的敵人移動速度降低 40%。",
      },
      5: {
        level: 5,
        title: "解鎖【神經毒素】",
        description: "毒霧持續時間翻倍，且在毒霧中死亡的敵人會原地再次生成一顆即爆地雷。",
      },
    },
  },

  vortex_cannon: {
    id: "vortex_cannon",
    name: "虛空黑洞槍",
    nameEn: "Vortex Cannon",
    category: "energy",
    feature: "聚怪控場利器，發射緩慢飛行的重力奇異點。",
    color: "#c084fc",
    icon: "Atom",
    levels: {
      1: {
        level: 1,
        title: "微型重力奇異點",
        description: "發射 1 顆緩速能量球，將周圍小型敵人牽引至核心，每秒造成 15 傷害，持續 2 秒。",
      },
      2: {
        level: 2,
        title: "重力透鏡放大",
        description: "牽引半徑擴大 35%，吸引力道增強。",
      },
      3: {
        level: 3,
        title: "事件視界擴充",
        description: "能量球持續時間延長至 3.5 秒，可牽引中型精英怪。",
      },
      4: {
        level: 4,
        title: "潮汐力撕裂",
        description: "能量球持續期間每秒傷害提升至 28。",
      },
      5: {
        level: 5,
        title: "解鎖【奇異點坍縮】",
        description: "黑洞結束瞬間引發空間坍縮大爆炸，造成核心區域 250 點毀滅傷害。",
      },
    },
  },
};
