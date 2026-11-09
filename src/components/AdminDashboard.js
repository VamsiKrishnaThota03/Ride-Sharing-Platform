import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { ROLE_LABELS, authHeader, errorMessage, formatDateTime } from '../utils/auth';

const Stars = ({ value }) => (
  <span className="stars" aria-label={`${value} out of 5`}>
    {'★'.repeat(value)}
    <span className="stars-off">{'★'.repeat(Math.max(0, 5 - value))}</span>
  </span>
);

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('users');

  useEffect(() => {
    Promise.all([
      axios.get(`${BACKEND_URL}/api/admin/users`, { headers: authHeader() }),
      axios.get(`${BACKEND_URL}/api/admin/feedbacks`, { headers: authHeader() }),
    ])
      .then(([usersResponse, feedbackResponse]) => {
        setUsers(usersResponse.data);
        setFeedbacks(feedbackResponse.data);
      })
      .catch((err) => setError(errorMessage(err, 'Error fetching data')))
      .finally(() => setLoading(false));
  }, []);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const averageRating = feedbacks.length
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '–';
  const countRole = (role) => users.filter((u) => u.role === role).length;

  return (
    <div className="container py-4">
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-1">Admin</p>
          <h1 className="h3 mb-0">Admin dashboard</h1>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="row g-3 mb-4">
        {[
          ['Travelers', countRole('traveler')],
          ['Companions', countRole('traveler_companion')],
          ['Feedback', feedbacks.length],
          ['Average rating', averageRating],
        ].map(([label, value]) => (
          <div className="col-6 col-lg-3" key={label}>
            <div className="card app-card stat-card">
              <div className="card-body">
                <div className="stat-label">{label}</div>
                <div className="stat-value fs-3">{loading ? '…' : value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card app-card">
        <div className="card-header bg-white border-0 pt-3 px-4">
          <ul className="nav nav-pills gap-2" role="tablist">
            {[
              ['users', `Users (${users.length})`],
              ['feedback', `Feedback (${feedbacks.length})`],
            ].map(([key, label]) => (
              <li className="nav-item" key={key} role="presentation">
                <button type="button" role="tab" aria-selected={tab === key} className={`nav-link ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body px-4 pb-4">
          {loading ? (
            <div className="empty-state"><span className="spinner-border text-primary" role="status" aria-label="Loading" /></div>
          ) : tab === 'users' ? (
            users.length === 0 ? (
              <div className="empty-state"><strong>No users found</strong></div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Mobile</th>
                      <th scope="col">Role</th>
                      <th scope="col">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="fw-semibold">{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.mobile_number}</td>
                        <td><span className={`role-badge role-badge--${user.role}`}>{ROLE_LABELS[user.role] || user.role}</span></td>
                        <td className="small text-secondary">{formatDateTime(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : feedbacks.length === 0 ? (
            <div className="empty-state"><strong>No feedback yet</strong><span>Ratings from travelers and companions appear here.</span></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Trip</th>
                    <th scope="col">From</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Comment</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((feedback) => (
                    <tr key={feedback.id}>
                      <td className="fw-semibold">{feedback.rideShareId}</td>
                      <td>{usersById[feedback.userId]?.name || `User ${feedback.userId}`}</td>
                      <td><Stars value={feedback.rating} /></td>
                      <td className="text-wrap">{feedback.comment || <span className="text-secondary">No comment</span>}</td>
                      <td className="small text-secondary">{formatDateTime(feedback.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
