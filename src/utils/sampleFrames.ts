/**
 * Generates realistic simulated residential porch and CCTV camera frames
 * as base64 JPEG images for testing the Edge-Vision Gemini multimodal agent.
 */

export interface SampleCameraFeed {
  id: string;
  title: string;
  expectedMatch: boolean;
  description: string;
  notes: string;
  generateDataUrl: () => string;
}

// Helper to draw a simulated camera frame onto an offscreen canvas
function createSimulatedFrame(config: {
  timestampText: string;
  cameraName: string;
  personType: 'MATCHING_RED_JACKET' | 'GREEN_HOODIE' | 'NAVY_SWEATER' | 'EMPTY_SIDEWALK' | 'DISTANT_RED_JACKET';
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw residential street/porch background (asphalt, sidewalk, lawn, houses)
  // Sky / distance
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 200);
  skyGrad.addColorStop(0, '#334155');
  skyGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 640, 200);

  // Distant houses & trees
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, 110, 120, 80);
  ctx.fillRect(200, 95, 140, 95);
  ctx.fillRect(400, 115, 150, 75);

  // Roof triangles
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(30, 110);
  ctx.lineTo(100, 60);
  ctx.lineTo(170, 110);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(190, 95);
  ctx.lineTo(270, 50);
  ctx.lineTo(350, 95);
  ctx.fill();

  // Lawn & bushes
  ctx.fillStyle = '#2d4a22';
  ctx.fillRect(0, 180, 640, 100);

  // Sidewalk
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, 280);
  ctx.lineTo(640, 240);
  ctx.lineTo(640, 340);
  ctx.lineTo(0, 420);
  ctx.fill();

  // Sidewalk expansion lines
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  for (let x = 60; x < 640; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 260 + (x / 640) * -20);
    ctx.lineTo(x - 40, 390);
    ctx.stroke();
  }

  // Asphalt road in foreground
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, 410);
  ctx.lineTo(640, 330);
  ctx.lineTo(640, 480);
  ctx.lineTo(0, 480);
  ctx.fill();

  // Curb line
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 412);
  ctx.lineTo(640, 332);
  ctx.stroke();

  // 2. Draw person based on scenario
  if (config.personType === 'MATCHING_RED_JACKET') {
    // Elderly male walking slowly, bright red jacket, blue jeans, gray sneakers
    const px = 280;
    const py = 200;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px + 10, py + 155, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head / hair (gray hair, elderly build)
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.arc(px + 4, py + 12, 11, 0, Math.PI * 2);
    ctx.fill();
    // Face skin tone
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(px + 6, py + 14, 8, 0, Math.PI * 2);
    ctx.fill();

    // Bright Red Jacket (prominent red winter coat / windbreaker)
    ctx.fillStyle = '#dc2626'; // Vibrant Red
    ctx.beginPath();
    ctx.roundRect(px - 14, py + 26, 36, 56, 6);
    ctx.fill();

    // Jacket zipper / collar details
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 26);
    ctx.lineTo(px + 4, py + 82);
    ctx.stroke();

    // Arms in red jacket
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(px - 22, py + 30, 10, 42, 4);
    ctx.roundRect(px + 20, py + 32, 10, 40, 4);
    ctx.fill();

    // Hands
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(px - 17, py + 74, 5, 0, Math.PI * 2);
    ctx.arc(px + 25, py + 74, 5, 0, Math.PI * 2);
    ctx.fill();

    // Blue Jeans (classic denim blue trousers)
    ctx.fillStyle = '#1d4ed8'; // Blue jeans
    // Left leg
    ctx.beginPath();
    ctx.roundRect(px - 12, py + 82, 12, 58, 3);
    ctx.fill();
    // Right leg (stepping)
    ctx.beginPath();
    ctx.roundRect(px + 6, py + 82, 12, 56, 3);
    ctx.fill();

    // Denim seam lines
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 82);
    ctx.lineTo(px + 3, py + 110);
    ctx.stroke();

    // Gray sneakers
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.ellipse(px - 6, py + 142, 9, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(px + 12, py + 140, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // White soles
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 15, py + 144, 18, 3);
    ctx.fillRect(px + 3, py + 142, 18, 3);
  } else if (config.personType === 'DISTANT_RED_JACKET') {
    // Further down the sidewalk, walking away
    const px = 420;
    const py = 205;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + 5, py + 95, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(px + 5, py + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Bright Red Jacket
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px - 8, py + 16, 26, 38);

    // Blue Jeans
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(px - 6, py + 54, 10, 36);
    ctx.fillRect(px + 6, py + 54, 10, 34);

    // Shoes
    ctx.fillStyle = '#64748b';
    ctx.fillRect(px - 7, py + 90, 11, 5);
    ctx.fillRect(px + 5, py + 88, 11, 5);
  } else if (config.personType === 'GREEN_HOODIE') {
    // Younger person in lime green hoodie and black pants with a dog
    const px = 240;
    const py = 210;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px + 10, py + 150, 40, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Green Hoodie
    ctx.fillStyle = '#16a34a'; // Green
    ctx.beginPath();
    ctx.arc(px + 8, py + 14, 12, 0, Math.PI * 2); // Hood
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.roundRect(px - 12, py + 26, 40, 52, 6);
    ctx.fill();

    // Black pants
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px - 8, py + 78, 14, 60);
    ctx.fillRect(px + 12, py + 78, 14, 58);

    // White sneakers
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(px - 10, py + 138, 17, 6);
    ctx.fillRect(px + 10, py + 136, 17, 6);

    // Little dog on leash
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px + 55, py + 125, 25, 16);
    ctx.arc(px + 82, py + 128, 8, 0, Math.PI * 2);
    ctx.fill();
    // Leash
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 22, py + 60);
    ctx.lineTo(px + 75, py + 126);
    ctx.stroke();
  } else if (config.personType === 'NAVY_SWEATER') {
    // Person in navy dark sweater and khaki trousers
    const px = 310;
    const py = 195;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + 10, py + 160, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(px + 6, py + 14, 10, 0, Math.PI * 2);
    ctx.fill();

    // Navy Blue Sweater
    ctx.fillStyle = '#1e3a8a';
    ctx.roundRect(px - 12, py + 26, 36, 56, 5);
    ctx.fill();

    // Khaki pants
    ctx.fillStyle = '#d97706';
    ctx.fillRect(px - 10, py + 82, 13, 62);
    ctx.fillRect(px + 7, py + 82, 13, 60);

    // Brown leather shoes
    ctx.fillStyle = '#451a03';
    ctx.fillRect(px - 12, py + 144, 16, 6);
    ctx.fillRect(px + 5, py + 142, 16, 6);
  }

  // 3. CCTV / Porch camera overlay (Timecode, REC indicator, noise, camera title)
  // Subtle lens vignette
  const vigGrad = ctx.createRadialGradient(320, 240, 200, 320, 240, 400);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, 640, 480);

  // Scanlines effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let y = 0; y < 480; y += 4) {
    ctx.fillRect(0, y, 640, 1.5);
  }

  // Camera OSD Info
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(28, 28, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText('● REC', 40, 33);
  ctx.fillText(config.cameraName.toUpperCase(), 110, 33);

  // Timestamp
  ctx.fillText(config.timestampText, 390, 33);

  // Privacy protection badge (demonstrating ethical AI edge design)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(16, 440, 310, 26);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.strokeRect(16, 440, 310, 26);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('🔒 MEMORYMESH EDGE AGENT: NO FACIAL BIOMETRICS', 24, 457);

  // Bounding guide box
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, 560, 400);

  return canvas.toDataURL('image/jpeg', 0.88);
}

export const sampleFeeds: SampleCameraFeed[] = [
  {
    id: 'feed-match-1',
    title: 'Porch Cam 14 - Red Jacket Subject (High Match)',
    expectedMatch: true,
    description: 'Elderly male walking on sidewalk in bright red coat, blue jeans, and gray sneakers.',
    notes: 'Simulates matching clothing profile right outside Oak St intersection.',
    generateDataUrl: () =>
      createSimulatedFrame({
        timestampText: '2026-10-18 10:14:02',
        cameraName: 'PorchCam #14 - Oak St',
        personType: 'MATCHING_RED_JACKET',
      }),
  },
  {
    id: 'feed-distant-match',
    title: 'Park Cam - Red Jacket Pedestrian (Mid-Range)',
    expectedMatch: true,
    description: 'Pedestrian in red jacket and denim jeans heading towards south park gate.',
    notes: 'Distant silhouette matching color signature.',
    generateDataUrl: () =>
      createSimulatedFrame({
        timestampText: '2026-10-18 10:18:45',
        cameraName: 'Willow Park Cam #03',
        personType: 'DISTANT_RED_JACKET',
      }),
  },
  {
    id: 'feed-no-match-green',
    title: 'Corner CCTV - Green Hoodie & Dog (No Match)',
    expectedMatch: false,
    description: 'Dog walker wearing bright green hoodie and black athletic pants.',
    notes: 'Should test negative for red jacket clothing description.',
    generateDataUrl: () =>
      createSimulatedFrame({
        timestampText: '2026-10-18 10:16:11',
        cameraName: 'Corner CCTV #03 - Elm St',
        personType: 'GREEN_HOODIE',
      }),
  },
  {
    id: 'feed-no-match-navy',
    title: 'Driveway Cam - Navy Sweater (No Match)',
    expectedMatch: false,
    description: 'Neighbor in dark navy blue sweater and khaki pants checking mailbox.',
    notes: 'Different color palette, AI should reject.',
    generateDataUrl: () =>
      createSimulatedFrame({
        timestampText: '2026-10-18 10:11:30',
        cameraName: 'Driveway Cam #08 - Pine Ave',
        personType: 'NAVY_SWEATER',
      }),
  },
  {
    id: 'feed-empty',
    title: 'Sidewalk Cam - Empty Street (No Subject)',
    expectedMatch: false,
    description: 'Quiet suburban sidewalk with no pedestrians present.',
    notes: 'Verifies negative baseline with zero false positives.',
    generateDataUrl: () =>
      createSimulatedFrame({
        timestampText: '2026-10-18 10:20:00',
        cameraName: 'PorchCam #14 - Oak St',
        personType: 'EMPTY_SIDEWALK',
      }),
  },
];
