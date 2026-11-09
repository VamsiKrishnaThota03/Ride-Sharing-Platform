const WebSocket = require('ws');
const RideShare = require('./models/RideShare');
const { verifyToken } = require('./utils/jwtUtils');

// WebSocket channel.
//   ws://host/?token=<jwt>&tripId=<id>  join a trip (owner, its companion or an admin)
//   ws://host/?token=<jwt>              companion notifications for every ride shared with them
// Messages from the trip owner:
//   { type: 'updatePosition', lat, lon }  relayed to the other viewers of the trip
//   { type: 'nearby' }                    companion gets a nearbyNotification
//   { type: 'destinationReached' }        ride is marked inactive, companion gets tripComplete
const attachRealtime = (server) => {
  const wss = new WebSocket.Server({ server });
  const tripRooms = new Map(); // tripId -> Set<ws>
  const companionSockets = new Map(); // mobile -> Set<ws>

  const join = (map, key, ws) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(ws);
    ws.on('close', () => {
      const set = map.get(key);
      if (!set) return;
      set.delete(ws);
      if (set.size === 0) map.delete(key);
    });
  };

  const send = (ws, payload) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const broadcast = (sockets, payload, except) => {
    if (!sockets) return;
    sockets.forEach((client) => client !== except && send(client, payload));
  };

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const tripId = url.searchParams.get('tripId');
    let user;
    try {
      user = verifyToken(url.searchParams.get('token') || '');
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    if (!tripId) {
      if (user.role === 'traveler_companion' && user.mobile_number) {
        join(companionSockets, user.mobile_number, ws);
        send(ws, { type: 'connected' });
      } else {
        ws.close(4000, 'tripId is required');
      }
      return;
    }

    let trip;
    try {
      trip = await RideShare.findOne({ where: { tripId, isActive: true } });
    } catch (error) {
      console.error('WebSocket trip lookup failed:', error.message);
      ws.close(1011, 'Server error');
      return;
    }
    if (!trip) {
      ws.close(4004, 'Trip not found or no longer active');
      return;
    }

    const isOwner = trip.userId === user.id;
    const isCompanion = Boolean(trip.companionMobile) && trip.companionMobile === user.mobile_number;
    if (!isOwner && !isCompanion && user.role !== 'admin') {
      ws.close(4003, 'Forbidden');
      return;
    }

    join(tripRooms, tripId, ws);
    send(ws, { type: 'joined', tripId, isOwner });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return; // ignore malformed messages
      }
      if (!isOwner || !msg || typeof msg.type !== 'string') return;

      if (msg.type === 'updatePosition' && Number.isFinite(msg.lat) && Number.isFinite(msg.lon)) {
        broadcast(tripRooms.get(tripId), { type: 'position', lat: msg.lat, lon: msg.lon }, ws);
      } else if (msg.type === 'nearby') {
        broadcast(companionSockets.get(trip.companionMobile), {
          type: 'nearbyNotification',
          tripId,
          message: `Trip ${tripId} is getting close to its destination.`,
        });
      } else if (msg.type === 'destinationReached' && trip.isActive) {
        try {
          trip.isActive = false;
          await trip.save();
        } catch (error) {
          console.error('Could not mark trip as completed:', error.message);
          return;
        }
        const payload = { type: 'tripComplete', tripId, message: `Trip ${tripId} has reached its destination.` };
        broadcast(tripRooms.get(tripId), payload);
        broadcast(companionSockets.get(trip.companionMobile), payload);
      }
    });
  });

  return wss;
};

module.exports = attachRealtime;
