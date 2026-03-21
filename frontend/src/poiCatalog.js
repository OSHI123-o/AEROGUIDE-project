export const POI_CATEGORIES = {
  help: { label: "Help Desk", emoji: "i", color: "#38bdf8" },
  medical: { label: "Medical", emoji: "M", color: "#ef4444" },
  toilet: { label: "Toilets", emoji: "WC", color: "#22c55e" },
  gate: { label: "Gates", emoji: "G", color: "#facc15" },

  shop: { label: "Shops", emoji: "S", color: "#f97316" },
  food: { label: "Food", emoji: "F", color: "#fb7185" },
  coffee: { label: "Coffee", emoji: "C", color: "#0ea5e9" },
  pharmacy: { label: "Pharmacy", emoji: "P", color: "#10b981" },
  lounge: { label: "Lounges", emoji: "L", color: "#a78bfa" },

  atm: { label: "ATM", emoji: "$", color: "#60a5fa" },
  wifi: { label: "Free Wi-Fi", emoji: "Wi", color: "#22c55e" },
  charging: { label: "Charging", emoji: "CH", color: "#f59e0b" },
  prayer: { label: "Prayer Room", emoji: "PR", color: "#c084fc" },
  kids: { label: "Kids Area", emoji: "K", color: "#fb7185" },
  water: { label: "Water Refill", emoji: "H2O", color: "#38bdf8" },

  baggage: { label: "Baggage Services", emoji: "B", color: "#94a3b8" },
  lostfound: { label: "Lost & Found", emoji: "LF", color: "#94a3b8" },
  checkin: { label: "Check-in", emoji: "CI", color: "#38bdf8" },
  security: { label: "Security", emoji: "SEC", color: "#64748b" },
  immigration: { label: "Immigration", emoji: "IM", color: "#64748b" },

  transport: { label: "Transport", emoji: "T", color: "#38bdf8" },
  taxi: { label: "Taxi", emoji: "TX", color: "#facc15" },
  bus: { label: "Bus", emoji: "BUS", color: "#60a5fa" },
  parking: { label: "Parking", emoji: "P", color: "#60a5fa" },
  rental: { label: "Car Rental", emoji: "R", color: "#34d399" },

  smoking: { label: "Smoking Area", emoji: "SM", color: "#94a3b8" },
};

export const CATEGORY_ORDER = [
  "help", "medical", "toilet", "gate",
  "checkin", "security", "immigration",
  "food", "coffee", "shop", "pharmacy", "lounge",
  "wifi", "charging", "atm", "water", "prayer", "kids",
  "baggage", "lostfound",
  "transport", "taxi", "bus", "parking", "rental",
  "smoking",
];

export const getCategoryMeta = (key) =>
  POI_CATEGORIES[key] || { label: key, emoji: "*", color: "#94a3b8" };
