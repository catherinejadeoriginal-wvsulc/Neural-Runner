/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameAction, GameStatus, InputMode, Particle, Obstacle } from '../types';
import { sounds } from '../utils/audio';

const PIXEL_SCALE = 2.5;

// ─── DOG SPRITES ────────────────────────────────────────────────────────────
// Running frame 1 (16 cols × 17 rows)
const DOG_RUN1 = [
  '................',
  '...XXXXX........',
  '..XXXXXXX.......',
  '..XXOXXXXX......',
  '..XXXXXXXXX.....',
  '..XXX.XXXXX.....',
  '.XXXXXXXXXXX....',
  'XXXXXXXXXXXXX...',
  'XXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXX...',
  '..XXXXXXXXXX....',
  '...XXXX.XXXX....',
  '...XXXX..XXX....',
  '...XX....XXX....',
  '...X......XX....',
  '...XX.....XX....',
  '................',
];

// Running frame 2 (16 cols × 17 rows)
const DOG_RUN2 = [
  '................',
  '...XXXXX........',
  '..XXXXXXX.......',
  '..XXOXXXXX......',
  '..XXXXXXXXX.....',
  '..XXX.XXXXX.....',
  '.XXXXXXXXXXX....',
  'XXXXXXXXXXXXX...',
  'XXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXX...',
  '..XXXXXXXXXX....',
  '...XXXX.XXXX....',
  '....XX...XXX....',
  '....X....XXX....',
  '....XX...X......',
  '.....X...XX.....',
  '................',
];

// Jumping frame (16 cols × 17 rows)
const DOG_JUMP = [
  '................',
  '...XXXXX........',
  '..XXXXXXX.......',
  '..XXOXXXXX......',
  '..XXXXXXXXX.....',
  '..XXX.XXXXX.....',
  '.XXXXXXXXXXX....',
  'XXXXXXXXXXXXX...',
  'XXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXX...',
  '..XXXXXXXXXX....',
  '...XXXX.XXXX....',
  '...XXXX..XXX....',
  '...XX....X......',
  '...XXXXX........',
  '................',
  '................',
];

// Crouching frame 1 (20 cols × 12 rows)
const DOG_CROUCH1 = [
  '..........XXXXX.............',
  '.........XXXXXXX............',
  '.........XXOXXXXX...........',
  '...XXXX..XXXXXXXXX..........',
  '..XXXXXXXXXXXXXXXXX.........',
  '.XXXXXXXXXXXXXXXXXXX........',
  'XXXXXXXXXXXXXXXXXXXX........',
  '.XXXXXXXXXXXXXXXXXXX........',
  '..XXXX.XXXX.XXXX.XXX........',
  '..XX....XX...XX...XX........',
  '..X.....X....X.....X........',
  '..XX....X....X.....XX.......',
];

// Crouching frame 2 (20 cols × 12 rows)
const DOG_CROUCH2 = [
  '..........XXXXX.............',
  '.........XXXXXXX............',
  '.........XXOXXXXX...........',
  '...XXXX..XXXXXXXXX..........',
  '..XXXXXXXXXXXXXXXXX.........',
  '.XXXXXXXXXXXXXXXXXXX........',
  'XXXXXXXXXXXXXXXXXXXX........',
  '.XXXXXXXXXXXXXXXXXXX........',
  '..XXXX.XXXX.XXXX.XXX........',
  '..X.....XX....XX..X.........',
  '..XX....X.....X...XX........',
  '...XX...X.....X....X........',
];

// ─── OBSTACLE BITMAPS ────────────────────────────────────────────────────────
const CACTUS_S = [
  '...XX...',
  '..XXXX..',
  '.XXOOXX.',
  'XXOOOOXX',
  'XXOXXOXX',
  'XXOXXOXX',
  'XXOXXOXX',
  '.XXXXXX.',
  '..XXXX..',
  '..XXXX..',
  '..XXXX..',
  '..XXXX..',
  '..XXXX..',
  '..XXXX..',
];

const CACTUS_L = [
  '.....XX.......',
  '....XXXX......',
  '..XXXXXX......',
  '.XXOOOXX..XX..',
  'XXOOOOXXXXXX..',
  'XXOXXOXXOOXX..',
  'XXOXXOXXOXX...',
  '.XXXXXXOXX....',
  '..XXXXXOXX....',
  '..XXXXXX......',
  '....XXXX......',
  '....XXXX......',
  '....XXXX......',
  '....XXXX......',
  '....XXXX......',
  '....XXXX......',
  '....XXXX......',
  '....XXXX......',
];

const BIRD_WING_UP = [
  '......XX........',
  '....XXXXXX......',
  '..XXXXXXXXXX....',
  'XXXXXOXXXXXX....',
  '..XXXXXXXX......',
  '....XXXX........',
  '....XXXXXX......',
  '....XXXXXXXX....',
  '....XX..XXXX....',
  '....X.....XX....',
];

const BIRD_WING_DOWN = [
  '......XX........',
  '....XXXXXX......',
  '..XXXXXXXXXX....',
  'XXXXXOXXXXXX....',
  '..XXXXXXXX......',
  '....XXXX........',
  '....XX..........',
  '....X...........',
  '................',
  '................',
];

const ROCK_BITMAP = [
  '....XX......',
  '..XXXXXX....',
  '.XXXXXXXX...',
  'XXXXXXXXXX..',
  'OXXXXXXXXXO.',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
];

// ─── DYNAMIC BACKGROUND THEMES ───────────────────────────────────────────────
interface BgTheme {
  sky: string;
  grid: string;
  cloud: string;
  groundTop: string;
  groundFill: string;
  groundDot: string;
  dogColor: string;
  obstacleColor: string;
  birdColor: string;
  rockColor: string;
  hudAccent: string;
}

const BG_THEMES: BgTheme[] = [
  {
    // 0: Deep space blue/violet
    sky: '#0a0818',
    grid: '#1a1035',
    cloud: '#1e1040',
    groundTop: '#7c3aed',
    groundFill: '#5b21b6',
    groundDot: '#4c1d95',
    dogColor: '#00c8ff',
    obstacleColor: '#f59e0b',
    birdColor: '#ff2d9b',
    rockColor: '#94a3b8',
    hudAccent: '#00c8ff',
  },
  {
    // 100pts: Neon pink sunset
    sky: '#120820',
    grid: '#2d1040',
    cloud: '#3b1050',
    groundTop: '#ec4899',
    groundFill: '#db2777',
    groundDot: '#be185d',
    dogColor: '#00c8ff',
    obstacleColor: '#fbbf24',
    birdColor: '#a78bfa',
    rockColor: '#64748b',
    hudAccent: '#ff2d9b',
  },
  {
    // 200pts: Teal ocean night
    sky: '#031020',
    grid: '#062030',
    cloud: '#083040',
    groundTop: '#0e7490',
    groundFill: '#0891b2',
    groundDot: '#0c4a6e',
    dogColor: '#ff2d9b',
    obstacleColor: '#f97316',
    birdColor: '#a78bfa',
    rockColor: '#475569',
    hudAccent: '#00c8ff',
  },
  {
    // 300pts: Synthwave purple
    sky: '#0d0520',
    grid: '#1e0c40',
    cloud: '#2d1260',
    groundTop: '#9333ea',
    groundFill: '#7c3aed',
    groundDot: '#581c87',
    dogColor: '#ff2d9b',
    obstacleColor: '#fb923c',
    birdColor: '#00c8ff',
    rockColor: '#6b7280',
    hudAccent: '#c084fc',
  },
  {
    // 400pts: Cyberpunk gold
    sky: '#100a00',
    grid: '#281800',
    cloud: '#3b2500',
    groundTop: '#d97706',
    groundFill: '#b45309',
    groundDot: '#92400e',
    dogColor: '#00c8ff',
    obstacleColor: '#ff2d9b',
    birdColor: '#a78bfa',
    rockColor: '#78716c',
    hudAccent: '#fbbf24',
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────
interface GameCanvasProps {
  activeAction: GameAction;
  inputMode: InputMode;
  onScoreChange: (score: number) => void;
  onStatusChange: (status: GameStatus) => void;
  status: GameStatus;
  highScore: number;
}

export default function GameCanvas({
  activeAction,
  inputMode,
  onScoreChange,
  onStatusChange,
  status,
  highScore,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pressedKeyAction, setPressedKeyAction] = useState<GameAction>('NONE');

  const scoreRef = useRef(0);
  const statusRef = useRef<GameStatus>('IDLE');
  const speedRef = useRef(5.0);
  const scrollRef = useRef(0);

  const playerRef = useRef({
    x: 50,
    y: 0,
    width: 16 * PIXEL_SCALE,
    height: 17 * PIXEL_SCALE,
    vy: 0,
    isJumping: false,
    isCrouching: false,
    groundY: 180,
    animFrame: 0,
    animTimer: 0,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const obstacleTimerRef = useRef(0);
  const obstacleIdCounter = useRef(0);
  const keyboardRef = useRef<GameAction>('NONE');

  // Sync status ref
  useEffect(() => {
    statusRef.current = status;
    if (status === 'PLAYING' && scoreRef.current === 0) {
      resetGameStats();
    }
  }, [status]);

  const resetGameStats = () => {
    scoreRef.current = 0;
    speedRef.current = 6.0;
    obstaclesRef.current = [];
    particlesRef.current = [];
    scrollRef.current = 0;
    obstacleTimerRef.current = 0;
    playerRef.current.y = playerRef.current.groundY;
    playerRef.current.vy = 0;
    playerRef.current.isJumping = false;
    playerRef.current.isCrouching = false;
    onScoreChange(0);
  };

  const playSound = (type: 'JUMP' | 'CROUCH' | 'SCORE' | 'CRASH') => {
    if (type === 'JUMP') sounds.playJump();
    if (type === 'CROUCH') sounds.playCrouch();
    if (type === 'SCORE') sounds.playScoreMilestone();
    if (type === 'CRASH') sounds.playCrash();
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();

        if (statusRef.current === 'IDLE' || statusRef.current === 'GAME_OVER') {
          onStatusChange('PLAYING');
          resetGameStats();
          playSound('JUMP');
          return;
        }
        // Unpause on space
        if (statusRef.current === 'PAUSED') {
          onStatusChange('PLAYING');
          return;
        }

        keyboardRef.current = 'JUMP';
        setPressedKeyAction('JUMP');
      }

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        keyboardRef.current = 'CROUCH';
        setPressedKeyAction('CROUCH');
      }

      // P or Escape to toggle pause
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (statusRef.current === 'PLAYING') {
          onStatusChange('PAUSED');
        } else if (statusRef.current === 'PAUSED') {
          onStatusChange('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (keyboardRef.current === 'JUMP') {
          keyboardRef.current = 'NONE';
          setPressedKeyAction('NONE');
        }
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (keyboardRef.current === 'CROUCH') {
          keyboardRef.current = 'NONE';
          setPressedKeyAction('NONE');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onStatusChange]);

  // Obstacle spawning
  const spawnObstacle = () => {
    const currentScore = scoreRef.current;
    obstacleIdCounter.current++;

    const types: Obstacle['type'][] = ['CACTUS_S', 'CACTUS_L', 'ROCK'];
    if (currentScore > 150) types.push('PTERODACTYL');

    const rollType = types[Math.floor(Math.random() * types.length)];
    let width = 8 * PIXEL_SCALE;
    let height = 14 * PIXEL_SCALE;
    let yOffset = 0;

    if (rollType === 'CACTUS_L') {
      width = 14 * PIXEL_SCALE;
      height = 18 * PIXEL_SCALE;
    } else if (rollType === 'ROCK') {
      width = 12 * PIXEL_SCALE;
      height = 7 * PIXEL_SCALE;
    } else if (rollType === 'PTERODACTYL') {
      width = 16 * PIXEL_SCALE;
      height = 10 * PIXEL_SCALE;
      const heights = [35, 75, 45];
      yOffset = heights[Math.floor(Math.random() * heights.length)];
    }

    obstaclesRef.current.push({
      id: obstacleIdCounter.current,
      x: 820,
      width,
      height,
      type: rollType,
      yOffset,
      passed: false,
    });
  };

  const spawnDust = (x: number, y: number) => {
    particlesRef.current.push({
      x,
      y,
      vx: -(0.5 + Math.random() * 2),
      vy: -(Math.random() * 0.5),
      color: '#a78bfa',
      size: 1.5 + Math.random() * 3,
      life: 15 + Math.random() * 15,
    });
  };

  // Core game loop
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawBitmap = (
      bitmap: string[],
      x: number,
      y: number,
      pScale: number,
      color: string,
    ) => {
      bitmap.forEach((row, rIdx) => {
        for (let cIdx = 0; cIdx < row.length; cIdx++) {
          const char = row[cIdx];
          if (char === 'X' || char === 'O') {
            ctx.fillStyle = char === 'O' ? '#ffffff' : color;
            ctx.fillRect(
              Math.floor(x + cIdx * pScale),
              Math.floor(y + rIdx * pScale),
              Math.ceil(pScale),
              Math.ceil(pScale),
            );
          }
        }
      });
    };

    const isColliding = (
      r1: { x: number; y: number; w: number; h: number },
      r2: { x: number; y: number; w: number; h: number },
    ) => {
      const pw1 = r1.w * 0.15, ph1 = r1.h * 0.1;
      const pw2 = r2.w * 0.15, ph2 = r2.h * 0.1;
      return (
        r1.x + pw1 < r2.x + r2.w - pw2 &&
        r1.x + r1.w - pw1 > r2.x + pw2 &&
        r1.y + ph1 < r2.y + r2.h - ph2 &&
        r1.y + r1.h - ph1 > r2.y + ph2
      );
    };

    const update = () => {
      // Pick background theme based on score (cycles every 100 pts)
      const displayScore = Math.floor(scoreRef.current / 5);
      const themeIdx = Math.floor(displayScore / 100) % BG_THEMES.length;
      const theme = BG_THEMES[themeIdx];

      // 0. Clear background
      ctx.fillStyle = theme.sky;
      ctx.fillRect(0, 0, 800, 250);

      // Parallax grid
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      for (let g = 30; g < 200; g += 30) {
        ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(800, g); ctx.stroke();
      }
      const gridScroll = (scrollRef.current * 0.3) % 40;
      for (let g = -gridScroll; g < 800; g += 40) {
        ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, 200); ctx.stroke();
      }

      // 1. Update logic (only while PLAYING)
      if (statusRef.current === 'PLAYING') {
        scrollRef.current += speedRef.current;
        scoreRef.current += 1;
        if (scoreRef.current % 5 === 0) {
          onScoreChange(Math.floor(scoreRef.current / 5));
        }
        if (scoreRef.current > 0 && scoreRef.current % 500 === 0) {
          playSound('SCORE');
        }

        speedRef.current = 6.0 + Math.floor(scoreRef.current / 400) * 0.55;

        const decisionAction =
          inputMode === 'TEACHABLE_MACHINE' && activeAction !== 'NONE'
            ? activeAction
            : keyboardRef.current;

        const player = playerRef.current;
        player.animTimer += 1;
        if (player.animTimer % 6 === 0) {
          player.animFrame = (player.animFrame + 1) % 2;
        }

        // Jump
        if (decisionAction === 'JUMP' && !player.isJumping) {
          player.vy = -11.5;
          player.isJumping = true;
          player.isCrouching = false;
          playSound('JUMP');
        }

        // Gravity
        if (player.isJumping) {
          const extraGravity = decisionAction === 'CROUCH' ? 1.4 : 0.6;
          player.vy += extraGravity;
          player.y += player.vy;
          if (player.y >= player.groundY) {
            player.y = player.groundY;
            player.vy = 0;
            player.isJumping = false;
          }
        }

        // Crouch
        if (!player.isJumping) {
          if (decisionAction === 'CROUCH') {
            if (!player.isCrouching) playSound('CROUCH');
            player.isCrouching = true;
            player.width = 20 * PIXEL_SCALE;
            player.height = 12 * PIXEL_SCALE;
          } else {
            player.isCrouching = false;
            player.width = 16 * PIXEL_SCALE;
            player.height = 17 * PIXEL_SCALE;
          }
        }

        // Ground dust
        if (!player.isJumping && Math.random() < 0.25) {
          spawnDust(
            player.x + 4,
            player.isCrouching
              ? player.groundY + 12 * PIXEL_SCALE
              : player.groundY + 16 * PIXEL_SCALE,
          );
        }

        // Obstacle spawning
        obstacleTimerRef.current += 1;
        const minSpawnInterval = 75;
        const spawnVariance = Math.max(25, 130 - Math.floor(scoreRef.current / 300) * 10);
        if (obstacleTimerRef.current > minSpawnInterval + Math.random() * spawnVariance) {
          spawnObstacle();
          obstacleTimerRef.current = 0;
        }

        obstaclesRef.current = obstaclesRef.current
          .map((obs) => ({ ...obs, x: obs.x - speedRef.current }))
          .filter((obs) => obs.x + obs.width > -10);

        // Collision
        const playerBox = {
          x: player.x,
          y: player.isCrouching ? player.y + (17 - 12) * PIXEL_SCALE : player.y,
          w: player.width,
          h: player.height,
        };
        obstaclesRef.current.forEach((obs) => {
          const obsY =
            obs.type === 'PTERODACTYL'
              ? player.groundY - obs.yOffset
              : player.groundY + 17 * PIXEL_SCALE - obs.height;
          if (isColliding(playerBox, { x: obs.x, y: obsY, w: obs.width, h: obs.height })) {
            onStatusChange('GAME_OVER');
            playSound('CRASH');
            for (let i = 0; i < 40; i++) {
              particlesRef.current.push({
                x: player.x + player.width / 2 + (Math.random() - 0.5) * 30,
                y: player.y + player.height / 2 + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 3,
                color: Math.random() > 0.5 ? '#00c8ff' : '#ff2d9b',
                size: 2 + Math.random() * 5,
                life: 30 + Math.random() * 40,
              });
            }
          }
        });
      }

      // 2. Ground
      ctx.fillStyle = theme.groundTop;
      ctx.fillRect(0, 222, 800, 3);
      ctx.fillStyle = theme.groundFill;
      ctx.fillRect(0, 225, 800, 25);
      ctx.fillStyle = theme.groundDot;
      const groundDotScroll = scrollRef.current % 120;
      for (let gx = -groundDotScroll; gx < 800; gx += 120) {
        ctx.fillRect(gx + 10, 230, 6, 2);
        ctx.fillRect(gx + 40, 238, 4, 2);
        ctx.fillRect(gx + 75, 232, 8, 2);
        ctx.fillRect(gx + 110, 240, 5, 2);
      }

      // 3. Clouds
      ctx.fillStyle = theme.cloud;
      const cloudScroll = (scrollRef.current * 0.1) % 400;
      for (let cx = -cloudScroll; cx < 800; cx += 400) {
        ctx.fillRect(cx + 80, 40, 50, 10);
        ctx.fillRect(cx + 100, 30, 70, 10);
        ctx.fillRect(cx + 150, 40, 40, 10);
        ctx.fillRect(cx + 90, 50, 110, 10);
        ctx.fillRect(cx + 280, 80, 40, 8);
        ctx.fillRect(cx + 295, 72, 50, 8);
        ctx.fillRect(cx + 290, 88, 70, 8);
      }

      // 4. Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.life -= 1;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // 5. Obstacles
      obstaclesRef.current.forEach((obs) => {
        const obsY =
          obs.type === 'PTERODACTYL'
            ? playerRef.current.groundY - obs.yOffset
            : playerRef.current.groundY + 17 * PIXEL_SCALE - obs.height;

        let bitmap = CACTUS_S;
        let color = theme.obstacleColor;

        if (obs.type === 'CACTUS_L') {
          bitmap = CACTUS_L;
        } else if (obs.type === 'ROCK') {
          bitmap = ROCK_BITMAP;
          color = theme.rockColor;
        } else if (obs.type === 'PTERODACTYL') {
          const wingState = Math.floor(scrollRef.current / 12) % 2;
          bitmap = wingState === 0 ? BIRD_WING_UP : BIRD_WING_DOWN;
          color = theme.birdColor;
        }
        drawBitmap(bitmap, obs.x, obsY, PIXEL_SCALE, color);
      });

      // 6. Dog player
      const player = playerRef.current;
      if (statusRef.current !== 'GAME_OVER') {
        let dogBitmap = DOG_RUN1;
        if (player.isJumping) {
          dogBitmap = DOG_JUMP;
        } else if (player.isCrouching) {
          dogBitmap = player.animFrame === 0 ? DOG_CROUCH1 : DOG_CROUCH2;
        } else {
          dogBitmap = player.animFrame === 0 ? DOG_RUN1 : DOG_RUN2;
        }
        const drawY = player.isCrouching ? player.y + (17 - 12) * PIXEL_SCALE : player.y;
        drawBitmap(dogBitmap, player.x, drawY, PIXEL_SCALE, theme.dogColor);
      }

      // 7. Overlays (IDLE / PAUSED / GAME_OVER)
      if (statusRef.current === 'IDLE') {
        ctx.fillStyle = 'rgba(10,8,24,0.93)';
        ctx.fillRect(0, 0, 800, 250);

        ctx.font = '900 24px monospace';
        ctx.fillStyle = '#00c8ff';
        ctx.textAlign = 'center';
        ctx.fillText('🐶  DOG RUNNER MODULE', 400, 85);

        ctx.font = '700 12px monospace';
        ctx.fillStyle = '#a78bfa';
        if (inputMode === 'KEYBOARD') {
          ctx.fillText('PRESS [ SPACE ] OR [ UP ARROW ] TO WOOF AND JUMP', 400, 130);
          ctx.fillText('PRESS [ DOWN ARROW ] TO DUCK', 400, 155);
        } else {
          ctx.fillText('SHOW  😄  HAPPY FACE  →  DOG JUMPS', 400, 130);
          ctx.fillText('SHOW  😢  SAD FACE    →  DOG DUCKS', 400, 155);
        }

        const handBob = Math.sin(Date.now() / 120) * 4;
        ctx.font = '22px sans-serif';
        ctx.fillText('🐾', 400, 195 + handBob);
      }

      if (statusRef.current === 'PAUSED') {
        ctx.fillStyle = 'rgba(10,8,24,0.82)';
        ctx.fillRect(0, 0, 800, 250);

        ctx.font = '900 30px monospace';
        ctx.fillStyle = '#ff2d9b';
        ctx.textAlign = 'center';
        ctx.fillText('⏸  PAUSED', 400, 100);

        ctx.font = '700 12px monospace';
        ctx.fillStyle = '#00c8ff';
        ctx.fillText('PRESS  [ P ]  OR  CLICK  TO  RESUME', 400, 145);

        ctx.font = '700 11px monospace';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(`SCORE: ${displayScore}  •  HI-SCORE: ${highScore}`, 400, 180);
      }

      if (statusRef.current === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(10,8,24,0.94)';
        ctx.fillRect(0, 0, 800, 250);

        ctx.font = '900 38px monospace';
        ctx.fillStyle = '#ff2d9b';
        ctx.textAlign = 'center';
        ctx.fillText('RUFF!  CONNECTION LOST', 400, 90);

        ctx.font = '700 14px monospace';
        ctx.fillStyle = '#00c8ff';
        ctx.fillText(`SCORE: ${displayScore}  •  HI-SCORE: ${highScore}`, 400, 135);

        ctx.font = '700 11px monospace';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('CLICK CANVAS OR TAP [ SPACE ] TO RE-DEPLOY DOG 🐶', 400, 175);
      }

      // 8. Score & background-theme indicator (top center of canvas)
      if (statusRef.current === 'PLAYING' || statusRef.current === 'PAUSED') {
        ctx.font = '700 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.hudAccent;
        const nextThreshold = (Math.floor(displayScore / 100) + 1) * 100;
        ctx.fillText(`NEXT BG IN ${nextThreshold - displayScore} pts`, 400, 16);
      }

      animationId = requestAnimationFrame(update);
    };

    update();
    return () => { cancelAnimationFrame(animationId); };
  }, [inputMode, activeAction, highScore]);

  const handleCanvasClick = () => {
    if (status === 'IDLE' || status === 'GAME_OVER') {
      onStatusChange('PLAYING');
      resetGameStats();
    } else if (status === 'PAUSED') {
      onStatusChange('PLAYING');
    }
  };

  return (
    <div className="relative border-4 border-[#1a0f33] bg-cyber-dark shadow-cyber-heavy overflow-hidden select-none">
      <canvas
        id="retro-game-viewport"
        ref={canvasRef}
        width={800}
        height={250}
        onClick={handleCanvasClick}
        className="w-full h-auto cursor-pointer block"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Input mode badge */}
      <div className="absolute top-3 left-4 flex gap-2">
        <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest border-2 border-cyber-green bg-cyber-dark text-cyber-green shadow">
          SYS_IN: {inputMode === 'KEYBOARD' ? 'KEYBOARD' : 'CUSTOM_AI'}
        </span>
        {status === 'PLAYING' && (
          <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest border-2 border-cyber-green/50 bg-cyber-green/10 text-cyber-green shadow animate-pulse">
            CLOCK: {speedRef.current.toFixed(1)}x
          </span>
        )}
        {status === 'PAUSED' && (
          <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest border-2 border-cyber-red bg-cyber-red/10 text-cyber-red shadow animate-pulse">
            ⏸ PAUSED
          </span>
        )}
      </div>

      {/* Live action indicator */}
      <div className="absolute top-3 right-4 flex gap-3 items-center">
        <div className="flex gap-1.5 text-xs font-semibold">
          <span className="text-slate-500 font-bold">MAX:</span>
          <span className="text-cyber-green font-black">{highScore}</span>
        </div>
        <div className="flex gap-1.5">
          <span className={`px-2 py-0.5 text-[9px] font-black border transition-all ${
            (inputMode === 'TEACHABLE_MACHINE' ? activeAction : pressedKeyAction) === 'JUMP'
              ? 'bg-cyber-green border-cyber-green text-cyber-dark shadow-cyber'
              : 'bg-cyber-dark border-[#333] text-slate-700'
          }`}>▲ JUMP</span>
          <span className={`px-2 py-0.5 text-[9px] font-black border transition-all ${
            (inputMode === 'TEACHABLE_MACHINE' ? activeAction : pressedKeyAction) === 'CROUCH'
              ? 'bg-cyber-red border-cyber-red text-white'
              : 'bg-cyber-dark border-[#333] text-slate-700'
          }`}>▼ CROUCH</span>
        </div>
      </div>
    </div>
  );
}
