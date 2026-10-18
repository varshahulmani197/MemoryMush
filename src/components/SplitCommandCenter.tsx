import React from 'react';
import { AlertState, CameraNode } from '../types';
import { CaregiverDashboard } from './CaregiverDashboard';
import { NeighborInterface } from './NeighborInterface';
import { EdgeVisionSimulator } from './EdgeVisionSimulator';

interface SplitCommandCenterProps {
  alert: AlertState;
  cameraNodes: CameraNode[];
  onBroadcastAlert: (data: Partial<AlertState>) => Promise<void>;
  onResolveAlert: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  onDropSighting: (data: { lat: number; lng: number; notes?: string; reportedBy?: string }) => Promise<void>;
  onNavigateToView: (view: 'caregiver' | 'neighbor' | 'camera' | 'split') => void;
}

export const SplitCommandCenter: React.FC<SplitCommandCenterProps> = ({
  alert,
  cameraNodes,
  onBroadcastAlert,
  onResolveAlert,
  onResetDemo,
  onDropSighting,
  onNavigateToView,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-black">
            ● SIMULTANEOUS LIVE DEMO ENVIRONMENT
          </span>
          <h2 className="text-xl font-black text-white">Full Network Mesh Split Screen</h2>
          <p className="text-xs text-slate-400">
            Caregiver Broadcast + Neighbor Mobile GPS + Automated Edge-Vision Camera AI running on a shared real-time event bus.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left half: Caregiver Dashboard */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <CaregiverDashboard
            alert={alert}
            cameraNodes={cameraNodes}
            onBroadcastAlert={onBroadcastAlert}
            onResolveAlert={onResolveAlert}
            onResetDemo={onResetDemo}
            onNavigateToView={onNavigateToView}
          />
        </div>

        {/* Right half: Tabs or stacked Neighbor & Edge-Vision */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <NeighborInterface
              alert={alert}
              cameraNodes={cameraNodes}
              onDropSighting={onDropSighting}
              onNavigateToView={onNavigateToView}
            />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <EdgeVisionSimulator
              alert={alert}
              cameraNodes={cameraNodes}
              onNavigateToView={onNavigateToView}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
