import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

export default function MapView({ activities, onSelect }) {
  const mapped = jitterDuplicates(activities.filter(a => a.latitude && a.longitude));

  return (
    <div className="relative" style={{ height: '100%', minHeight: '60vh' }}>
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
            >
              <Popup closeButton={false}>
                <div className="p-1 min-w-[160px]">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg leading-none">{activity.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800 text-xs leading-tight line-clamp-2">{activity.name}</p>
                      <p className="text-stone-400 text-[10px] mt-0.5">{activity.neighborhood}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => onSelect(activity)}
                      className="text-[10px] font-semibold text-dusty-roseDark underline"
                    >
                      View details →
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
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
    </div>
  );
}
