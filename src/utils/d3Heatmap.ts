import * as d3 from 'd3';
import L from 'leaflet';
import { Sighting } from '../types';

export interface HeatmapOptions {
  radius: number; // in pixels
  opacity: number; // 0 to 1
  showContours: boolean;
  showRadialBlobs: boolean;
  showEpicenterBadge: boolean;
}

export interface HotspotEpicenter {
  lat: number;
  lng: number;
  intensity: number;
  sightingCount: number;
  clusterRadiusMeters: number;
}

/**
 * Renders a D3-powered Sighting Density Heat Map onto an SVG overlay in Leaflet.
 */
export function renderD3HeatmapOverlay(
  map: L.Map,
  svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  sightings: Sighting[],
  options: HeatmapOptions
): HotspotEpicenter | null {
  // Clear previous rendering
  svgSelection.selectAll('*').remove();

  if (!sightings || sightings.length === 0) return null;

  // Calculate current map viewport layer bounds
  const bounds = map.getBounds();
  const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
  const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());

  const padding = 120; // extra padding around viewport for smooth pan transitions
  const xMin = topLeft.x - padding;
  const yMin = topLeft.y - padding;
  const width = Math.max(10, bottomRight.x - topLeft.x + padding * 2);
  const height = Math.max(10, bottomRight.y - topLeft.y + padding * 2);

  // Position and size the SVG container
  svgSelection
    .attr('width', width)
    .attr('height', height)
    .style('left', `${xMin}px`)
    .style('top', `${yMin}px`)
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', options.opacity);

  // Filter and project sightings onto local SVG coordinates
  const projectedPoints: { x: number; y: number; weight: number; sighting: Sighting }[] = [];

  sightings.forEach((s) => {
    const layerPoint = map.latLngToLayerPoint([s.lat, s.lng]);
    const localX = layerPoint.x - xMin;
    const localY = layerPoint.y - yMin;

    // Weight AI verified sightings slightly higher or standard weight
    const weight = s.source === 'AI_CAMERA' ? 1.4 : 1.0;
    projectedPoints.push({ x: localX, y: localY, weight, sighting: s });
  });

  if (projectedPoints.length === 0) return null;

  // Definitions for radial gradients
  const defs = svgSelection.append('defs');

  // Heat blob radial gradient (Volumetric thermal signature)
  const radialGrad = defs
    .append('radialGradient')
    .attr('id', 'd3-heat-gaussian-glow')
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '50%');

  radialGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ff2200').attr('stop-opacity', 0.95);
  radialGrad.append('stop').attr('offset', '25%').attr('stop-color', '#ff5500').attr('stop-opacity', 0.8);
  radialGrad.append('stop').attr('offset', '50%').attr('stop-color', '#ffaa00').attr('stop-opacity', 0.55);
  radialGrad.append('stop').attr('offset', '75%').attr('stop-color', '#00ddff').attr('stop-opacity', 0.25);
  radialGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0044ff').attr('stop-opacity', 0);

  // Group for Heat Blends
  const heatGroup = svgSelection
    .append('g')
    .attr('class', 'heat-contours')
    .style('mix-blend-mode', 'screen');

  // 1. D3 2D Kernel Density Contours (when we have 3 or more points)
  if (options.showContours && projectedPoints.length >= 3) {
    try {
      // Density estimation with d3.contourDensity
      const densityContours = d3
        .contourDensity<{ x: number; y: number; weight: number }>()
        .x((d) => d.x)
        .y((d) => d.y)
        .weight((d) => d.weight)
        .size([width, height])
        .bandwidth(options.radius * 0.9)
        .thresholds(12)(projectedPoints);

      if (densityContours.length > 0) {
        const maxDensity = d3.max(densityContours, (d) => d.value) || 0.001;
        const colorScale = d3
          .scaleSequential((t) => d3.interpolateInferno(0.2 + t * 0.8))
          .domain([0, maxDensity]);

        const geoPath = d3.geoPath();

        heatGroup
          .selectAll('path.density-contour')
          .data(densityContours)
          .enter()
          .append('path')
          .attr('class', 'density-contour')
          .attr('d', geoPath)
          .attr('fill', (d) => colorScale(d.value))
          .attr('fill-opacity', (d) => Math.min(0.75, (d.value / maxDensity) * 0.8 + 0.15))
          .attr('stroke', (d) => colorScale(d.value))
          .attr('stroke-width', 0.5)
          .attr('stroke-opacity', 0.6);
      }
    } catch (e) {
      console.warn('D3 contour density generation fallback:', e);
    }
  }

  // 2. Radial Heat Blobs (Guarantees visible luminous thermal halos for every single sighting point)
  if (options.showRadialBlobs) {
    const blobRadius = Math.max(25, options.radius * 1.3);

    heatGroup
      .selectAll('circle.heat-blob')
      .data(projectedPoints)
      .enter()
      .append('circle')
      .attr('class', 'heat-blob')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', blobRadius)
      .attr('fill', 'url(#d3-heat-gaussian-glow)');
  }

  // 3. Hotspot Epicenter Calculation
  const sumLat = sightings.reduce((acc, s) => acc + s.lat, 0);
  const sumLng = sightings.reduce((acc, s) => acc + s.lng, 0);
  const epicLat = sumLat / sightings.length;
  const epicLng = sumLng / sightings.length;

  const epicLayerPt = map.latLngToLayerPoint([epicLat, epicLng]);
  const epicLocalX = epicLayerPt.x - xMin;
  const epicLocalY = epicLayerPt.y - yMin;

  if (options.showEpicenterBadge) {
    const epicGroup = svgSelection.append('g').attr('class', 'epicenter-badge');

    // Pulsing outer halo for peak density epicenter
    epicGroup
      .append('circle')
      .attr('cx', epicLocalX)
      .attr('cy', epicLocalY)
      .attr('r', options.radius * 0.7)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4, 4')
      .attr('opacity', 0.8);

    // Inner bright core
    epicGroup
      .append('circle')
      .attr('cx', epicLocalX)
      .attr('cy', epicLocalY)
      .attr('r', 5)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e11d48')
      .attr('stroke-width', 2);
  }

  return {
    lat: epicLat,
    lng: epicLng,
    intensity: Math.min(100, sightings.length * 22),
    sightingCount: sightings.length,
    clusterRadiusMeters: 450,
  };
}
