import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import TravelerMap from './TravelerMap';
import RideSharingForm from './RideSharingForm';
import RideHistory from './RideHistory';
import { BACKEND_URL } from '../config';
import { authHeader, dashboardPath, errorMessage } from '../utils/auth';

const TravelerDashboard = ({ session }) => {
  const location = useLocation();
  const tripId = new URLSearchParams(location.search).get('tripId');
  const isTraveler = session?.role === 'traveler';

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(isTraveler);
  const [error, setError] = useState('');

  const loadRides = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rides/shared`, { headers: authHeader() });
      setRides(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load ride history. Please try again later.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTraveler) loadRides();
  }, [isTraveler, loadRides]);

  if (tripId) {
    return (
      <div className="container py-4">
        <div className="page-heading">
          <div>
            <p className="eyebrow mb-1">Live trip</p>
            <h1 className="h3 mb-0">Traveler live location</h1>
          </div>
          <Link to={dashboardPath(session?.role)} className="btn btn-light">Back to dashboard</Link>
        </div>
        <div className="live-map">
          <TravelerMap tripId={tripId} />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-1">Traveler</p>
          <h1 className="h3 mb-0">Traveler dashboard</h1>
        </div>
      </div>

      {!isTraveler ? (
        <div className="alert alert-info">Only travelers can share rides. Open a shared trip from your dashboard to follow it.</div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-lg-5">
              <RideSharingForm onShared={loadRides} />
            </div>
            <div className="col-lg-7">
              <TravelerMap />
            </div>
          </div>
          <RideHistory rides={rides} loading={loading} error={error} onChange={loadRides} />
        </>
      )}
    </div>
  );
};

export default TravelerDashboard;
