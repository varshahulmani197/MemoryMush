import React, { useState, useEffect } from 'react';
import { AlertState, CameraNode, Sighting } from './types';
import { CaregiverDashboard } from './components/CaregiverDashboard';
import { NeighborInterface } from './components/NeighborInterface';
import { EdgeVisionSimulator } from './components/EdgeVisionSimulator';
import { SplitCommandCenter } from './components/SplitCommandCenter';
import { 
  ShieldAlert, 
  Users, 
  Camera, 
  LayoutGrid, 
  Radio, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Info, 
  CheckCircle2, 
  Lock,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';

type ActiveView = 'caregiver' | 'neighbor' | 'camera' | 'split';

const initialAlertState: AlertState = {
  isActive: true,
  alertId: 'ALERT-8921',
  patientName: 'Robert Vance (Age 78)',
  clothingDescription: 'elderly male, bright red jacket, blue jeans, gray sneakers, slight stoop',
  homeAddress: '742 Evergreen Terrace, Willow Glen',
  homeCoords: { lat: 37.3065, lng: -121.8907 },
  searchRadiusKm: 2.0,
  caregiverPhone: '(408) 555-0192',
  broadcastTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  sightings: [
    {
      id: 's-1',
      lat: 37.3092,
      lng: -121.8885,
      accuracyMeters: 12,
      reportedBy: 'Neighbor Sarah M.',
      source: 'NEIGHBOR',
      notes: 'Walking slowly toward Willow St Park, wearing bright red coat.',
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    },
    {
      id: 's-2',
      lat: 37.3088,
      lng: -121.8878,
      accuracyMeters: 8,
      reportedBy: 'Neighbor Dave K.',
      source: 'NEIGHBOR',
      notes: 'Seen pausing at park bench near south pathway in red jacket.',
      timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    },
    {
      id: 's-3',
      lat: 37.3095,
      lng: -121.8890,
      accuracyMeters: 10,
      reportedBy: 'Neighbor Elena R.',
      source: 'NEIGHBOR',
      notes: 'Passed by on bicycle, confirmed red outerwear and denim trousers.',
      timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    },
    {
      id: 's-4',
      lat: 37.3051,
      lng: -121.8845,
      accuracyMeters: 5,
      reportedBy: 'Edge-Vision AI (Community Hub Cam)',
      source: 'AI_CAMERA',
      cameraName: 'Community Hub Cam - Willow St Park',
      confidenceScore: 89,
      reasoning: 'Person matching red coat and blue jeans detected moving southeast.',
      notes: 'AI Match (89%): Person matching red coat and blue jeans detected moving southeast.',
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    },
  ],
  auditLogs: [],
};

const initialCameraNodes: CameraNode[] = [
  {
    id: 'cam-oak-14',
    name: 'PorchCam #14',
    locationName: 'Oak St & Glen Eyrie Ave',
    lat: 37.3085,
    lng: -121.8932,
    status: 'ONLINE',
    sampleDescription: 'Front porch doorbell feed facing sidewalk',
  },
  {
    id: 'cam-corner-elm',
    name: 'Corner CCTV #03',
    locationName: 'Elm St & Lincoln Ave Crossing',
    lat: 37.3115,
    lng: -121.8868,
    status: 'ONLINE',
    sampleDescription: 'Commercial pedestrian crossing cam',
  },
  {
    id: 'cam-park-south',
    name: 'Community Hub Cam',
    locationName: 'Willow St Park South Entrance',
    lat: 37.3051,
    lng: -121.8845,
    status: 'ONLINE',
    sampleDescription: 'Community safety camera facing walking trail',
  },
  {
    id: 'cam-pine-driveway',
    name: 'Driveway Camera #8',
    locationName: 'Pine Ave Residential Block',
    lat: 37.3028,
    lng: -121.8965,
    status: 'ONLINE',
    sampleDescription: 'Residential garage security camera',
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('caregiver');
  const [alert, setAlert] = useState<AlertState>(initialAlertState);
  const [cameraNodes, setCameraNodes] = useState<CameraNode[]>(initialCameraNodes);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);
  const [latestNotification, setLatestNotification] = useState<string | null>(null);

  // Play subtle chime when new sighting arrives
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // Ignored
    }
  };

  // Connect to SSE for real-time live synchronization
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          if (data.alert) setAlert(data.alert);
          if (data.cameraNodes) setCameraNodes(data.cameraNodes);
        }
      } catch (err) {
        console.warn('State fetch fallback error:', err);
      }
    };

    // Initial fetch
    fetchState();

    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'STATE_UPDATE') {
            setAlert((prev) => {
              // If new sighting was added
              if (parsed.data.alert.sightings.length > prev.sightings.length) {
                const newest = parsed.data.alert.sightings[0];
                playChime();
                setLatestNotification(`New Sighting: ${newest.reportedBy} - ${newest.notes || 'Pin placed'}`);
                setTimeout(() => setLatestNotification(null), 5000);
              }
              return parsed.data.alert;
            });
            if (parsed.data.cameraNodes) {
              setCameraNodes(parsed.data.cameraNodes);
            }
          }
        } catch (e) {
          console.error('SSE JSON error', e);
        }
      };

      eventSource.onerror = () => {
        // SSE disconnected, fallback to polling
        if (!pollInterval) {
          pollInterval = setInterval(fetchState, 4000);
        }
      };
    } catch {
      pollInterval = setInterval(fetchState, 4000);
    }

    return () => {
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [soundEnabled]);

  // Handlers
  const handleBroadcastAlert = async (data: Partial<AlertState>) => {
    const res = await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const resData = await res.json();
      setAlert(resData.alert);
      playChime();
    }
  };

  const handleResolveAlert = async () => {
    const res = await fetch('/api/alert/resolve', { method: 'POST' });
    if (res.ok) {
      const resData = await res.json();
      setAlert(resData.alert);
    }
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/demo/reset', { method: 'POST' });
    if (res.ok) {
      const resData = await res.json();
      setAlert(resData.alert);
    }
  };

  const handleDropSighting = async (data: {
    lat: number;
    lng: number;
    notes?: string;
    reportedBy?: string;
    accuracyMeters?: number;
  }) => {
    const res = await fetch('/api/sightings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const resData = await res.json();
      playChime();
      setLatestNotification(`GPS Pin Dropped: ${data.notes || 'Visual match reported'}`);
      setTimeout(() => setLatestNotification(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white">
                  MemoryMesh
                </span>
                <span className="text-[10px] font-mono uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                  Safety Net
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Privacy-First Wandering Defense & Edge Vision
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs: View Switcher */}
          <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveView('caregiver')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeView === 'caregiver'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Caregiver</span>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveView('neighbor')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeView === 'neighbor'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Neighbor</span>
              <span>Interface</span>
            </button>

            <button
              onClick={() => setActiveView('camera')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeView === 'camera'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Edge-Vision</span>
              <span>AI Mesh</span>
            </button>

            <button
              onClick={() => setActiveView('split')}
              className={`px-2.5 py-1.5 rounded-lg transition hidden lg:flex items-center gap-1.5 ${
                activeView === 'split'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split Command Center"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </nav>

          {/* Right Controls: Audio & Architecture Info */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Alert Chimes' : 'Enable Alert Chimes'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => setShowArchitectureModal(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 text-xs"
              title="Architecture & AI Prompt Spec"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Spec & AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification Toast */}
      {latestNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-red-500 text-white p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn max-w-md">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-red-400 uppercase tracking-wide">Live Sighting Broadcast</div>
            <div className="text-slate-200 mt-0.5">{latestNotification}</div>
          </div>
          <button
            onClick={() => setLatestNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeView === 'caregiver' && (
          <CaregiverDashboard
            alert={alert}
            cameraNodes={cameraNodes}
            onBroadcastAlert={handleBroadcastAlert}
            onResolveAlert={handleResolveAlert}
            onResetDemo={handleResetDemo}
            onNavigateToView={setActiveView}
          />
        )}

        {activeView === 'neighbor' && (
          <NeighborInterface
            alert={alert}
            cameraNodes={cameraNodes}
            onDropSighting={handleDropSighting}
            onNavigateToView={setActiveView}
          />
        )}

        {activeView === 'camera' && (
          <EdgeVisionSimulator
            alert={alert}
            cameraNodes={cameraNodes}
            onNavigateToView={setActiveView}
          />
        )}

        {activeView === 'split' && (
          <SplitCommandCenter
            alert={alert}
            cameraNodes={cameraNodes}
            onBroadcastAlert={handleBroadcastAlert}
            onResolveAlert={handleResolveAlert}
            onResetDemo={handleResetDemo}
            onDropSighting={handleDropSighting}
            onNavigateToView={setActiveView}
          />
        )}
      </main>

      {/* Architecture & Prompt Spec Modal */}
      {showArchitectureModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">MemoryMesh System Architecture & Gemini Spec</h3>
              </div>
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="font-bold text-cyan-300 text-sm mb-1">1. Multimodal AI Prompt (Google AI Studio)</div>
                <p className="text-[11px] text-slate-400 mb-2">
                  The Edge-Vision Agent passes the simulated porch camera image and caregiver's text description to the Gemini API, returning structured JSON to automatically drop a pin on the map.
                </p>
                <pre className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-cyan-200 overflow-x-auto whitespace-pre-wrap border border-cyan-500/20">
{`You are a privacy-first, visual anomaly analysis AI for a neighborhood safety network. Your task is to analyze the provided image (simulating a residential security camera feed) and determine if it contains a person matching the specific clothing and build description provided below. 

Description to match: "[INSERT CAREGIVER DESCRIPTION HERE]"

CRITICAL INSTRUCTIONS:
1. Do NOT attempt facial recognition. Base your analysis entirely on clothing color, garment type, and general physical build.
2. Output your response STRICTLY as a valid JSON object with no markdown formatting, no code blocks, and no additional text. 

Use this exact JSON structure:
{
  "match_found": true/false,
  "confidence_score": [number between 0-100],
  "reasoning": "[Brief 1-sentence explanation of why the clothing matches or does not match]"
}`}
                </pre>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="font-bold text-red-300 text-sm mb-1">2. Real-Time Mapping & Coordinate Mesh Stack</div>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Mapping:</strong> Interactive Leaflet map with colored 2km search radius circle, high-contrast dark tiles, and animated GPS pulse pins.</li>
                  <li><strong>Real-Time Synchronization:</strong> Real-time event bus (SSE + REST fallback) propagating neighbor GPS drops and camera detections to all dashboard clients in under 100ms.</li>
                  <li><strong>Privacy Guarantee:</strong> Facial biometrics are strictly prohibited. The system analyzes solely clothing color palettes, garment textures, and build outlines.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="font-bold text-emerald-300 text-sm mb-1">3. Caregiver & Neighbor Flows</div>
                <p className="text-[11px] text-slate-400">
                  Caregivers broadcast the active alert protocol with clothing specs. Neighbors in the zone see the sticky top alert banner and can tap "I See Them (Drop Pin)" with a single click to instantly share device coordinates.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Spec
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800 py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>MemoryMesh Privacy Protocol: Zero Facial Recognition • Pure Garment Vector Matching</span>
          </div>
          <div>
            Powered by Google Gemini 3.8 Flash Multimodal & Leaflet Real-Time Mesh
          </div>
        </div>
      </footer>
    </div>
  );
}
