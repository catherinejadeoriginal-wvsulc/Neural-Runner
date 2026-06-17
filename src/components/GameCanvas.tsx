/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameAction, GameStatus, InputMode, Particle, Obstacle } from '../types';
import { sounds } from '../utils/audio';

// 8-bit Art Bitmaps (1 means color, 0/'.' means empty)
// Dinosaur run frames (16 cols x 17 rows)
const PIXEL_SCALE = 2.5;

const DINO_RUN1 = [
  '.....XXXXXX.....',
  '....XXXXXXXX....',
  '....XXOXXXXX....', // O is eye
  '....XXXXXXXX....',
  '....XXXX........',
  'XX..XXXXXXX.....',
  'XX.XXXXXXXXX....',
  'XXXXXXXXXXXX....',
  '.XXXXXXXXXX.....',
  '..XXXXXXXX......',
  '...XXXXXX.......',
  '....XXXX........',
  '....XXXX........',
  '....X..XX.......',
  '....X..X........',
  '....XX..........',
  '................'
];

const DINO_RUN2 = [
  '.....XXXXXX.....',
  '....XXXXXXXX....',
  '....XXOXXXXX....',
  '....XXXXXXXX....',
  '....XXXX........',
  'XX..XXXXXXX.....',
  'XX.XXXXXXXXX....',
  'XXXXXXXXXXXX....',
  '.XXXXXXXXXX.....',
  '..XXXXXXXX......',
  '...XXXXXX.......',
  '....XXXX........',
  '....XXXX........',
  '....XX..X.......',
  '.....X..X.......',
  '.....X..XX......',
  '................'
];

const DINO_JUMP = [
  '.....XXXXXX.....',
  '....XXXXXXXX....',
  '....XXOXXXXX....',
  '....XXXXXXXX....',
  '....XXXX........',
  'XX..XXXXXXX.....',
  'XX.XXXXXXXXX....',
  'XXXXXXXXXXXX....',
  '.XXXXXXXXXX.....',
  '..XXXXXXXX......',
  '...XXXXXX.......',
  '....XXXX........',
  '....X..X........',
  '....XX.XX.......',
  '................',
  '................',
  '................'
];

// Crouching dino (20 cols x 12 rows)
const DINO_CROUCH1 = [
  '.........XXXXXX.....',
  '........XXXXXXXX....',
  '........XXOXXXXX....',
  '..XXXX..XXXXXXXX....',
  'XXXXXXXXXXXXXXX.....',
  '.XXXXXXXXXXXXX......',
  '..XXXXXXXXXXX.......',
  '...XXXXXXXXX........',
  '....XXXX.XXX........',
  '....XX...XX.........',
  '....XX...X..........',
  '....X....X..........'
];

const DINO_CROUCH2 = [
  '.........XXXXXX.....',
  '........XXXXXXXX....',
  '........XXOXXXXX....',
  '..XXXX..XXXXXXXX....',
  'XXXXXXXXXXXXXXX.....',
  '.XXXXXXXXXXXXX......',
  '..XXXXXXXXXXX.......',
  '...XXXXXXXXX........',
  '....XXXX.XXX........',
  '....X....XX.........',
  '....XX...X..........',
  '....X....X..........'
];

// Obstacle Cactus Small (8 cols x 14 rows)
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
  '..XXXX..'
];

// Obstacle Cactus Large (14 cols x 18 rows)
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
  '....XXXX......'
];

// Flying Pterodactyl (16 cols x 10 rows)
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
  '....X.....XX....'
];

const BIRD_WING_DOWN = [
  '......XX........',
  '....XXXXXX......',
  '..XXXXXXXXXX....',
  'XXXXXOXXXXXX....', // O is bird eye
  '..XXXXXXXX......',
  '....XXXX........',
  '....XX..........',
  '....X...........',
  '................',
  '................'
];

// Low rock (12 cols x 7 rows)
const ROCK_BITMAP = [
  '....XX......',
  '..XXXXXX....',
  '.XXXXXXXX...',
  'XXXXXXXXXX..',
  'OXXXXXXXXXO.',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX'
];

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
  highScore
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // High fidelity keyboard mapping tracking
  const [pressedKeyAction, setPressedKeyAction] = useState<GameAction>('NONE');

  // Game internal coordinates & variables (uses refs to keep execution at strict 60fps in requestAnimationFrame without stale React closures)
  const scoreRef = useRef(0);
  const statusRef = useRef<GameStatus>('IDLE');
  const speedRef = useRef(5.0);
  const scrollRef = useRef(0);

  // Player physics state
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
    animTimer: 0
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const obstacleTimerRef = useRef(0);
  const obstacleIdCounter = useRef(0);
  const keyboardRef = useRef<GameAction>('NONE');

  // Sync statuses safely to prevent react timing closures
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

  // Sound play gate
  const playSound = (type: 'JUMP' | 'CROUCH' | 'SCORE' | 'CRASH') => {
    if (type === 'JUMP') sounds.playJump();
    if (type === 'CROUCH') sounds.playCrouch();
    if (type === 'SCORE') sounds.playScoreMilestone();
    if (type === 'CRASH') sounds.playCrash();
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space or ArrowUp to JUMP
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        
        if (statusRef.current === 'IDLE' || statusRef.current === 'GAME_OVER') {
          onStatusChange('PLAYING');
          resetGameStats();
          playSound('JUMP');
          return;
        }

        keyboardRef.current = 'JUMP';
        setPressedKeyAction('JUMP');
      }

      // ArrowDown or KeyS to CROUCH
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        keyboardRef.current = 'CROUCH';
        setPressedKeyAction('CROUCH');
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

  // Spawn obstacles
  const spawnObstacle = () => {
    const currentScore = scoreRef.current;
    obstacleIdCounter.current++;

    const types: Obstacle['type'][] = ['CACTUS_S', 'CACTUS_L', 'ROCK'];
    // Allow flying pterodactyls only after 150 points to build difficulty scaling
    if (currentScore > 150) {
      types.push('PTERODACTYL');
    }

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
      // Fly height options: low (requires JUMP over), middle (requires CROUCH), high (sails over safely)
      const heights = [35, 75, 45];
      yOffset = heights[Math.floor(Math.random() * heights.length)];
    }

    const obs: Obstacle = {
      id: obstacleIdCounter.current,
      x: 820,
      width,
      height,
      type: rollType,
      yOffset,
      passed: false
    };

    obstaclesRef.current.push(obs);
  };

  // Add dust particles
  const spawnDust = (x: number, y: number) => {
    const p: Particle = {
      x,
      y,
      vx: -(0.5 + Math.random() * 2),
      vy: -(Math.random() * 0.5),
      color: '#cbd5e1', // soft slate
      size: 1.5 + Math.random() * 3,
      life: 15 + Math.random() * 15
    };
    particlesRef.current.push(p);
  };

  // Core Game loop
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper: Draw simple bitmap
    const drawBitmap = (
      bitmap: string[],
      x: number,
      y: number,
      pScale: number,
      color: string,
      hasUnderColor: boolean = false
    ) => {
      const scale = pScale;
      bitmap.forEach((row, rIdx) => {
        for (let cIdx = 0; cIdx < row.length; cIdx++) {
          const char = row[cIdx];
          if (char === 'X' || char === 'O') {
            ctx.fillStyle = char === 'O' ? '#ffffff' : color;
            ctx.fillRect(
              Math.floor(x + cIdx * scale),
              Math.floor(y + rIdx * scale),
              Math.ceil(scale),
              Math.ceil(scale)
            );
          } else if (hasUnderColor && char === '.') {
            // Can be used for custom silhouettes
          }
        }
      });
    };

    // Helper: Bounding Box Intersection collision detection
    const isColliding = (r1: { x: number; y: number; w: number; h: number }, r2: { x: number; y: number; w: number; h: number }) => {
      // Reduce the hitbox bounds slightly (padding) for fairer hitbox forgiveness!
      const padWidth1 = r1.w * 0.15;
      const padHeight1 = r1.h * 0.1;
      const padWidth2 = r2.w * 0.15;
      const padHeight2 = r2.h * 0.1;

      return (
        r1.x + padWidth1 < r2.x + r2.w - padWidth2 &&
        r1.x + r1.w - padWidth1 > r2.x + padWidth2 &&
        r1.y + padHeight1 < r2.y + r2.h - padHeight2 &&
        r1.y + r1.h - padHeight1 > r2.y + padHeight2
      );
    };

    // Update and Draw Frame
    const update = () => {
      // 0. CLEAR BACKGROUND PREVIEW
      ctx.fillStyle = '#0f172a'; // Deep retro cosmic charcoal
      ctx.fillRect(0, 0, 800, 250);

      // PARALLAX STARS/GRID LAYER
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      
      // Horizontal gridlines
      for (let g = 30; g < 200; g += 30) {
        ctx.beginPath();
        ctx.moveTo(0, g);
        ctx.lineTo(800, g);
        ctx.stroke();
      }

      // Vertical moving gridlines (simulates parallax scroll)
      const gridScroll = (scrollRef.current * 0.3) % 40;
      for (let g = -gridScroll; g < 800; g += 40) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, 200);
        ctx.stroke();
      }

      // 1. UPDATE LOGIC (ONLY IF PLAYING)
      if (statusRef.current === 'PLAYING') {
        scrollRef.current += speedRef.current;
        scoreRef.current += 1;
        if (scoreRef.current % 5 === 0) {
          onScoreChange(Math.floor(scoreRef.current / 5));
        }

        // Play high score chime
        if (scoreRef.current > 0 && scoreRef.current % 500 === 0) {
          playSound('SCORE');
        }

        // Slowly accelerate game speed as score goes higher
        speedRef.current = 6.0 + Math.floor(scoreRef.current / 400) * 0.55;

        // Determine input decision (Merge keyboard or Teachable Machine)
        const decisionAction = inputMode === 'TEACHABLE_MACHINE' && activeAction !== 'NONE'
          ? activeAction
          : keyboardRef.current;

        // A. Handle Player states
        const player = playerRef.current;
        player.animTimer += 1;
        if (player.animTimer % 6 === 0) {
          player.animFrame = (player.animFrame + 1) % 2;
        }

        // Jump physics
        if (decisionAction === 'JUMP' && !player.isJumping) {
          player.vy = -11.5;
          player.isJumping = true;
          player.isCrouching = false;
          playSound('JUMP');
        }

        // Gravity pull
        if (player.isJumping) {
          // Accelerate down faster if they are holding down/crouch pose mid-jump (Fast drop!)
          const extraGravity = decisionAction === 'CROUCH' ? 1.4 : 0.6;
          player.vy += extraGravity;
          player.y += player.vy;

          if (player.y >= player.groundY) {
            player.y = player.groundY;
            player.vy = 0;
            player.isJumping = false;
          }
        }

        // Crouch physics (firmly on ground)
        if (!player.isJumping) {
          if (decisionAction === 'CROUCH') {
            if (!player.isCrouching) {
              playSound('CROUCH');
            }
            player.isCrouching = true;
            // Shrunken height bounding size
            player.width = 20 * PIXEL_SCALE;
            player.height = 12 * PIXEL_SCALE;
          } else {
            player.isCrouching = false;
            player.width = 16 * PIXEL_SCALE;
            player.height = 17 * PIXEL_SCALE;
          }
        }

        // Spawn ground dust if running
        if (!player.isJumping && Math.random() < 0.25) {
          spawnDust(
            player.x + 4,
            player.isCrouching ? player.groundY + 12 * PIXEL_SCALE : player.groundY + 16 * PIXEL_SCALE
          );
        }

        // B. Obstacles updates
        obstacleTimerRef.current += 1;
        // Frequency of obstacles varies dynamically
        const minSpawnInterval = 75;
        const spawnVariance = Math.max(25, 130 - Math.floor(scoreRef.current / 300) * 10);
        
        if (obstacleTimerRef.current > minSpawnInterval + Math.random() * spawnVariance) {
          spawnObstacle();
          obstacleTimerRef.current = 0;
        }

        obstaclesRef.current = obstaclesRef.current.map((obs) => {
          return {
            ...obs,
            x: obs.x - speedRef.current
          };
        }).filter((obs) => {
          // If passed, score verification
          return obs.x + obs.width > -10;
        });

        // C. Collisions Check
        const playerBox = {
          x: player.x,
          y: player.isCrouching ? player.y + (17 - 12) * PIXEL_SCALE : player.y,
          w: player.width,
          h: player.height
        };

        obstaclesRef.current.forEach((obs) => {
          const obsY = obs.type === 'PTERODACTYL' 
            ? player.groundY - obs.yOffset 
            : player.groundY + (17 * PIXEL_SCALE) - obs.height;

          const obsBox = {
            x: obs.x,
            y: obsY,
            w: obs.width,
            h: obs.height
          };

          if (isColliding(playerBox, obsBox)) {
            // BOOM! CRASH!
            onStatusChange('GAME_OVER');
            playSound('CRASH');

            // Spawn explosion shards
            for (let i = 0; i < 40; i++) {
              particlesRef.current.push({
                x: player.x + player.width / 2 + (Math.random() - 0.5) * 30,
                y: player.y + player.height / 2 + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 3,
                color: Math.random() > 0.5 ? '#10b981' : '#ef4444', // debris colors
                size: 2 + Math.random() * 5,
                life: 30 + Math.random() * 40
              });
            }
          }
        });
      }

      // 2. DRAW GROUND LINE
      ctx.fillStyle = '#059669'; // High-contrast green path
      // Grass deck
      ctx.fillRect(0, 222, 800, 3);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, 225, 800, 25);

      // Procedural pixel dots on the scrolling ground
      ctx.fillStyle = '#0f766e';
      const groundDotScroll = scrollRef.current % 120;
      for (let gx = -groundDotScroll; gx < 800; gx += 120) {
        ctx.fillRect(gx + 10, 230, 6, 2);
        ctx.fillRect(gx + 40, 238, 4, 2);
        ctx.fillRect(gx + 75, 232, 8, 2);
        ctx.fillRect(gx + 110, 240, 5, 2);
      }

      // 3. DRAW BACKGROUND CLOUDS
      ctx.fillStyle = '#1e293b';
      const cloudScroll = (scrollRef.current * 0.1) % 400;
      for (let cx = -cloudScroll; cx < 800; cx += 400) {
        // Pixelated cloud clusters
        ctx.fillRect(cx + 80, 40, 50, 10);
        ctx.fillRect(cx + 100, 30, 70, 10);
        ctx.fillRect(cx + 150, 40, 40, 10);
        ctx.fillRect(cx + 90, 50, 110, 10);

        ctx.fillRect(cx + 280, 80, 40, 8);
        ctx.fillRect(cx + 295, 72, 50, 8);
        ctx.fillRect(cx + 290, 88, 70, 8);
      }

      // 4. DRAW PARTICLES (dust, crash debris)
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // 5. DRAW OBSTACLES
      obstaclesRef.current.forEach((obs) => {
        const obsY = obs.type === 'PTERODACTYL' 
          ? playerRef.current.groundY - obs.yOffset 
          : playerRef.current.groundY + (17 * PIXEL_SCALE) - obs.height;

        let bitmap = CACTUS_S;
        let color = '#ea580c'; // Warm orange for cacti

        if (obs.type === 'CACTUS_L') {
          bitmap = CACTUS_L;
          color = '#ea580c';
        } else if (obs.type === 'ROCK') {
          bitmap = ROCK_BITMAP;
          color = '#94a3b8'; // Slate grey
        } else if (obs.type === 'PTERODACTYL') {
          // Flapping wing cycles based on frame scroll speed
          const wingState = Math.floor(scrollRef.current / 12) % 2;
          bitmap = wingState === 0 ? BIRD_WING_UP : BIRD_WING_DOWN;
          color = '#f43f5e'; // Rose pink
        }

        drawBitmap(bitmap, obs.x, obsY, PIXEL_SCALE, color);
      });

      // 6. DRAW PLAYER CHARACTER
      const player = playerRef.current;
      if (statusRef.current !== 'GAME_OVER') {
        let dinoBitmap = DINO_RUN1;
        if (player.isJumping) {
          dinoBitmap = DINO_JUMP;
        } else if (player.isCrouching) {
          dinoBitmap = player.animFrame === 0 ? DINO_CROUCH1 : DINO_CROUCH2;
        } else {
          dinoBitmap = player.animFrame === 0 ? DINO_RUN1 : DINO_RUN2;
        }

        // Draw Player - Neon Emerald
        const drawY = player.isCrouching ? player.y + (17 - 12) * PIXEL_SCALE : player.y;
        drawBitmap(dinoBitmap, player.x, drawY, PIXEL_SCALE, '#10b981');
      }

      // 7. HUD INFO & GAMESTATE OVERLAYS
      if (statusRef.current === 'IDLE') {
        ctx.fillStyle = 'rgba(13, 13, 21, 0.93)';
        ctx.fillRect(0, 0, 800, 250);

        ctx.font = '900 24px monospace';
        ctx.fillStyle = '#00ff41';
        ctx.textAlign = 'center';
        ctx.fillText('NEURAL RUNNER MODULE', 400, 85);

        ctx.font = '700 12px monospace';
        ctx.fillStyle = '#a1a1aa';
        if (inputMode === 'KEYBOARD') {
          ctx.fillText('PRESS [ SPACE ] OR [ UP ARROW ] TO ACTIVATE JUMP GATE', 400, 130);
          ctx.fillText('PRESS [ DOWN ARROW ] TO TRIGGER DE COMPRESSION CROUCH', 400, 155);
        } else {
          ctx.fillText(`TRIGGER YOUR GESTURE JUMP MODEL COMMAND TO INITIALIZE`, 400, 130);
          ctx.fillText(`PERFORM CROUCH GESTURE TO DESCEND QUICKLY`, 400, 155);
        }

        // Animated pointer hand
        const handBob = Math.sin(Date.now() / 120) * 4;
        ctx.font = '22px sans-serif';
        ctx.fillText('⚡', 400, 195 + handBob);
      }

      if (statusRef.current === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(13, 13, 21, 0.94)';
        ctx.fillRect(0, 0, 800, 250);

        ctx.font = '900 38px monospace';
        ctx.fillStyle = '#ff3e3e'; // cyberpunk red
        ctx.textAlign = 'center';
        ctx.fillText('CONNECTION LOST', 400, 95);

        ctx.font = '700 14px monospace';
        ctx.fillStyle = '#00ff41';
        ctx.fillText(`PULSE RATING: ${Math.floor(scoreRef.current / 5)} POINTS`, 400, 135);

        ctx.font = '700 11px monospace';
        ctx.fillStyle = '#ff3e3e';
        ctx.fillText('CLICK RETRO SCREEN OR TAP [ SPACE ] TO RE-ESTABLISH KERNEL', 400, 175);
      }

      animationId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [inputMode, activeAction]);

  // Click on canvas to restart if game over or idle
  const handleCanvasClick = () => {
    if (status === 'IDLE' || status === 'GAME_OVER') {
      onStatusChange('PLAYING');
      resetGameStats();
    }
  };

  return (
    <div className="relative border-4 border-[#333] bg-cyber-dark shadow-cyber-heavy overflow-hidden select-none">
      <canvas
        id="retro-game-viewport"
        ref={canvasRef}
        width={800}
        height={250}
        onClick={handleCanvasClick}
        className="w-full h-auto cursor-pointer block"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Inputs Badge overlay */}
      <div className="absolute top-3 left-4 flex gap-2">
        <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest border-2 border-cyber-green bg-cyber-dark text-cyber-green shadow">
          SYS_IN: {inputMode === 'KEYBOARD' ? 'KEYBOARD' : 'CUSTOM_AI'}
        </span>
        {status === 'PLAYING' && (
          <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest border-2 border-cyber-green/50 bg-cyber-green/10 text-cyber-green shadow animate-pulse">
            CLOCK: {speedRef.current.toFixed(1)}x
          </span>
        )}
      </div>

      {/* Live action trigger indicator */}
      <div className="absolute top-3 right-4 flex gap-3 items-center">
        {/* Real-time Indicator overlay */}
        <div className="flex gap-1.5 text-xs font-semibold">
          <span className="text-slate-500 font-bold">MAX:</span>
          <span className="text-cyber-green font-black">{highScore}</span>
        </div>

        {/* Input actuate logger */}
        <div className="flex gap-1.5">
          <span
            className={`px-2 py-0.5 text-[9px] font-black border transition-all ${
              (inputMode === 'TEACHABLE_MACHINE' ? activeAction : pressedKeyAction) === 'JUMP'
                ? 'bg-cyber-green border-cyber-green text-cyber-dark shadow-cyber'
                : 'bg-cyber-dark border-[#333] text-slate-700'
            }`}
          >
            ▲ JUMP
          </span>
          <span
            className={`px-2 py-0.5 text-[9px] font-black border transition-all ${
              (inputMode === 'TEACHABLE_MACHINE' ? activeAction : pressedKeyAction) === 'CROUCH'
                ? 'bg-cyber-amber border-cyber-amber text-cyber-dark'
                : 'bg-cyber-dark border-[#333] text-slate-700'
            }`}
          >
            ▼ CROUCH
          </span>
        </div>
      </div>
    </div>
  );
}
