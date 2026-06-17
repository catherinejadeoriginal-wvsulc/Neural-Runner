/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, RefreshCw, Layers, ShieldAlert, Cpu, Info, Sliders, Play, Pause, AlertTriangle } from 'lucide-react';
import { GameAction, ModelClassMapping } from '../types';

interface MappingPanelProps {
  isScriptsLoaded: boolean;
  isLoading: boolean;
  isWebcamActive: boolean;
  isSimulator: boolean;
  error: string | null;
  classes: ModelClassMapping[];
  activeAction: GameAction;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  loadModel: (url: string) => Promise<void>;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  setSimulatorMode: (active: boolean) => void;
  updateClassMapping: (className: string, action: GameAction) => void;
  updateClassThreshold: (className: string, threshold: number) => void;
  updateSimulatorProbability: (className: string, probability: number) => void;
}

export default function MappingPanel({
  isScriptsLoaded,
  isLoading,
  isWebcamActive,
  isSimulator,
  error,
  classes,
  activeAction,
  videoRef,
  loadModel,
  startWebcam,
  stopWebcam,
  setSimulatorMode,
  updateClassMapping,
  updateClassThreshold,
  updateSimulatorProbability
}: MappingPanelProps) {
  const [modelInputUrl, setModelInputUrl] = useState('');

  const submitLoadModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (modelInputUrl.trim()) {
      loadModel(modelInputUrl.trim());
    }
  };

  // Helper template models to make testing quick
  const useDemoModelUrl = (url: string) => {
    setModelInputUrl(url);
    loadModel(url);
  };

  return (
    <div id="mapping-panel-container" className="flex flex-col gap-6 bg-cyber-panel border-4 border-[#333] p-5 shadow-cyber-heavy text-cyber-green">
      
      {/* Tab Switcher: Real Teachable Machine vs Interactive Simulator */}
      <div className="flex bg-cyber-dark p-1 border-2 border-[#333]">
        <button
          id="tab-simulator"
          type="button"
          onClick={() => setSimulatorMode(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono font-bold transition-all cursor-pointer ${
            isSimulator
              ? 'bg-cyber-amber/20 text-cyber-amber border-2 border-cyber-amber'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Cpu size={14} />
          CALIBRATE SIMULATOR
        </button>
        <button
          id="tab-real-model"
          type="button"
          onClick={() => {
            setSimulatorMode(false);
            if (!isWebcamActive) startWebcam();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono font-bold transition-all cursor-pointer ${
            !isSimulator
              ? 'bg-cyber-green/20 text-cyber-green border-2 border-cyber-green'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Layers size={14} />
          WEBCAM TELEMETRY
        </button>
      </div>

      {/* Simulator Guidance Mode */}
      {isSimulator && (
        <div className="bg-cyber-dark/80 border-2 border-[#333] p-4 flex gap-3 text-slate-300 text-xs leading-relaxed">
          <Info size={20} className="text-cyber-amber shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-cyber-amber mb-1 uppercase">Simulator active [&gt;&gt; Ready]</p>
            Adjust live confidence levels using sliders below to mock active pose triggers without compiling camera frames!
          </div>
        </div>
      )}

      {/* Camera and Real-model panels strictly shown on Teachable Machine Mode */}
      {!isSimulator && (
        <div className="flex flex-col gap-5">
          {/* 1. URL Form Input */}
          <form onSubmit={submitLoadModel} className="flex flex-col gap-2">
            <label id="model-url-label" className="text-[10px] font-bold tracking-wider text-slate-400">
              TEACHABLE MACHINE CLOUD ENDPOINT:
            </label>
            <div className="flex gap-2">
              <input
                id="model-url-input"
                type="url"
                value={modelInputUrl}
                onChange={(e) => setModelInputUrl(e.target.value)}
                placeholder="https://teachablemachine.withgoogle.com/models/..."
                className="flex-1 px-3 py-2 bg-cyber-dark border-2 border-[#333] text-sm text-white placeholder-slate-700 font-mono focus:outline-none focus:border-cyber-green"
                disabled={isLoading}
              />
              <button
                id="load-model-btn"
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-cyber-green hover:bg-emerald-400 font-black text-xs text-cyber-dark shadow-cyber transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                {isLoading ? 'CONNECTING...' : 'HOOK'}
              </button>
            </div>
            
            {/* Quick Demo Assist */}
            <div className="flex gap-2 items-center flex-wrap text-[10px] text-slate-500 mt-1">
              <span>Need test data?</span>
              <button
                type="button"
                onClick={() => useDemoModelUrl('https://teachablemachine.withgoogle.com/models/C5L7I1sZk/')}
                className="text-cyber-green font-bold hover:underline cursor-pointer"
              >
                [LOAD PRE-TRAINED GESTURES]
              </button>
            </div>
          </form>

          {/* 2. Webcam Video Frame element */}
          <div className="self-center flex flex-col items-center gap-3 w-full">
            <div className="relative aspect-video w-full max-w-[320px] border-4 border-[#333] bg-cyber-dark overflow-hidden flex items-center justify-center">
              {/* Actual HTML5 video target */}
              <video
                id="webcam-camera-render"
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover scale-x-[-1] ${isWebcamActive ? 'block' : 'hidden'}`}
              />
              
              {!isWebcamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <Camera size={24} className="text-slate-700 animate-pulse" />
                  <span className="text-[10px] text-slate-600">VIDEO FEED SUSPENDED</span>
                </div>
              )}

              {/* Scanning Overlay Grid */}
              {isWebcamActive && (
                <div id="camera-scan-grid" className="absolute inset-0 border border-cyber-green/10 pointer-events-none">
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyber-green/20 animate-pulse" />
                  <div className="absolute left-1/2 top-0 w-[1px] h-full bg-cyber-green/20 animate-pulse" />
                </div>
              )}
            </div>

            {/* Webcam Stream Button controls */}
            <div className="flex gap-2 w-full max-w-[320px]">
              {isWebcamActive ? (
                <button
                  id="stop-webcam-btn"
                  type="button"
                  onClick={stopWebcam}
                  className="flex-1 py-1.5 px-3 bg-red-950/20 border-2 border-cyber-red/40 rounded text-[10px] font-bold text-cyber-red flex items-center justify-center gap-1 cursor-pointer transition-all hover:bg-cyber-red/20"
                >
                  <Pause size={12} /> SUSPEND_FEED
                </button>
              ) : (
                <button
                  id="start-webcam-btn"
                  type="button"
                  onClick={startWebcam}
                  className="flex-1 py-1.5 px-3 bg-cyber-dark border-2 border-[#333] rounded text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1 cursor-pointer transition-all hover:border-cyber-green hover:text-cyber-green"
                >
                  <Camera size={12} /> INITIALIZE_CAMERA
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Global Class Mappings Section */}
      <div className="flex flex-col gap-3">
        <h3 id="mapping-heading" className="text-xs font-bold tracking-wider text-slate-400 flex items-center gap-1.5 border-b-2 border-[#333] pb-2">
          <Sliders size={13} className="text-cyber-green" />
          ALGORITHM_THRESHOLD_CALIBRATOR
        </h3>

        {/* Global Error message container */}
        {error && (
          <div className="bg-cyber-red/10 border-2 border-cyber-red/50 rounded p-3 text-cyber-red text-xs flex gap-2">
            <ShieldAlert size={16} className="text-cyber-red shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {classes.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-600">
            CONNECT DEVICE CLOUD LINK TO PARSE GESTURE CLASSMAP.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {classes.map((cls) => {
              const probabilityPercent = Math.min(100, Math.max(0, cls.currentProbability * 100));
              const isTriggerActive = cls.currentProbability >= cls.threshold && cls.mappedAction !== 'NONE';
              
              return (
                <div
                  key={cls.className}
                  className={`flex flex-col gap-2.5 p-3.5 bg-cyber-dark border-2 transition-all ${
                    isTriggerActive
                      ? 'border-cyber-green/60 shadow-[0_0_12px_rgba(0,255,65,0.12)] bg-cyber-green/5'
                      : 'border-[#333]'
                  }`}
                >
                  {/* Top: Class identifier label & dynamic Trigger flag */}
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-white capitalize break-all">
                      &gt; {cls.className}
                    </span>

                    {isTriggerActive && (
                      <span className="text-[8px] font-bold tracking-widest bg-cyber-green text-cyber-dark px-1.5 py-0.5 shadow-cyber">
                        TRIGGERED
                      </span>
                    )}
                  </div>

                  {/* Confidence metrics visual bars */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>CONF_LEVEL:</span>
                      <span className={isTriggerActive ? 'text-cyber-green font-bold text-glow' : 'text-slate-400'}>
                        {probabilityPercent.toFixed(0)}%
                      </span>
                    </div>
                    {/* Retro fill block bar */}
                    <div className="relative h-4 w-full bg-cyber-panel border-2 border-[#333] overflow-hidden">
                      {/* Threshold Tick Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-[3px] bg-cyber-red z-10"
                        style={{ left: `${cls.threshold * 100}%` }}
                        title={`Trigger threshold: ${cls.threshold * 100}%`}
                      />
                      <div
                        className={`h-full transition-all duration-75 ${
                          isTriggerActive ? 'bg-cyber-green shadow-[0_0_8px_#00ff41]' : 'bg-slate-700'
                        }`}
                        style={{ width: `${probabilityPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Settings section of Class */}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    
                    {/* Action Select mapping tool */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500">
                        GATE_ACTION / OUT:
                      </span>
                      <select
                        value={cls.mappedAction}
                        onChange={(e) => updateClassMapping(cls.className, e.target.value as GameAction)}
                        className="px-2 py-1 bg-cyber-panel border-2 border-[#333] text-[10px] font-bold text-cyber-green rounded cursor-pointer hover:border-cyber-green focus:outline-none"
                      >
                        <option value="NONE">Neutral / Run</option>
                        <option value="JUMP">JUMP OVER</option>
                        <option value="CROUCH">CROUCH DOWN</option>
                      </select>
                    </div>

                    {/* Action Activation threshold Slider config */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>MIN_CONF:</span>
                        <span className="text-cyber-red font-bold">{(cls.threshold * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.40"
                        max="0.98"
                        step="0.02"
                        value={cls.threshold}
                        onChange={(e) => updateClassThreshold(cls.className, parseFloat(e.target.value))}
                        className="w-full h-1 bg-cyber-panel appearance-none cursor-pointer accent-cyber-red mt-2"
                      />
                    </div>

                  </div>

                  {/* Simulator slide adjustments */}
                  {isSimulator && (
                    <div className="flex flex-col gap-1 border-t-2 border-[#333] pt-2.5 mt-1">
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>SIMULATE TELEMETRY CONFIDENCE:</span>
                        <span className="text-cyber-green">{(cls.currentProbability * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.00"
                        max="1.00"
                        step="0.01"
                        value={cls.currentProbability}
                        onChange={(e) => updateSimulatorProbability(cls.className, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-cyber-panel border border-[#333] appearance-none cursor-pointer accent-cyber-green mt-1"
                      />
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
