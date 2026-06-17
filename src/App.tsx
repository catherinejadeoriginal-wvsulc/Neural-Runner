/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Gamepad2, Volume2, VolumeX, Keyboard, Camera, Trophy, BookOpen, ExternalLink, HelpCircle, ArrowRight, Play, Pause, Activity } from 'lucide-react';
import { useTeachableMachine } from './hooks/useTeachableMachine';
import GameCanvas from './components/GameCanvas';
import MappingPanel from './components/MappingPanel';
import { GameStatus, InputMode } from './types';
import { sounds } from './utils/audio';

export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tm_platformer_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [inputMode, setInputMode] = useState<InputMode>('KEYBOARD');
  const [isMuted, setIsMuted] = useState(true); // Default muted to comply with browser audio restrictions

  // Connect our custom Teachable Machine hook
  const tm = useTeachableMachine();

  // Load sound configurations
  useEffect(() => {
    // Initialise audio state based on current settings
    sounds.toggle(!isMuted);
  }, [isMuted]);

  // Sync high score on score change
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem('tm_platformer_highscore', score.toString());
      } catch (e) {
        console.warn("Storage quota exceeded", e);
      }
    }
  }, [score, highScore]);

  // Auto-switch input mode feedback helper
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    if (mode === 'TEACHABLE_MACHINE' && tm.isSimulator) {
      // Guide the user when they toggle TM mode
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
  };

  const handlePauseToggle = () => {
    if (status === 'PLAYING') {
      setStatus('PAUSED');
    } else if (status === 'PAUSED') {
      setStatus('PLAYING');
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg text-cyber-green flex flex-col font-mono select-none antialiased relative">
      {/* CRT Scanline overlay effect to deliver the digital arcade feel */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.07] crt-scanlines"></div>
      
      {/* 1. ARCHITECTURAL HEADER (Inspired by Neon Runner HUD) */}
      <header className="h-20 border-b-4 border-[#333] flex items-center justify-between px-6 sm:px-10 bg-cyber-panel">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyber-green shadow-cyber"></div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-white animate-pulse">
            Neural Runner v1.1
          </h1>
        </div>

        <div className="flex items-center gap-6 sm:gap-12 text-sm sm:text-lg">
          <div className="font-bold flex items-center gap-1.5">
            <span className="opacity-50 text-slate-400">HI-SCORE:</span> 
            <span className="text-cyber-green font-black">{highScore}</span>
          </div>
          <div className="font-bold flex items-center gap-1.5">
            <span className="opacity-50 text-slate-400">SCORE:</span> 
            <span className="text-white bg-cyber-dark px-3 py-1 border-2 border-[#333] text-glow">{score}</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN GRID WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-8 relative z-10">
        
        {/* TOP LEVEL STATUS CONSOLE HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-cyber-green px-4 py-2 bg-cyber-panel/40">
          <div>
            <span className="text-[10px] font-bold text-cyber-green tracking-widest block uppercase">SYS_KERNEL_LINK</span>
            <span className="text-xs text-slate-300">STABLE FRAME RATES DETECTED: 60FPS</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Audio Toggle control */}
            <button
              id="audio-toggle-btn"
              type="button"
              onClick={handleMuteToggle}
              className={`px-3 py-1.5 border-2 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isMuted
                  ? 'bg-cyber-green/15 border-cyber-green text-cyber-green shadow-cyber'
                  : 'bg-cyber-dark border-[#333] text-slate-500 hover:text-slate-300'
              }`}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isMuted ? 'MUTE [SOUND_OFF]' : 'ACTIVE [SOUND_ON]'}</span>
            </button>

            {/* Pause/Resume button — only shown during active/paused game */}
            {(status === 'PLAYING' || status === 'PAUSED') && (
              <button
                id="pause-toggle-btn"
                type="button"
                onClick={handlePauseToggle}
                className={`px-3 py-1.5 border-2 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  status === 'PAUSED'
                    ? 'bg-cyber-red/15 border-cyber-red text-cyber-red shadow-cyber-red animate-pulse'
                    : 'bg-cyber-dark border-[#333] text-slate-400 hover:border-cyber-red hover:text-cyber-red'
                }`}
                title={status === 'PAUSED' ? 'Resume Game' : 'Pause Game'}
              >
                {status === 'PAUSED' ? <Play size={13} /> : <Pause size={13} />}
                <span>{status === 'PAUSED' ? '▶ RESUME [PLAY]' : '⏸ PAUSE [BREAK]'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Platformer Canvas & Mode selectors */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* GAME VIEWPORT */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                  <Activity size={12} className="text-cyber-green" />
                  RENDER_STAGE_ACTIVE
                </span>
                <span className="text-[10px] text-slate-500">SCALE: 2.5x PIX</span>
              </div>

              <GameCanvas
                activeAction={tm.activeAction}
                inputMode={inputMode}
                onScoreChange={setScore}
                onStatusChange={setStatus}
                status={status}
                highScore={highScore}
              />
            </div>

            {/* CONTROLLER MODE CONTAINER */}
            <div className="bg-cyber-panel border-4 border-[#333] p-5 flex flex-col gap-4">
              <h3 className="text-xs font-bold tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 bg-cyber-green"></span>
                CORE INPUT CONTROLLER INTERFACE:
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  id="mode-keyboard"
                  type="button"
                  onClick={() => handleInputModeChange('KEYBOARD')}
                  className={`py-4 px-4 border-2 transition-all cursor-pointer flex flex-col items-center gap-2.5 ${
                    inputMode === 'KEYBOARD'
                      ? 'bg-cyber-dark border-cyber-green text-cyber-green shadow-cyber font-bold'
                      : 'bg-cyber-dark/50 border-[#333] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Keyboard size={18} />
                  <div className="text-center font-bold">
                    <p className="text-xs uppercase">Keyboard (Classic)</p>
                    <p className="text-[9px] opacity-60 mt-0.5">Space / W / DownArrow</p>
                  </div>
                </button>

                <button
                  id="mode-teachable-machine"
                  type="button"
                  onClick={() => handleInputModeChange('TEACHABLE_MACHINE')}
                  className={`py-4 px-4 border-2 transition-all cursor-pointer flex flex-col items-center gap-2.5 ${
                    inputMode === 'TEACHABLE_MACHINE'
                      ? 'bg-cyber-dark border-cyber-green text-cyber-green shadow-cyber font-bold'
                      : 'bg-cyber-dark/50 border-[#333] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Camera size={18} />
                  <div className="text-center font-bold">
                    <p className="text-xs uppercase">Teachable Machine AI</p>
                    <p className="text-[9px] opacity-60 mt-0.5">Custom Gesture / Pose Link</p>
                  </div>
                </button>
              </div>

              {/* Feed logic debugger */}
              <div className="bg-cyber-dark border-2 border-[#333] p-3 text-xs flex justify-between items-center">
                <span className="text-slate-400">ACTUATOR BUS:</span>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 font-bold text-[9px] border ${
                    (inputMode === 'TEACHABLE_MACHINE' ? tm.activeAction : 'NONE') === 'JUMP'
                      ? 'bg-cyber-green/20 border-cyber-green text-cyber-green text-glow'
                      : 'bg-transparent border-[#333] text-slate-600'
                  }`}>
                    JUMP_PULSE
                  </span>
                  <span className={`px-2 py-0.5 font-bold text-[9px] border ${
                    (inputMode === 'TEACHABLE_MACHINE' ? tm.activeAction : 'NONE') === 'CROUCH'
                      ? 'bg-cyber-amber/20 border-cyber-amber text-cyber-amber'
                      : 'bg-transparent border-[#333] text-slate-600'
                  }`}>
                    CROUCH_PULSE
                  </span>
                </div>
              </div>
            </div>

            {/* MANUAL DICTIONARY */}
            <div className="bg-cyber-panel border-4 border-[#333] p-5 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b-2 border-[#333] pb-2">
                <BookOpen size={13} className="text-cyber-green" />
                SYSTEM OPERATIONS GUIDE
              </h4>

              <div className="space-y-3 text-xs text-slate-400 leading-relaxed font-mono">
                <div className="flex gap-3 items-start">
                  <span className="text-cyber-green font-bold shrink-0">&gt;&gt;</span>
                  <p>In <strong className="text-white">Keyboard mode</strong>, initiate and jump with <strong className="text-cyber-green">[Space] / [ArrowUp] / [W]</strong>. React and duck under flying pterodactyls using <strong className="text-cyber-green">[ArrowDown] / [S]</strong>.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-cyber-green font-bold shrink-0">&gt;&gt;</span>
                  <p>In <strong className="text-white">AI mode</strong>, calibrate and hook trained outputs. Hold Crouch while air-bound to instantly swoop down! (Custom fast-fall gravity).</p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Calibration HUD Console */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <MappingPanel
              isScriptsLoaded={tm.isScriptsLoaded}
              isLoading={tm.isLoading}
              isWebcamActive={tm.isWebcamActive}
              isSimulator={tm.isSimulator}
              error={tm.error}
              classes={tm.classes}
              activeAction={tm.activeAction}
              videoRef={tm.videoRef}
              loadModel={tm.loadModel}
              startWebcam={tm.startWebcam}
              stopWebcam={tm.stopWebcam}
              setSimulatorMode={tm.setSimulatorMode}
              updateClassMapping={tm.updateClassMapping}
              updateClassThreshold={tm.updateClassThreshold}
              updateSimulatorProbability={tm.updateSimulatorProbability}
            />
          </div>

        </div>

        {/* 3. INSTRUCTIONAL TUTORIAL PANEL */}
        <section id="teachable-machine-guide" className="bg-cyber-panel border-4 border-[#333] p-6 flex flex-col gap-5 mt-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b-2 border-[#333] pb-4">
            <div>
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                📂 Neural Model Export Pipeline
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Train your model in the official Teachable Machine suite, then wire the telemetry link below.
              </p>
            </div>
            
            <a
              href="https://teachablemachine.withgoogle.com/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-cyber-green hover:bg-emerald-400 text-cyber-dark font-black text-xs rounded shadow-cyber transition-all flex items-center gap-1.5 cursor-pointer self-stretch md:self-auto text-center justify-center"
            >
              LAUNCH TEACHABLE MACHINE
              <ExternalLink size={13} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed">
            
            <div className="flex flex-col gap-2.5 p-4 bg-cyber-dark border-2 border-[#333]">
              <span className="text-xs font-black text-cyber-green">[01] DATASET COLLECTION</span>
              <h3 className="font-bold text-white">Record Physical Poses</h3>
              <p className="text-slate-400 text-[11px]">
                Create a Pose or Image project. Map three discrete classes:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li><strong className="text-white">Neutral (Ready):</strong> Comfortable standing/sitting stance</li>
                <li><strong className="text-white">Jump Command:</strong> Arms raised high</li>
                <li><strong className="text-white">Crouch Command:</strong> Lower chin or lean down</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2.5 p-4 bg-cyber-dark border-2 border-[#333]">
              <span className="text-xs font-black text-cyber-green">[02] TRAINING ENGINE</span>
              <h3 className="font-bold text-white">Train & Export Project</h3>
              <p className="text-slate-400 text-[11px]">
                Initiate the model compilation. Wait for completion, then select <strong className="text-white">Export Model</strong>:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>Leverage the standard Tensorflow.js file system</li>
                <li>Press <strong className="text-white">Upload (shareable link)</strong> to host the metadata</li>
                <li>Copy the generated code URL once ready</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2.5 p-4 bg-cyber-dark border-2 border-[#333]">
              <span className="text-xs font-black text-cyber-green">[03] CALIBRATOR HOOK</span>
              <h3 className="font-bold text-white">Load live telemetry</h3>
              <p className="text-slate-400 text-[11px]">
                Swap into the Teachable Machine tab on the right calibration deck:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>Paste the share link. The hook auto-extracts defined classes</li>
                <li>Select the mapping target for each class and dial standard thresholds!</li>
              </ul>
            </div>

          </div>
        </section>

      </main>

      {/* 4. FOOTER CREDITS */}
      <footer className="h-16 border-t-4 border-[#333] bg-cyber-dark px-6 flex items-center justify-between mt-auto">
        <span className="text-slate-600 text-[10px] tracking-wider uppercase">
          Neural Runner Engine v1.1
        </span>
        <span className="text-slate-600 text-[10px] tracking-wider">
          KERNEL ONLINE // DEPLOYED_STAGE
        </span>
      </footer>

    </div>
  );
}
