# ✈️ AeroGuide

AeroGuide is a premium, state-of-the-art airport indoor navigation and passenger assistance platform. It combines high-fidelity UI/UX with advanced AI to provide a seamless travel experience, from terminal navigation to real-time flight tracking.

## 🚀 Features

- **📍 Advanced Indoor Navigation**: Interactive maps with corridor-based pathfinding to help passengers find gates, amenities, and lounges.
- **🎙️ AI Voice Assistant**: Powered by Google's Gemini AI, providing personalized assistance and information through voice and text.
- **📊 Real-time Flight Tracking**: Integration with Flightradar24 for up-to-the-minute flight status and gate information.
- **✨ Premium UI/UX**: A "mission-control" aesthetic featuring glassmorphism, dynamic animations (Framer Motion), and a sleek dark mode.
- **🔐 Secure Infrastructure**: Built on Supabase for reliable data management and authentication.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Maps**: Google Maps Platform

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **AI**: Google Generative AI (Gemini)
- **Database**: Supabase (PostgreSQL)
- **Logging**: Pino

## 📁 Project Structure

```
├── frontend/          # React + Vite frontend application
├── backend/           # Node.js + Express backend service
├── supabase/          # Database schema and migrations
└── README.md          # Project documentation
```

## 🚥 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Google Maps API Key
- Google Gemini API Key
- Supabase Project URL & Service Role Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/OSHI123-o/AEROGUIDE-project.git
   cd AEROGUIDE-project
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   # Create a .env file with your credentials (SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY)
   npm run dev
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   # Create a .env file with VITE_GOOGLE_MAPS_API_KEY
   npm run dev
   ```

## 📸 Preview

*Experience the future of airport navigation with a sleek, interactive interface and intelligent assistance.*

---

Developed with ❤️ by [OSHI123-o](https://github.com/OSHI123-o)
