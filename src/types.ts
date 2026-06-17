export type GameAction = 'NONE' | 'JUMP' | 'CROUCH';
export type InputMode = 'KEYBOARD' | 'TEACHABLE_MACHINE';
export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface ModelClassMapping {
  className: string;
  mappedAction: GameAction;
  threshold: number; // 0.0 to 1.0 confidence
  currentProbability: number; // 0.0 to 1.0 confidence from live frame
}

export interface HighScore {
  score: number;
  date: string;
}

export interface Obstacle {
  id: number;
  x: number;
  width: number;
  height: number;
  type: 'CACTUS_S' | 'CACTUS_L' | 'PTERODACTYL' | 'ROCK';
  yOffset: number; // For flying birds (lower, middle, upper)
  passed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}
