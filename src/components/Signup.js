import React, { useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard';
import { BACKEND_URL } from '../config';
import { dashboardPath, errorMessage } from '../utils/auth';

const emptyForm = { name: '', email: '', password: '', mobile_number: '', role: 'traveler' };

const Signup = ({ session }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to={dashboardPath(session.role)} replace />;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[0-9]{10}$/.test(formData.mobile_number)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/signup`, formData);
      navigate('/', { state: { signedUp: true } });
    } catch (err) {
      setError(errorMessage(err, 'Sign-up failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Choose Traveler to share rides, or Companion to follow them."
      footer={<>Already have an account? <Link to="/">Log in</Link></>}
    >
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <fieldset className="mb-3">
          <legend className="form-label fs-6">I am a</legend>
          <div className="role-toggle" role="radiogroup">
            {[
              ['traveler', 'Traveler', 'I share my rides'],
              ['traveler_companion', 'Companion', 'I follow rides'],
            ].map(([value, label, hint]) => (
              <label key={value} className={`role-option ${formData.role === value ? 'is-selected' : ''}`}>
                <input type="radio" name="role" value={value} checked={formData.role === value} onChange={handleChange} />
                <strong>{label}</strong>
                <span>{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mb-3">
          <label htmlFor="signup-name" className="form-label">Full name</label>
          <input id="signup-name" type="text" name="name" className="form-control" autoComplete="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label htmlFor="signup-email" className="form-label">Email address</label>
          <input id="signup-email" type="email" name="email" className="form-control" autoComplete="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div className="row g-3 mb-4">
          <div className="col-sm-6">
            <label htmlFor="signup-mobile" className="form-label">Mobile number</label>
            <input
              id="signup-mobile"
              type="tel"
              name="mobile_number"
              className="form-control"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder="10 digits"
              autoComplete="tel-national"
              value={formData.mobile_number}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-sm-6">
            <label htmlFor="signup-password" className="form-label">Password</label>
            <input
              id="signup-password"
              type="password"
              name="password"
              className="form-control"
              minLength={6}
              placeholder="6+ characters"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <p className="form-text mt-n2 mb-4">Companions see rides that travelers share with this mobile number.</p>
        <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
          {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthCard>
  );
};

export default Signup;
