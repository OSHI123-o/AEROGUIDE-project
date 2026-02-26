import React from 'react';

const items = [
  { title: 'Medical Help', desc: 'Find the nearest medical point or request assistance.', icon: '🩺' },
  { title: 'Lost & Found', desc: 'Report a lost item and get directions to the counter.', icon: '🧳' },
  { title: 'Security Alert', desc: 'Follow official instructions and move to safe zones.', icon: '🚨' },
  { title: 'Accessibility Support', desc: 'Wheelchair, hearing/visual support, priority lanes.', icon: '♿' },
];

export default function EmergencyPage() {
  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h2>Emergency & Help</h2>
          <p className="muted">Quick actions for assistance. (Prototype — connect to airport hotline/helpdesk later.)</p>
        </div>
      </div>

      <div className="grid">
        {items.map((x) => (
          <div key={x.title} className="card">
            <div className="icon">{x.icon}</div>
            <div>
              <div className="cardTitle">{x.title}</div>
              <div className="muted">{x.desc}</div>
            </div>
            <button className="btn">Open</button>
          </div>
        ))}
      </div>

      <div className="callout">
        <b>Tip:</b> In a real airport deployment, this page can show your nearest help points using indoor positioning,
        plus a one-tap "Call staff" or "Chat" feature.
      </div>
    </div>
  );
}
