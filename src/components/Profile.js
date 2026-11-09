import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { ROLE_LABELS, authHeader, errorMessage, formatDateTime } from '../utils/auth';

const Profile = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/user/profile`, { headers: authHeader() })
      .then(({ data }) => setUser(data))
      .catch((err) => setError(errorMessage(err, 'Failed to fetch user details. Please try again later.')))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await axios.put(`${BACKEND_URL}/api/user/profile`, form, { headers: authHeader() });
      const contactChanged = form.email !== user.email || form.mobile_number !== user.mobile_number;
      setUser(data.user);
      setForm(null);
      if (contactChanged) {
        onLogout?.();
        return;
      }
      setMessage('Profile updated.');
    } catch (err) {
      setError(errorMessage(err, 'Could not update your profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <span className="spinner-border text-primary" role="status" aria-label="Loading profile" />
      </div>
    );
  }

  return (
    <div className="container py-4 profile-page">
      <div className="card app-card">
        <div className="card-body p-4 p-sm-5">
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          {message && <div className="alert alert-success py-2" role="status">{message}</div>}

          {user && !form && (
            <>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <h1 className="h4 mb-0">{user.name}</h1>
                  <span className={`role-badge role-badge--${user.role}`}>{ROLE_LABELS[user.role] || user.role}</span>
                </div>
              </div>
              <dl className="ride-details mb-4">
                <div><dt>Email</dt><dd>{user.email}</dd></div>
                <div><dt>Mobile</dt><dd>{user.mobile_number}</dd></div>
                <div><dt>Member since</dt><dd>{formatDateTime(user.createdAt)}</dd></div>
              </dl>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => {
                  setMessage('');
                  setForm({ name: user.name, email: user.email, mobile_number: user.mobile_number });
                }}
              >
                Edit profile
              </button>
            </>
          )}

          {form && (
            <form onSubmit={handleSave}>
              <h1 className="h4 mb-4">Edit profile</h1>
              <div className="mb-3">
                <label htmlFor="profile-name" className="form-label">Full name</label>
                <input id="profile-name" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label htmlFor="profile-email" className="form-label">Email address</label>
                <input id="profile-email" type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="mb-2">
                <label htmlFor="profile-mobile" className="form-label">Mobile number</label>
                <input id="profile-mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className="form-control" value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} required />
              </div>
              <p className="form-text mb-4">Changing your email or mobile number logs you out so you can log in again.</p>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                <button type="button" className="btn btn-light" onClick={() => setForm(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
