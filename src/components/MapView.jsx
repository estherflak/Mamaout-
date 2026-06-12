import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ActivityCard from './ActivityCard';

function InvalidateSize() {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [map]);
  return null;
}

const CATEGORY_COLORS = {
  Movement:  '#7BAFDC',
  Wellness:  '#d4a5a5',
  Creative:  '#b39ddb',
  Social:    '#f4a261',
  Baby:      '#a4c0a4',
};

function categoryIcon(activity) {
  const color = CATEGORY_COLORS[activity.category] || '#d4a5a5';
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer">${activity.emoji}</div>`,
    iconSize:    [32, 32],
    iconAnchor:  [16, 16],
    popupAnchor: [0, -18],
  });
}

// When multiple activities share the same geocoded point (city/neighbourhood centroid),
// spread them in concentric rings so they're individually tappable after zooming in.
function jitterDuplicates(activities) {
  const buckets = {};
  for (const a of activities) {
    const key = `${a.latitude.toFixed(4)},${a.longitude.toFixed(4)}`;
    (buckets[key] = buckets[key] || []).push(a);
  }
  return activities.map(a => {
    const key   = `${a.latitude.toFixed(4)},${a.longitude.toFixed(4)}`;
    const group = buckets[key];
    if (group.length <= 1) return a;
    const idx   = group.indexOf(a);
    const ring  = Math.floor(idx / 8);
    const slot  = idx % 8;
    const angle = (2 * Math.PI * slot) / 8 + (ring * Math.PI / 8); // stagger rings
    const r     = 0.0015 * (ring + 1); // ~165m per ring
    return { ...a, latitude: a.latitude + r * Math.sin(angle), longitude: a.longitude + r * Math.cos(angle) };
  });
}

export default function MapView({ activities, onSelect, className = '' }) {
  const mapped = jitterDuplicates(activities.filter(a => a.latitude && a.longitude));
  // Activity surfaced in the bottom sheet after tapping a pin
  const [sheet, setSheet] = useState(null);

  return (
    <div className={`relative ${className}`} style={{ height: '100%', minHeight: '60vh' }}>
      <MapContainer
        center={[32.0853, 34.7818]}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
        tap={false}
      >
        <InvalidateSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup chunkedLoading>
          {mapped.map(activity => (
            <Marker
              key={activity.id}
              position={[activity.latitude, activity.longitude]}
              icon={categoryIcon(activity)}
              eventHandlers={{ click: () => setSheet(activity) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {mapped.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-stone-100">
            <p className="text-xs text-stone-500">No activities with map coordinates yet</p>
          </div>
        </div>
      )}

      {/* Bottom sheet — full activity card for the tapped pin */}
      {sheet && (
        <div
          className="absolute inset-0 z-[1000] flex items-end"
          onClick={() => setSheet(null)}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div
            className="relative w-full px-3 pb-3 animate-sheet-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end mb-1.5">
              <button
                onClick={() => setSheet(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white shadow-md border border-stone-100 flex items-center justify-center text-stone-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <ActivityCard
              activity={sheet}
              onSelect={a => { setSheet(null); onSelect(a); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
