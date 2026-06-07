import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    iconAnchor:  [16, 32],
    popupAnchor: [0, -34],
  });
}

export default function MapView({ activities, onSelect }) {
  const mapped = activities.filter(a => a.latitude && a.longitude);

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ height: '60vh' }}>
      <MapContainer
        center={[32.0853, 34.7818]}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {activity.price}
                  </span>
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
