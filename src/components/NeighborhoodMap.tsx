import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import * as d3 from 'd3';
import { AlertState, CameraNode, Sighting } from '../types';
import { renderD3HeatmapOverlay, HotspotEpicenter } from '../utils/d3Heatmap';
import { SightingDensityModal } from './SightingDensityModal';
import { 
  Flame, 
  BarChart2, 
  Sliders, 
  Layers, 
  Sparkles, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Target 
} from 'lucide-react';

interface NeighborhoodMapProps {
  alert: AlertState;
  cameraNodes: CameraNode[];
  selectedCameraId?: string | null;
  onSelectCamera?: (cameraId: string) => void;
  userCoords?: { lat: number; lng: number } | null;
  onDropPinAtLocation?: (lat: number, lng: number) => void;
  interactivePinDrop?: boolean;
  activeView: 'caregiver' | 'neighbor' | 'camera' | 'split';
}

export const NeighborhoodMap: React.FC<NeighborhoodMapProps> = ({
  alert,
  cameraNodes,
  selectedCameraId,
  onSelectCamera,
  userCoords,
  onDropPinAtLocation,
  interactivePinDrop = false,
  activeView,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const d3SvgRef = useRef<SVGSVGElement | null>(null);

  // Heat map states
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(45);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.85);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDensityModal, setShowDensityModal] = useState<boolean>(false);
  const [epicenter, setEpicenter] = useState<HotspotEpicenter | null>(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [alert.homeCoords.lat, alert.homeCoords.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark-themed tiles for high-contrast safety UI
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'dark-map-tiles',
    }).addTo(map);

    // Create D3 SVG layer inside Leaflet overlay pane
    const overlayPane = map.getPanes().overlayPane;
    const svgEl = d3
      .select(overlayPane)
      .append('svg')
      .attr('class', 'leaflet-d3-heatmap-svg')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('z-index', '350')
      .node();

    if (svgEl) {
      d3SvgRef.current = svgEl;
    }

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Optional map click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onDropPinAtLocation && interactivePinDrop) {
        onDropPinAtLocation(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      if (d3SvgRef.current) {
        d3.select(d3SvgRef.current).remove();
        d3SvgRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. D3 Heat Map redraw callback
  const updateD3Heatmap = useCallback(() => {
    const map = mapInstanceRef.current;
    const svgEl = d3SvgRef.current;
    if (!map || !svgEl) return;

    const svgSelection = d3.select(svgEl);

    if (!showHeatmap || alert.sightings.length === 0) {
      svgSelection.selectAll('*').remove();
      setEpicenter(null);
      return;
    }

    const result = renderD3HeatmapOverlay(map, svgSelection, alert.sightings, {
      radius: heatmapRadius,
      opacity: heatmapOpacity,
      showContours: true,
      showRadialBlobs: true,
      showEpicenterBadge: true,
    });

    setEpicenter(result);
  }, [alert.sightings, showHeatmap, heatmapRadius, heatmapOpacity]);

  // Hook map pan/zoom events to re-project D3 heatmap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapMovement = () => {
      updateD3Heatmap();
    };

    map.on('move', handleMapMovement);
    map.on('moveend', handleMapMovement);
    map.on('zoomend', handleMapMovement);
    map.on('viewreset', handleMapMovement);

    updateD3Heatmap();

    return () => {
      map.off('move', handleMapMovement);
      map.off('moveend', handleMapMovement);
      map.off('zoomend', handleMapMovement);
      map.off('viewreset', handleMapMovement);
    };
  }, [updateD3Heatmap]);

  // 3. Update Markers & Search Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear previous markers
    markersLayer.clearLayers();

    // Remove old circle if exists
    if (circleLayerRef.current) {
      circleLayerRef.current.remove();
      circleLayerRef.current = null;
    }

    // Draw Search Radius Circle (e.g. 2km)
    if (alert.isActive) {
      const radiusMeters = (alert.searchRadiusKm || 2) * 1000;
      const circle = L.circle([alert.homeCoords.lat, alert.homeCoords.lng], {
        radius: radiusMeters,
        color: '#ef4444',
        weight: 2,
        dashArray: '6, 8',
        fillColor: '#ef4444',
        fillOpacity: 0.08,
      });

      circle.bindTooltip(`Search Perimeter: ${alert.searchRadiusKm} km radius`, {
        permanent: false,
        direction: 'top',
        className: 'bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded border border-red-500/30',
      });

      circle.addTo(map);
      circleLayerRef.current = circle;
    }

    // Home Point Marker
    const homeIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-blue-500/20 animate-ping"></div>
        <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-lg shadow-blue-500/50">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
          </svg>
        </div>
      </div>
    `;

    const homeIcon = L.divIcon({
      html: homeIconHtml,
      className: 'custom-home-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const homeMarker = L.marker([alert.homeCoords.lat, alert.homeCoords.lng], { icon: homeIcon });
    homeMarker.bindPopup(`
      <div class="space-y-1">
        <div class="flex items-center gap-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
          <span>🏠 Home / Point of Origin</span>
        </div>
        <div class="text-sm font-semibold text-slate-100">${alert.patientName}</div>
        <div class="text-xs text-slate-300">${alert.homeAddress}</div>
        <div class="text-[11px] text-slate-400 mt-1">Caregiver Contact: ${alert.caregiverPhone}</div>
      </div>
    `);
    markersLayer.addLayer(homeMarker);

    // Neighbor & AI Sighting Markers
    alert.sightings.forEach((sighting: Sighting, index: number) => {
      const isLatest = index === 0;
      const isAi = sighting.source === 'AI_CAMERA';

      const badgeBg = isAi ? 'bg-cyan-500' : 'bg-red-500';
      const shadowColor = isAi ? 'rgba(6, 182, 212, 0.6)' : 'rgba(239, 68, 68, 0.7)';

      const markerHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          ${
            isLatest
              ? `<div class="absolute -top-1 w-10 h-10 rounded-full animate-ping" style="background-color: ${shadowColor}"></div>`
              : ''
          }
          <div class="relative z-10 w-9 h-9 rounded-full ${badgeBg} border-2 border-white text-white flex items-center justify-center shadow-xl" style="box-shadow: 0 0 16px ${shadowColor}">
            ${
              isAi
                ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`
                : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`
            }
          </div>
          <div class="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight text-white ${
            isAi ? 'bg-cyan-950/90 border border-cyan-500/60' : 'bg-red-950/90 border border-red-500/60'
          } whitespace-nowrap shadow">
            ${isAi ? `AI MATCH ${sighting.confidenceScore || 89}%` : 'NEIGHBOR PIN'}
          </div>
        </div>
      `;

      const sightingIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-sighting-icon',
        iconSize: [36, 48],
        iconAnchor: [18, 24],
      });

      const marker = L.marker([sighting.lat, sighting.lng], { icon: sightingIcon });
      const timeAgo = formatTimeAgo(sighting.timestamp);

      marker.bindPopup(`
        <div class="space-y-2 min-w-[210px]">
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded ${
              isAi ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }">
              ${isAi ? '🤖 Edge-Vision AI Pin' : '📍 Neighbor Live GPS'}
            </span>
            <span class="text-[10px] text-slate-400 font-mono">${timeAgo}</span>
          </div>

          <div class="text-xs font-semibold text-slate-200">
            ${sighting.reportedBy}
          </div>

          ${
            sighting.confidenceScore !== undefined
              ? `
            <div class="bg-slate-900/80 p-2 rounded border border-cyan-500/20">
              <div class="flex justify-between text-[11px] text-cyan-300 font-mono mb-1">
                <span>Clothing Match Confidence:</span>
                <span class="font-bold">${sighting.confidenceScore}%</span>
              </div>
              <div class="text-[11px] text-slate-300 leading-tight">
                "${sighting.reasoning || sighting.notes}"
              </div>
            </div>
          `
              : `
            <div class="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded">
              "${sighting.notes || 'Visual sighting reported'}"
            </div>
          `
          }

          <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
            <span>Lat: ${sighting.lat.toFixed(5)}</span>
            <span>Lng: ${sighting.lng.toFixed(5)}</span>
          </div>
        </div>
      `);

      markersLayer.addLayer(marker);
    });

    // Camera Nodes
    cameraNodes.forEach((camera) => {
      const isSelected = selectedCameraId === camera.id;
      const isDetecting = camera.status === 'ALERT_DETECTED';
      const isAnalyzing = camera.status === 'ANALYZING';

      const statusColor = isDetecting
        ? '#ef4444'
        : isAnalyzing
        ? '#f59e0b'
        : '#10b981';

      const camHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          ${
            isDetecting
              ? '<div class="absolute -top-1 w-9 h-9 rounded-full bg-red-500/30 animate-ping"></div>'
              : ''
          }
          <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${
            isSelected ? 'ring-2 ring-cyan-400 scale-110' : ''
          }" style="background-color: ${
            isDetecting ? '#7f1d1d' : '#1e293b'
          }; border: 1.5px solid ${statusColor}">
            <svg class="w-4 h-4" style="color: ${statusColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </div>
          <span class="mt-0.5 px-1 py-0.2 rounded text-[9px] font-mono text-slate-300 bg-slate-900/90 border border-slate-700 whitespace-nowrap">
            ${camera.name}
          </span>
        </div>
      `;

      const camIcon = L.divIcon({
        html: camHtml,
        className: 'custom-cam-icon',
        iconSize: [32, 42],
        iconAnchor: [16, 21],
      });

      const camMarker = L.marker([camera.lat, camera.lng], { icon: camIcon });

      camMarker.on('click', () => {
        if (onSelectCamera) {
          onSelectCamera(camera.id);
        }
      });

      camMarker.bindPopup(`
        <div class="space-y-1.5 min-w-[190px]">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-white">${camera.name}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${
              isDetecting ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }">${camera.status}</span>
          </div>
          <div class="text-xs text-slate-300">${camera.locationName}</div>
          <div class="text-[11px] text-slate-400">${camera.sampleDescription}</div>
        </div>
      `);

      markersLayer.addLayer(camMarker);
    });

    // Neighbor GPS location
    if (userCoords) {
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-6 h-6 rounded-full bg-emerald-500/20 animate-ping"></div>
          <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'custom-user-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon });
      userMarker.bindTooltip('You (Current Neighbor Position)', {
        permanent: false,
        direction: 'top',
        className: 'bg-emerald-950 text-emerald-200 text-xs px-2 py-1 rounded border border-emerald-500/40',
      });
      markersLayer.addLayer(userMarker);
    }
  }, [alert, cameraNodes, selectedCameraId, userCoords]);

  // Recenter helper
  const handleRecenter = (lat: number, lng: number, zoom = 15) => {
    mapInstanceRef.current?.setView([lat, lng], zoom, { animate: true });
  };

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left: Heatmap Toggle & Density Quick Action */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          title="Toggle D3 Sighting Density Heat Map Layer"
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xl border ${
            showHeatmap
              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-400/80 shadow-red-600/40'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-700'
          }`}
        >
          <Flame className={`w-4 h-4 ${showHeatmap ? 'text-yellow-300 animate-pulse' : 'text-slate-500'}`} />
          <span>Sighting Heat Map</span>
          <span
            className={`w-2 h-2 rounded-full ${
              showHeatmap ? 'bg-yellow-300 animate-ping' : 'bg-slate-600'
            }`}
          ></span>
        </button>

        <button
          onClick={() => setShowDensityModal(true)}
          title="Open Recharts Sighting Density Analytics"
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 shadow-xl"
        >
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Density Analytics</span>
        </button>

        {showHeatmap && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Adjust Heat Map Radius and Intensity"
            className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-xl text-xs border border-slate-700 shadow-xl transition"
          >
            <Sliders className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Heatmap Settings Popover */}
      {showHeatmap && showSettings && (
        <div className="absolute top-14 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 shadow-2xl text-xs w-64 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              D3 Heatmap Engine
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-white text-[10px]"
            >
              Close
            </button>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 text-[11px] mb-1">
              <span>Kernel Bandwidth / Radius:</span>
              <span className="font-mono text-cyan-400">{heatmapRadius}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={heatmapRadius}
              onChange={(e) => setHeatmapRadius(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 text-[11px] mb-1">
              <span>Layer Opacity:</span>
              <span className="font-mono text-cyan-400">{Math.round(heatmapOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          {epicenter && (
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[10px] space-y-1">
              <div className="text-amber-400 font-bold flex items-center gap-1">
                <Target className="w-3 h-3" />
                Cluster Peak Detected:
              </div>
              <div className="text-slate-300 font-mono">
                {epicenter.lat.toFixed(4)}, {epicenter.lng.toFixed(4)}
              </div>
              <button
                onClick={() => handleRecenter(epicenter.lat, epicenter.lng, 16)}
                className="text-cyan-400 hover:underline font-semibold"
              >
                Focus Peak Hotspot →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Top Right: Quick Recenter Buttons */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-xl">
        <button
          onClick={() => handleRecenter(alert.homeCoords.lat, alert.homeCoords.lng, 14)}
          title="Recenter on Home"
          className="p-2 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-medium"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Home
        </button>

        {alert.sightings.length > 0 && (
          <button
            onClick={() => handleRecenter(alert.sightings[0].lat, alert.sightings[0].lng, 16)}
            title="Recenter on Latest Sighting"
            className="p-2 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Latest Pin
          </button>
        )}

        {epicenter && showHeatmap && (
          <button
            onClick={() => handleRecenter(epicenter.lat, epicenter.lng, 16)}
            title="Recenter on Heatmap Cluster Epicenter"
            className="p-2 rounded text-amber-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Hotspot
          </button>
        )}

        {userCoords && (
          <button
            onClick={() => handleRecenter(userCoords.lat, userCoords.lng, 16)}
            title="Recenter on My Location"
            className="p-2 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            My GPS
          </button>
        )}
      </div>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[1000] bg-slate-950/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs shadow-2xl flex items-center gap-4 flex-wrap">
        {/* Heatmap density color gradient indicator */}
        {showHeatmap && alert.sightings.length > 0 && (
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Heat Density:</span>
            <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-red-600 shadow-inner"></div>
            <span className="text-[10px] text-red-400 font-bold font-mono">PEAK</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
          <span className="text-slate-300">Home</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
          <span className="text-slate-300">Neighbor Pin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
          <span className="text-slate-300">AI Cam Match</span>
        </div>
        <div className="text-red-400 font-mono text-[11px] font-semibold">
          Perimeter: {alert.searchRadiusKm} km
        </div>
      </div>

      {/* Recharts Sighting Density Modal */}
      {showDensityModal && (
        <SightingDensityModal
          alert={alert}
          onClose={() => setShowDensityModal(false)}
          onFocusEpicenter={(lat, lng) => handleRecenter(lat, lng, 16)}
        />
      )}
    </div>
  );
};

function formatTimeAgo(timestamp: string): string {
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    return `${diffHrs}h ago`;
  } catch {
    return 'Just now';
  }
}
