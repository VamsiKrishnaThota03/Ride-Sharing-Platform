import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { FRONTEND_URL, WS_URL } from '../config';
import { getToken } from '../utils/auth';
import { distanceKm, formatDuration, interpolate } from '../utils/geo';

// Webpack does not resolve Leaflet's default icon paths, so set them explicitly.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const travelerIcon = L.divIcon({
  className: 'traveler-marker',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// The demo trip: Delhi to Hyderabad, replayed in about a minute.
const START = [28.6139, 77.209];
const DESTINATION = [17.385044, 78.486671];
const TOTAL_STEPS = 120;
const TICK_MS = 500;
const ASSUMED_SPEED_KMH = 60;
const NEARBY_KM = 150;

const FollowPosition = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo(position, { animate: true });
  }, [map, position]);
  return null;
};

const TravelerMap = ({ tripId }) => {
  const [step, setStep] = useState(0);
  const [livePosition, setLivePosition] = useState(null);
  const [connection, setConnection] = useState(tripId ? 'connecting' : 'demo');
  const [isOwner, setIsOwner] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const ws = useRef(null);
  const sentNearby = useRef(false);
  const sentArrival = useRef(false);

  const simulated = useMemo(() => interpolate(START, DESTINATION, step / TOTAL_STEPS), [step]);
  const position = livePosition || simulated;
  const remainingKm = distanceKm(position, DESTINATION);
  const arrived = step >= TOTAL_STEPS || remainingKm < 1;

  // Trip WebSocket (only for a shared trip).
  useEffect(() => {
    if (!tripId) return undefined;
    let attempts = 0;
    let stopped = false;
    let retryTimer;

    const connect = () => {
      const socket = new WebSocket(`${WS_URL}/?tripId=${encodeURIComponent(tripId)}&token=${encodeURIComponent(getToken() || '')}`);
      ws.current = socket;

      socket.onopen = () => {
        attempts = 0;
        setConnection('live');
      };
      socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === 'joined') setIsOwner(Boolean(data.isOwner));
        if (data.type === 'position') setLivePosition([data.lat, data.lon]);
        if (data.type === 'tripComplete') {
          setNotice(data.message || 'The traveler has reached the destination.');
          setStep(TOTAL_STEPS);
        }
      };
      socket.onclose = (event) => {
        if (stopped) return;
        if (event.code === 4004) {
          setConnection('ended');
          return setNotice('This trip is no longer active.');
        }
        if (event.code === 4003 || event.code === 4001) {
          setConnection('denied');
          return setNotice('You do not have access to live updates for this trip.');
        }
        setConnection('offline');
        if (attempts < 5) {
          attempts += 1;
          retryTimer = setTimeout(connect, 1000 * attempts);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      ws.current?.close();
    };
  }, [tripId]);

  // Replay the simulated trip unless we are following live updates from the traveler.
  useEffect(() => {
    if (livePosition || arrived) return undefined;
    const timer = setInterval(() => setStep((s) => Math.min(TOTAL_STEPS, s + 1)), TICK_MS);
    return () => clearInterval(timer);
  }, [livePosition, arrived]);

  // The trip owner broadcasts progress to the companion.
  useEffect(() => {
    const socket = ws.current;
    if (!isOwner || !socket || socket.readyState !== WebSocket.OPEN) return;
    const send = (message) => socket.send(JSON.stringify(message));

    send({ type: 'updatePosition', lat: simulated[0], lon: simulated[1] });
    if (!sentNearby.current && remainingKm <= NEARBY_KM) {
      sentNearby.current = true;
      send({ type: 'nearby' });
    }
    if (!sentArrival.current && arrived) {
      sentArrival.current = true;
      send({ type: 'destinationReached' });
    }
  }, [isOwner, simulated, remainingKm, arrived]);

  const shareLink = tripId ? `${FRONTEND_URL}/traveler-dashboard?tripId=${encodeURIComponent(tripId)}` : '';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice(`Copy this link: ${shareLink}`);
    }
  };

  const statusLabel = {
    demo: 'Demo route',
    connecting: 'Connecting…',
    live: livePosition ? 'Live from traveler' : 'Connected',
    offline: 'Reconnecting…',
    ended: 'Trip ended',
    denied: 'No live access',
  }[connection];

  return (
    <div className="card app-card map-card h-100">
      <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 className="h6 mb-0">{tripId ? `Trip ${tripId}` : 'Route preview'}</h2>
          <small className="text-secondary">Delhi → Hyderabad (simulated)</small>
        </div>
        <span className={`status-dot status-dot--${connection}`}>{statusLabel}</span>
      </div>

      <div className="map-frame">
        <MapContainer bounds={[START, DESTINATION]} boundsOptions={{ padding: [30, 30] }} scrollWheelZoom={false} className="leaflet-map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Polyline positions={[START, DESTINATION]} pathOptions={{ color: '#94a3b8', dashArray: '6 8', weight: 3 }} />
          <Polyline positions={[START, position]} pathOptions={{ color: '#0d9488', weight: 4 }} />
          <Marker position={START} icon={defaultIcon}><Popup>Start: Delhi</Popup></Marker>
          <Marker position={DESTINATION} icon={defaultIcon}><Popup>Destination: Hyderabad</Popup></Marker>
          <Marker position={position} icon={travelerIcon}><Popup>Traveler is here</Popup></Marker>
          {tripId && <FollowPosition position={position} />}
        </MapContainer>
        {(notice || (arrived && !tripId)) && (
          <div className="map-toast" role="status">{notice || 'Destination reached'}</div>
        )}
      </div>

      <div className="card-body">
        <div className="row g-3 text-center trip-stats">
          <div className="col-4">
            <div className="stat-label">Distance left</div>
            <div className="stat-value">{arrived ? '0 km' : `${Math.round(remainingKm)} km`}</div>
          </div>
          <div className="col-4">
            <div className="stat-label">ETA at {ASSUMED_SPEED_KMH} km/h</div>
            <div className="stat-value">{arrived ? 'Arrived' : formatDuration(remainingKm / ASSUMED_SPEED_KMH)}</div>
          </div>
          <div className="col-4">
            <div className="stat-label">Progress</div>
            <div className="stat-value">{Math.round((1 - remainingKm / distanceKm(START, DESTINATION)) * 100)}%</div>
          </div>
        </div>
        {tripId && (
          <button type="button" className="btn btn-outline-primary w-100 mt-3" onClick={copyLink}>
            {copied ? 'Link copied' : 'Copy trip link'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TravelerMap;
