import React, { useState, useEffect } from 'react';
import { AlertState, CameraNode } from '../types';
import { NeighborhoodMap } from './NeighborhoodMap';
import { 
  AlertCircle, 
  MapPin, 
  Compass, 
  CheckCircle2, 
  ShieldAlert, 
  Send, 
  Navigation,
  Info,
  PhoneCall,
  Sparkles
} from 'lucide-react';

interface NeighborInterfaceProps {
  alert: AlertState;
  cameraNodes: CameraNode[];
  onDropSighting: (data: { lat: number; lng: number; notes?: string; reportedBy?: string; accuracyMeters?: number }) => Promise<void>;
  onNavigateToView: (view: 'caregiver' | 'neighbor' | 'camera' | 'split') => void;
}

export const NeighborInterface: React.FC<NeighborInterfaceProps> = ({
  alert,
  cameraNodes,
  onDropSighting,
  onNavigateToView,
}) => {
  // Live GPS state with neighborhood fallback default
  const [neighborCoords, setNeighborCoords] = useState<{ lat: number; lng: number }>({
    lat: 37.3078,
    lng: -121.8892,
  });
  const [gpsStatus, setGpsStatus] = useState<'ACQUIRING' | 'LIVE' | 'SIMULATED'>('LIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinDroppedSuccess, setPinDroppedSuccess] = useState(false);
  const [sightingNotes, setSightingNotes] = useState('Spotted walking along sidewalk, matches description');
  const [neighborName, setNeighborName] = useState('Neighbor (Oak St)');
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Attempt real browser geolocation with safety fallback
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGpsStatus('ACQUIRING');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Check if position is reasonably close or user is remote
          // If remote, we can allow keeping the simulated neighborhood location or using real coords
          setNeighborCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsStatus('LIVE');
        },
        () => {
          // Fallback to simulated neighborhood spot
          setNeighborCoords({
            lat: 37.3078,
            lng: -121.8892,
          });
          setGpsStatus('SIMULATED');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Quick simulation points for easy demo testing
  const simulationSpots = [
    { label: 'Oak St Sidewalk', lat: 37.3078, lng: -121.8892 },
    { label: 'Near Park Gate', lat: 37.3060, lng: -121.8850 },
    { label: 'Elm St Crossing', lat: 37.3108, lng: -121.8875 },
    { label: 'Pine Ave Corner', lat: 37.3035, lng: -121.8950 },
  ];

  const handleInstantDropPin = async () => {
    setIsSubmitting(true);
    try {
      await onDropSighting({
        lat: neighborCoords.lat,
        lng: neighborCoords.lng,
        notes: sightingNotes,
        reportedBy: neighborName,
        accuracyMeters: gpsStatus === 'LIVE' ? 8 : 12,
      });

      setPinDroppedSuccess(true);
      setShowNoteModal(false);
      setTimeout(() => setPinDroppedSuccess(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* 1. Sticky Top Alert Banner */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-red-400/80 animate-pulse-ring">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-red-100 flex items-center gap-1.5">
                <span>⚠️ ACTIVE NEIGHBORHOOD ALERT IN YOUR ZONE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              </div>
              <div className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Looking for: <span className="underline decoration-yellow-300 underline-offset-4">{alert.clothingDescription}</span>
              </div>
              <div className="text-xs text-red-100/90 mt-1 flex items-center gap-3 flex-wrap">
                <span>Person: <strong>{alert.patientName}</strong></span>
                <span>•</span>
                <span>Search Radius: <strong>{alert.searchRadiusKm} km around {alert.homeAddress}</strong></span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end shrink-0">
            <span className="text-[10px] uppercase font-mono text-red-200">Emergency Caregiver Contact</span>
            <a
              href={`tel:${alert.caregiverPhone}`}
              className="mt-0.5 px-3 py-1 bg-white text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 transition flex items-center gap-1 shadow"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              {alert.caregiverPhone}
            </a>
          </div>
        </div>
      </div>

      {/* GPS Status & Position Simulation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-medium">Your GPS Location:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            {neighborCoords.lat.toFixed(5)}, {neighborCoords.lng.toFixed(5)}
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
            {gpsStatus}
          </span>
        </div>

        {/* Quick GPS Position Selector (great for demo testing without walking outside) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400">Simulate Spot:</span>
          {simulationSpots.map((spot, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setNeighborCoords({ lat: spot.lat, lng: spot.lng })}
              className={`text-[11px] px-2 py-0.5 rounded transition border ${
                neighborCoords.lat === spot.lat && neighborCoords.lng === spot.lng
                  ? 'bg-emerald-600 text-white border-emerald-400 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              {spot.label}
            </button>
          ))}
        </div>
      </div>

      {/* The Map: Shows their live location relative to the search zone */}
      <div className="flex-1 min-h-[360px] relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
        <NeighborhoodMap
          alert={alert}
          cameraNodes={cameraNodes}
          userCoords={neighborCoords}
          activeView="neighbor"
        />
      </div>

      {/* Safety Protocol Note & Action Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Helpful Neighbor Protocol:</strong> If spotted, speak gently from a calm distance. Do not startle or grab. Tap the button below to drop a live pin to the family.
            </span>
          </div>
          <button
            onClick={() => setShowNoteModal(!showNoteModal)}
            className="text-[11px] text-cyan-400 hover:underline shrink-0 font-semibold"
          >
            {showNoteModal ? 'Hide Note Options' : '+ Add Details / Note'}
          </button>
        </div>

        {showNoteModal && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 animate-fadeIn text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Your Name or Identifier</label>
                <input
                  type="text"
                  value={neighborName}
                  onChange={(e) => setNeighborName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Observation Note</label>
                <input
                  type="text"
                  value={sightingNotes}
                  onChange={(e) => setSightingNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  placeholder="e.g. Walking north on sidewalk, wearing bright red coat"
                />
              </div>
            </div>
          </div>
        )}

        {/* The Action: Single Large Button at the Bottom */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleInstantDropPin}
          className="w-full py-5 px-6 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-2xl text-xl sm:text-2xl font-black tracking-wide uppercase shadow-2xl shadow-red-600/60 hover:shadow-red-500/80 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 border-2 border-red-400/50"
        >
          <MapPin className="w-8 h-8 animate-bounce" />
          {isSubmitting ? 'Pushing GPS Coordinates...' : 'I See Them (Drop Pin)'}
        </button>

        {pinDroppedSuccess && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-200 text-sm font-bold flex items-center justify-center gap-2 animate-fadeIn shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            GPS Pin Dropped! Caregiver and neighborhood network alerted instantly.
          </div>
        )}
      </div>
    </div>
  );
};
