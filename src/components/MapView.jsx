import { useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const CATEGORY_COLORS = {
  Movement:  '#7BAFDC',
  Wellness:  '#d4a5a5',
  Creative:  '#b39ddb',
  Social:    '#f4a261',
  Baby:      '#a4c0a4',
};

export default function MapView({ activities, onSelect }) {
  const [popup, setPopup] = useState(null);
  const [viewport, setViewport] = useState({
    latitude:  32.0853,
    longitude: 34.7818,
    zoom: 12,
  });

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50 rounded-2xl border border-stone-100 text-center p-8">
        <div>
          <span className="text-3xl block mb-2">🗺️</span>
          <p className="text-sm text-stone-500 font-medium">Map not configured</p>
          <p className="text-xs text-stone-300 mt-1">Add VITE_MAPBOX_TOKEN to your Vercel environment variables</p>
        </div>
      </div>
    );
  }

  const mapped = activities.filter(a => a.latitude && a.longitude);

  return (
    <div className="flex-1 rounded-2xl overflow-hidden relative" style={{ minHeight: '60vh' }}>
      <Map
        {...viewport}
        onMove={e => setViewport(e.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {mapped.map(activity => (
          <Marker
            key={activity.id}
            latitude={activity.latitude}
            longitude={activity.longitude}
            anchor="bottom"
            onClick={e => { e.originalEvent.stopPropagation(); setPopup(activity); }}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-sm cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: CATEGORY_COLORS[activity.category] || '#d4a5a5' }}
            >
              {activity.emoji}
            </div>
          </Marker>
        ))}

        {popup && (
          <Popup
            latitude={popup.latitude}
            longitude={popup.longitude}
            anchor="top"
            onClose={() => setPopup(null)}
            closeButton={false}
            className="mamaout-popup"
          >
            <div className="p-2 min-w-[180px]">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">{popup.emoji}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-800 text-xs leading-tight line-clamp-2">{popup.name}</p>
                  <p className="text-stone-400 text-[10px] mt-0.5">{popup.neighborhood}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  {popup.price}
                </span>
                <button
                  onClick={() => { onSelect(popup); setPopup(null); }}
                  className="text-[10px] font-semibold text-dusty-roseDark underline"
                >
                  View details →
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

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
