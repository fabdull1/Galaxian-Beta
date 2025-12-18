
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, GameStats } from './types';
import { getTacticalAdvice } from './services/geminiService';
import { audioManager } from './services/audioService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [advice, setAdvice] = useState<string>("SYSTEMS ONLINE. PREPARE FOR DEPLOYMENT.");
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('galaxian-highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const handleStart = () => {
    audioManager.init(); // Initialize audio on user gesture
    audioManager.playLevelUp();
    setScore(0);
    setLevel(1);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('galaxian-highscore', finalScore.toString());
    }
    setGameState(GameState.GAME_OVER);
  };

  const handleLevelComplete = async (stats: GameStats) => {
    setGameState(GameState.LEVEL_TRANSITION);
    setScore(stats.score);
    setIsLoadingAdvice(true);
    const newAdvice = await getTacticalAdvice(stats);
    setAdvice(newAdvice);
    setIsLoadingAdvice(false);
  };

  const nextLevel = () => {
    audioManager.playLevelUp();
    setLevel(prev => prev + 1);
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-1/4 bg-gradient-to-b from-purple-500 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-cyan-500 to-transparent"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 rounded-lg p-8 text-center backdrop-blur-sm">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 retro-text text-cyan-400">GALAXIAN</h1>
            <h2 className="text-2xl md:text-4xl font-bold mb-8 text-purple-500">VANGUARD</h2>
            
            <div className="mb-8 space-y-2">
              <p className="text-yellow-400 text-sm">HIGH SCORE: {highScore}</p>
              <p className="text-gray-400 text-xs">USE ARROW KEYS OR WASD TO MOVE</p>
              <p className="text-gray-400 text-xs">SPACE TO FIRE</p>
            </div>

            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white border-4 border-white transition-all transform hover:scale-105 active:scale-95 font-bold"
            >
              LAUNCH INTERCEPTOR
            </button>
            
            <div className="mt-8 text-xs text-cyan-200/50 animate-pulse">
              [ AI ADVISOR STANDING BY ]
            </div>
          </div>
        )}

        {gameState === GameState.LEVEL_TRANSITION && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 rounded-lg p-8 text-center">
            <h2 className="text-4xl font-bold mb-4 text-green-400">WAVE CLEARED</h2>
            <div className="bg-gray-900 border-2 border-green-900 p-6 max-w-md mb-8">
              <p className="text-xs text-green-600 mb-2 font-mono uppercase">Vanguard Tactical Link:</p>
              <p className="text-lg italic text-white min-h-[3rem]">
                {isLoadingAdvice ? "ANALYZING COMBAT DATA..." : `"${advice}"`}
              </p>
            </div>
            <button 
              onClick={nextLevel}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white border-2 border-white"
            >
              NEXT SECTOR
            </button>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-950/90 rounded-lg p-8 text-center">
            <h2 className="text-6xl font-bold mb-4 text-red-500">LOST</h2>
            <p className="text-xl mb-2">FINAL SCORE: {score}</p>
            <p className="text-sm text-yellow-500 mb-8">HIGH SCORE: {highScore}</p>
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white border-2 border-white"
            >
              REDEPLOY PILOT
            </button>
          </div>
        )}

        <GameCanvas 
          gameState={gameState} 
          onGameOver={handleGameOver} 
          onLevelComplete={handleLevelComplete}
          level={level}
        />

        <div className="w-full max-w-[800px] mt-4 p-4 bg-gray-900/50 border-l-4 border-cyan-500 flex items-start gap-4 backdrop-blur-md">
          <div className="w-12 h-12 flex-shrink-0 bg-cyan-500/20 border border-cyan-500 flex items-center justify-center">
             <div className="w-8 h-8 bg-cyan-400 animate-pulse rounded-full opacity-50"></div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] text-cyan-500 font-mono">ADVISOR // VANGUARD_CONTROL</p>
              <div className="text-[8px] text-cyan-500/50 flex items-center gap-2">
                AUDIO_ACTIVE <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-mono">
               {gameState === GameState.PLAYING ? "Engage the swarm. Watch for diving predators." : "Waiting for mission parameters..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
