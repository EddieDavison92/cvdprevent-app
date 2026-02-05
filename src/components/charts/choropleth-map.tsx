'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SYSTEM_LEVELS } from '@/lib/api/types';
import { NHS_COLORS } from '@/lib/constants/colors';

interface AreaValue {
  code: string;
  name: string;
  value: number | null;
}

interface ChoroplethMapProps {
  data: AreaValue[];
  levelId: number;
  selectedAreaCode?: string;
  baselineValue?: number | null;
  baselineName?: string;
  formatValue?: (v: number) => string;
  height?: number;
}

// Map system level to boundary file
const BOUNDARY_FILES: Record<number, string> = {
  [SYSTEM_LEVELS.REGION]: '/geo/regions.geojson',
  [SYSTEM_LEVELS.ICB]: '/geo/icbs.geojson',
  [SYSTEM_LEVELS.SUB_ICB]: '/geo/sub-icbs.geojson',
};

// England bounding box for better initial zoom
const ENGLAND_BOUNDS = L.latLngBounds(
  L.latLng(49.9, -6.5),  // Southwest
  L.latLng(55.9, 2.0)    // Northeast
);

// Diverging colour scale: red (below) → white (at baseline) → green (above)
function getColor(value: number | null, min: number, max: number, baselineValue: number | null): string {
  if (value === null) return '#ddd';

  if (baselineValue !== null && baselineValue !== 0) {
    const diff = value - baselineValue;
    const maxAbsDiff = Math.max(Math.abs(min - baselineValue), Math.abs(max - baselineValue)) || 1;
    const ratio = Math.max(-1, Math.min(1, diff / maxAbsDiff));

    if (ratio >= 0) {
      // Above: white → green
      const t = ratio;
      const r = Math.round(255 - t * (255 - 0));
      const g = Math.round(255 - t * (255 - 127));
      const b = Math.round(255 - t * (255 - 59));
      return `rgb(${r},${g},${b})`;
    } else {
      // Below: white → red
      const t = -ratio;
      const r = Math.round(255 - t * (255 - 218));
      const g = Math.round(255 - t * (255 - 41));
      const b = Math.round(255 - t * (255 - 28));
      return `rgb(${r},${g},${b})`;
    }
  }

  // Fallback: sequential blue scale
  const range = max - min || 1;
  const t = (value - min) / range;
  const r = Math.round(232 - t * (232 - 0));
  const g = Math.round(237 - t * (237 - 94));
  const b = Math.round(238 - t * (238 - 184));
  return `rgb(${r},${g},${b})`;
}

export function ChoroplethMap({
  data,
  levelId,
  selectedAreaCode,
  baselineValue,
  baselineName = 'England',
  formatValue = (v) => v.toFixed(1),
  height = 500,
}: ChoroplethMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const legendRef = useRef<L.Control | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const boundaryFile = BOUNDARY_FILES[levelId];

  // Build lookup map from area code to value
  const valueMap = useMemo(() => {
    const map = new Map<string, AreaValue>();
    data.forEach((d) => map.set(d.code, d));
    return map;
  }, [data]);

  // Compute min/max for colour scale
  const { min, max } = useMemo(() => {
    const values = data.map((d) => d.value).filter((v): v is number => v !== null);
    return {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 100,
    };
  }, [data]);

  // Fetch boundary GeoJSON
  useEffect(() => {
    if (!boundaryFile) {
      setError('Map not available for this geography level');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(boundaryFile)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${boundaryFile}`);
        return res.json();
      })
      .then((data) => {
        setGeojson(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [boundaryFile]);

  // Style callback for GeoJSON features
  const getStyle = useCallback(
    (feature: GeoJSON.Feature | undefined) => {
      if (!feature) return {};
      const code = feature.properties?.code;
      const areaData = valueMap.get(code);
      const isSelected = code === selectedAreaCode;

      return {
        fillColor: getColor(areaData?.value ?? null, min, max, baselineValue ?? null),
        weight: isSelected ? 3 : 1,
        opacity: 1,
        color: isSelected ? NHS_COLORS.darkBlue : '#fff',
        fillOpacity: 0.8,
      };
    },
    [valueMap, min, max, baselineValue, selectedAreaCode]
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !geojson || typeof window === 'undefined') return;

    const initMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
        maxBounds: ENGLAND_BOUNDS.pad(0.3),
        minZoom: 5,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      const layer = L.geoJSON(geojson, {
        style: (feature) => getStyle(feature),
        onEachFeature: (feature, layer) => {
          const code = feature.properties?.code;
          const areaName = feature.properties?.name;
          const areaData = valueMap.get(code);

          const tooltipContent = areaData?.value != null
            ? `<strong>${areaName}</strong><br/>${formatValue(areaData.value)}`
            : `<strong>${areaName}</strong><br/>No data`;

          layer.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'choropleth-tooltip',
          });

          layer.on('mouseover', (e) => {
            const target = e.target as L.Path;
            target.setStyle({ weight: 3, color: NHS_COLORS.darkBlue });
            target.bringToFront();
          });
          layer.on('mouseout', (e) => {
            const target = e.target as L.Path;
            const isSelected = code === selectedAreaCode;
            target.setStyle({
              weight: isSelected ? 3 : 1,
              color: isSelected ? NHS_COLORS.darkBlue : '#fff',
            });
          });
        },
      }).addTo(map);

      geojsonLayerRef.current = layer;

      // Fit to England bounds (tighter than layer bounds)
      map.fitBounds(ENGLAND_BOUNDS, { padding: [10, 10] });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson]);

  // Update styles when data/selection changes
  useEffect(() => {
    if (!geojsonLayerRef.current) return;
    geojsonLayerRef.current.setStyle((feature) => getStyle(feature));
  }, [getStyle]);

  // Update legend when baseline changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (legendRef.current) {
      legendRef.current.remove();
    }

    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'choropleth-legend');
      const baseLabel = baselineValue != null ? formatValue(baselineValue) : '—';
      div.innerHTML = `
        <div style="background:white;padding:8px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.15);font-size:11px;line-height:1.6">
          <div style="font-weight:600;margin-bottom:4px">vs ${baselineName} (${baseLabel})</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:14px;height:14px;background:#DA291C;border-radius:2px"></span> Below
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:14px;height:14px;background:#fff;border:1px solid #ccc;border-radius:2px"></span> At average
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:14px;height:14px;background:#007F3B;border-radius:2px"></span> Above
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
            <span style="display:inline-block;width:14px;height:14px;background:#ddd;border-radius:2px"></span> No data
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);
    legendRef.current = legend;
  }, [baselineValue, baselineName, formatValue]);

  if (!boundaryFile) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>
        Map view not available for this geography level
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center text-sm text-red-500" style={{ height }}>
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <span className="text-sm text-gray-400">Loading map...</span>
        </div>
      )}
      <div ref={mapRef} style={{ height, width: '100%', borderRadius: 8 }} />
    </div>
  );
}
