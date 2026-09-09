export interface ScoreEntry {
  id: string;
  timestamp: string;
  playerId: string;
  score: number;
  kills: number;
  combo: number;
  accuracy: number;
}

export interface GameStats {
  score: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  maxCombo: number;
  accuracy: number;
  durationSeconds: number;
  playerId: string;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  isPlayer: boolean;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: "scout" | "interceptor" | "meteor" | "elite";
  color: string;
  scoreValue: number;
  lastShootTime?: number;
  angle?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: "score" | "emp" | "rapid";
  radius: number;
}

export interface SchemaField {
  field: string;
  header: string;
  type: string;
  example: string;
  description: string;
}
