export const flights = [
  {
    flightNo: "UL403",
    airline: "SriLankan Airlines",
    from: "CMB (Colombo)",
    to: "SIN (Singapore)",
    schedDeparture: "2026-02-13T12:30:00+05:30",
    schedArrival: "2026-02-13T16:15:00+08:00",
    status: "On Time",
    terminal: "T1",
    gate: "A12"
  },
  {
    flightNo: "EK654",
    airline: "Emirates",
    from: "CMB (Colombo)",
    to: "DXB (Dubai)",
    schedDeparture: "2026-02-13T03:20:00+05:30",
    schedArrival: "2026-02-13T05:55:00+04:00",
    status: "Delayed",
    terminal: "T1",
    gate: "B04"
  },
  {
    flightNo: "QR662",
    airline: "Qatar Airways",
    from: "DOH (Doha)",
    to: "CMB (Colombo)",
    schedDeparture: "2026-02-13T08:10:00+03:00",
    schedArrival: "2026-02-13T15:20:00+05:30",
    status: "On Time",
    terminal: "T1",
    gate: "C05"
  }
];

export const pois = [
{
  "id": "poi-1",
  "name": "Help Desk (Arrivals)",
  "category": "help",
  "lat": 7.1781,
  "lon": 79.8842,
  "floor": "Ground",
  "description": "General assistance, directions and passenger support.",
  "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-2",
  "name": "Medical Room",
  "category": "medical",
  "lat": 7.179,
  "lon": 79.8836,
  "floor": "Ground",
  "description": "First aid and emergency medical help.",
  "image": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-3",
  "name": "Toilets (Entrance)",
  "category": "toilet",
  "lat": 7.1774,
  "lon": 79.8852,
  "floor": "Ground",
  "description": "Public restrooms.",
  "image": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-4",
  "name": "Gate A12",
  "category": "gate",
  "lat": 7.1802,
  "lon": 79.8848,
  "floor": "Level 1",
  "description": "Departure Gate A12.",
  "image": "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-5",
  "name": "Mini Mart",
  "category": "shop",
  "lat": 7.1785,
  "lon": 79.8845,
  "floor": "Ground",
  "description": "Snacks, travel essentials and SIM cards.",
  "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-6",
  "name": "Food Court",
  "category": "food",
  "lat": 7.1788,
  "lon": 79.8849,
  "floor": "Level 1",
  "description": "Multiple cuisines with quick seating.",
  "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-7",
  "name": "Coffee Bar",
  "category": "coffee",
  "lat": 7.18,
  "lon": 79.884,
  "floor": "Level 1",
  "description": "Coffee, pastries and grab‑and‑go.",
  "image": "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-8",
  "name": "Pharmacy",
  "category": "pharmacy",
  "lat": 7.1792,
  "lon": 79.885,
  "floor": "Ground",
  "description": "Medicines and health products.",
  "image": "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-9",
  "name": "Executive Lounge",
  "category": "lounge",
  "lat": 7.1805,
  "lon": 79.8855,
  "floor": "Level 2",
  "description": "Quiet seating, snacks and work pods.",
  "image": "https://images.unsplash.com/photo-1563911302283-d2bc129e7c1f?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-10",
  "name": "ATM (Arrivals)",
  "category": "atm",
  "lat": 7.1789,
  "lon": 79.8839,
  "floor": "Ground",
  "description": "Cash withdrawal & currency services nearby.",
  "image": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-11",
  "name": "Free Wi‑Fi Zone",
  "category": "wifi",
  "lat": 7.1796,
  "lon": 79.8844,
  "floor": "Level 1",
  "description": "Strong signal seating area for quick work.",
  "image": "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-12",
  "name": "Charging Station",
  "category": "charging",
  "lat": 7.1799,
  "lon": 79.8849,
  "floor": "Level 1",
  "description": "USB‑C / USB‑A + AC power outlets.",
  "image": "https://images.unsplash.com/photo-1585060544815-40e3f7ad9eab?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-13",
  "name": "Prayer Room",
  "category": "prayer",
  "lat": 7.1791,
  "lon": 79.8847,
  "floor": "Level 2",
  "description": "Quiet space for prayer & reflection.",
  "image": "https://images.unsplash.com/photo-1528222354212-a295abf125c6?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-14",
  "name": "Kids Play Corner",
  "category": "kids",
  "lat": 7.1803,
  "lon": 79.8842,
  "floor": "Level 1",
  "description": "Family zone with soft play seating.",
  "image": "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-15",
  "name": "Water Refill Point",
  "category": "water",
  "lat": 7.178,
  "lon": 79.8837,
  "floor": "Ground",
  "description": "Refill bottles — stay hydrated.",
  "image": "https://images.unsplash.com/photo-1526401485004-2aa6c13f5c29?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-16",
  "name": "Baggage Wrap Service",
  "category": "baggage",
  "lat": 7.1779,
  "lon": 79.884,
  "floor": "Ground",
  "description": "Protect luggage with secure wrapping.",
  "image": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-17",
  "name": "Lost & Found",
  "category": "lostfound",
  "lat": 7.1786,
  "lon": 79.8834,
  "floor": "Ground",
  "description": "Report and recover missing items.",
  "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-18",
  "name": "Check‑in Counters",
  "category": "checkin",
  "lat": 7.1794,
  "lon": 79.8853,
  "floor": "Ground",
  "description": "Airline check‑in and bag drop.",
  "image": "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-19",
  "name": "Security Screening",
  "category": "security",
  "lat": 7.1798,
  "lon": 79.8857,
  "floor": "Level 1",
  "description": "Prepare liquids & laptops before entry.",
  "image": "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-20",
  "name": "Immigration",
  "category": "immigration",
  "lat": 7.1807,
  "lon": 79.8846,
  "floor": "Level 1",
  "description": "Passport control and outbound processing.",
  "image": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-21",
  "name": "Taxi Stand",
  "category": "taxi",
  "lat": 7.1772,
  "lon": 79.8832,
  "floor": "Outside",
  "description": "Official airport taxis and e‑hailing pickup.",
  "image": "https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-22",
  "name": "Bus Stop",
  "category": "bus",
  "lat": 7.177,
  "lon": 79.8836,
  "floor": "Outside",
  "description": "Public bus connections and timetable.",
  "image": "https://images.unsplash.com/photo-1520975958225-1c0b0f8f6b0f?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-23",
  "name": "Short‑Stay Parking",
  "category": "parking",
  "lat": 7.1768,
  "lon": 79.8841,
  "floor": "Outside",
  "description": "Pick‑up / drop‑off parking area.",
  "image": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-24",
  "name": "Car Rental Desk",
  "category": "rental",
  "lat": 7.1783,
  "lon": 79.8831,
  "floor": "Ground",
  "description": "Self‑drive rentals & assistance.",
  "image": "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-25",
  "name": "Smoking Area",
  "category": "smoking",
  "lat": 7.1809,
  "lon": 79.8852,
  "floor": "Outside",
  "description": "Designated smoking zone.",
  "image": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-26",
  "name": "Information Kiosk",
  "category": "help",
  "lat": 7.1797,
  "lon": 79.8838,
  "floor": "Level 1",
  "description": "Self‑service maps, announcements and tips.",
  "image": "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-27",
  "name": "Restrooms (Level 1)",
  "category": "toilet",
  "lat": 7.1801,
  "lon": 79.8851,
  "floor": "Level 1",
  "description": "Toilets near food court.",
  "image": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-28",
  "name": "Baggage Claim",
  "category": "baggage",
  "lat": 7.1776,
  "lon": 79.8848,
  "floor": "Ground",
  "description": "Arrivals baggage claim belts.",
  "image": "https://images.unsplash.com/photo-1558244661-d248897f7bcf?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-29",
  "name": "Transport Hub",
  "category": "transport",
  "lat": 7.1774,
  "lon": 79.8839,
  "floor": "Outside",
  "description": "Taxis, buses and pickup zones.",
  "image": "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=500&auto=format&fit=crop&q=60"
},
{
  "id": "poi-30",
  "name": "Duty Free (Shopping)",
  "category": "shop",
  "lat": 7.1806,
  "lon": 79.885,
  "floor": "Level 1",
  "description": "Perfume, cosmetics and souvenirs.",
  "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60"
}
];

