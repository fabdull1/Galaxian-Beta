
import React, { useRef, useEffect, useCallback } from 'react';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SPEED, BULLET_SPEED, COLORS, ENEMY_BULLET_SPEED 
} from '../constants';
import { 
  GameState, Enemy, EnemyType, Bullet, Vector2D, Particle, GameStats 
} from '../types';
import { audioManager } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  onGameOver: (score: number) => void;
  onLevelComplete: (stats: GameStats) => void;
  level: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onGameOver, onLevelComplete, level }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const playerPos = useRef<Vector2D>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60 });
  const enemies = useRef<Enemy[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const stats = useRef<GameStats>({
    score: 0, lives: 3, level: level, accuracy: 0, shotsFired: 0, hits: 0
  });
  
  const keys = useRef<{ [key: string]: boolean }>({});
  const formationOffset = useRef<number>(0);
  const formationDir = useRef<number>(1);
  const lastShotTime = useRef<number>(0);

  const initLevel = useCallback(() => {
    const newEnemies: Enemy[] = [];
    const rows = 4 + Math.min(level, 4);
    const cols = 8;
    const startX = (CANVAS_WIDTH - (cols * 50)) / 2;
    const startY = 100;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = EnemyType.DRONE;
        let points = 50;
        let color = COLORS.DRONE;

        if (r === 0) {
          type = EnemyType.COMMANDER;
          points = 200;
          color = COLORS.COMMANDER;
        } else if (r < 3) {
          type = EnemyType.STINGER;
          points = 100;
          color = COLORS.STINGER;
        }

        newEnemies.push({
          id: `enemy-${r}-${c}`,
          type,
          health: 1,
          points,
          pos: { x: startX + c * 50, y: startY + r * 45 },
          originPos: { x: startX + c * 50, y: startY + r * 45 },
          width: 30,
          height: 30,
          active: true,
          isDiving: false,
          divePhase: 0,
          color
        });
      }
    }
    enemies.current = newEnemies;
  }, [level]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      initLevel();
    }
  }, [gameState, level, initLevel]);

  const spawnExplosion = (x: number, y: number, color: string) => {
    audioManager.playExplosion();
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        color
      });
    }
  };

  const handleInput = () => {
    if (keys.current['ArrowLeft'] || keys.current['a']) {
      playerPos.current.x = Math.max(20, playerPos.current.x - PLAYER_SPEED);
    }
    if (keys.current['ArrowRight'] || keys.current['d']) {
      playerPos.current.x = Math.min(CANVAS_WIDTH - 20, playerPos.current.x + PLAYER_SPEED);
    }
    if (keys.current[' '] && Date.now() - lastShotTime.current > 300) {
      bullets.current.push({
        id: `bullet-${Date.now()}`,
        pos: { x: playerPos.current.x, y: playerPos.current.y - 20 },
        width: 4,
        height: 12,
        velocity: { x: 0, y: -BULLET_SPEED },
        isPlayerBullet: true,
        active: true
      });
      stats.current.shotsFired++;
      lastShotTime.current = Date.now();
      audioManager.playShoot();
    }
  };

  const update = (dt: number) => {
    if (gameState !== GameState.PLAYING) return;

    handleInput();

    formationOffset.current += formationDir.current * (0.5 + level * 0.2);
    if (Math.abs(formationOffset.current) > 100) {
      formationDir.current *= -1;
    }

    enemies.current.forEach(enemy => {
      if (!enemy.active) return;

      if (!enemy.isDiving) {
        enemy.pos.x = enemy.originPos.x + formationOffset.current;
        enemy.pos.y = enemy.originPos.y + Math.sin(Date.now() / 1000) * 10;

        if (Math.random() < 0.0005 * (1 + level * 0.5)) {
          enemy.isDiving = true;
          enemy.divePhase = 0;
        }
      } else {
        enemy.divePhase += 0.05;
        enemy.pos.y += 4 + level * 0.5;
        enemy.pos.x += Math.sin(enemy.divePhase * 3) * 5;

        if (Math.random() < 0.02) {
          bullets.current.push({
            id: `ebullet-${Date.now()}-${Math.random()}`,
            pos: { x: enemy.pos.x, y: enemy.pos.y + 15 },
            width: 4,
            height: 10,
            velocity: { x: 0, y: ENEMY_BULLET_SPEED + level * 0.2 },
            isPlayerBullet: false,
            active: true
          });
        }

        if (enemy.pos.y > CANVAS_HEIGHT) {
          enemy.pos.y = -50;
          enemy.isDiving = false;
        }

        const dx = enemy.pos.x - playerPos.current.x;
        const dy = enemy.pos.y - playerPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          enemy.active = false;
          spawnExplosion(playerPos.current.x, playerPos.current.y, COLORS.PLAYER);
          audioManager.playPlayerHit();
          stats.current.lives--;
          if (stats.current.lives <= 0) {
            onGameOver(stats.current.score);
          }
        }
      }
    });

    bullets.current.forEach(bullet => {
      bullet.pos.x += bullet.velocity.x;
      bullet.pos.y += bullet.velocity.y;

      if (bullet.pos.y < 0 || bullet.pos.y > CANVAS_HEIGHT) {
        bullet.active = false;
      }

      if (bullet.isPlayerBullet) {
        enemies.current.forEach(enemy => {
          if (!enemy.active) return;
          const dx = bullet.pos.x - enemy.pos.x;
          const dy = bullet.pos.y - enemy.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            enemy.active = false;
            bullet.active = false;
            stats.current.score += enemy.points;
            stats.current.hits++;
            spawnExplosion(enemy.pos.x, enemy.pos.y, enemy.color);
          }
        });
      } else {
        const dx = bullet.pos.x - playerPos.current.x;
        const dy = bullet.pos.y - playerPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          bullet.active = false;
          spawnExplosion(playerPos.current.x, playerPos.current.y, COLORS.PLAYER);
          audioManager.playPlayerHit();
          stats.current.lives--;
          if (stats.current.lives <= 0) {
            onGameOver(stats.current.score);
          }
        }
      }
    });

    bullets.current = bullets.current.filter(b => b.active);
    
    if (enemies.current.filter(e => e.active).length === 0 && gameState === GameState.PLAYING) {
      onLevelComplete({...stats.current});
    }

    particles.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
    });
    particles.current = particles.current.filter(p => p.life > 0);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
      const y = (Date.now() / 10 + i * 20) % CANVAS_HEIGHT;
      const x = (i * 17) % CANVAS_WIDTH;
      const size = (i % 3) + 1;
      ctx.globalAlpha = 0.3 + (i % 5) / 10;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;

    if (stats.current.lives > 0) {
      ctx.fillStyle = COLORS.PLAYER;
      ctx.beginPath();
      ctx.moveTo(playerPos.current.x, playerPos.current.y - 20);
      ctx.lineTo(playerPos.current.x - 20, playerPos.current.y + 20);
      ctx.lineTo(playerPos.current.x + 20, playerPos.current.y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLORS.PLAYER;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    enemies.current.forEach(enemy => {
      if (!enemy.active) return;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x, enemy.pos.y + 10);
      ctx.lineTo(enemy.pos.x - 12, enemy.pos.y - 10);
      ctx.lineTo(enemy.pos.x + 12, enemy.pos.y - 10);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#000';
      ctx.fillRect(enemy.pos.x - 5, enemy.pos.y - 2, 2, 2);
      ctx.fillRect(enemy.pos.x + 3, enemy.pos.y - 2, 2, 2);
    });

    bullets.current.forEach(bullet => {
      ctx.fillStyle = bullet.isPlayerBullet ? COLORS.BULLET : '#ff4444';
      ctx.fillRect(bullet.pos.x - bullet.width / 2, bullet.pos.y, bullet.width, bullet.height);
    });

    particles.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${stats.current.score}`, 20, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${stats.current.lives}`, CANVAS_WIDTH - 20, 40);
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL: ${stats.current.level}`, CANVAS_WIDTH / 2, 40);
  };

  const loop = useCallback((time: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      update(0);
      draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, onGameOver, onLevelComplete]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="max-w-full max-h-screen object-contain bg-black border-4 border-purple-900 rounded-lg shadow-[0_0_50px_rgba(128,0,128,0.5)]"
    />
  );
};

export default GameCanvas;
