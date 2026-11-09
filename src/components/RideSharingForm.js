import React, { useState } from 'react';
import axios from 'axios';
import { BACKEND_URL, FRONTEND_URL } from '../config';
import { authHeader, errorMessage } from '../utils/auth';

const emptyForm = { tripId: '', driverName: '', driverPhone: '', cabNumber: '', companionMobile: '' };

const newTripId = () => `TRIP-${Date.now().toString(36).toUpperCase()}`;

// Builds the WhatsApp message with the ride details and the trip link.
export const whatsappUrl = (ride) => {
  const link = `${FRONTEND_URL}/traveler-dashboard?tripId=${encodeURIComponent(ride.tripId)}`;
  const lines = [
    'I am sharing my ride with you:',
    `- Driver: ${ride.driverName}`,
    `- Driver phone: ${ride.driverPhone}`,
    `- Cab number: ${ride.cabNumber}`,
    `- Trip ID: ${ride.tripId}`,
    `Follow the trip: ${link}`,
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
};

const RideSharingForm = ({ onShared }) => {
  const [form, setForm] = useState(() => ({ ...emptyForm, tripId: newTripId() }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/rides/share`, form, { headers: authHeader() });
      setShared(data.rideShare);
      window.open(whatsappUrl(data.rideShare), '_blank', 'noopener');
      setForm({ ...emptyForm, tripId: newTripId() });
      onShared?.(data.rideShare);
    } catch (err) {
      setError(errorMessage(err, 'Error sharing ride. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card app-card h-100">
      <div className="card-body p-4">
        <h2 className="h5 mb-1">Share a ride</h2>
        <p className="text-secondary small mb-4">
          Enter your cab details. We save the ride and open WhatsApp so you can send it to your companion.
        </p>

        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        {shared && (
          <div className="alert alert-success py-2" role="status">
            <div className="mb-2">Ride <strong>{shared.tripId}</strong> saved. If WhatsApp did not open, use the button below.</div>
            <a className="btn btn-sm btn-success" href={whatsappUrl(shared)} target="_blank" rel="noopener noreferrer">Send details on WhatsApp</a>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-sm-6">
              <label htmlFor="ride-trip" className="form-label">Trip ID</label>
              <input id="ride-trip" name="tripId" className="form-control" value={form.tripId} onChange={handleChange} pattern="[A-Za-z0-9_\-]{1,64}" required />
            </div>
            <div className="col-sm-6">
              <label htmlFor="ride-cab" className="form-label">Cab number</label>
              <input id="ride-cab" name="cabNumber" className="form-control" placeholder="TS09AB1234" value={form.cabNumber} onChange={handleChange} required />
            </div>
            <div className="col-sm-6">
              <label htmlFor="ride-driver" className="form-label">Driver name</label>
              <input id="ride-driver" name="driverName" className="form-control" value={form.driverName} onChange={handleChange} required />
            </div>
            <div className="col-sm-6">
              <label htmlFor="ride-driver-phone" className="form-label">Driver phone</label>
              <input id="ride-driver-phone" name="driverPhone" type="tel" className="form-control" value={form.driverPhone} onChange={handleChange} required />
            </div>
            <div className="col-12">
              <label htmlFor="ride-companion" className="form-label">Companion mobile <span className="text-secondary fw-normal">(optional)</span></label>
              <input
                id="ride-companion"
                name="companionMobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                className="form-control"
                placeholder="10-digit number of a registered companion"
                value={form.companionMobile}
                onChange={handleChange}
                aria-describedby="ride-companion-help"
              />
              <div id="ride-companion-help" className="form-text">The companion sees this ride on their dashboard.</div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-100 mt-4" disabled={loading}>
            {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {loading ? 'Sharing ride…' : 'Save and share on WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RideSharingForm;
