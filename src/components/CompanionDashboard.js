import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FeedbackForm from './FeedbackForm';
import { BACKEND_URL, WS_URL } from '../config';
import { authHeader, errorMessage, formatDateTime, getToken } from '../utils/auth';
import { RideStatus, isRideActive } from '../utils/rides';

const CompanionDashboard = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [thanks, setThanks] = useState('');

  const fetchRides = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rides/companion/details`, { headers: authHeader() });
      setRides(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh every 10 seconds so new rides show up.
  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 10000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  // Trip notifications (nearby / completed) for rides shared with this companion.
  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/?token=${encodeURIComponent(getToken() || '')}`);
    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === 'tripComplete' || data.type === 'nearbyNotification') {
        setNotifications((prev) => [{ id: `${Date.now()}-${prev.length}`, ...data }, ...prev].slice(0, 5));
        if (data.type === 'tripComplete') fetchRides();
      }
    };
    return () => socket.close();
  }, [fetchRides]);

  const activeCount = rides.filter(isRideActive).length;

  return (
    <div className="container py-4">
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-1">Companion</p>
          <h1 className="h3 mb-0">Rides shared with you</h1>
        </div>
        {!loading && (
          <div className="d-flex gap-2">
            <span className="summary-chip"><strong>{activeCount}</strong> active</span>
            <span className="summary-chip"><strong>{rides.length}</strong> total</span>
          </div>
        )}
      </div>

      {notifications.map((note) => (
        <div key={note.id} className={`alert ${note.type === 'tripComplete' ? 'alert-success' : 'alert-info'} alert-dismissible`} role="status">
          {note.message}
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== note.id))} />
        </div>
      ))}
      {thanks && <div className="alert alert-success py-2" role="status">{thanks}</div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {loading ? (
        <div className="card app-card"><div className="empty-state"><span className="spinner-border text-primary" role="status" aria-label="Loading rides" /></div></div>
      ) : rides.length === 0 ? (
        <div className="card app-card">
          <div className="empty-state">
            <strong>No rides shared with you yet</strong>
            <span>When a traveler adds your mobile number to a ride, it appears here.</span>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {rides.map((ride) => {
            const active = isRideActive(ride);
            return (
              <div className="col-md-6 col-xl-4" key={ride.id}>
                <article className={`card app-card ride-card h-100 ${active ? 'is-active' : ''}`}>
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <div className="small text-secondary">Trip</div>
                        <h2 className="h5 mb-0">{ride.tripId}</h2>
                      </div>
                      <RideStatus ride={ride} />
                    </div>
                    <dl className="ride-details">
                      <div><dt>Driver</dt><dd>{ride.driverName}</dd></div>
                      <div><dt>Driver phone</dt><dd><a href={`tel:${ride.driverPhone}`}>{ride.driverPhone}</a></dd></div>
                      <div><dt>Cab</dt><dd><span className="plate">{ride.cabNumber}</span></dd></div>
                      <div><dt>Shared</dt><dd>{formatDateTime(ride.createdAt)}</dd></div>
                    </dl>
                    <div className="mt-auto d-grid gap-2">
                      {active && (
                        <button type="button" className="btn btn-primary" onClick={() => navigate(`/traveler-dashboard?tripId=${encodeURIComponent(ride.tripId)}`)}>
                          Follow on map
                        </button>
                      )}
                      {feedbackFor === ride.id ? (
                        <FeedbackForm
                          tripId={ride.tripId}
                          onCancel={() => setFeedbackFor(null)}
                          onDone={() => {
                            setFeedbackFor(null);
                            setThanks(`Thanks! Feedback for ${ride.tripId} was sent.`);
                          }}
                        />
                      ) : (
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setFeedbackFor(ride.id)}>
                          Give feedback
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanionDashboard;
