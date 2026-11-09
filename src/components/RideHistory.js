import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import FeedbackForm from './FeedbackForm';
import { whatsappUrl } from './RideSharingForm';
import { BACKEND_URL } from '../config';
import { authHeader, errorMessage, formatDateTime } from '../utils/auth';
import { RideStatus, isRideActive } from '../utils/rides';

const RideHistory = ({ rides, loading, error, onChange }) => {
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const endRide = async (ride) => {
    setActionError('');
    try {
      await axios.post(`${BACKEND_URL}/api/rides/expire`, { tripId: ride.tripId }, { headers: authHeader() });
      setMessage(`Trip ${ride.tripId} marked as completed.`);
      onChange?.();
    } catch (err) {
      setActionError(errorMessage(err, 'Could not end the ride.'));
    }
  };

  return (
    <div className="card app-card">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Your shared rides</h2>
          {!loading && <span className="text-secondary small">{rides.length} total</span>}
        </div>

        {message && <div className="alert alert-success py-2" role="status">{message}</div>}
        {(error || actionError) && <div className="alert alert-danger py-2" role="alert">{error || actionError}</div>}

        {loading ? (
          <div className="empty-state"><span className="spinner-border text-primary" role="status" aria-label="Loading rides" /></div>
        ) : rides.length === 0 ? (
          <div className="empty-state">
            <strong>No rides shared yet</strong>
            <span>Rides you share appear here so you can follow them and leave feedback.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle ride-table mb-0">
              <thead>
                <tr>
                  <th scope="col">Trip</th>
                  <th scope="col">Driver</th>
                  <th scope="col">Cab</th>
                  <th scope="col">Shared</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <React.Fragment key={ride.id}>
                    <tr>
                      <td className="fw-semibold">{ride.tripId}</td>
                      <td>
                        {ride.driverName}
                        <div className="small text-secondary">{ride.driverPhone}</div>
                      </td>
                      <td><span className="plate">{ride.cabNumber}</span></td>
                      <td className="small">{formatDateTime(ride.createdAt)}</td>
                      <td><RideStatus ride={ride} /></td>
                      <td className="text-end">
                        <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                          {isRideActive(ride) && (
                            <>
                              <Link className="btn btn-sm btn-outline-primary" to={`/traveler-dashboard?tripId=${encodeURIComponent(ride.tripId)}`}>Live view</Link>
                              <a className="btn btn-sm btn-outline-secondary" href={whatsappUrl(ride)} target="_blank" rel="noopener noreferrer">Share</a>
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => endRide(ride)}>End</button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-light"
                            onClick={() => setFeedbackFor(feedbackFor === ride.id ? null : ride.id)}
                            aria-expanded={feedbackFor === ride.id}
                          >
                            Feedback
                          </button>
                        </div>
                      </td>
                    </tr>
                    {feedbackFor === ride.id && (
                      <tr className="feedback-row">
                        <td colSpan={6}>
                          <FeedbackForm
                            tripId={ride.tripId}
                            onCancel={() => setFeedbackFor(null)}
                            onDone={() => {
                              setFeedbackFor(null);
                              setMessage(`Thanks! Feedback for ${ride.tripId} was sent.`);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideHistory;
