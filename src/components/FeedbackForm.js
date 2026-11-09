import React, { useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { authHeader, errorMessage } from '../utils/auth';

// Inline rating form for one ride.
const FeedbackForm = ({ tripId, onDone, onCancel }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(`${BACKEND_URL}/api/feedback/send`, { rideShareId: tripId, rating, comment }, { headers: authHeader() });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, 'Failed to submit feedback.'));
      setSaving(false);
    }
  };

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger py-1 px-2 small mb-2" role="alert">{error}</div>}
      <fieldset className="mb-2">
        <legend className="form-label small mb-1">Rating</legend>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={`star ${value <= rating ? 'is-on' : ''}`}
              aria-label={`${value} star${value > 1 ? 's' : ''}`}
              aria-pressed={value === rating}
              onClick={() => setRating(value)}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`comment-${tripId}`} className="form-label small mb-1">Comment</label>
      <textarea
        id={`comment-${tripId}`}
        className="form-control form-control-sm mb-2"
        rows={2}
        maxLength={1000}
        placeholder="How was the ride?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>{saving ? 'Sending…' : 'Submit'}</button>
        <button type="button" className="btn btn-sm btn-light" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default FeedbackForm;
