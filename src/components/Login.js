import React, { useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard';
import { BACKEND_URL } from '../config';
import { dashboardPath, errorMessage, saveSession } from '../utils/auth';

const Login = ({ session, onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to={location.state?.from || dashboardPath(session.role)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/login`, { email, password });
      saveSession(data.token, data.role);
      onLogin();
      navigate(location.state?.from || dashboardPath(data.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'An error occurred during login. Please try again.'));
      setPassword('');
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to share a ride or follow one."
      footer={<>New here? <Link to="/signup">Create an account</Link></>}
    >
      {location.state?.signedUp && (
        <div className="alert alert-success py-2" role="status">Account created. You can log in now.</div>
      )}
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">Email address</label>
          <input
            id="login-email"
            type="email"
            className="form-control form-control-lg"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="login-password" className="form-label">Password</label>
          <input
            id="login-password"
            type="password"
            className="form-control form-control-lg"
            placeholder="Your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
          {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthCard>
  );
};

export default Login;
