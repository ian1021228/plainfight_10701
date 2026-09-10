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
  pierce?: number;
  isCrit?: boolean;
  isExplosive?: boolean;
  explosionRadius?: number;
  sourceWeapon?: string;
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
  shootInterval?: number;
  angle?: number;
  vulnerabilityTimer?: number;
  burnTimer?: number;
  burnDps?: number;
  slowTimer?: number;
  slowFactor?: number;
  isDead?: boolean;
}

export interface OrbitingBlade {
  angle: number;
  radius: number;
  damage: number;
  count: number;
  shockwaveCooldown?: number;
}

export interface SeekerMissile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId?: number;
  damage: number;
  isCluster?: boolean;
  subMunitionsLeft?: number;
  lifeTime: number;
  color: string;
}

export interface ToxicMineItem {
  x: number;
  y: number;
  lifeTimer: number;
  duration: number;
  damage: number;
  radius: number;
  triggered: boolean;
  poisonTimer: number;
  poisonRadius: number;
}

export interface VortexItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number;
  duration: number;
  radius: number;
  dps: number;
  isCollapsing?: boolean;
}

export interface IonBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  timer: number;
  duration: number;
  dps: number;
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
  type: "score" | "emp" | "rapid" | "heal";
  radius: number;
}

export interface SchemaField {
  field: string;
  header: string;
  type: string;
  example: string;
  description: string;
}
