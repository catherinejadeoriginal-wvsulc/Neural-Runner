/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameAction, ModelClassMapping } from '../types';

declare global {
  interface Window {
    tf?: any;
    tmImage?: any;
  }
}

const TF_JS_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js';
const TM_IMAGE_URL = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js';

export function useTeachableMachine() {
  const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isSimulator, setIsSimulator] = useState(true); // Default to simulator so user can try right away!
  const [error, setError] = useState<string | null>(null);

  const [modelURL, setModelURL] = useState('');
  const [classes, setClasses] = useState<ModelClassMapping[]>([
    { className: 'Jump Pose (e.g. Hands Up)', mappedAction: 'JUMP', threshold: 0.82, currentProbability: 0.0 },
    { className: 'Crouch Pose (e.g. Hands Down)', mappedAction: 'CROUCH', threshold: 0.82, currentProbability: 0.0 },
    { className: 'Idle Pose (e.g. Normal stance)', mappedAction: 'NONE', threshold: 0.50, currentProbability: 1.0 }
  ]);

  const [activeAction, setActiveAction] = useState<GameAction>('NONE');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modelRef = useRef<any>(null);
  const loopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load external scripts (Tensorflow + TM Image) on demand
  const loadScripts = async (): Promise<boolean> => {
    if (window.tf && window.tmImage) {
      setIsScriptsLoaded(true);
      return true;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load Tensorflow
      if (!window.tf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = TF_JS_URL;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load TensorFlow.js'));
          document.head.appendChild(script);
        });
      }

      // Load Teachable Machine Image
      if (!window.tmImage) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = TM_IMAGE_URL;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Teachable Machine Image SDK'));
          document.head.appendChild(script);
        });
      }

      setIsScriptsLoaded(true);
      setIsLoading(false);
      return true;
    } catch (e: any) {
      setError(e.message || 'Error loading TensorFlow scripts');
      setIsLoading(false);
      return false;
    }
  };

  // Turn on / off simulator mode
  const setSimulatorMode = (active: boolean) => {
    setIsSimulator(active);
    if (active) {
      // Setup mock classes
      setClasses([
        { className: 'Hands Raised', mappedAction: 'JUMP', threshold: 0.80, currentProbability: 0.0 },
        { className: 'Squatting / Crouching', mappedAction: 'CROUCH', threshold: 0.80, currentProbability: 0.0 },
        { className: 'Standing Neutral', mappedAction: 'NONE', threshold: 0.50, currentProbability: 1.0 }
      ]);
      setError(null);
      stopWebcam();
    } else {
      // Clear mock probabilities
      setClasses([]);
    }
  };

  // Stop Webcam stream
  const stopWebcam = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  }, []);

  // Set up webcam stream
  const startWebcam = async () => {
    try {
      setError(null);
      stopWebcam();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });

      streamRef.current = stream;
      setIsWebcamActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Video play interrupted", e));
      }
    } catch (e: any) {
      console.error(e);
      setError('Camera access denied. Please grant webcam permissions to use Teachable Machine.');
      setIsWebcamActive(false);
    }
  };

  // Load Teachable Machine Model URL
  const loadModel = async (url: string) => {
    if (!url.trim()) {
      setError('Please provide a valid Teachable Machine Model URL.');
      return;
    }

    // Normalise URL to end with a slash
    let formattedUrl = url.trim();
    if (!formattedUrl.endsWith('/')) {
      formattedUrl += '/';
    }

    try {
      setIsLoading(true);
      setError(null);

      // Make sure scripts are loaded
      const success = await loadScripts();
      if (!success) return;

      const modelJsonURL = formattedUrl + 'model.json';
      const metadataJsonURL = formattedUrl + 'metadata.json';

      const loadedModel = await window.tmImage.load(modelJsonURL, metadataJsonURL);
      modelRef.current = loadedModel;

      const labels = loadedModel.getClassLabels() as string[];
      if (!labels || labels.length === 0) {
        throw new Error('No classes found in the provided Teachable Machine model.');
      }

      // Map incoming model's classes to defaults
      const mapped: ModelClassMapping[] = labels.map((label, index) => {
        // Guess default mappings based on common names
        let action: GameAction = 'NONE';
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('jump') || lowerLabel.includes('up') || lowerLabel.includes('raise') || index === 1) {
          action = 'JUMP';
        } else if (lowerLabel.includes('crouch') || lowerLabel.includes('down') || lowerLabel.includes('squat') || index === 2) {
          action = 'CROUCH';
        }

        return {
          className: label,
          mappedAction: action,
          threshold: 0.80,
          currentProbability: 0.0
        };
      });

      setClasses(mapped);
      setModelURL(formattedUrl);
      setIsSimulator(false);
      setIsLoading(false);

      // Instantly open webcam if we aren't active yet
      await startWebcam();
    } catch (e: any) {
      console.error(e);
      setError('Failed to load Teachable Machine model. Verify that you pasted the correct shared URL (e.g. starting with https://teachablemachine.withgoogle.com/models/...).');
      setIsLoading(false);
    }
  };

  // Prediction loop
  const predictLoop = useCallback(async () => {
    if (!isWebcamActive || isSimulator || !modelRef.current || !videoRef.current) {
      return;
    }

    try {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const predictions = await modelRef.current.predict(videoRef.current);
        
        // Match prediction items to configured classes
        setClasses((prevClasses) => {
          const updated = prevClasses.map((cls) => {
            const match = predictions.find((p: any) => p.className === cls.className);
            return {
              ...cls,
              currentProbability: match ? match.probability : 0.0
            };
          });

          // Compute action from updated classes
          evaluateActiveAction(updated);

          return updated;
        });
      }
    } catch (e) {
      console.warn("Prediction frame failed", e);
    }

    loopRef.current = requestAnimationFrame(predictLoop);
  }, [isWebcamActive, isSimulator]);

  // Hook prediction loop execution
  useEffect(() => {
    if (isWebcamActive && !isSimulator && modelRef.current) {
      loopRef.current = requestAnimationFrame(predictLoop);
    }
    return () => {
      if (loopRef.current) {
         cancelAnimationFrame(loopRef.current);
         loopRef.current = null;
      }
    };
  }, [isWebcamActive, isSimulator, predictLoop]);

  // Evaluate which action is mathematically triggered based on probabilities and thresholds
  const evaluateActiveAction = (currentClasses: ModelClassMapping[]) => {
    // Find all classes that exceed their defined threshold and are mapped to a control action
    const candidates = currentClasses.filter(
      (cls) => cls.currentProbability >= cls.threshold && cls.mappedAction !== 'NONE'
    );

    if (candidates.length === 0) {
      setActiveAction('NONE');
      return;
    }

    // If we have candidates, pick the one with the highest confidence / probability!
    const bestCandidate = candidates.reduce((prev, curr) => 
      prev.currentProbability > curr.currentProbability ? prev : curr
    );

    setActiveAction(bestCandidate.mappedAction);
  };

  // Class configuration setters
  const updateClassMapping = (className: string, action: GameAction) => {
    setClasses((prev) => {
      const next = prev.map((cls) => 
        cls.className === className ? { ...cls, mappedAction: action } : cls
      );
      if (isSimulator) {
        evaluateActiveAction(next);
      }
      return next;
    });
  };

  const updateClassThreshold = (className: string, threshold: number) => {
    setClasses((prev) => {
      const next = prev.map((cls) => 
        cls.className === className ? { ...cls, threshold } : cls
      );
      if (isSimulator) {
        evaluateActiveAction(next);
      }
      return next;
    });
  };

  // Simulator helper to let the user scroll sliders in UI and test action logic
  const updateSimulatorProbability = (className: string, prob: number) => {
    if (!isSimulator) return;

    setClasses((prev) => {
      // Standardise other classes so they scale down when model focuses on one
      const targetClass = prev.find(c => c.className === className);
      if (!targetClass) return prev;

      const otherCount = prev.length - 1;
      const leftover = Math.max(0, 1.0 - prob);
      
      const next = prev.map((cls) => {
        if (cls.className === className) {
          return { ...cls, currentProbability: prob };
        } else {
          // Stochastically scale remaining classes down
          return { ...cls, currentProbability: otherCount > 0 ? leftover / otherCount : 0.0 };
        }
      });

      evaluateActiveAction(next);
      return next;
    });
  };

  return {
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
    updateSimulatorProbability,
    setActiveAction // Allow resetting action externally if needed
  };
}
