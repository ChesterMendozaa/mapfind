import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline,
} from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { DEFAULT_CENTER } from '../data/places.js';
import { getBrandLogoUrl } from '../utils/brandLogo.js';
import DirectionsBanner from './DirectionsBanner.jsx';
import {
  FaHamburger, FaCoffee, FaShoppingBag, FaUniversity, FaPills,
  FaGasPump, FaHotel, FaGraduationCap, FaMapMarkerAlt, FaTimes, FaLayerGroup,
} from 'react-icons/fa';

const ICONS = {
  food: FaHamburger,
  coffee: FaCoffee,
  shopping: FaShoppingBag,
  bank: FaUniversity,
  pharmacy: FaPills,
  gas: FaGasPump,
  hotel: FaHotel,
  school: FaGraduationCap,
};

function makePin(iconComponent, extraClass = '') {
  const Icon = iconComponent || FaMapMarkerAlt;
  const svg = renderToStaticMarkup(<Icon size={14} />);
  return L.divIcon({
    className: '',
    html: `<div class="pin ${extraClass}">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function RecenterOn({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

function FitRoute({ route }) {
  const map = useMap();
  useEffect(() => {
    if (!route?.coordinates?.length) return;
    const bounds = L.latLngBounds(route.coordinates);
    map.fitBounds(bounds, { padding: [80, 80] });
  }, [route, map]);
  return null;
}

// Rich popup content with brand logo + category fallback
function PopupContent({ place }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getBrandLogoUrl(place.brand || place.name);
  const Icon = ICONS[place.category] || FaMapMarkerAlt;
  const showLogo = logoUrl && !logoFailed;

  return (
    <div className="mf-popup">
      <div className="mf-popup-logo">
        {showLogo ? (
          <img
            src={logoUrl}
            alt=""
            width={32}
            height={32}
            onLoad={(e) => {
              // Google returns a 16x16 generic globe when the domain has no favicon
              if (e.target.naturalWidth <= 16) setLogoFailed(true);
            }}
            onError={() => setLogoFailed(true)}
            style={{ borderRadius: 6, display: 'block' }}
          />
        ) : (
          <div className="mf-popup-logo-fallback">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="mf-popup-body">
        <div className="mf-popup-name">{place.name}</div>
        <div className="mf-popup-address">{place.address}</div>
      </div>
    </div>
  );
}

export default function MapView({
  places,
  selectedId,
  onSelectPlace,
  userLocation,
  recenterTarget,
  route,
  routeLoading,
  routeError,
  onClearRoute,
}) {
  const userIcon = useMemo(() => makePin(FaMapMarkerAlt, 'user'), []);
  const pinCache = useRef(new Map());

  const getIcon = (place) => {
    const Icon = ICONS[place.category] || FaMapMarkerAlt;
    const isSel = place.id === selectedId;
    const key = `${place.category}-${isSel}`;
    if (!pinCache.current.has(key)) {
      pinCache.current.set(key, makePin(Icon, isSel ? 'selected' : ''));
    }
    return pinCache.current.get(key);
  };

  return (
    <div className="map-wrap">
      <MapContainer
        center={recenterTarget || DEFAULT_CENTER}
        zoom={14}
        scrollWheelZoom
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Zoom controls repositioned to bottom-right */}
        <ZoomControl position="bottomright" />

        {recenterTarget && <RecenterOn center={recenterTarget} zoom={14} />}
        {route?.coordinates && <FitRoute route={route} />}

        {route?.coordinates && (
          <Polyline
            positions={route.coordinates}
            pathOptions={{
              color: '#2563eb',
              weight: 6,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {places.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={getIcon(p)}
            eventHandlers={{ click: () => onSelectPlace(p.id) }}
            zIndexOffset={p.id === selectedId ? 1000 : 0}
          >
            <Popup>
              <PopupContent place={p} />
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            zIndexOffset={2000}
          >
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Directions banner — top center */}
      {routeLoading && (
        <div className="directions-banner">
          <div className="directions-info">
            <div className="directions-title">Calculating route…</div>
          </div>
        </div>
      )}
      {route && !routeLoading && (
        <DirectionsBanner
          route={route}
          destinationName={route.destinationName}
          onClose={onClearRoute}
        />
      )}
      {routeError && !routeLoading && (
        <div className="directions-banner">
          <div className="directions-info">
            <div className="directions-title" style={{ color: 'var(--red)' }}>
              {routeError}
            </div>
          </div>
          <button className="directions-close" onClick={onClearRoute} aria-label="Close">
            <FaTimes size={12} />
          </button>
        </div>
      )}

      {/* Location count chip — top left */}
      <div className={`map-overlay ${route ? 'has-banner' : ''}`}>
        <div className="overlay-chip">
          <FaLayerGroup size={12} />
          {places.length === 0 ? (
            <span>No matching places</span>
          ) : (
            <>
              <span className="label-long">Showing&nbsp;</span>
              <b>{places.length}</b>
              <span>&nbsp;location{places.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}