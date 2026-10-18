import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Parse JSON bodies with up to 15MB for camera feed snapshots
app.use(express.json({ limit: '15mb' }));

// Neighborhood & Alert State Model
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

// Default initial state
const state: AlertState = {
  isActive: true,
  alertId: 'ALERT-8921',
  patientName: 'Robert Vance (Age 78)',
  clothingDescription: 'elderly male, bright red jacket, blue jeans, gray sneakers, slight stoop',
  baselinePhoto: '',
  homeAddress: '742 Evergreen Terrace, Willow Glen',
  homeCoords: { lat: 37.3065, lng: -121.8907 },
  searchRadiusKm: 2.0,
  caregiverPhone: '(408) 555-0192',
  broadcastTime: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
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
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
      type: 'ALERT_ISSUED',
      message: 'Caregiver initiated Active Alert Protocol for Robert Vance (elderly male, bright red jacket, blue jeans).',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      type: 'SIGHTING_REPORTED',
      message: 'Neighbor Sarah M. dropped GPS pin near Willow St Park.',
    },
  ],
};

// Simulated Edge-Vision Camera Nodes positioned in the neighborhood
const cameraNodes: CameraNode[] = [
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

// SSE Clients for instant real-time synchronization
const sseClients: Response[] = [];

function broadcastState() {
  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    data: {
      alert: state,
      cameraNodes,
    },
  });

  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// API Routes
app.get('/api/state', (_req: Request, res: Response) => {
  res.json({
    alert: state,
    cameraNodes,
  });
});

// SSE endpoint for live map & sighting updates
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state immediately
  res.write(
    `data: ${JSON.stringify({
      type: 'STATE_UPDATE',
      data: { alert: state, cameraNodes },
    })}\n\n`
  );

  sseClients.push(res);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// Broadcast or update alert
app.post('/api/alert', (req: Request, res: Response) => {
  const { clothingDescription, patientName, homeAddress, homeCoords, searchRadiusKm, caregiverPhone, baselinePhoto } = req.body;

  state.isActive = true;
  state.alertId = `ALERT-${Math.floor(1000 + Math.random() * 9000)}`;
  state.broadcastTime = new Date().toISOString();
  if (clothingDescription) state.clothingDescription = clothingDescription;
  if (patientName) state.patientName = patientName;
  if (homeAddress) state.homeAddress = homeAddress;
  if (homeCoords) state.homeCoords = homeCoords;
  if (searchRadiusKm) state.searchRadiusKm = Number(searchRadiusKm);
  if (caregiverPhone) state.caregiverPhone = caregiverPhone;
  if (baselinePhoto !== undefined) state.baselinePhoto = baselinePhoto;

  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'ALERT_ISSUED',
    message: `Active Alert Protocol broadcasted: "${state.clothingDescription}". Radius: ${state.searchRadiusKm}km.`,
  });

  broadcastState();
  res.json({ success: true, alert: state });
});

// Resolve alert
app.post('/api/alert/resolve', (req: Request, res: Response) => {
  state.isActive = false;
  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'ALERT_RESOLVED',
    message: `Alert ${state.alertId} resolved. Patient located safely.`,
  });

  broadcastState();
  res.json({ success: true, alert: state });
});

// Neighbor or manual pin drop
app.post('/api/sightings', (req: Request, res: Response) => {
  const { lat, lng, notes, reportedBy, accuracyMeters } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'Valid latitude and longitude required' });
  }

  const newSighting: Sighting = {
    id: `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    lat,
    lng,
    accuracyMeters: accuracyMeters || 10,
    reportedBy: reportedBy || 'Neighbor (Live GPS)',
    source: 'NEIGHBOR',
    notes: notes || 'Visual sighting reported by neighbor',
    timestamp: new Date().toISOString(),
  };

  state.sightings.unshift(newSighting);
  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'SIGHTING_REPORTED',
    message: `Neighbor pin dropped at [${lat.toFixed(4)}, ${lng.toFixed(4)}]: ${newSighting.notes}`,
  });

  broadcastState();
  res.status(201).json({ success: true, sighting: newSighting });
});

// Edge-Vision AI Analysis endpoint
app.post('/api/edge-vision/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', cameraId, customDescription } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const targetDescription = customDescription || state.clothingDescription;
    const camera = cameraNodes.find((c) => c.id === cameraId) || cameraNodes[0];

    // Mark camera node as analyzing
    camera.status = 'ANALYZING';
    broadcastState();

    // Multimodal AI Prompt matching exact user specifications:
    const systemInstruction = `You are a privacy-first, visual anomaly analysis AI for a neighborhood safety network. Your task is to analyze the provided image (simulating a residential security camera feed) and determine if it contains a person matching the specific clothing and build description provided below. 

Description to match: "${targetDescription}"

CRITICAL INSTRUCTIONS:
1. Do NOT attempt facial recognition. Base your analysis entirely on clothing color, garment type, and general physical build.
2. Output your response STRICTLY as a valid JSON object with no markdown formatting, no code blocks, and no additional text. 

Use this exact JSON structure:
{
  "match_found": true/false,
  "confidence_score": [number between 0-100],
  "reasoning": "[Brief 1-sentence explanation of why the clothing matches or does not match]"
}`;

    // Clean base64 string if it contains data prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this security camera frame against the description: "${targetDescription}". Respond strictly in JSON format as specified.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match_found: {
              type: Type.BOOLEAN,
              description: 'Whether a person matching the clothing and build description was detected',
            },
            confidence_score: {
              type: Type.NUMBER,
              description: 'Confidence score between 0 and 100',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Brief 1-sentence explanation of why the clothing matches or does not match',
            },
          },
          required: ['match_found', 'confidence_score', 'reasoning'],
        },
      },
    });

    const responseText = response.text || '{}';
    let analysisResult: { match_found: boolean; confidence_score: number; reasoning: string };

    try {
      analysisResult = JSON.parse(responseText);
    } catch {
      // Fallback clean parsing if any wrapped text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI vision response as JSON');
      }
    }

    camera.lastChecked = new Date().toISOString();

    let newSighting: Sighting | null = null;

    if (analysisResult.match_found) {
      camera.status = 'ALERT_DETECTED';

      // Slight jitter around camera location for realistic sidewalk tracking
      const jitterLat = camera.lat + (Math.random() - 0.5) * 0.0003;
      const jitterLng = camera.lng + (Math.random() - 0.5) * 0.0003;

      newSighting = {
        id: `ai-s-${Date.now()}`,
        lat: jitterLat,
        lng: jitterLng,
        accuracyMeters: 5,
        reportedBy: `Edge-Vision AI (${camera.name})`,
        source: 'AI_CAMERA',
        cameraName: `${camera.name} - ${camera.locationName}`,
        confidenceScore: analysisResult.confidence_score,
        reasoning: analysisResult.reasoning,
        notes: `AI Match (${analysisResult.confidence_score}%): ${analysisResult.reasoning}`,
        timestamp: new Date().toISOString(),
      };

      state.sightings.unshift(newSighting);
      state.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'AI_CAMERA_MATCH',
        message: `Edge camera ${camera.name} detected match (${analysisResult.confidence_score}%): ${analysisResult.reasoning}`,
      });
    } else {
      camera.status = 'ONLINE';
      state.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'SYSTEM',
        message: `${camera.name} scanned frame: No match found. (${analysisResult.reasoning})`,
      });
    }

    broadcastState();

    res.json({
      success: true,
      analysis: analysisResult,
      camera,
      sighting: newSighting,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Edge-Vision analysis error:', errorMsg);
    res.status(500).json({ error: 'AI analysis failed', details: errorMsg });
  }
});

// Reset demo simulation state
app.post('/api/demo/reset', (_req: Request, res: Response) => {
  state.isActive = true;
  state.alertId = 'ALERT-8921';
  state.patientName = 'Robert Vance (Age 78)';
  state.clothingDescription = 'elderly male, bright red jacket, blue jeans, gray sneakers, slight stoop';
  state.broadcastTime = new Date().toISOString();
  state.sightings = [
    {
      id: 's-initial-1',
      lat: 37.3092,
      lng: -121.8885,
      accuracyMeters: 12,
      reportedBy: 'Neighbor Sarah M.',
      source: 'NEIGHBOR',
      notes: 'Walking slowly toward Willow St Park, wearing bright red coat.',
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    },
    {
      id: 's-initial-2',
      lat: 37.3088,
      lng: -121.8878,
      accuracyMeters: 8,
      reportedBy: 'Neighbor Dave K.',
      source: 'NEIGHBOR',
      notes: 'Seen pausing at park bench near south pathway in red jacket.',
      timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    },
    {
      id: 's-initial-3',
      lat: 37.3095,
      lng: -121.8890,
      accuracyMeters: 10,
      reportedBy: 'Neighbor Elena R.',
      source: 'NEIGHBOR',
      notes: 'Passed by on bicycle, confirmed red outerwear and denim trousers.',
      timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    },
    {
      id: 's-initial-4',
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
  ];
  cameraNodes.forEach((c) => (c.status = 'ONLINE'));
  state.auditLogs = [
    {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'ALERT_ISSUED',
      message: 'Demo state reset. Active Alert Protocol running.',
    },
  ];
  broadcastState();
  res.json({ success: true, alert: state });
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MemoryMesh server listening on port ${PORT}`);
  });
}

startServer();
