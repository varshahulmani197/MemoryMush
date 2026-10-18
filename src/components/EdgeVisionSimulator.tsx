import React, { useState, useEffect } from 'react';
import { AlertState, CameraNode, VisionAnalysisResult } from '../types';
import { sampleFeeds, SampleCameraFeed } from '../utils/sampleFrames';
import { 
  Camera, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Cpu, 
  Radio, 
  MapPin, 
  AlertTriangle,
  Play,
  RotateCw,
  Video
} from 'lucide-react';

interface EdgeVisionSimulatorProps {
  alert: AlertState;
  cameraNodes: CameraNode[];
  onNavigateToView: (view: 'caregiver' | 'neighbor' | 'camera' | 'split') => void;
}

export const EdgeVisionSimulator: React.FC<EdgeVisionSimulatorProps> = ({
  alert,
  cameraNodes,
  onNavigateToView,
}) => {
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameraNodes[0]?.id || 'cam-oak-14');
  const [selectedFeedId, setSelectedFeedId] = useState<string>(sampleFeeds[0].id);
  const [currentFrameUrl, setCurrentFrameUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matchTriggered, setMatchTriggered] = useState(false);
  const [customUploadedUrl, setCustomUploadedUrl] = useState<string | null>(null);

  // Generate current frame from selected feed on load or switch
  useEffect(() => {
    if (customUploadedUrl) {
      setCurrentFrameUrl(customUploadedUrl);
      return;
    }
    const feed = sampleFeeds.find((f) => f.id === selectedFeedId);
    if (feed) {
      setCurrentFrameUrl(feed.generateDataUrl());
    }
  }, [selectedFeedId, customUploadedUrl]);

  const activeCamera = cameraNodes.find((c) => c.id === selectedCameraId) || cameraNodes[0];
  const activeFeed = sampleFeeds.find((f) => f.id === selectedFeedId);

  // Synthesize audio radar ping using Web Audio API when match is detected
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomUploadedUrl(reader.result);
          setSelectedFeedId('custom');
          setAnalysisResult(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAnalysis = async () => {
    if (!currentFrameUrl) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisResult(null);
    setMatchTriggered(false);

    try {
      const res = await fetch('/api/edge-vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentFrameUrl,
          mimeType: 'image/jpeg',
          cameraId: selectedCameraId,
          customDescription: alert.clothingDescription,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'AI analysis request failed');
      }

      const data = await res.json();
      setAnalysisResult(data.analysis);

      if (data.analysis?.match_found) {
        playAlertSound();
        setMatchTriggered(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title & Privacy-First Architecture Explanation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                MULTIMODAL EDGE-VISION AGENT
              </span>
              <span className="text-xs font-mono text-slate-400">
                Powered by Gemini API
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              Automated Camera Matching & Pin Drop Simulator
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              Simulates residential smart doorbells and CCTV camera nodes. The agent analyzes clothing color, garment type, and physical build — strictly excluding facial recognition to protect neighborhood privacy.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shrink-0">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-white">Zero Facial Biometrics</div>
              <div className="text-slate-400 text-[11px]">Strict clothing/garment analysis only</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Camera Feeds on Left + Live Analysis & Prompt Inspection on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Column: Camera Node Selector & Video Viewport (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Node selection bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                Select Camera Node in Mesh:
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                Active: {activeCamera.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cameraNodes.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => {
                    setSelectedCameraId(cam.id);
                    setAnalysisResult(null);
                  }}
                  className={`p-2 rounded-lg text-left transition border ${
                    selectedCameraId === cam.id
                      ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-md shadow-cyan-950'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{cam.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{cam.locationName}</div>
                  <div className="text-[9px] font-mono text-emerald-400 mt-1">● {cam.status}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Camera Viewport Screen */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl flex-1 flex flex-col justify-center items-center min-h-[320px]">
            {currentFrameUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={currentFrameUrl}
                  alt="Simulated Camera Stream"
                  className="w-full h-full max-h-[460px] object-contain"
                />

                {/* Scanline overlay when analyzing */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none">
                    <div className="w-full h-2 bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-scan"></div>
                  </div>
                )}

                {/* Status Badges on feed */}
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-700/60 text-xs font-mono text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  LIVE PORCH FEED: {activeCamera.locationName}
                </div>

                {/* Real-time Match Banner on Feed */}
                {matchTriggered && analysisResult?.match_found && (
                  <div className="absolute top-12 left-3 right-3 bg-red-600/90 backdrop-blur-md text-white p-3 rounded-xl border border-red-300 flex items-center justify-between shadow-2xl animate-bounce">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-yellow-300 animate-pulse" />
                      <div>
                        <div className="text-xs font-black uppercase">Visual Match Detected ({analysisResult.confidence_score}%)!</div>
                        <div className="text-[11px] text-red-100">Pin dropped automatically at camera GPS location.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateToView('caregiver')}
                      className="px-3 py-1 bg-white text-red-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition shrink-0"
                    >
                      View Map →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                Select or upload a simulated camera feed to start
              </div>
            )}
          </div>

          {/* Test Scenarios & Upload Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Test Snapshot or Upload Feed:
              </span>
              <label className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1 font-semibold">
                <Upload className="w-3.5 h-3.5" />
                Upload Custom Image
                <input type="file" accept="image/*" onChange={handleCustomUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {sampleFeeds.map((feed) => (
                <button
                  key={feed.id}
                  onClick={() => {
                    setCustomUploadedUrl(null);
                    setSelectedFeedId(feed.id);
                    setAnalysisResult(null);
                    setMatchTriggered(false);
                  }}
                  className={`p-2 rounded-lg text-left transition border text-xs ${
                    selectedFeedId === feed.id && !customUploadedUrl
                      ? 'bg-slate-800 border-cyan-400 text-white'
                      : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold truncate">
                    <span className="truncate">{feed.title.split('-')[0]}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        feed.expectedMatch
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {feed.expectedMatch ? 'TARGET' : 'DIFF'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{feed.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis Engine & Results (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Target Description Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-red-500" />
                Active Clothing Match Target
              </span>
              <span className="text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">
                From Caregiver
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-red-500/30 text-xs text-white leading-relaxed font-medium">
              "{alert.clothingDescription}"
            </div>

            {/* Run AI Analysis Action Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-sm font-bold tracking-wide uppercase shadow-xl shadow-cyan-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  Analyzing Clothing & Build with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Run Edge-Vision AI Analysis
                </>
              )}
            </button>

            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs">
                {errorMessage}
              </div>
            )}
          </div>

          {/* AI Result Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Structured Edge Output
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                JSON Response
              </span>
            </div>

            {analysisResult ? (
              <div className="space-y-4 flex-1">
                {/* Match Status Hero */}
                <div
                  className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                    analysisResult.match_found
                      ? 'bg-red-950/50 border-red-500 text-red-200 shadow-lg shadow-red-950'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {analysisResult.match_found ? (
                      <CheckCircle2 className="w-8 h-8 text-red-400 shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-black uppercase tracking-wide">
                        {analysisResult.match_found ? 'MATCH FOUND (PIN DROPPED)' : 'NO MATCH FOUND'}
                      </div>
                      <div className="text-xs opacity-80">
                        {analysisResult.match_found
                          ? 'Automated coordinate broadcast triggered'
                          : 'Frame logged to network audit'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-mono font-black">
                      {analysisResult.confidence_score}%
                    </div>
                    <div className="text-[10px] uppercase font-mono text-slate-400">Confidence</div>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Confidence Score Gauge:</span>
                    <span>{analysisResult.confidence_score} / 100</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-700 ${
                        analysisResult.confidence_score > 60
                          ? 'bg-gradient-to-r from-yellow-400 to-red-500'
                          : 'bg-slate-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, analysisResult.confidence_score))}%` }}
                    ></div>
                  </div>
                </div>

                {/* AI Reasoning */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    Model Reasoning:
                  </div>
                  <p className="text-slate-200 leading-relaxed italic">
                    "{analysisResult.reasoning}"
                  </p>
                </div>

                {/* Exact JSON Output as required by user prompt */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400">Strict JSON Payload:</div>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                    {JSON.stringify(analysisResult, null, 2)}
                  </pre>
                </div>

                {analysisResult.match_found && (
                  <button
                    onClick={() => onNavigateToView('caregiver')}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-950"
                  >
                    <MapPin className="w-4 h-4" />
                    Open Pin on Neighborhood Map →
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs space-y-2">
                <Sparkles className="w-8 h-8 opacity-40 text-cyan-400" />
                <p>Click "Run Edge-Vision AI Analysis" to test clothing matching on the current camera snapshot.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
