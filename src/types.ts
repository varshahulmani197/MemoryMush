export interface Sighting {
  id: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  reportedBy: string;
  source: 'NEIGHBOR' | 'AI_CAMERA';
  cameraName?: string;
  notes?: string;
  timestamp: string;
  confidenceScore?: number;
  reasoning?: string;
  imageUrl?: string;
}

export interface CameraNode {
  id: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  status: 'ONLINE' | 'ANALYZING' | 'ALERT_DETECTED' | 'STANDBY';
  lastChecked?: string;
  sampleDescription: string;
}

export interface AlertState {
  isActive: boolean;
  alertId: string;
  patientName: string;
  clothingDescription: string;
  baselinePhoto?: string;
  homeAddress: string;
  homeCoords: { lat: number; lng: number };
  searchRadiusKm: number;
  caregiverPhone: string;
  broadcastTime: string | null;
  sightings: Sighting[];
  auditLogs: {
    id: string;
    timestamp: string;
    type: 'ALERT_ISSUED' | 'SIGHTING_REPORTED' | 'AI_CAMERA_MATCH' | 'ALERT_RESOLVED' | 'SYSTEM';
    message: string;
  }[];
}

export interface VisionAnalysisResult {
  match_found: boolean;
  confidence_score: number;
  reasoning: string;
}
