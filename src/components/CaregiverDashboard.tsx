import React, { useState } from 'react';
import { AlertState, CameraNode } from '../types';
import { NeighborhoodMap } from './NeighborhoodMap';
import { 
  AlertTriangle, 
  Radio, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Sliders, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  Eye,
  Camera
} from 'lucide-react';

interface CaregiverDashboardProps {
  alert: AlertState;
  cameraNodes: CameraNode[];
  onBroadcastAlert: (data: Partial<AlertState>) => Promise<void>;
  onResolveAlert: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  onNavigateToView: (view: 'caregiver' | 'neighbor' | 'camera' | 'split') => void;
}

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  alert,
  cameraNodes,
  onBroadcastAlert,
  onResolveAlert,
  onResetDemo,
  onNavigateToView,
}) => {
  const [clothingDesc, setClothingDesc] = useState(alert.clothingDescription);
  const [patientName, setPatientName] = useState(alert.patientName);
  const [radiusKm, setRadiusKm] = useState(alert.searchRadiusKm || 2.0);
  const [baselinePhoto, setBaselinePhoto] = useState<string>(alert.baselinePhoto || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const presets = [
    'elderly male, bright red jacket, blue jeans, gray sneakers, slight stoop',
    'elderly female, lavender knit cardigan, dark trousers, white sneakers',
    'senior male, beige windbreaker, green baseball cap, navy trousers, walking cane',
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setBaselinePhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onBroadcastAlert({
        clothingDescription: clothingDesc,
        patientName,
        searchRadiusKm: radiusKm,
        baselinePhoto,
      });
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const minutesElapsed = alert.broadcastTime
    ? Math.max(1, Math.round((Date.now() - new Date(alert.broadcastTime).getTime()) / (1000 * 60)))
    : 0;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header: Large, bold Active Alert Protocol Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  alert.isActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${alert.isActive ? 'bg-red-500' : 'bg-emerald-400'}`}></span>
                {alert.isActive ? 'ACTIVE ALERT PROTOCOL' : 'PROTOCOL STANDBY'}
              </span>

              <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                ID: {alert.alertId}
              </span>

              {alert.isActive && (
                <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-red-400" />
                  Elapsed: <strong className="text-white">{minutesElapsed}m</strong>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              MemoryMesh Caregiver Command
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Instant neighborhood wandering alert broadcasting with privacy-first Edge-Vision AI matching.
            </p>
          </div>

          {/* Quick Action Badges / Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl px-3 py-2 flex items-center gap-3">
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400">Sightings Received</div>
                <div className="text-xl font-mono font-bold text-white flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-red-500" />
                  {alert.sightings.length}
                </div>
              </div>
              <div className="h-7 w-px bg-slate-700"></div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400">Active Cameras</div>
                <div className="text-xl font-mono font-bold text-cyan-400 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {cameraNodes.length}
                </div>
              </div>
            </div>

            {alert.isActive ? (
              <button
                type="button"
                onClick={onResolveAlert}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
              >
                <CheckCircle2 className="w-4 h-4" />
                Resolve / Safe
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetDemo}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Demo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Input Form on Left/Top + The Map (Takes bottom 60% / right panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Column: Form & Broadcast Controls (4 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <form
            onSubmit={handleSubmitAlert}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500" />
                  Alert Configuration
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  Privacy-Guaranteed
                </span>
              </div>

              {/* Patient Name & Home */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loved One Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    placeholder="e.g. Robert Vance (Age 78)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Search Perimeter</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.5"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-red-400 min-w-[48px]">{radiusKm} km</span>
                  </div>
                </div>
              </div>

              {/* Clothing Description (Primary AI Matching Input) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-red-400 uppercase tracking-wide">
                    Clothing Description (For AI & Neighbors) *
                  </label>
                  <span className="text-[11px] text-slate-400">Crucial for edge matching</span>
                </div>
                <textarea
                  rows={3}
                  value={clothingDesc}
                  onChange={(e) => setClothingDesc(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-red-500/50 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-400 transition"
                  placeholder="e.g. elderly male, bright red jacket, blue jeans, gray sneakers, slight stoop"
                  required
                />

                {/* Quick description presets */}
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Presets:</span>
                  {presets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setClothingDesc(preset)}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 transition truncate max-w-[200px]"
                      title={preset}
                    >
                      {preset.split(',')[1]?.trim() || 'Preset'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Baseline Outfit Photo Upload */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">Today's Baseline Outfit Photo</span>
                  </div>
                  {baselinePhoto && (
                    <button
                      type="button"
                      onClick={() => setBaselinePhoto('')}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {baselinePhoto ? (
                    <img
                      src={baselinePhoto}
                      alt="Baseline outfit"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                      <Upload className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Helps neighbors identify garment texture and colors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Point of Origin / Address */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Point of Origin (Home)</div>
                  <div className="text-slate-400">{alert.homeAddress}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    Lat: {alert.homeCoords.lat.toFixed(4)}, Lng: {alert.homeCoords.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Massive, High-Contrast Red Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-base sm:text-lg font-black tracking-wide uppercase shadow-2xl shadow-red-600/50 hover:shadow-red-500/70 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                <Radio className="w-6 h-6 animate-pulse" />
                {isSubmitting ? 'Broadcasting Protocol...' : 'Broadcast Local Alert'}
              </button>

              {broadcastSuccess && (
                <div className="mt-2 text-center text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  Alert broadcasted to neighborhood mesh & {cameraNodes.length} camera nodes!
                </div>
              )}
            </div>
          </form>

          {/* Recent Sightings & AI Detections Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Active Pins & Sighting Logs ({alert.sightings.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const jitterLat = 37.3090 + (Math.random() - 0.5) * 0.002;
                    const jitterLng = -121.8880 + (Math.random() - 0.5) * 0.002;
                    await fetch('/api/sightings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        lat: jitterLat,
                        lng: jitterLng,
                        reportedBy: `Neighbor (Willow St #${Math.floor(10 + Math.random() * 90)})`,
                        notes: 'Spotted walking calmly in red jacket and jeans',
                        accuracyMeters: 8,
                      }),
                    });
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded transition flex items-center gap-1"
                  title="Inject test sighting to watch D3 heat map update"
                >
                  <span>+ Test Pin</span>
                </button>
                <button
                  onClick={() => onNavigateToView('camera')}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Camera AI →
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {alert.sightings.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">
                  No sightings reported yet. Neighbors & AI cameras are scanning the zone.
                </div>
              ) : (
                alert.sightings.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-1 transition ${
                      s.source === 'AI_CAMERA'
                        ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
                        : 'bg-red-950/30 border-red-500/30 text-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        {s.source === 'AI_CAMERA' ? '🤖 ' : '📍 '}
                        {s.reportedBy}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {s.notes || s.reasoning}
                    </p>

                    {s.confidenceScore && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 pt-1">
                        <span>Confidence Score: {s.confidenceScore}%</span>
                        <span>[Auto-Dropped Pin]</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: The Map (Takes up bottom 60% or main interactive view) */}
        <div className="lg:col-span-7 flex flex-col h-[520px] lg:h-auto min-h-[460px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Neighborhood Mesh Perimeter
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono">
                {alert.searchRadiusKm} km circle
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Click any marker for details</span>
            </div>
          </div>

          <div className="flex-1 min-h-[440px] relative">
            <NeighborhoodMap
              alert={alert}
              cameraNodes={cameraNodes}
              activeView="caregiver"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
