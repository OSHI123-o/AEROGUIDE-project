import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ScanBoardingPass() {
  const [scanning, setScanning] = useState(false);
  const [flightInput, setFlightInput] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [recentFlights, setRecentFlights] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("recentFlights") || "[]");
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();

  const addToRecent = (flight) => {
    const upper = flight.toUpperCase();
    const newRecent = [upper, ...recentFlights.filter(f => f !== upper)].slice(0, 4);
    setRecentFlights(newRecent);
    localStorage.setItem("recentFlights", JSON.stringify(newRecent));
  };

  const startScan = () => {
    setScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setScanning(false);
      // Redirect to flights page with a simulated flight number
      const flight = 'UL403';
      addToRecent(flight);
      navigate(`/flights?search=${flight}`);
    }, 2500);
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (flightInput.trim()) {
      addToRecent(flightInput.trim());
      navigate(`/flights?search=${encodeURIComponent(flightInput.trim())}`);
    }
  };

  const toggleStep = (step) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(step.id)) {
      newCompleted.delete(step.id);
    } else {
      newCompleted.add(step.id);
      setNotification(`🎉 Successfully completed: ${step.title}`);
      setTimeout(() => setNotification(null), 3000);
    }
    setCompletedSteps(newCompleted);
  };

  const handleEnableLocation = () => {
    if (!locationEnabled) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationEnabled(true);
            setNotification("📍 Live location enabled. Guiding you...");
            setTimeout(() => setNotification(null), 3000);
          },
          () => {
            setNotification("⚠️ Location access denied");
            setTimeout(() => setNotification(null), 3000);
          }
        );
      }
    } else {
      setLocationEnabled(false);
      setNotification("📍 Live location disabled");
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleShowPath = (e, step) => {
    e.stopPropagation();
    
    if (!navigator.geolocation) {
      setNotification("⚠️ Geolocation is not supported");
      return;
    }

    setNotification("📍 Acquiring your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setNotification(`🗺️ Starting navigation to: ${step.title}`);
        setTimeout(() => {
          navigate(`/flights?search=${encodeURIComponent(step.title)}&navigation=true&userLat=${latitude}&userLon=${longitude}&destLat=${step.lat}&destLon=${step.lon}`);
        }, 1000);
      },
      (error) => {
        setNotification("⚠️ Location access denied. Using default.");
        setTimeout(() => {
           navigate(`/flights?search=${encodeURIComponent(step.title)}&navigation=true&destLat=${step.lat}&destLon=${step.lon}`);
        }, 1000);
      }
    );
  };

  const steps = [
    {
      id: 1,
      title: "Enter the airport",
      icon: "🏁",
      lat: 7.1790,
      lon: 79.8820,
      details: [
        "Security at entrance checks ticket + ID",
        "Your bag may go through a quick scan",
        "Go inside and look for signs: “Departures”"
      ]
    },
    {
      id: 2,
      title: "Find your airline check-in counter",
      icon: "🧾",
      lat: 7.1800,
      lon: 79.8830,
      details: [
        "Look at the big Flight Information screens",
        "Find your flight number",
        "Screen will show the check-in counter number (example: C12–C18)",
        "Go to that counter and stand in the queue"
      ]
    },
    {
      id: 3,
      title: "Check-in (counter or kiosk)",
      icon: "🎫",
      lat: 7.1805,
      lon: 79.8835,
      details: [
        "Give your passport + ticket",
        "Staff weighs your big luggage",
        "They give you: Boarding pass & Baggage tag (keep it!)",
        "They tell your: Gate number, Boarding time, Seat number",
        "✅ After check-in: you keep only your hand luggage."
      ]
    },
    {
      id: 4,
      title: "Security screening",
      icon: "🧳",
      lat: 7.1810,
      lon: 79.8840,
      details: [
        "Follow signs “Security / Departures”",
        "Put items into trays: Phone, wallet, keys, Belt/watch/jacket, Laptop",
        "Walk through scanner",
        "Collect your items and move on",
        "Liquids rule: Max 100ml per bottle, all inside 1 zip bag"
      ]
    },
    {
      id: 5,
      title: "Immigration (International only)",
      icon: "🛂",
      lat: 7.1815,
      lon: 79.8845,
      details: [
        "Join queue “Departures / Immigration”",
        "Give passport + boarding pass",
        "They may ask: Where are you going? Purpose?",
        "After stamp → you go to the gate area"
      ]
    },
    {
      id: 6,
      title: "Inside the departure area",
      icon: "🛍️",
      lat: 7.1820,
      lon: 79.8850,
      details: [
        "Check flight screens again: Confirm Gate & Boarding time",
        "You can: Sit near gate, Eat, shop, use washroom",
        "Stay close to your gate when boarding time is near"
      ]
    },
    {
      id: 7,
      title: "Go to your gate",
      icon: "🚪",
      lat: 7.1825,
      lon: 79.8855,
      details: [
        "Go to the gate number shown on screen/boarding pass",
        "Sit and listen for announcements: “Now boarding”, “Final call”"
      ]
    },
    {
      id: 8,
      title: "Boarding the plane",
      icon: "✈️",
      lat: 7.1830,
      lon: 79.8860,
      details: [
        "Show: Boarding pass & Passport",
        "Walk to aircraft (or take shuttle bus)",
        "Find your seat (Example 18A)",
        "Put: Big cabin bag → overhead bin, Small bag → under seat"
      ]
    }
  ];

  return (
    <div className="home-page" style={{
      height: '100vh',
      width: '100vw',
      background: '#0f172a',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(20, 184, 166, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(245, 158, 11, 0.15) 0px, transparent 50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      position: 'relative'
    }}>
      {/* Weather Widget */}
      <div style={{ 
        position: 'absolute', top: '20px', right: '20px', 
        background: 'rgba(255,255,255,0.1)', padding: '8px 16px', 
        borderRadius: '20px', backdropFilter: 'blur(10px)', 
        display: 'flex', alignItems: 'center', gap: '8px', 
        border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' 
      }}>
        <span>☀️</span> <span style={{ fontWeight: 600 }}>28°C</span> <span style={{ opacity: 0.7 }}>CMB</span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '3rem', zIndex: 10 }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 900,
          margin: 0,
          background: 'linear-gradient(135deg, #14b8a6 0%, #f59e0b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-2px',
          lineHeight: 1.1
        }}>
          Aero Guide
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Your intelligent airport companion
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.2rem', zIndex: 10 }}>
        <button 
          onClick={startScan} 
          className="homeBtn" 
          style={{
            background: 'rgba(255,255,255,0.08)', 
            backdropFilter: 'blur(12px)', 
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '1.2rem',
            borderRadius: '16px',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'transform 0.2s, background 0.2s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{fontSize: '1.4rem'}}>📷</span> Scan Boarding Pass
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 700 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
          OR
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '0.8rem' }}>
          <input 
            type="text" 
            value={flightInput}
            onChange={(e) => setFlightInput(e.target.value)}
            placeholder="Flight No (e.g. UL403)"
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '0 1rem',
              height: '48px',
              color: 'white',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
          <button 
            type="submit"
            style={{
              height: '48px',
              padding: '0 1.5rem',
              background: '#14b8a6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Go
          </button>
        </form>

        {recentFlights.length > 0 && (
          <div style={{ width: '100%', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {recentFlights.map((flight) => (
                <button
                  key={flight}
                  onClick={() => {
                    addToRecent(flight);
                    navigate(`/flights?search=${encodeURIComponent(flight)}`);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    color: '#cbd5e1',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#cbd5e1'; }}
                >
                  <span style={{ opacity: 0.5 }}>🕒</span> {flight}
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowGuide(true)}
          style={{
            marginTop: '0.5rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#94a3b8',
            padding: '0.8rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            width: '100%',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#14b8a6'; e.currentTarget.style.color = '#14b8a6'; e.currentTarget.style.background = 'rgba(20, 184, 166, 0.1)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
        >
          <span>✈️</span> First Time Flyer Guide
        </button>

        {/* Quick Find Grid */}
        <div style={{ marginTop: '2rem', width: '100%' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Quick Find</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <QuickAction icon="☕" label="Coffee" onClick={() => navigate('/flights?search=Coffee')} />
            <QuickAction icon="🍔" label="Food" onClick={() => navigate('/flights?search=Food')} />
            <QuickAction icon="🚻" label="Toilets" onClick={() => navigate('/flights?search=Restrooms')} />
            <QuickAction icon="🏧" label="ATM" onClick={() => navigate('/flights?search=ATM')} />
          </div>
        </div>
      </div>

      {scanning && (
        <div className="scanOverlay">
          <div className="scanBox">
            <div className="scanLine"></div>
          </div>
          <p className="scanText">Align Boarding Pass QR Code</p>
          <button className="scanCancel" onClick={() => setScanning(false)}>Cancel</button>
          
          <style>{`
            .scanOverlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.95);
              z-index: 9999;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              animation: fadeIn 0.3s ease;
            }
            .scanBox {
              width: 280px;
              height: 280px;
              border: 2px solid rgba(255,255,255,0.2);
              border-radius: 20px;
              position: relative;
              overflow: hidden;
              background: rgba(255,255,255,0.05);
              box-shadow: 0 0 0 100vmax rgba(0,0,0,0.6);
            }
            .scanBox::before, .scanBox::after {
              content: '';
              position: absolute;
              width: 40px;
              height: 40px;
              border: 4px solid #3b82f6;
              transition: all 0.2s;
            }
            .scanBox::before { top: 0; left: 0; border-right: 0; border-bottom: 0; border-radius: 16px 0 0 0; }
            .scanBox::after { bottom: 0; right: 0; border-left: 0; border-top: 0; border-radius: 0 0 16px 0; }
            
            .scanLine {
              width: 100%;
              height: 2px;
              background: #ef4444;
              box-shadow: 0 0 15px #ef4444;
              position: absolute;
              top: 0;
              animation: scanMove 2s infinite linear;
            }
            @keyframes scanMove {
              0% { top: 0; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
            .scanText {
              color: white;
              margin-top: 2rem;
              font-size: 1.1rem;
              font-weight: 500;
              letter-spacing: 0.5px;
            }
            .scanCancel {
              margin-top: 2rem;
              background: transparent;
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 8px 24px;
              border-radius: 30px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .scanCancel:hover {
              background: white;
              color: black;
            }
          `}</style>
        </div>
      )}

      {showGuide && (
        <div className="guide-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div className="guide-card" style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '600px',
            height: '85vh',
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(to right, #ecfdf5, #f0fdf4)',
              borderBottom: '1px solid #d1fae5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#064e3b', fontWeight: 800 }}>✈️ Airport Guide</h2>
                <p style={{ margin: '0.5rem 0 0 0', color: '#059669', fontSize: '0.95rem', fontWeight: 600 }}>Step-by-step companion</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={handleEnableLocation}
                  style={{
                    background: locationEnabled ? '#d1fae5' : 'white',
                    border: '1px solid #059669',
                    color: '#059669',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {locationEnabled ? '📍 Live On' : '📍 Enable Location'}
                </button>
                <button 
                  onClick={() => setShowGuide(false)}
                  style={{
                    background: 'white',
                    border: 'none',
                    color: '#059669',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >✕</button>
              </div>
            </div>
            
            <div style={{ padding: '2rem', overflowY: 'auto', background: '#f8fafc', flex: 1 }}>
              
              {/* Pre-flight info */}
              <div style={{ 
                background: 'white', 
                padding: '1.5rem', 
                borderRadius: '20px', 
                marginBottom: '2rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1.1rem' }}>🕒 Arrive Early</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>International</div>
                    <div style={{ color: '#15803d' }}>3 hours before</div>
                  </div>
                  <div style={{ flex: 1, background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>Domestic</div>
                    <div style={{ color: '#15803d' }}>1.5–2 hours before</div>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {steps.map((step) => {
                  const isCompleted = completedSteps.has(step.id);
                  return (
                    <div 
                      key={step.id}
                      onClick={() => toggleStep(step)}
                      style={{
                        background: isCompleted ? '#f0fdf4' : 'white',
                        padding: '1.5rem',
                        borderRadius: '20px',
                        border: isCompleted ? '2px solid #4ade80' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isCompleted ? 0.8 : 1,
                        position: 'relative',
                        boxShadow: isCompleted ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.8rem' }}>
                        <div style={{ 
                          background: isCompleted ? '#22c55e' : '#f1f5f9', 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          transition: 'background 0.3s'
                        }}>
                          {isCompleted ? '✓' : step.icon}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: isCompleted ? '#15803d' : '#1e293b', flex: 1 }}>
                          {step.id}) {step.title}
                        </h3>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: isCompleted ? 'none' : '2px solid #cbd5e1',
                          background: isCompleted ? '#22c55e' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}>
                          {isCompleted && '✓'}
                        </div>
                      </div>
                      
                      <ul style={{ 
                        margin: 0, 
                        paddingLeft: '3.5rem', 
                        listStyle: 'none',
                        color: '#64748b',
                        fontSize: '0.95rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {step.details.map((detail, i) => (
                          <li key={i} style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '-1.2rem', color: '#94a3b8' }}>•</span>
                            {detail}
                          </li>
                        ))}
                      </ul>

                      {locationEnabled && !isCompleted && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          animation: 'fadeIn 0.5s ease'
                        }}>
                          <div style={{ fontSize: '1.2rem' }}>🧭</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>Live Guidance</div>
                            <div style={{ fontSize: '0.8rem', color: '#059669' }}>~{Math.max(2, 15 - step.id * 1.5).toFixed(0)} min walk from here</div>
                          </div>
                          <button 
                            onClick={(e) => handleShowPath(e, step)}
                            style={{ background: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Show Path
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notification Toast */}
            {notification && (
              <div style={{
                position: 'absolute',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1e293b',
                color: 'white',
                padding: '0.8rem 1.5rem',
                borderRadius: '50px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                whiteSpace: 'nowrap',
                zIndex: 10
              }}>
                {notification}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '12px 0',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s'
      }}
      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 500 }}>{label}</span>
    </button>
  );
}
