import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ROLE_LABELS, dashboardPath } from '../utils/auth';

const BrandMark = () => (
  <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="#14b8a6" />
    <path d="M32 12c-8.3 0-15 6.5-15 14.6C17 37.5 32 52 32 52s15-14.5 15-25.4C47 18.5 40.3 12 32 12z" fill="#fff" />
    <circle cx="32" cy="27" r="6" fill="#0f766e" />
  </svg>
);

const Navbar = ({ session, onLogout }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = session
    ? [
        { to: dashboardPath(session.role), label: 'Dashboard' },
        { to: '/profile', label: 'Profile' },
      ]
    : [
        { to: '/', label: 'Log in' },
        { to: '/signup', label: 'Sign up' },
      ];

  const handleLogout = () => {
    setOpen(false);
    onLogout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-md navbar-dark app-navbar sticky-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to={session ? dashboardPath(session.role) : '/'}>
          <BrandMark />
          <span>Ride Sharing <span className="brand-muted">Platform</span></span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="main-nav"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => setOpen(!open)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`} id="main-nav">
          <ul className="navbar-nav ms-auto align-items-md-center gap-md-1">
            {links.map((link) => (
              <li className="nav-item" key={link.to}>
                <NavLink className="nav-link" to={link.to} end onClick={() => setOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            {session && (
              <>
                <li className="nav-item d-none d-md-block">
                  <span className="role-chip">{ROLE_LABELS[session.role] || session.role}</span>
                </li>
                <li className="nav-item">
                  <button type="button" className="btn btn-sm btn-outline-light ms-md-2 my-2 my-md-0" onClick={handleLogout}>
                    Log out
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
