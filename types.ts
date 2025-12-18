
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LEVEL_TRANSITION = 'LEVEL_TRANSITION',
  GAME_OVER = 'GAME_OVER'
}

export enum EnemyType {
  DRONE = 'DRONE',
  STINGER = 'STINGER',
  COMMANDER = 'COMMANDER'
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2D;
  width: number;
  height: number;
  active: boolean;
}

export interface Bullet extends Entity {
  velocity: Vector2D;
  isPlayerBullet: boolean;
}

export interface Enemy extends Entity {
  type: EnemyType;
  health: number;
  points: number;
  originPos: Vector2D;
  isDiving: boolean;
  divePhase: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface GameStats {
  score: number;
  lives: number;
  level: number;
  accuracy: number;
  shotsFired: number;
  hits: number;
}
