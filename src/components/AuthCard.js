import React from 'react';

const highlights = [
  ['Share your cab', 'Send driver, phone and cab number to someone you trust on WhatsApp.'],
  ['Follow the trip', 'Companions open the shared trip and watch it on the map.'],
  ['Rate the ride', 'Travelers and companions leave feedback that admins can review.'],
];

// Split layout shared by the login and sign-up pages.
const AuthCard = ({ title, subtitle, children, footer }) => (
  <div className="auth-shell">
    <section className="auth-intro d-none d-lg-flex">
      <div>
        <p className="eyebrow">Ride safety, shared</p>
        <h1 className="display-6 fw-semibold mb-4">Let the people who care about you follow your ride.</h1>
        <ul className="list-unstyled auth-highlights">
          {highlights.map(([heading, text]) => (
            <li key={heading}>
              <strong>{heading}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
    <section className="auth-form-wrap">
      <div className="card app-card auth-card">
        <div className="card-body p-4 p-sm-5">
          <h2 className="h3 mb-1">{title}</h2>
          {subtitle && <p className="text-secondary mb-4">{subtitle}</p>}
          {children}
          {footer && <p className="text-center text-secondary small mt-4 mb-0">{footer}</p>}
        </div>
      </div>
    </section>
  </div>
);

export default AuthCard;
