import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: 520, textAlign: 'center' }}>
        <div className="cardTitle" style={{ fontSize: '1.4rem' }}>404 - Page not found</div>
        <p className="muted">That route does not exist. Go back to the home page.</p>
        <Link to="/" className="btn" style={{ display: 'inline-flex', textDecoration: 'none' }}>Go Home</Link>
      </div>
    </div>
  );
}
