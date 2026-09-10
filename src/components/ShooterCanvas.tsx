import React, { useEffect, useRef, useState, useCallback } from "react";
import { Bullet, Enemy, FloatingText, GameStats, Particle, PowerUp, OrbitingBlade, SeekerMissile, ToxicMineItem, VortexItem, IonBeam } from "../types";
import { sound } from "../utils/audio";
import { WEAPONS_CATALOG, WeaponId } from "../data/weapons";
import { WeaponUpgradeModal, UpgradeOption } from "./WeaponUpgradeModal";
import { Zap, ShieldAlert, Crosshair, Sparkles, Heart, Trophy, Swords } from "lucide-react";

interface ShooterCanvasProps {
  playerId: string;
  onGameOver: (stats: GameStats) => void;
  isAudioMuted: boolean;
  initialWeaponId?: WeaponId;
}

export const ShooterCanvas: React.FC<ShooterCanvasProps> = ({
  playerId,
  onGameOver,
  initialWeaponId = "pulse_pistol",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game UI states
  const [survivalTime, setSurvivalTime] = useState<number>(0.0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [empReady, setEmpReady] = useState<boolean>(true);
  const [isRushMode, setIsRushMode] = useState<boolean>(false);

  // Weapon Upgrade Modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [currentKills, setCurrentKills] = useState<number>(0);
  const [equippedWeapons, setEquippedWeapons] = useState<Record<WeaponId, number>>({
    pulse_pistol: initialWeaponId === "pulse_pistol" ? 1 : 0,
    scatter_shotgun: initialWeaponId === "scatter_shotgun" ? 1 : 0,
    assault_rifle: initialWeaponId === "assault_rifle" ? 1 : 0,
    charged_sniper: initialWeaponId === "charged_sniper" ? 1 : 0,
    orbiting_blades: initialWeaponId === "orbiting_blades" ? 1 : 0,
    tesla_arc: initialWeaponId === "tesla_arc" ? 1 : 0,
    flamethrower: initialWeaponId === "flamethrower" ? 1 : 0,
    seeker_pod: initialWeaponId === "seeker_pod" ? 1 : 0,
    toxic_mine: initialWeaponId === "toxic_mine" ? 1 : 0,
    vortex_cannon: initialWeaponId === "vortex_cannon" ? 1 : 0,
  });

  // Mutable game state held in ref for 60fps loop
  const stateRef = useRef({
    isPlaying: true,
    isPausedForUpgrade: false,
    survivalTime: 0.0,
    empTimer: 18.0,
    score: 0,
    kills: 0,
    nextUpgradeKills: 4, // First upgrade at 4 kills, then 8, 13, 19, 26, 34...
    shotsFired: 0,
    shotsHit: 0,
    combo: 0,
    maxCombo: 0,
    empReady: true,
    player: {
      x: 300,
      y: 500,
      targetX: 300,
      targetY: 500,
      width: 48,
      height: 54,
      hp: 100,
      maxHp: 100,
      speed: 8,
      tilt: 0,
      invulnerableTimer: 0,
      continuousFireTimer: 0,
      lastHitTargetId: -1,
      frenzyHitsOnTarget: 0,
    },
    weapons: {
      pulse_pistol: initialWeaponId === "pulse_pistol" ? 1 : 0,
      scatter_shotgun: initialWeaponId === "scatter_shotgun" ? 1 : 0,
      assault_rifle: initialWeaponId === "assault_rifle" ? 1 : 0,
      charged_sniper: initialWeaponId === "charged_sniper" ? 1 : 0,
      orbiting_blades: initialWeaponId === "orbiting_blades" ? 1 : 0,
      tesla_arc: initialWeaponId === "tesla_arc" ? 1 : 0,
      flamethrower: initialWeaponId === "flamethrower" ? 1 : 0,
      seeker_pod: initialWeaponId === "seeker_pod" ? 1 : 0,
      toxic_mine: initialWeaponId === "toxic_mine" ? 1 : 0,
      vortex_cannon: initialWeaponId === "vortex_cannon" ? 1 : 0,
    } as Record<WeaponId, number>,

    // Weapon Timers & Internal States
    weaponTimers: {
      pulse_pistol: { lastFired: 0, ammo: 12, maxAmmo: 12, reloadTimer: 0 },
      scatter_shotgun: { lastFired: 0 },
      assault_rifle: { lastFired: 0, ammo: 30, maxAmmo: 30, reloadTimer: 0 },
      charged_sniper: { lastFired: 0 },
      orbiting_blades: { angle: 0, lastShockwave: 0 },
      tesla_arc: { lastFired: 0 },
      flamethrower: { lastTick: 0 },
      seeker_pod: { lastFired: 0 },
      toxic_mine: { lastFired: 0 },
      vortex_cannon: { lastFired: 0 },
    },

    // Bullets & Entities
    bullets: [] as Bullet[],
    enemyBullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    powerUps: [] as PowerUp[],
    seekerMissiles: [] as SeekerMissile[],
    toxicMines: [] as ToxicMineItem[],
    vortexes: [] as VortexItem[],
    ionBeams: [] as IonBeam[],
    teslaArcs: [] as { x1: number; y1: number; x2: number; y2: number; timer: number; color: string }[],
    stars: [] as { x: number; y: number; size: number; speed: number; alpha: number }[],
    keys: {} as Record<string, boolean>,
    lastEnemySpawnTime: 0,
    lastWarningSecond: -1,
    canvasWidth: 600,
    canvasHeight: 700,
    shake: 0,
  });

  // Particle explosion helper
  const createExplosion = (x: number, y: number, color: string, count = 12) => {
    sound.playExplosion(count > 15);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 2,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  };

  // Centralized Enemy destruction & reward dispatcher
  const destroyEnemy = (enemy: Enemy, hitX?: number, hitY?: number, isSpecial = false) => {
    if (enemy.isDead) return;
    enemy.isDead = true;
    const state = stateRef.current;
    state.kills += 1;
    setCurrentKills(state.kills);

    const comboMultiplier = 1 + Math.min(Math.floor(state.combo / 4) * 0.25, 2.0);
    const baseScore = enemy.scoreValue * (isRushMode ? 2 : 1);
    const totalGain = Math.round(baseScore * comboMultiplier);

    state.score += totalGain;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);

    const ex = hitX ?? (enemy.x + enemy.width / 2);
    const ey = hitY ?? (enemy.y + enemy.height / 2);
    createExplosion(ex, ey, enemy.color, isSpecial ? 22 : 16);

    // Powerup drop chance: score gem (45%) or emergency health repair kit (15%, or 25% if low HP)
    const randDrop = Math.random();
    if (randDrop < 0.45) {
      state.powerUps.push({
        x: ex,
        y: ey,
        vy: 2.2,
        type: "score",
        radius: 10,
      });
    } else if (randDrop < 0.60 || (state.player.hp < 50 && randDrop < 0.75)) {
      state.powerUps.push({
        x: ex,
        y: ey,
        vy: 2.0,
        type: "heal",
        radius: 12,
      });
    }

    // Floating score
    state.floatingTexts.push({
      id: Math.random(),
      x: enemy.x,
      y: enemy.y,
      text: `+${totalGain}${comboMultiplier > 1 ? ` (${comboMultiplier}x)` : ""}`,
      color: isRushMode ? "#fb7185" : "#38bdf8",
      alpha: 1,
      vy: -1.8,
    });
  };

  // Centralized Damage Application for all weapons
  const applyDamageToEnemy = (enemy: Enemy, rawDamage: number, sourceWeapon?: string, hitX?: number, hitY?: number) => {
    if (enemy.isDead) return;
    let dmg = rawDamage;
    if (enemy.vulnerabilityTimer && enemy.vulnerabilityTimer > 0) {
      dmg *= 1.3;
    }
    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      destroyEnemy(enemy, hitX, hitY);
    }
  };

  // Keyboard controls & EMP
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = true;
      if (e.key === " " || e.key.toLowerCase() === "e") {
        e.preventDefault();
      }
      if (e.key.toLowerCase() === "e") {
        triggerEmp();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Trigger Overdrive EMP Blast
  const triggerEmp = useCallback(() => {
    const state = stateRef.current;
    if (!state.empReady || !state.isPlaying || state.isPausedForUpgrade) return;

    state.empReady = false;
    state.empTimer = 0;
    setEmpReady(false);
    sound.playEmp();
    state.shake = 18;

    // Destroy all enemies on screen
    state.enemies.forEach((enemy) => {
      const addedScore = enemy.scoreValue * 2;
      state.score += addedScore;
      state.kills += 1;

      createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#38bdf8", 25);

      state.floatingTexts.push({
        id: Math.random(),
        x: enemy.x,
        y: enemy.y,
        text: `EMP +${addedScore}`,
        color: "#38bdf8",
        alpha: 1,
        vy: -2,
      });

      state.powerUps.push({
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        vy: 2.5,
        type: "score",
        radius: 12,
      });
    });

    state.enemies = [];
    state.enemyBullets = []; // Clear all enemy bullets!

    // EMP Shockwave Particles
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = 7 + Math.random() * 5;
      state.particles.push({
        x: state.player.x,
        y: state.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4,
        color: "#38bdf8",
        alpha: 1,
        decay: 0.025,
      });
    }

    setScore(state.score);
  }, []);

  // Trigger Level-Up Prompt
  const openUpgradePrompt = useCallback(() => {
    const state = stateRef.current;
    sound.playLevelUp();
    state.isPausedForUpgrade = true;

    // Select 3 random upgrade options
    const allWeaponIds = Object.keys(WEAPONS_CATALOG) as WeaponId[];
    const candidates: UpgradeOption[] = [];

    // Prioritize weapons not at max level (5)
    allWeaponIds.forEach((wId) => {
      const currentLevel = state.weapons[wId] || 0;
      if (currentLevel < 5) {
        candidates.push({ weaponId: wId, targetLevel: currentLevel + 1 });
      }
    });

    // Shuffle and pick 3
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const chosenOptions = candidates.slice(0, 3);

    setUpgradeOptions(chosenOptions);
    setCurrentKills(state.kills);
    setIsUpgradeModalOpen(true);
  }, []);

  // Player selected an upgrade
  const handleSelectUpgrade = useCallback((weaponId: WeaponId) => {
    const state = stateRef.current;
    const currentLvl = state.weapons[weaponId] || 0;
    const nextLvl = Math.min(5, currentLvl + 1);

    state.weapons[weaponId] = nextLvl;
    setEquippedWeapons({ ...state.weapons });

    // Update state & ammo capacities
    if (weaponId === "pulse_pistol") {
      state.weaponTimers.pulse_pistol.maxAmmo = nextLvl >= 2 ? 15 : 12;
      state.weaponTimers.pulse_pistol.ammo = state.weaponTimers.pulse_pistol.maxAmmo;
    } else if (weaponId === "assault_rifle") {
      state.weaponTimers.assault_rifle.maxAmmo = nextLvl >= 3 ? 45 : 30;
      state.weaponTimers.assault_rifle.ammo = state.weaponTimers.assault_rifle.maxAmmo;
    }

    // Floating text above player
    const weaponDef = WEAPONS_CATALOG[weaponId];
    state.floatingTexts.push({
      id: Math.random(),
      x: state.player.x - 40,
      y: state.player.y - 50,
      text: `★ ${weaponDef.name} Lv.${nextLvl}!`,
      color: weaponDef.color,
      alpha: 1,
      vy: -2,
    });

    // Burst of sparkle particles around player
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      state.particles.push({
        x: state.player.x,
        y: state.player.y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        size: 3,
        color: weaponDef.color,
        alpha: 1,
        decay: 0.03,
      });
    }

    // Set next upgrade milestone (escalating curve: +4, +5, +6...)
    state.nextUpgradeKills += Math.min(8, 4 + Math.floor(state.kills / 6));
    state.isPausedForUpgrade = false;
    setIsUpgradeModalOpen(false);
  }, []);

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;

    // Initialize Starfield
    state.stars = Array.from({ length: 65 }, () => ({
      x: Math.random() * (state.canvasWidth || 600),
      y: Math.random() * (state.canvasHeight || 700),
      size: Math.random() * 2 + 0.8,
      speed: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    let animationFrameId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      if (!state.isPlaying) return;

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // When upgrade modal is open, game physics pause cleanly
      if (state.isPausedForUpgrade) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // Helper function to handle player death (Game Over)
      const triggerDeathGameOver = () => {
        if (!state.isPlaying) return;
        state.isPlaying = false;
        sound.playGameOver();
        const pl = state.player;
        createExplosion(pl.x, pl.y, "#f43f5e", 45);
        createExplosion(pl.x, pl.y, "#38bdf8", 35);
        createExplosion(pl.x, pl.y, "#fbbf24", 25);

        const accuracy = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
        onGameOver({
          score: state.score,
          kills: state.kills,
          shotsFired: state.shotsFired,
          shotsHit: state.shotsHit,
          maxCombo: state.maxCombo,
          accuracy,
          durationSeconds: Math.round(state.survivalTime * 10) / 10,
          playerId,
        });
      };

      // 1. Update Unlimited Survival Time (Count-Up)
      state.survivalTime += dt;
      setSurvivalTime(state.survivalTime);

      // EMP Recharge Timer (Recharges every 18 seconds)
      if (!state.empReady) {
        state.empTimer += dt;
        if (state.empTimer >= 18) {
          state.empReady = true;
          setEmpReady(true);
          state.floatingTexts.push({
            id: Math.random(),
            x: state.player.x - 35,
            y: state.player.y - 45,
            text: "⚡ EMP RECHARGED!",
            color: "#38bdf8",
            alpha: 1,
            vy: -2,
          });
        }
      }

      // Dynamic Rush waves: Every 45 seconds, trigger an 8-second adrenaline rush
      const rushCycle = state.survivalTime % 45;
      const inRush = rushCycle > 37;
      if (inRush && !isRushMode) {
        setIsRushMode(true);
        sound.playWarning();
      } else if (!inRush && isRushMode) {
        setIsRushMode(false);
      }

      // Check for weapon upgrade milestone
      if (state.kills >= state.nextUpgradeKills && !state.isPausedForUpgrade) {
        openUpgradePrompt();
      }

      // 2. Player Controls & Movement
      const p = state.player;
      let playerSpeed = p.speed;
      // Assault Rifle Lv.4 perk: continuous fire > 1s -> speed +15%
      if (state.weapons.assault_rifle >= 4 && p.continuousFireTimer > 1.0) {
        playerSpeed *= 1.15;
      }

      let dx = 0;
      let dy = 0;
      if (state.keys["arrowleft"] || state.keys["a"]) dx -= 1;
      if (state.keys["arrowright"] || state.keys["d"]) dx += 1;
      if (state.keys["arrowup"] || state.keys["w"]) dy -= 1;
      if (state.keys["arrowdown"] || state.keys["s"]) dy += 1;

      if (dx !== 0 || dy !== 0) {
        p.targetX += dx * playerSpeed;
        p.targetY += dy * playerSpeed;
      }

      p.targetX = Math.max(30, Math.min(state.canvasWidth - 30, p.targetX));
      p.targetY = Math.max(40, Math.min(state.canvasHeight - 40, p.targetY));

      const prevX = p.x;
      p.x += (p.targetX - p.x) * 0.25;
      p.y += (p.targetY - p.y) * 0.25;
      p.tilt = (p.x - prevX) * 1.5;

      if (p.invulnerableTimer > 0) {
        p.invulnerableTimer -= dt;
      }

      p.continuousFireTimer += dt;

      // Engine Thruster Exhaust Particles
      if (Math.random() < 0.8) {
        state.particles.push({
          x: p.x - 10 + (Math.random() * 4 - 2),
          y: p.y + 24,
          vx: (Math.random() - 0.5) * 1,
          vy: 4 + Math.random() * 3,
          size: 3.5,
          color: isRushMode ? "#f43f5e" : "#06b6d4",
          alpha: 0.9,
          decay: 0.05,
        });
        state.particles.push({
          x: p.x + 10 + (Math.random() * 4 - 2),
          y: p.y + 24,
          vx: (Math.random() - 0.5) * 1,
          vy: 4 + Math.random() * 3,
          size: 3.5,
          color: isRushMode ? "#f43f5e" : "#06b6d4",
          alpha: 0.9,
          decay: 0.05,
        });
      }

      // ========================================================
      // 3. WEAPON SYSTEMS EXECUTION (10 WEAPONS RUNNING)
      // ========================================================

      // --- 1. Pulse Pistol ---
      if (state.weapons.pulse_pistol >= 1) {
        const lvl = state.weapons.pulse_pistol;
        const wt = state.weaponTimers.pulse_pistol;
        const fireInterval = 210;

        if (wt.reloadTimer > 0) {
          wt.reloadTimer -= dt;
          if (wt.reloadTimer <= 0) {
            wt.ammo = wt.maxAmmo;
          }
        } else if (currentTime - wt.lastFired >= fireInterval) {
          wt.lastFired = currentTime;
          wt.ammo -= 1;
          state.shotsFired += 1;
          sound.playLaser();

          const isLastRound = wt.ammo === 0;
          const isOverclock = lvl >= 5 && isLastRound;
          const baseDmg = lvl === 1 ? 15 : lvl === 2 ? 22 : lvl === 3 ? 24 : 30;
          const isCrit = lvl >= 3 && Math.random() < 0.1;
          const finalDmg = isOverclock ? baseDmg * 3 : isCrit ? baseDmg * 1.5 : baseDmg;

          state.bullets.push({
            x: p.x,
            y: p.y - 20,
            vx: 0,
            vy: -15,
            radius: isOverclock ? 6 : 4,
            color: isOverclock ? "#f59e0b" : "#38bdf8",
            damage: finalDmg,
            isPlayer: true,
            pierce: lvl >= 4 ? 1 : 0,
            isCrit,
            isExplosive: isOverclock,
            explosionRadius: isOverclock ? 75 : 0,
            sourceWeapon: "pulse_pistol",
          });

          if (wt.ammo <= 0) {
            // Reloading
            wt.reloadTimer = lvl >= 3 ? 0.8 : 1.2;
          }
        }
      }

      // --- 2. Scatter Shotgun ---
      if (state.weapons.scatter_shotgun >= 1) {
        const lvl = state.weapons.scatter_shotgun;
        const wt = state.weaponTimers.scatter_shotgun;
        const fireInterval = lvl >= 4 ? 490 : 650;

        if (currentTime - wt.lastFired >= fireInterval) {
          wt.lastFired = currentTime;
          const pelletCount = lvl === 1 ? 4 : lvl <= 3 ? 6 : 8;
          const spreadAngle = lvl >= 2 ? 0.35 : 0.55;
          const dmgPerPellet = lvl >= 3 ? 10 : 8;

          state.shotsFired += pelletCount;
          for (let k = 0; k < pelletCount; k++) {
            const angleOffset = -spreadAngle / 2 + (spreadAngle / (pelletCount - 1)) * k;
            state.bullets.push({
              x: p.x + (k - pelletCount / 2) * 4,
              y: p.y - 15,
              vx: Math.sin(angleOffset) * 12,
              vy: -Math.cos(angleOffset) * 12,
              radius: 3,
              color: "#fb923c",
              damage: dmgPerPellet,
              isPlayer: true,
              sourceWeapon: "scatter_shotgun",
            });
          }
        }
      }

      // --- 3. Assault Rifle ---
      if (state.weapons.assault_rifle >= 1) {
        const lvl = state.weapons.assault_rifle;
        const wt = state.weaponTimers.assault_rifle;
        const fireInterval = lvl >= 2 ? 100 : 125; // 10 rps or 8 rps

        if (wt.reloadTimer > 0) {
          wt.reloadTimer -= dt;
          if (wt.reloadTimer <= 0) {
            wt.ammo = wt.maxAmmo;
          }
        } else if (currentTime - wt.lastFired >= fireInterval) {
          wt.lastFired = currentTime;
          wt.ammo -= 1;
          state.shotsFired += 1;

          let dmg = lvl >= 3 ? 14 : 10;
          if (lvl >= 5) {
            const frenzyBonus = Math.min(0.5, p.frenzyHitsOnTarget * 0.05);
            dmg *= 1 + frenzyBonus;
          }

          state.bullets.push({
            x: p.x + (Math.random() * 8 - 4),
            y: p.y - 18,
            vx: (Math.random() - 0.5) * (lvl >= 2 ? 0.4 : 1.0),
            vy: -16,
            radius: 3,
            color: "#eab308",
            damage: dmg,
            isPlayer: true,
            sourceWeapon: "assault_rifle",
          });

          if (wt.ammo <= 0) {
            wt.reloadTimer = 1.0;
          }
        }
      }

      // --- 4. Charged Sniper ---
      if (state.weapons.charged_sniper >= 1) {
        const lvl = state.weapons.charged_sniper;
        const wt = state.weaponTimers.charged_sniper;
        const fireInterval = lvl >= 3 ? 1000 : 1250;

        if (currentTime - wt.lastFired >= fireInterval) {
          wt.lastFired = currentTime;
          sound.playSniper();
          state.shotsFired += 1;

          const baseDmg = lvl === 1 ? 80 : 120;
          const critMult = lvl >= 3 ? 2.5 : 2.0;
          const isCrit = Math.random() < 0.25;
          const finalDmg = isCrit ? baseDmg * critMult : baseDmg;
          const pierceCount = lvl === 1 ? 0 : lvl <= 3 ? 1 : 3;

          state.bullets.push({
            x: p.x,
            y: p.y - 25,
            vx: 0,
            vy: -24,
            radius: 5,
            color: "#818cf8",
            damage: finalDmg,
            isPlayer: true,
            pierce: pierceCount,
            isCrit,
            sourceWeapon: "charged_sniper",
          });

          // Lv.5 Aurora Pierce: leaves IonBeam on trail
          if (lvl >= 5) {
            state.ionBeams.push({
              x1: p.x,
              y1: p.y - 25,
              x2: p.x,
              y2: 0,
              timer: 1.5,
              duration: 1.5,
              dps: 50,
            });
          }
        }
      }

      // --- 5. Orbiting Blades ---
      if (state.weapons.orbiting_blades >= 1) {
        const lvl = state.weapons.orbiting_blades;
        const wt = state.weaponTimers.orbiting_blades;
        const bladeCount = lvl === 1 ? 1 : lvl === 2 ? 2 : lvl === 3 ? 3 : 4;
        const spinSpeed = lvl >= 2 ? 0.08 : 0.06;
        const radius = lvl >= 3 ? 62 : 48;
        const bladeDmg = lvl >= 3 ? 20 : 12;

        wt.angle += spinSpeed;

        // Check collision between each blade and enemies
        for (let b = 0; b < bladeCount; b++) {
          const bAngle = wt.angle + (b / bladeCount) * Math.PI * 2;
          const bx = p.x + Math.cos(bAngle) * radius;
          const by = p.y + Math.sin(bAngle) * radius;

          state.enemies.forEach((enemy) => {
            if (enemy.isDead) return;
            const edx = enemy.x + enemy.width / 2 - bx;
            const edy = enemy.y + enemy.height / 2 - by;
            if (Math.sqrt(edx * edx + edy * edy) < 24 + enemy.width / 2) {
              applyDamageToEnemy(enemy, bladeDmg * dt * 8, "orbiting_blades", bx, by);
              createExplosion(bx, by, "#10b981", 1);
              if (lvl >= 4 && Math.random() < 0.2) {
                enemy.y -= 15; // Knockback
              }
            }
          });
        }

        // Lv.5 Metal Storm: Expanding shockwave every 5s
        if (lvl >= 5 && currentTime - wt.lastShockwave >= 5000) {
          wt.lastShockwave = currentTime;
          sound.playEmp();
          state.enemies.forEach((enemy) => {
            if (enemy.isDead) return;
            const dist = Math.sqrt((enemy.x + enemy.width / 2 - p.x) ** 2 + (enemy.y + enemy.height / 2 - p.y) ** 2);
            if (dist < 180) {
              applyDamageToEnemy(enemy, 40, "orbiting_blades", enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
              enemy.y -= 30; // Strong pushback
            }
          });
          // Visual ring
          for (let k = 0; k < 20; k++) {
            const a = (k / 20) * Math.PI * 2;
            state.particles.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * 6,
              vy: Math.sin(a) * 6,
              size: 4,
              color: "#10b981",
              alpha: 1,
              decay: 0.04,
            });
          }
        }
      }

      // --- 6. Tesla Arc ---
      if (state.weapons.tesla_arc >= 1) {
        const lvl = state.weapons.tesla_arc;
        const wt = state.weaponTimers.tesla_arc;
        const fireInterval = lvl >= 3 ? 560 : 800;

        if (currentTime - wt.lastFired >= fireInterval && state.enemies.length > 0) {
          const liveEnemies = state.enemies.filter((e) => !e.isDead);
          if (liveEnemies.length > 0) {
            wt.lastFired = currentTime;
            sound.playTeslaZap();
            const arcCount = lvl >= 4 ? 2 : 1;
            const maxBounces = lvl === 1 ? 2 : 4;
            const baseDmg = 20;

            for (let a = 0; a < arcCount; a++) {
              // Find closest alive enemy to player
              let nearestEnemy: Enemy | null = null;
              let nearestDist = 380;
              liveEnemies.forEach((e) => {
                if (e.isDead) return;
                const d = Math.sqrt((e.x + e.width / 2 - p.x) ** 2 + (e.y + e.height / 2 - p.y) ** 2);
                if (d < nearestDist) {
                  nearestDist = d;
                  nearestEnemy = e;
                }
              });

              if (nearestEnemy) {
                let currentTarget: Enemy = nearestEnemy;
                const hitEnemies = new Set<number>([currentTarget.id]);
                let prevX = p.x;
                let prevY = p.y - 20;

                for (let bounce = 0; bounce <= maxBounces; bounce++) {
                  const targetCenterX = currentTarget.x + currentTarget.width / 2;
                  const targetCenterY = currentTarget.y + currentTarget.height / 2;

                  // Record visual electric lightning arc
                  state.teslaArcs.push({
                    x1: prevX,
                    y1: prevY,
                    x2: targetCenterX,
                    y2: targetCenterY,
                    timer: 0.14,
                    color: "#c084fc",
                  });

                  applyDamageToEnemy(currentTarget, baseDmg * (lvl >= 5 ? 1.4 : 1.0), "tesla_arc", targetCenterX, targetCenterY);
                  createExplosion(targetCenterX, targetCenterY, "#c084fc", 4);

                  if (lvl >= 3) {
                    currentTarget.slowTimer = 0.4;
                    currentTarget.slowFactor = 0.5;
                  }

                  prevX = targetCenterX;
                  prevY = targetCenterY;

                  // Find next chain target
                  let nextTarget: Enemy | null = null;
                  let nextDist = 200;
                  state.enemies.forEach((candidate) => {
                    if (!candidate.isDead && !hitEnemies.has(candidate.id)) {
                      const cd = Math.sqrt((candidate.x + candidate.width / 2 - targetCenterX) ** 2 + (candidate.y + candidate.height / 2 - targetCenterY) ** 2);
                      if (cd < nextDist) {
                        nextDist = cd;
                        nextTarget = candidate;
                      }
                    }
                  });

                  if (nextTarget) {
                    hitEnemies.add(nextTarget.id);
                    currentTarget = nextTarget;
                  } else {
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // --- 7. Flamethrower ---
      if (state.weapons.flamethrower >= 1) {
        const lvl = state.weapons.flamethrower;
        const wt = state.weaponTimers.flamethrower;
        const range = lvl >= 2 ? 240 : 170;
        const baseDmg = lvl >= 5 ? 7.2 : 4.5;
        const isBlue = lvl >= 5;

        // Emit continuous flame particles
        for (let i = 0; i < 3; i++) {
          const spread = (Math.random() - 0.5) * (lvl >= 2 ? 40 : 25);
          state.particles.push({
            x: p.x + spread * 0.3,
            y: p.y - 22,
            vx: spread * 0.1,
            vy: -9 - Math.random() * 4,
            size: Math.random() * 7 + 4,
            color: isBlue ? "#38bdf8" : Math.random() < 0.5 ? "#f43f5e" : "#fb923c",
            alpha: 0.85,
            decay: 0.045,
          });
        }

        if (currentTime - wt.lastTick >= 160) {
          wt.lastTick = currentTime;
          state.enemies.forEach((enemy) => {
            if (enemy.isDead) return;
            const ex = enemy.x + enemy.width / 2;
            const ey = enemy.y + enemy.height / 2;
            const dy = ey - p.y;
            const dx = ex - p.x;
            const coneWidth = 40 + Math.abs(dy) * 0.35;
            if (dy < 0 && Math.abs(dy) < range && Math.abs(dx) < coneWidth) {
              applyDamageToEnemy(enemy, baseDmg, "flamethrower", ex, ey);
              if (lvl >= 3) {
                enemy.burnTimer = 2.0;
                enemy.burnDps = 10;
              }
              if (lvl >= 5) {
                enemy.slowTimer = 1.0;
                enemy.slowFactor = 0.7; // 30% slower
              }
            }
          });
        }
      }

      // --- 8. Seeker Pod (Homing Missiles) ---
      if (state.weapons.seeker_pod >= 1) {
        const lvl = state.weapons.seeker_pod;
        const wt = state.weaponTimers.seeker_pod;
        const cd = lvl >= 4 ? 1400 : lvl >= 2 ? 1800 : 2200;

        if (currentTime - wt.lastFired >= cd && state.enemies.some((e) => !e.isDead)) {
          wt.lastFired = currentTime;
          sound.playMissileLaunch();
          const missileCount = lvl >= 5 ? 4 : lvl >= 3 ? 2 : 1;

          // Find target enemy (prioritize high HP or nearest)
          const liveEnemies = state.enemies.filter((e) => !e.isDead);
          let target = liveEnemies[0];
          liveEnemies.forEach((e) => {
            if (e.hp > target.hp) target = e;
          });

          for (let m = 0; m < missileCount; m++) {
            const angleSpread = ((m - (missileCount - 1) / 2) * 0.25);
            const initialSpeed = 8;
            state.seekerMissiles.push({
              x: p.x + (m - (missileCount - 1) / 2) * 18,
              y: p.y - 18,
              vx: Math.sin(angleSpread) * initialSpeed,
              vy: -Math.cos(angleSpread) * initialSpeed,
              targetId: target.id,
              damage: 55,
              isCluster: lvl >= 5,
              subMunitionsLeft: lvl >= 5 ? 3 : 0,
              lifeTime: 4.5,
              color: "#06b6d4",
            });
          }
        }
      }

      // --- 9. Toxic Mine ---
      if (state.weapons.toxic_mine >= 1) {
        const lvl = state.weapons.toxic_mine;
        const wt = state.weaponTimers.toxic_mine;
        const dropInterval = 2800;

        if (currentTime - wt.lastFired >= dropInterval) {
          wt.lastFired = currentTime;
          const count = lvl >= 3 ? 2 : 1;
          for (let m = 0; m < count; m++) {
            state.toxicMines.push({
              x: p.x + (m === 0 ? -20 : 20),
              y: p.y - 35,
              lifeTimer: lvl >= 2 ? 12 : 8,
              duration: lvl >= 2 ? 12 : 8,
              damage: 35,
              radius: lvl >= 3 ? 48 : 36,
              triggered: false,
              poisonTimer: 0,
              poisonRadius: lvl >= 3 ? 60 : 45,
            });
          }
        }
      }

      // --- 10. Vortex Cannon ---
      if (state.weapons.vortex_cannon >= 1) {
        const lvl = state.weapons.vortex_cannon;
        const wt = state.weaponTimers.vortex_cannon;
        const fireInterval = 3200;

        if (currentTime - wt.lastFired >= fireInterval) {
          wt.lastFired = currentTime;
          const duration = lvl >= 3 ? 3.5 : 2.0;
          const radius = lvl >= 2 ? 80 : 60;
          const dps = lvl >= 4 ? 28 : 15;

          state.vortexes.push({
            x: p.x,
            y: p.y - 40,
            vx: 0,
            vy: -2.2, // Moves slowly upward
            timer: duration,
            duration,
            radius,
            dps,
            isCollapsing: false,
          });
        }
      }

      // ========================================================
      // 4. ENEMY SPAWNING WITH JET FIGHTER UPGRADES
      // ========================================================
      const baseInterval = Math.max(420, 800 - state.survivalTime * 3);
      const spawnInterval = isRushMode ? Math.max(280, baseInterval * 0.6) : baseInterval;
      if (currentTime - state.lastEnemySpawnTime > spawnInterval) {
        state.lastEnemySpawnTime = currentTime;
        const rand = Math.random();
        const spawnX = 40 + Math.random() * (state.canvasWidth - 80);

        if (rand < 0.45) {
          // Scout Jet Fighter (Light & Fast)
          state.enemies.push({
            id: Math.random(),
            x: spawnX,
            y: -30,
            vx: (Math.random() - 0.5) * 1.8,
            vy: 3.5 + Math.random() * 1.8,
            width: 32,
            height: 36,
            hp: 2,
            maxHp: 2,
            type: "scout",
            color: "#e11d48",
            scoreValue: 120,
            lastShootTime: currentTime + Math.random() * 800,
            shootInterval: 1800 + Math.random() * 600,
          });
        } else if (rand < 0.8) {
          // Interceptor Jet Fighter (Medium Twin Cannon)
          state.enemies.push({
            id: Math.random(),
            x: spawnX,
            y: -40,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 2.2 + Math.random() * 1.2,
            width: 42,
            height: 46,
            hp: 4,
            maxHp: 4,
            type: "interceptor",
            color: "#f59e0b",
            scoreValue: 260,
            lastShootTime: currentTime + Math.random() * 600,
            shootInterval: 1400 + Math.random() * 500,
          });
        } else {
          // Elite Battleship Fighter (Heavy Armored)
          state.enemies.push({
            id: Math.random(),
            x: spawnX,
            y: -50,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 1.6 + Math.random() * 1.0,
            width: 52,
            height: 56,
            hp: 8,
            maxHp: 8,
            type: isRushMode ? "elite" : "meteor",
            color: isRushMode ? "#a855f7" : "#0ea5e9",
            scoreValue: 480,
            angle: 0,
            lastShootTime: currentTime + Math.random() * 500,
            shootInterval: 1200 + Math.random() * 400,
          });
        }
      }

      // ========================================================
      // 5. ENEMY SHOOTING MECHANISM (GAMEPLAY DIFFICULTY UP!)
      // ========================================================
      state.enemies.forEach((enemy) => {
        if (enemy.y > 10 && enemy.y < state.canvasHeight - 100) {
          const shootInterval = enemy.shootInterval || 1800;
          if (currentTime - (enemy.lastShootTime || 0) >= shootInterval) {
            enemy.lastShootTime = currentTime;
            sound.playEnemyLaser();

            if (enemy.type === "scout") {
              // Scout fires single aimed red plasma bullet downward
              const dx = p.x - enemy.x;
              const dy = p.y - enemy.y;
              const angle = Math.atan2(dy, dx);
              state.enemyBullets.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                vx: Math.cos(angle) * 5.2,
                vy: Math.sin(angle) * 5.2,
                radius: 4,
                color: "#f43f5e",
                damage: 15,
                isPlayer: false,
              });
            } else if (enemy.type === "interceptor") {
              // Interceptor fires dual angled plasma bolts
              state.enemyBullets.push({
                x: enemy.x + 8,
                y: enemy.y + enemy.height,
                vx: -1.2,
                vy: 5.5,
                radius: 4.5,
                color: "#fb923c",
                damage: 18,
                isPlayer: false,
              });
              state.enemyBullets.push({
                x: enemy.x + enemy.width - 8,
                y: enemy.y + enemy.height,
                vx: 1.2,
                vy: 5.5,
                radius: 4.5,
                color: "#fb923c",
                damage: 18,
                isPlayer: false,
              });
            } else {
              // Elite fires 3-way spread purple energy barrage
              [-1.8, 0, 1.8].forEach((spreadVx) => {
                state.enemyBullets.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height,
                  vx: spreadVx,
                  vy: 5.0,
                  radius: 5,
                  color: "#c084fc",
                  damage: 22,
                  isPlayer: false,
                });
              });
            }
          }
        }
      });

      // ========================================================
      // 6. UPDATE BULLETS & COLLISION DETECTION
      // ========================================================

      // 6A. Player Bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.y < -20 || b.y > state.canvasHeight + 20 || b.x < -20 || b.x > state.canvasWidth + 20) {
          state.bullets.splice(i, 1);
          continue;
        }

        // Collision with Enemies
        let hit = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const enemy = state.enemies[j];
          if (
            b.x > enemy.x &&
            b.x < enemy.x + enemy.width &&
            b.y > enemy.y &&
            b.y < enemy.y + enemy.height
          ) {
            hit = true;
            state.shotsHit += 1;

            // Damage calculation with vulnerability and unified dispatcher
            applyDamageToEnemy(enemy, b.damage, b.sourceWeapon, b.x, b.y);
            createExplosion(b.x, b.y, "#fde047", 3);

            // Assault Rifle frenzy tracking
            if (b.sourceWeapon === "assault_rifle") {
              if (p.lastHitTargetId === enemy.id) {
                p.frenzyHitsOnTarget += 1;
              } else {
                p.lastHitTargetId = enemy.id;
                p.frenzyHitsOnTarget = 1;
              }
            }

            // Scatter Shotgun knockback & Lv.5 vulnerability effect
            if (b.sourceWeapon === "scatter_shotgun") {
              enemy.y -= 10;
              if (state.weapons.scatter_shotgun >= 5) {
                enemy.vulnerabilityTimer = 3.0;
              }
            }

            // Explosive blast (Pulse Pistol Lv.5)
            if (b.isExplosive && b.explosionRadius) {
              createExplosion(b.x, b.y, "#f59e0b", 16);
              state.enemies.forEach((other) => {
                if (other !== enemy && !other.isDead) {
                  const dist = Math.sqrt((other.x + other.width / 2 - b.x) ** 2 + (other.y + other.height / 2 - b.y) ** 2);
                  if (dist < b.explosionRadius!) {
                    applyDamageToEnemy(other, b.damage * 0.8, b.sourceWeapon, b.x, b.y);
                  }
                }
              });
            }

            // Piercing check
            if (b.pierce && b.pierce > 0) {
              b.pierce -= 1;
            } else {
              state.bullets.splice(i, 1);
            }

            if (enemy.isDead) {
              state.enemies.splice(j, 1);
            }
            break;
          }
        }
      }

      // 6B. Enemy Bullets vs Player
      for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const eb = state.enemyBullets[i];
        eb.x += eb.vx;
        eb.y += eb.vy;

        if (eb.y > state.canvasHeight + 20 || eb.x < -20 || eb.x > state.canvasWidth + 20) {
          state.enemyBullets.splice(i, 1);
          continue;
        }

        // Collision with Player
        const pDistSq = (p.x - eb.x) ** 2 + (p.y - eb.y) ** 2;
        if (pDistSq < (24 + eb.radius) ** 2) {
          state.enemyBullets.splice(i, 1);
          if (p.invulnerableTimer <= 0) {
            sound.playShieldHit();
            p.hp = Math.max(0, p.hp - eb.damage);
            p.invulnerableTimer = 0.35; // Brief invincibility frames
            state.combo = 0; // Bullet hit breaks combo
            state.shake = 12;

            // Score penalty
            state.score = Math.max(0, state.score - 80);

            createExplosion(p.x, p.y, "#f43f5e", 10);
            state.floatingTexts.push({
              id: Math.random(),
              x: p.x - 20,
              y: p.y - 30,
              text: `HIT! -${eb.damage} HP`,
              color: "#f43f5e",
              alpha: 1,
              vy: -1.8,
            });

            setPlayerHp(p.hp);

            // If HP hits 0 -> GAME OVER / DEATH!
            if (p.hp <= 0) {
              triggerDeathGameOver();
              return;
            }
          }
        }
      }

      // 6C. Seeker Missiles update
      for (let i = state.seekerMissiles.length - 1; i >= 0; i--) {
        const m = state.seekerMissiles[i];
        m.lifeTime -= dt;

        // Find or acquire alive target
        let target = state.enemies.find((e) => e.id === m.targetId && !e.isDead);
        if (!target) {
          const liveEnemies = state.enemies.filter((e) => !e.isDead);
          if (liveEnemies.length > 0) {
            let closestDist = Infinity;
            liveEnemies.forEach((e) => {
              const d = Math.hypot((e.x + e.width / 2) - m.x, (e.y + e.height / 2) - m.y);
              if (d < closestDist) {
                closestDist = d;
                target = e;
              }
            });
            if (target) {
              m.targetId = target.id;
            }
          }
        }

        if (target) {
          const targetX = target.x + target.width / 2;
          const targetY = target.y + target.height / 2;
          const mdx = targetX - m.x;
          const mdy = targetY - m.y;
          const targetAngle = Math.atan2(mdy, mdx);
          const currentAngle = Math.atan2(m.vy, m.vx);

          let diff = targetAngle - currentAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          const turnRate = state.weapons.seeker_pod >= 2 ? 0.28 : 0.20;
          const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
          const missileSpeed = 10.5;
          m.vx = Math.cos(newAngle) * missileSpeed;
          m.vy = Math.sin(newAngle) * missileSpeed;
        }

        m.x += m.vx;
        m.y += m.vy;

        // Smoke trail
        if (Math.random() < 0.6) {
          state.particles.push({
            x: m.x,
            y: m.y,
            vx: -m.vx * 0.15,
            vy: -m.vy * 0.15,
            size: 2.8,
            color: "#67e8f9",
            alpha: 0.7,
            decay: 0.05,
          });
        }

        // Check impact against ANY enemy in proximity
        let hitEnemy: Enemy | null = null;
        for (const e of state.enemies) {
          if (e.isDead) continue;
          const ex = e.x + e.width / 2;
          const ey = e.y + e.height / 2;
          const hitRadius = Math.max(e.width, e.height) / 2 + 12;
          if (Math.hypot(ex - m.x, ey - m.y) < hitRadius) {
            hitEnemy = e;
            break;
          }
        }

        if (hitEnemy) {
          // Direct hit damage
          applyDamageToEnemy(hitEnemy, m.damage, "seeker_pod", m.x, m.y);
          createExplosion(m.x, m.y, "#06b6d4", 18);
          sound.playExplosion(false);

          // AoE splash to nearby enemies (55px radius)
          state.enemies.forEach((other) => {
            if (other !== hitEnemy && !other.isDead) {
              const d = Math.hypot((other.x + other.width / 2) - m.x, (other.y + other.height / 2) - m.y);
              if (d < 55) {
                applyDamageToEnemy(other, m.damage * 0.6, "seeker_pod", m.x, m.y);
              }
            }
          });

          // Cluster submunitions (Lv.5)
          if (m.isCluster && m.subMunitionsLeft && m.subMunitionsLeft > 0) {
            for (let sm = 0; sm < 3; sm++) {
              const smAngle = -Math.PI / 2 + (sm - 1) * 0.6;
              state.bullets.push({
                x: m.x,
                y: m.y,
                vx: Math.cos(smAngle) * 7.5,
                vy: Math.sin(smAngle) * 7.5,
                radius: 3.5,
                color: "#22d3ee",
                damage: 25,
                isPlayer: true,
                sourceWeapon: "seeker_pod",
              });
            }
          }

          state.seekerMissiles.splice(i, 1);
          continue;
        }

        if (m.lifeTime <= 0 || m.y < -50 || m.y > state.canvasHeight + 50 || m.x < -50 || m.x > state.canvasWidth + 50) {
          state.seekerMissiles.splice(i, 1);
        }
      }

      // 6D. Toxic Mines update
      for (let i = state.toxicMines.length - 1; i >= 0; i--) {
        const mine = state.toxicMines[i];
        mine.lifeTimer -= dt;

        if (!mine.triggered) {
          // Check proximity to alive enemies
          for (const enemy of state.enemies) {
            if (enemy.isDead) continue;
            const edist = Math.hypot((enemy.x + enemy.width / 2) - mine.x, (enemy.y + enemy.height / 2) - mine.y);
            if (edist < mine.radius) {
              mine.triggered = true;
              mine.poisonTimer = state.weapons.toxic_mine >= 5 ? 4.5 : 2.5;
              // Immediate burst detonation damage
              applyDamageToEnemy(enemy, mine.damage, "toxic_mine", mine.x, mine.y);
              createExplosion(mine.x, mine.y, "#84cc16", 16);
              break;
            }
          }
        } else {
          // Poison cloud active
          mine.poisonTimer -= dt;
          if (Math.random() < 0.4) {
            state.particles.push({
              x: mine.x + (Math.random() - 0.5) * mine.poisonRadius,
              y: mine.y + (Math.random() - 0.5) * mine.poisonRadius,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -Math.random() * 2,
              size: Math.random() * 4 + 2,
              color: "#a3e635",
              alpha: 0.7,
              decay: 0.05,
            });
          }

          state.enemies.forEach((enemy) => {
            if (enemy.isDead) return;
            const edist = Math.hypot((enemy.x + enemy.width / 2) - mine.x, (enemy.y + enemy.height / 2) - mine.y);
            if (edist < mine.poisonRadius) {
              const poisonDps = state.weapons.toxic_mine >= 2 ? 50 : 35;
              applyDamageToEnemy(enemy, poisonDps * dt, "toxic_mine", enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
              if (state.weapons.toxic_mine >= 4) {
                enemy.slowTimer = 0.5;
                enemy.slowFactor = 0.55; // 45% slower
              }
            }
          });

          if (mine.poisonTimer <= 0) {
            state.toxicMines.splice(i, 1);
            continue;
          }
        }

        if (mine.lifeTimer <= 0) {
          state.toxicMines.splice(i, 1);
        }
      }

      // 6E. Vortex Cannons update
      for (let i = state.vortexes.length - 1; i >= 0; i--) {
        const v = state.vortexes[i];
        v.timer -= dt;
        v.x += v.vx;
        v.y += v.vy;

        // Pull enemies & deal gravitational tearing DPS
        state.enemies.forEach((enemy) => {
          if (enemy.isDead) return;
          if (enemy.type !== "meteor" || state.weapons.vortex_cannon >= 3) {
            const vdx = v.x - (enemy.x + enemy.width / 2);
            const vdy = v.y - (enemy.y + enemy.height / 2);
            const dist = Math.sqrt(vdx * vdx + vdy * vdy);
            if (dist < v.radius) {
              const pullStr = state.weapons.vortex_cannon >= 2 ? 4.5 : 3.0;
              enemy.x += (vdx / dist) * pullStr;
              enemy.y += (vdy / dist) * pullStr;
              applyDamageToEnemy(enemy, v.dps * dt, "vortex_cannon", v.x, v.y);
            }
          }
        });

        // Singularity Collapse (Lv.5)
        if (v.timer <= 0) {
          if (state.weapons.vortex_cannon >= 5) {
            createExplosion(v.x, v.y, "#c084fc", 28);
            sound.playEmp();
            state.enemies.forEach((enemy) => {
              if (enemy.isDead) return;
              const dist = Math.sqrt((enemy.x - v.x) ** 2 + (enemy.y - v.y) ** 2);
              if (dist < 150) {
                applyDamageToEnemy(enemy, 250, "vortex_cannon", v.x, v.y);
              }
            });
          }
          state.vortexes.splice(i, 1);
        }
      }

      // 6F. Ion Beams update
      for (let i = state.ionBeams.length - 1; i >= 0; i--) {
        const ib = state.ionBeams[i];
        ib.timer -= dt;

        state.enemies.forEach((enemy) => {
          if (enemy.isDead) return;
          if (Math.abs(enemy.x + enemy.width / 2 - ib.x1) < 28) {
            applyDamageToEnemy(enemy, ib.dps * dt, "charged_sniper", ib.x1, enemy.y + enemy.height / 2);
          }
        });

        if (ib.timer <= 0) {
          state.ionBeams.splice(i, 1);
        }
      }

      // 6G. Tesla Arcs update
      for (let i = state.teslaArcs.length - 1; i >= 0; i--) {
        state.teslaArcs[i].timer -= dt;
        if (state.teslaArcs[i].timer <= 0) {
          state.teslaArcs.splice(i, 1);
        }
      }

      // 7. Update Enemies & Status Timers
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];

        // Check if enemy died from previous weapons/DoT
        if (enemy.hp <= 0 || enemy.isDead) {
          if (!enemy.isDead) {
            destroyEnemy(enemy);
          }
          state.enemies.splice(i, 1);
          continue;
        }

        let moveSpeedY = enemy.vy;
        let moveSpeedX = enemy.vx;

        // Slow effect
        if (enemy.slowTimer && enemy.slowTimer > 0) {
          enemy.slowTimer -= dt;
          const factor = enemy.slowFactor || 0.7;
          moveSpeedY *= factor;
          moveSpeedX *= factor;
        }

        enemy.x += moveSpeedX;
        enemy.y += moveSpeedY;

        // Burn DoT
        if (enemy.burnTimer && enemy.burnTimer > 0) {
          enemy.burnTimer -= dt;
          applyDamageToEnemy(enemy, (enemy.burnDps || 8) * dt, "flamethrower", enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
          if (Math.random() < 0.25) {
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#f43f5e", 1);
          }
        }

        // Vulnerability timer
        if (enemy.vulnerabilityTimer && enemy.vulnerabilityTimer > 0) {
          enemy.vulnerabilityTimer -= dt;
        }

        // Post-DoT death check
        if (enemy.hp <= 0 || enemy.isDead) {
          if (!enemy.isDead) {
            destroyEnemy(enemy);
          }
          state.enemies.splice(i, 1);
          continue;
        }

        // Leaves bottom of screen
        if (enemy.y > state.canvasHeight + 60) {
          state.enemies.splice(i, 1);
          state.combo = 0;
          continue;
        }

        // Crash collision with player
        const distSq = (p.x - (enemy.x + enemy.width / 2)) ** 2 + (p.y - (enemy.y + enemy.height / 2)) ** 2;
        if (distSq < (28 + enemy.width / 2) ** 2) {
          createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#f43f5e", 20);
          state.enemies.splice(i, 1);
          state.combo = 0;
          state.shake = 14;

          p.hp = Math.max(0, p.hp - 25);
          setPlayerHp(p.hp);

          state.floatingTexts.push({
            id: Math.random(),
            x: p.x - 20,
            y: p.y - 30,
            text: "CRASH! -25 HP",
            color: "#f43f5e",
            alpha: 1,
            vy: -1.8,
          });

          state.score = Math.max(0, state.score - 120);

          // If HP hits 0 -> GAME OVER / DEATH!
          if (p.hp <= 0) {
            triggerDeathGameOver();
            return;
          }
        }
      }

      // 8. Update Powerups
      for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const pu = state.powerUps[i];
        pu.y += pu.vy;

        const dx = p.x - pu.x;
        const dy = p.y - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          pu.x += (dx / dist) * 6;
          pu.y += (dy / dist) * 6;
        }

        if (dist < 32) {
          if (pu.type === "heal") {
            p.hp = Math.min(p.maxHp, p.hp + 25);
            setPlayerHp(p.hp);
            sound.playPowerUp();
            createExplosion(pu.x, pu.y, "#10b981", 14);
            state.floatingTexts.push({
              id: Math.random(),
              x: pu.x,
              y: pu.y,
              text: "+25 HP 修復!",
              color: "#10b981",
              alpha: 1,
              vy: -2,
            });
          } else {
            sound.playScoreGem();
            state.score += 200;
            state.floatingTexts.push({
              id: Math.random(),
              x: pu.x,
              y: pu.y,
              text: "+200 GEM!",
              color: "#fbbf24",
              alpha: 1,
              vy: -2,
            });
            createExplosion(pu.x, pu.y, "#fbbf24", 8);
          }
          state.powerUps.splice(i, 1);
          continue;
        }

        if (pu.y > state.canvasHeight + 20) {
          state.powerUps.splice(i, 1);
        }
      }

      // 9. Update Particles & Floating Texts
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0) {
          state.particles.splice(i, 1);
        }
      }

      for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.025;
        if (ft.alpha <= 0) {
          state.floatingTexts.splice(i, 1);
        }
      }

      // Shake decay
      if (state.shake > 0) {
        state.shake *= 0.88;
        if (state.shake < 0.5) state.shake = 0;
      }

      setScore(state.score);
      setCombo(state.combo);

      // ==========================================
      // 10. RENDER CANVAS SCENE
      // ==========================================
      ctx.save();

      // Screen shake
      if (state.shake > 0) {
        const shakeX = (Math.random() - 0.5) * state.shake;
        const shakeY = (Math.random() - 0.5) * state.shake;
        ctx.translate(shakeX, shakeY);
      }

      // Cosmic Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, state.canvasHeight);
      if (isRushMode) {
        bgGrad.addColorStop(0, "#1e112a");
        bgGrad.addColorStop(1, "#0f0717");
      } else {
        bgGrad.addColorStop(0, "#090d16");
        bgGrad.addColorStop(1, "#030712");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

      // Starfield
      state.stars.forEach((star) => {
        star.y += star.speed * (isRushMode ? 2.5 : 1);
        if (star.y > state.canvasHeight) {
          star.y = 0;
          star.x = Math.random() * state.canvasWidth;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size * (isRushMode ? 2 : 1));
      });

      // Cyber grid lines
      ctx.strokeStyle = isRushMode ? "rgba(244, 63, 94, 0.06)" : "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < state.canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.canvasHeight);
        ctx.stroke();
      }

      // Render Toxic Mines & Clouds
      state.toxicMines.forEach((mine) => {
        ctx.save();
        if (mine.triggered) {
          // Poison cloud
          ctx.fillStyle = "rgba(132, 204, 22, 0.25)";
          ctx.beginPath();
          ctx.arc(mine.x, mine.y, mine.poisonRadius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Mine pod
          ctx.fillStyle = "#84cc16";
          ctx.shadowColor = "#84cc16";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(mine.x, mine.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Render Vortexes
      state.vortexes.forEach((v) => {
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(currentTime * 0.005);
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(192, 132, 252, 0.3)";
        ctx.beginPath();
        ctx.arc(0, 0, v.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Ion Beams
      state.ionBeams.forEach((ib) => {
        ctx.save();
        ctx.strokeStyle = "rgba(129, 140, 248, 0.7)";
        ctx.lineWidth = 6;
        ctx.shadowColor = "#818cf8";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(ib.x1, ib.y1);
        ctx.lineTo(ib.x2, ib.y2);
        ctx.stroke();
        ctx.restore();
      });

      // Render Tesla Lightning Arcs
      state.teslaArcs.forEach((arc) => {
        ctx.save();
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#d8b4fe";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(arc.x1, arc.y1);
        const midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 16;
        const midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 16;
        ctx.lineTo(midX, midY);
        ctx.lineTo(arc.x2, arc.y2);
        ctx.stroke();
        ctx.restore();
      });

      // Render PowerUp Items
      state.powerUps.forEach((pu) => {
        ctx.save();
        ctx.translate(pu.x, pu.y);
        if (pu.type === "heal") {
          // Green Glowing Repair Core
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 14;
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
          ctx.fill();
          // White Cross
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-2.5, -7, 5, 14);
          ctx.fillRect(-7, -2.5, 14, 5);
        } else {
          // Gold Score Gem
          ctx.rotate(currentTime * 0.004);
          ctx.fillStyle = "#fbbf24";
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(0, -pu.radius);
          ctx.lineTo(pu.radius, 0);
          ctx.lineTo(0, pu.radius);
          ctx.lineTo(-pu.radius, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      // Render Player Bullets
      state.bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Seeker Missiles
      state.seekerMissiles.forEach((m) => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI / 2);
        // Thruster flame
        ctx.fillStyle = "#f59e0b";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 8;
        ctx.fillRect(-1.5, 6, 3, 5);
        // Missile fuselage
        ctx.fillStyle = m.color;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-2.5, -6, 5, 12);
        // Warhead tip
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(-2.5, -6);
        ctx.lineTo(2.5, -6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Render Enemy Bullets (Glowing Crimson / Amber orbs)
      state.enemyBullets.forEach((eb) => {
        ctx.save();
        ctx.fillStyle = eb.color;
        ctx.shadowColor = eb.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ========================================================
      // 11. RENDER ENEMY FIGHTERS (MATCHING JET-FIGHTER-UP SVG)
      // ========================================================
      state.enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

        if (enemy.angle !== undefined) {
          ctx.rotate(enemy.angle);
        }

        // Draw Supersonic Jet Fighter (FontAwesome jet-fighter-up delta design pointing downward)
        const w = enemy.width;
        const h = enemy.height;

        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 12;

        // Twin Engine Afterburner Exhaust Plumes (Pulsing at tail)
        const plumeLength = 6 + Math.sin(currentTime * 0.02 + enemy.id) * 3;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.ellipse(-w * 0.16, -h * 0.46, 2.5, plumeLength, 0, 0, Math.PI * 2);
        ctx.ellipse(w * 0.16, -h * 0.46, 2.5, plumeLength, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fighter Fuselage & Delta Wings
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        // Nose radome cone pointed downwards (+y direction of attack)
        ctx.moveTo(0, h * 0.52);
        // Right forward strake
        ctx.lineTo(w * 0.22, h * 0.16);
        // Right wing leading edge to wingtip
        ctx.lineTo(w * 0.52, -h * 0.08);
        // Right wingtip missile rail
        ctx.lineTo(w * 0.52, -h * 0.22);
        // Right trailing edge notch
        ctx.lineTo(w * 0.24, -h * 0.38);
        // Right engine nozzle
        ctx.lineTo(w * 0.14, -h * 0.48);
        // Rear fuselage center cleft
        ctx.lineTo(0, -h * 0.4);
        // Left engine nozzle
        ctx.lineTo(-w * 0.14, -h * 0.48);
        // Left trailing edge notch
        ctx.lineTo(-w * 0.24, -h * 0.38);
        // Left wingtip missile rail
        ctx.lineTo(-w * 0.52, -h * 0.22);
        // Left wing leading edge
        ctx.lineTo(-w * 0.52, -h * 0.08);
        // Left forward strake
        ctx.lineTo(-w * 0.22, h * 0.16);
        ctx.closePath();
        ctx.fill();

        // Twin vertical stabilizers (tail fins)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-w * 0.2, -h * 0.42, 3, 10);
        ctx.fillRect(w * 0.2 - 3, -h * 0.42, 3, 10);

        // Cockpit glass canopy
        ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, h * 0.08, 4, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // HP bar above enemy if wounded
        if (enemy.hp < enemy.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(-w / 2, -h / 2 - 10, w, 4);
          ctx.fillStyle = enemy.hp / enemy.maxHp > 0.4 ? "#22c55e" : "#ef4444";
          ctx.fillRect(-w / 2, -h / 2 - 10, (w * Math.max(0, enemy.hp)) / enemy.maxHp, 4);
        }

        ctx.restore();
      });

      // Render Particles
      state.particles.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ========================================================
      // 12. RENDER PLAYER FIGHTER WITH SEAT NUMBER 107-01
      // ========================================================
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.tilt * Math.PI) / 180);

      // Flickering if invincible
      if (p.invulnerableTimer > 0 && Math.floor(currentTime / 50) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      // Orbiting Blades
      if (state.weapons.orbiting_blades >= 1) {
        const lvl = state.weapons.orbiting_blades;
        const wt = state.weaponTimers.orbiting_blades;
        const bladeCount = lvl === 1 ? 1 : lvl === 2 ? 2 : lvl === 3 ? 3 : 4;
        const radius = lvl >= 3 ? 62 : 48;

        for (let b = 0; b < bladeCount; b++) {
          const bAngle = wt.angle + (b / bladeCount) * Math.PI * 2;
          const bx = Math.cos(bAngle) * radius;
          const by = Math.sin(bAngle) * radius;

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(bAngle + Math.PI / 2);
          ctx.fillStyle = "#10b981";
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(4, 0);
          ctx.lineTo(0, 12);
          ctx.lineTo(-4, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Holographic Orbit HUD Ring with Seat Number
      ctx.save();
      ctx.strokeStyle = isRushMode ? "rgba(244, 63, 94, 0.45)" : "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Top Floating Hologram Tag (座號 107-01)
      ctx.save();
      ctx.fillStyle = isRushMode ? "#fda4af" : "#bae6fd";
      ctx.shadowColor = isRushMode ? "#f43f5e" : "#0284c7";
      ctx.shadowBlur = 8;
      ctx.font = "bold 11px 'Chakra Petch', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`NO. ${playerId}`, 0, -44);
      ctx.restore();

      // High-Tech Delta Fighter Wings & Fuselage
      const mainColor = isRushMode ? "#e11d48" : "#0284c7";
      const edgeColor = isRushMode ? "#fb7185" : "#38bdf8";

      // Wings
      ctx.shadowColor = edgeColor;
      ctx.shadowBlur = 14;
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(0, -28); // Nose
      ctx.lineTo(26, 18); // Right wing tip
      ctx.lineTo(14, 18);
      ctx.lineTo(10, 24); // Right thruster
      ctx.lineTo(-10, 24); // Left thruster
      ctx.lineTo(-14, 18);
      ctx.lineTo(-26, 18); // Left wing tip
      ctx.closePath();
      ctx.fill();

      // Inner Wing Lining
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cockpit Glass Canopy
      ctx.fillStyle = "#ecfeff";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, -6, 5, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // SEAT NUMBER Stenciled on Aircraft Center
      ctx.save();
      ctx.font = `900 10px 'Orbitron', sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(playerId, 0, 10);
      ctx.restore();

      ctx.restore(); // End Player Transform

      // Floating Texts
      state.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = "bold 13px 'Chakra Petch', sans-serif";
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // HUD Overlay: Red Flash Vignette on Last 5 Seconds
      if (isRushMode) {
        const pulse = 0.15 + Math.sin(currentTime * 0.015) * 0.12;
        ctx.fillStyle = `rgba(225, 29, 72, ${pulse})`;
        ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playerId, onGameOver, triggerEmp, isRushMode, openUpgradePrompt]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
      canvasRef.current.style.width = `${w}px`;
      canvasRef.current.style.height = `${h}px`;

      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      stateRef.current.canvasWidth = w;
      stateRef.current.canvasHeight = h;
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Mouse & Touch Pointer Listeners
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || stateRef.current.isPausedForUpgrade) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    stateRef.current.player.targetX = x;
    stateRef.current.player.targetY = y;
  };

  const minutes = Math.floor(survivalTime / 60);
  const seconds = (survivalTime % 60).toFixed(1);
  const formattedSurvival = minutes > 0 ? `${minutes}分 ${seconds}秒` : `${seconds}秒`;

  return (
    <div
      ref={containerRef}
      id="game-canvas-container"
      onPointerMove={handlePointerMove}
      className="relative w-full h-full min-h-[540px] max-h-[740px] rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/20 shadow-2xl select-none touch-none cursor-crosshair flex items-center justify-center"
    >
      {/* HTML5 Game Canvas */}
      <canvas ref={canvasRef} id="shooter-canvas" className="w-full h-full block" />

      {/* Top High-Tech HUD Bar */}
      <div
        id="game-hud-top"
        className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10"
      >
        {/* Left: Player Seat Tag, Score & HP */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-950/40">
            <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <div className="text-[10px] uppercase font-mono text-cyan-400/80 leading-none">機身編號</div>
              <div className="text-sm font-black font-['Orbitron'] text-white">NO. {playerId}</div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/50">
            <div className="text-[10px] uppercase font-mono text-slate-400 leading-none">得分 SCORE</div>
            <div className="text-lg font-black font-['Orbitron'] text-cyan-400">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Player HP Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-rose-500/40 shadow-lg shadow-rose-950/30">
            <Heart className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400 leading-none">裝甲 HULL</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-14 sm:w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-200 ${
                      playerHp > 60
                        ? "bg-emerald-400"
                        : playerHp > 25
                        ? "bg-amber-400"
                        : "bg-rose-500 animate-pulse"
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, playerHp))}%` }}
                  />
                </div>
                <span className="text-xs font-black font-['Orbitron'] text-white">
                  {playerHp}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Unlimited Survival Time Meter */}
        <div
          id="hud-timer-widget"
          className={`flex items-center gap-2.5 px-4 py-1.5 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
            isRushMode
              ? "bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-600/50 scale-105"
              : "bg-slate-900/80 border-cyan-500/40 shadow-lg shadow-cyan-950/40"
          }`}
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/50 animate-[spin_6s_linear_infinite]" />
            <ShieldAlert
              className={`w-4 h-4 ${
                isRushMode ? "text-rose-400 animate-ping" : "text-cyan-400"
              }`}
            />
          </div>

          <div>
            <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase leading-none flex items-center gap-1.5">
              <span>{isRushMode ? "暴走突襲 RUSH" : "極限生存時間"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div
              className={`text-xl font-black font-['Orbitron'] tracking-wider ${
                isRushMode ? "text-rose-400 animate-pulse" : "text-white"
              }`}
            >
              {formattedSurvival}
            </div>
          </div>
        </div>

        {/* Right: Combo & EMP Ready */}
        <div className="flex items-center gap-2">
          {combo > 1 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 backdrop-blur-md animate-bounce">
              <div className="text-[10px] font-mono text-amber-400 uppercase leading-none">連擊 COMBO</div>
              <div className="text-base font-black font-['Orbitron'] text-amber-300">{combo}x</div>
            </div>
          )}

          <button
            id="emp-ability-btn"
            onClick={triggerEmp}
            disabled={!empReady}
            className={`pointer-events-auto px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold font-['Chakra_Petch'] text-xs uppercase tracking-wider transition-all duration-200 ${
              empReady
                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/40 active:scale-95 cursor-pointer"
                : "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>EMP {empReady ? "[E鍵/點擊]" : "冷卻中"}</span>
          </button>
        </div>
      </div>

      {/* Active Weapon Arsenal Badges */}
      <div
        id="hud-weapon-arsenal"
        className="absolute top-16 inset-x-3 flex flex-wrap items-center gap-1.5 pointer-events-none z-10"
      >
        {(Object.keys(equippedWeapons) as WeaponId[]).map((wId) => {
          const lvl = equippedWeapons[wId];
          if (lvl <= 0) return null;
          const def = WEAPONS_CATALOG[wId];

          return (
            <div
              key={wId}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/85 border backdrop-blur-md text-[10px] font-mono font-bold"
              style={{
                borderColor: `${def.color}60`,
                color: def.color,
              }}
            >
              <span>{def.name}</span>
              <span className="px-1 rounded bg-slate-900 text-white">Lv.{lvl}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom Controls Helper */}
      <div
        id="hud-controls-helper"
        className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none px-3 py-1 bg-slate-950/70 rounded-xl backdrop-blur-sm border border-slate-800/40"
      >
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          極限生存模式（無限時間直到死亡） • 敵機會發射彈幕，拾取綠色十字急救包修復裝甲！
        </span>
        <span className="hidden sm:inline-block text-cyan-400 font-semibold">
          Created by 107-01_王禹硯
        </span>
      </div>

      {/* Weapon Upgrade Selection Modal */}
      <WeaponUpgradeModal
        isOpen={isUpgradeModalOpen}
        options={upgradeOptions}
        onSelect={handleSelectUpgrade}
        kills={currentKills}
      />
    </div>
  );
};
