import React, { useEffect, useRef, useState, useCallback } from "react";
import { Bullet, Enemy, FloatingText, GameStats, Particle, PowerUp } from "../types";
import { sound } from "../utils/audio";
import { Zap, ShieldAlert, Crosshair, Sparkles } from "lucide-react";

interface ShooterCanvasProps {
  playerId: string;
  onGameOver: (stats: GameStats) => void;
  isAudioMuted: boolean;
}

export const ShooterCanvas: React.FC<ShooterCanvasProps> = ({
  playerId,
  onGameOver,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game active states
  const [timeLeft, setTimeLeft] = useState<number>(20.0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [empReady, setEmpReady] = useState<boolean>(true);
  const [isRushMode, setIsRushMode] = useState<boolean>(false);

  // Mutable game state held in ref for 60fps loop performance
  const stateRef = useRef({
    isPlaying: true,
    timeLeft: 20.0,
    score: 0,
    kills: 0,
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
      invulnerable: 0,
    },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    powerUps: [] as PowerUp[],
    stars: [] as { x: number; y: number; size: number; speed: number; alpha: number }[],
    keys: {} as Record<string, boolean>,
    lastShotTime: 0,
    lastEnemySpawnTime: 0,
    lastWarningSecond: -1,
    canvasWidth: 600,
    canvasHeight: 700,
    shake: 0,
  });

  // Handle player inputs (Mouse/Touch + Keyboard)
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
    if (!state.empReady || !state.isPlaying) return;

    state.empReady = false;
    setEmpReady(false);
    sound.playEmp();
    state.shake = 18;

    // Convert all enemies on screen to score crystals & massive explosion
    state.enemies.forEach((enemy) => {
      const addedScore = enemy.scoreValue * 2;
      state.score += addedScore;
      state.kills += 1;

      // Explosion particles
      createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#38bdf8", 25);

      // Add floating score
      state.floatingTexts.push({
        id: Math.random(),
        x: enemy.x,
        y: enemy.y,
        text: `EMP +${addedScore}`,
        color: "#38bdf8",
        alpha: 1,
        vy: -2,
      });

      // Spawn guaranteed powerup
      state.powerUps.push({
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        vy: 2.5,
        type: "score",
        radius: 12,
      });
    });

    state.enemies = [];
    state.bullets = state.bullets.filter((b) => b.isPlayer); // Clear enemy bullets

    // Flash ring particle effect
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = 7 + Math.random() * 5;
      state.particles.push({
        x: state.player.x,
        y: state.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: "#38bdf8",
        alpha: 1,
        decay: 0.03,
      });
    }

    setScore(state.score);
  }, []);

  const createExplosion = (x: number, y: number, color: string, count = 15) => {
    const state = stateRef.current;
    sound.playExplosion(count > 20);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5.5;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color,
        alpha: 1,
        decay: 0.025 + Math.random() * 0.03,
      });
    }
  };

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;
    state.isPlaying = true;
    state.timeLeft = 20.0;
    state.score = 0;
    state.kills = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.empReady = true;
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.floatingTexts = [];
    state.powerUps = [];

    // Initialize starry sky
    state.stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * (canvas.width || 600),
      y: Math.random() * (canvas.height || 700),
      size: Math.random() * 2 + 0.8,
      speed: Math.random() * 2 + 1.2,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    let animationFrameId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      if (!state.isPlaying) return;

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // 1. Update 20s Countdown Timer
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.isPlaying = false;
        setTimeLeft(0);
        sound.playGameOver();

        // Calculate final stats and trigger settlement
        const accuracy = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
        onGameOver({
          score: state.score,
          kills: state.kills,
          shotsFired: state.shotsFired,
          shotsHit: state.shotsHit,
          maxCombo: state.maxCombo,
          accuracy,
          durationSeconds: 20,
          playerId,
        });
        return;
      }

      setTimeLeft(Math.max(0, state.timeLeft));

      // Warning sound on each second during final 5 seconds rush
      const currentSecFloor = Math.ceil(state.timeLeft);
      if (state.timeLeft <= 5.0 && currentSecFloor !== state.lastWarningSecond) {
        state.lastWarningSecond = currentSecFloor;
        sound.playWarning();
        setIsRushMode(true);
      } else if (state.timeLeft > 5.0 && isRushMode) {
        setIsRushMode(false);
      }

      // 2. Keyboard Controls
      const p = state.player;
      const speed = p.speed;
      let dx = 0;
      let dy = 0;
      if (state.keys["arrowleft"] || state.keys["a"]) dx -= 1;
      if (state.keys["arrowright"] || state.keys["d"]) dx += 1;
      if (state.keys["arrowup"] || state.keys["w"]) dy -= 1;
      if (state.keys["arrowdown"] || state.keys["s"]) dy += 1;

      if (dx !== 0 || dy !== 0) {
        p.targetX += dx * speed;
        p.targetY += dy * speed;
      }

      // Clamp target within canvas boundaries
      p.targetX = Math.max(30, Math.min(state.canvasWidth - 30, p.targetX));
      p.targetY = Math.max(40, Math.min(state.canvasHeight - 40, p.targetY));

      // Smooth lerp movement and banking tilt
      const prevX = p.x;
      p.x += (p.targetX - p.x) * 0.25;
      p.y += (p.targetY - p.y) * 0.25;
      p.tilt = (p.x - prevX) * 1.5;

      // 3. Engine Thruster Particles
      if (Math.random() < 0.75) {
        state.particles.push({
          x: p.x - 10 + (Math.random() * 4 - 2),
          y: p.y + 24,
          vx: Math.random() * 1 - 0.5,
          vy: 4 + Math.random() * 3,
          size: 3.5,
          color: isRushMode ? "#f43f5e" : "#06b6d4",
          alpha: 0.9,
          decay: 0.05,
        });
        state.particles.push({
          x: p.x + 10 + (Math.random() * 4 - 2),
          y: p.y + 24,
          vx: Math.random() * 1 - 0.5,
          vy: 4 + Math.random() * 3,
          size: 3.5,
          color: isRushMode ? "#f43f5e" : "#06b6d4",
          alpha: 0.9,
          decay: 0.05,
        });
      }

      // 4. Player Auto-Shooting (Rapid Pulse)
      const fireInterval = isRushMode ? 100 : 130;
      if (currentTime - state.lastShotTime >= fireInterval) {
        state.lastShotTime = currentTime;
        sound.playLaser();
        state.shotsFired += 2;

        // Dual Plasma Cannons
        state.bullets.push({
          x: p.x - 14,
          y: p.y - 12,
          vx: -0.5,
          vy: -14,
          radius: 3.5,
          color: isRushMode ? "#fb7185" : "#38bdf8",
          damage: isRushMode ? 1.5 : 1,
          isPlayer: true,
        });
        state.bullets.push({
          x: p.x + 14,
          y: p.y - 12,
          vx: 0.5,
          vy: -14,
          radius: 3.5,
          color: isRushMode ? "#fb7185" : "#38bdf8",
          damage: isRushMode ? 1.5 : 1,
          isPlayer: true,
        });
      }

      // 5. Enemy Spawning Wave Cadence
      const spawnInterval = isRushMode ? 420 : 750;
      if (currentTime - state.lastEnemySpawnTime > spawnInterval) {
        state.lastEnemySpawnTime = currentTime;
        const rand = Math.random();
        const spawnX = 40 + Math.random() * (state.canvasWidth - 80);

        if (rand < 0.45) {
          // Scout Drone (fast)
          state.enemies.push({
            id: Math.random(),
            x: spawnX,
            y: -30,
            vx: (Math.random() - 0.5) * 1.8,
            vy: 3.8 + Math.random() * 2,
            width: 32,
            height: 32,
            hp: 2,
            maxHp: 2,
            type: "scout",
            color: "#e11d48",
            scoreValue: 120,
          });
        } else if (rand < 0.8) {
          // Interceptor (Medium)
          state.enemies.push({
            id: Math.random(),
            x: spawnX,
            y: -40,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 2.2 + Math.random() * 1.5,
            width: 42,
            height: 42,
            hp: 4,
            maxHp: 4,
            type: "interceptor",
            color: "#f59e0b",
            scoreValue: 260,
          });
        } else {
          // Meteor or Elite
          state.enemies.push({
            id: Math.random(),
            x: spawnX,
            y: -50,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 1.6 + Math.random() * 1.2,
            width: 52,
            height: 52,
            hp: 7,
            maxHp: 7,
            type: isRushMode ? "elite" : "meteor",
            color: isRushMode ? "#a855f7" : "#0ea5e9",
            scoreValue: 480,
            angle: 0,
          });
        }
      }

      // 6. Update Bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.y < -20 || b.y > state.canvasHeight + 20 || b.x < -20 || b.x > state.canvasWidth + 20) {
          state.bullets.splice(i, 1);
          continue;
        }

        // Check collision with enemies (if player bullet)
        if (b.isPlayer) {
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            const enemy = state.enemies[j];
            if (
              b.x > enemy.x &&
              b.x < enemy.x + enemy.width &&
              b.y > enemy.y &&
              b.y < enemy.y + enemy.height
            ) {
              state.shotsHit += 1;
              enemy.hp -= b.damage;
              state.bullets.splice(i, 1);

              // Hit spark
              createExplosion(b.x, b.y, "#fde047", 4);

              if (enemy.hp <= 0) {
                // Enemy Destroyed!
                state.kills += 1;
                const comboMultiplier = 1 + Math.min(Math.floor(state.combo / 4) * 0.25, 2.0);
                const baseScore = enemy.scoreValue * (isRushMode ? 2 : 1);
                const totalGain = Math.round(baseScore * comboMultiplier);

                state.score += totalGain;
                state.combo += 1;
                state.maxCombo = Math.max(state.maxCombo, state.combo);

                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 16);

                // Chance to drop score core
                if (Math.random() < 0.55) {
                  state.powerUps.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    vy: 2.2,
                    type: "score",
                    radius: 10,
                  });
                }

                // Show popup score
                state.floatingTexts.push({
                  id: Math.random(),
                  x: enemy.x,
                  y: enemy.y,
                  text: `+${totalGain}${comboMultiplier > 1 ? ` (${comboMultiplier}x)` : ""}`,
                  color: isRushMode ? "#fb7185" : "#38bdf8",
                  alpha: 1,
                  vy: -1.8,
                });

                state.enemies.splice(j, 1);
              }
              break;
            }
          }
        }
      }

      // 7. Update Enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        if (enemy.angle !== undefined) {
          enemy.angle += 0.03;
        }

        // Enemy leaves bottom
        if (enemy.y > state.canvasHeight + 60) {
          state.enemies.splice(i, 1);
          state.combo = 0; // Miss breaks combo
          continue;
        }

        // Collision with player
        const distSq = (p.x - (enemy.x + enemy.width / 2)) ** 2 + (p.y - (enemy.y + enemy.height / 2)) ** 2;
        if (distSq < (28 + enemy.width / 2) ** 2) {
          // Player hit!
          createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#f43f5e", 20);
          state.enemies.splice(i, 1);
          state.combo = 0;
          state.shake = 12;

          state.floatingTexts.push({
            id: Math.random(),
            x: p.x - 20,
            y: p.y - 30,
            text: "SHIELD HIT! -100",
            color: "#f43f5e",
            alpha: 1,
            vy: -1.5,
          });

          // Deduct small penalty from score
          state.score = Math.max(0, state.score - 100);
        }
      }

      // 8. Update Powerups
      for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const pu = state.powerUps[i];
        pu.y += pu.vy;

        // Magnetism towards player when nearby
        const dx = p.x - pu.x;
        const dy = p.y - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          pu.x += (dx / dist) * 6;
          pu.y += (dy / dist) * 6;
        }

        if (dist < 32) {
          // Collected!
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
          state.powerUps.splice(i, 1);
          continue;
        }

        if (pu.y > state.canvasHeight + 20) {
          state.powerUps.splice(i, 1);
        }
      }

      // 9. Update Particles & Floating Text
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

      // Camera shake decay
      if (state.shake > 0) {
        state.shake *= 0.88;
        if (state.shake < 0.5) state.shake = 0;
      }

      setScore(state.score);
      setCombo(state.combo);

      // ==========================================
      // RENDER CANVAS SCENE
      // ==========================================
      ctx.save();

      // Apply screen shake
      if (state.shake > 0) {
        const shakeX = (Math.random() - 0.5) * state.shake;
        const shakeY = (Math.random() - 0.5) * state.shake;
        ctx.translate(shakeX, shakeY);
      }

      // Dark Cosmic Gradient Background
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

      // Starfield (Parallax)
      state.stars.forEach((star) => {
        star.y += star.speed * (isRushMode ? 2.5 : 1);
        if (star.y > state.canvasHeight) {
          star.y = 0;
          star.x = Math.random() * state.canvasWidth;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size * (isRushMode ? 2 : 1));
      });

      // Background Cyber Grid lines
      ctx.strokeStyle = isRushMode ? "rgba(244, 63, 94, 0.06)" : "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      const offset = (currentTime * 0.08) % gridSize;
      for (let y = offset; y < state.canvasHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(state.canvasWidth, y);
        ctx.stroke();
      }

      // Render PowerUps (Glowing Diamonds)
      state.powerUps.forEach((pu) => {
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.rotate(currentTime * 0.005);
        ctx.fillStyle = "#facc15";
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -pu.radius);
        ctx.lineTo(pu.radius, 0);
        ctx.lineTo(0, pu.radius);
        ctx.lineTo(-pu.radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Render Bullets
      state.bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.radius, b.radius * 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Enemies
      state.enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

        if (enemy.angle !== undefined) {
          ctx.rotate(enemy.angle);
        }

        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = enemy.color;

        if (enemy.type === "scout") {
          // Sleek Arrow Scout
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 2);
          ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
          ctx.lineTo(0, -enemy.height / 4);
          ctx.lineTo(enemy.width / 2, -enemy.height / 2);
          ctx.closePath();
          ctx.fill();
        } else if (enemy.type === "interceptor") {
          // Heavy Fighter with Twin Wings
          ctx.beginPath();
          ctx.moveTo(0, enemy.height / 2);
          ctx.lineTo(-enemy.width / 2, 0);
          ctx.lineTo(-enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 3, -enemy.height / 2);
          ctx.lineTo(enemy.width / 2, 0);
          ctx.closePath();
          ctx.fill();

          // Cockpit eye
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-3, -2, 6, 8);
        } else {
          // Meteor or Elite Core
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const r = enemy.width / 2;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }

        // HP bar above enemy if wounded
        if (enemy.hp < enemy.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(-enemy.width / 2, -enemy.height / 2 - 8, enemy.width, 4);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(-enemy.width / 2, -enemy.height / 2 - 8, (enemy.width * enemy.hp) / enemy.maxHp, 4);
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
      // RENDER PLAYER FIGHTER WITH SEAT NUMBER AS CORE VISUAL
      // ========================================================
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.tilt * Math.PI) / 180);

      // 1. Holographic Orbit HUD Ring with Seat Number
      ctx.save();
      ctx.strokeStyle = isRushMode ? "rgba(244, 63, 94, 0.45)" : "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Top Floating Hologram Tag (座號/識別碼)
      ctx.save();
      ctx.fillStyle = isRushMode ? "#fda4af" : "#bae6fd";
      ctx.shadowColor = isRushMode ? "#f43f5e" : "#0284c7";
      ctx.shadowBlur = 8;
      ctx.font = "bold 11px 'Chakra Petch', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`NO. ${playerId}`, 0, -44);
      ctx.restore();

      // 2. High-Tech Delta Fighter Wings & Fuselage
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

      // 3. Prominent SEAT NUMBER Stenciled on Aircraft Wings
      ctx.save();
      const stencilSize = playerId.length > 5 ? 9 : playerId.length > 3 ? 10 : 13;
      ctx.font = `900 ${stencilSize}px 'Orbitron', sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Render Seat Number clearly in center of craft
      ctx.fillText(playerId, 0, 10);
      ctx.restore();

      ctx.restore(); // End Player Transform

      // Floating Score and Status Texts
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
  }, [playerId, onGameOver, triggerEmp, isRushMode]);

  // Handle Resize and Mouse/Touch tracking
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
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    stateRef.current.player.targetX = x;
    stateRef.current.player.targetY = y;
  };

  // Circular Countdown Progress Percent (20.0s)
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / 20.0) * 100));

  return (
    <div
      ref={containerRef}
      id="game-canvas-container"
      onPointerMove={handlePointerMove}
      className="relative w-full h-full min-h-[520px] max-h-[720px] rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/20 shadow-2xl select-none touch-none cursor-crosshair flex items-center justify-center"
    >
      {/* HTML5 Game Canvas */}
      <canvas ref={canvasRef} id="shooter-canvas" className="w-full h-full block" />

      {/* Top High-Tech HUD Bar */}
      <div
        id="game-hud-top"
        className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10"
      >
        {/* Left: Player Seat Tag & Score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-950/40">
            <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <div className="text-[10px] uppercase font-mono text-cyan-400/80 leading-none">機身編號</div>
              <div className="text-sm font-black font-['Orbitron'] text-white">NO. {playerId}</div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50">
            <div className="text-[10px] uppercase font-mono text-slate-400 leading-none">得分 SCORE</div>
            <div className="text-lg font-black font-['Orbitron'] text-cyan-400">
              {score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Center: 20-Second High-Precision Countdown Meter */}
        <div
          id="hud-timer-widget"
          className={`flex items-center gap-2.5 px-4 py-1.5 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
            timeLeft <= 5.0
              ? "bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-600/50 scale-105"
              : "bg-slate-900/80 border-cyan-500/40"
          }`}
        >
          {/* Radial Countdown Gauge */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="w-8 h-8 -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="13"
                className="stroke-slate-800"
                strokeWidth="3"
                fill="transparent"
              />
              <circle
                cx="16"
                cy="16"
                r="13"
                className={`transition-all duration-75 ${
                  timeLeft <= 5.0 ? "stroke-rose-500" : "stroke-cyan-400"
                }`}
                strokeWidth="3"
                strokeDasharray="81.68"
                strokeDashoffset={81.68 - (81.68 * timerPercentage) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <ShieldAlert
              className={`w-3.5 h-3.5 absolute ${
                timeLeft <= 5.0 ? "text-rose-400 animate-ping" : "text-cyan-400"
              }`}
            />
          </div>

          <div>
            <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase leading-none">
              {timeLeft <= 5.0 ? "倒數警戒 RUSH" : "單局限時 LIMIT"}
            </div>
            <div
              className={`text-xl font-black font-['Orbitron'] tracking-wider ${
                timeLeft <= 5.0 ? "text-rose-400 animate-pulse" : "text-white"
              }`}
            >
              {timeLeft.toFixed(1)}s
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
            <span>EMP {empReady ? "[E鍵/點擊]" : "已冷卻"}</span>
          </button>
        </div>
      </div>

      {/* Bottom Controls Indicator */}
      <div
        id="hud-controls-helper"
        className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none px-3 py-1 bg-slate-950/60 rounded-xl backdrop-blur-sm border border-slate-800/40"
      >
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          操作模式：滑鼠游標 / 觸控拖曳 / WASD 移動，戰機自動疾速開火
        </span>
        <span className="hidden sm:inline-block text-cyan-400/90 font-semibold">
          20秒結束自動結算並同步至 Google Sheets
        </span>
      </div>
    </div>
  );
};
