-- ============================================================
-- AeroGuide – Supabase Database Schema
-- Run this file in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES — extended user data (linked to auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  email         TEXT,
  phone         TEXT,
  nationality   TEXT,
  preferred_lang TEXT NOT NULL DEFAULT 'EN',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Extended user profile linked 1-to-1 with auth.users';

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role has full access to profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 2. PASSENGERS — passenger booking records
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.passengers (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pnr              TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  first_name       TEXT NOT NULL DEFAULT '',
  title            TEXT,
  email            TEXT,
  phone            TEXT,
  nationality      TEXT,
  passport_no      TEXT,
  frequent_flyer_no TEXT,
  seat             TEXT,
  cabin            TEXT CHECK (cabin IN ('Economy', 'Premium Economy', 'Business', 'First')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.passengers IS 'Passenger booking records with PNR';

CREATE INDEX IF NOT EXISTS idx_passengers_pnr ON public.passengers (pnr);
CREATE INDEX IF NOT EXISTS idx_passengers_last_name ON public.passengers (last_name);
CREATE INDEX IF NOT EXISTS idx_passengers_email ON public.passengers (email);
CREATE INDEX IF NOT EXISTS idx_passengers_user_id ON public.passengers (user_id);

-- RLS for passengers
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read passengers by PNR"
  ON public.passengers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role has full access to passengers"
  ON public.passengers FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 3. FLIGHTS — flight records
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flights (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pnr              TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  flight_no        TEXT NOT NULL,
  origin_code      TEXT NOT NULL,
  origin_city      TEXT NOT NULL DEFAULT '',
  destination_code TEXT NOT NULL,
  destination_city TEXT NOT NULL DEFAULT '',
  departure_iso    TEXT NOT NULL,
  gate             TEXT NOT NULL DEFAULT '',
  terminal         TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'On Schedule'
                   CHECK (status IN ('On Schedule', 'Boarding Soon', 'Delayed', 'Cancelled', 'Departed', 'Landed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.flights IS 'Flight records linked to passenger PNR';

CREATE INDEX IF NOT EXISTS idx_flights_pnr ON public.flights (pnr);
CREATE INDEX IF NOT EXISTS idx_flights_last_name ON public.flights (last_name);
CREATE INDEX IF NOT EXISTS idx_flights_flight_no ON public.flights (flight_no);

-- RLS for flights
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read flights"
  ON public.flights FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role has full access to flights"
  ON public.flights FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 4. AIRPORTS — airport reference data
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.airports (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  iata_code     TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  city          TEXT NOT NULL DEFAULT '',
  country       TEXT NOT NULL DEFAULT '',
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  timezone      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.airports IS 'Airport reference data with IATA codes';

CREATE INDEX IF NOT EXISTS idx_airports_iata ON public.airports (iata_code);

-- RLS for airports (public read)
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read airports"
  ON public.airports FOR SELECT
  USING (true);

CREATE POLICY "Service role has full access to airports"
  ON public.airports FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 5. FEEDBACK — user feedback
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  message     TEXT,
  category    TEXT DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.feedback IS 'User-submitted feedback and ratings';

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback (user_id);

-- RLS for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to feedback"
  ON public.feedback FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 6. SEED DATA — demo passengers & flights
-- ────────────────────────────────────────────────────────────
INSERT INTO public.passengers (pnr, last_name, first_name, title, email, phone, nationality, passport_no, frequent_flyer_no, seat, cabin)
VALUES
  ('AG1234', 'PERERA', 'Nimal', 'Mr', 'nimal.perera@example.com', '+94 71 234 5678', 'Sri Lankan', 'N1234567', 'UL 123456789', '13C', 'Economy'),
  ('AG5678', 'SILVA', 'Ayesha', 'Ms', 'ayesha.silva@example.com', '+94 77 987 6543', 'Sri Lankan', 'N9876543', 'UL 987654321', '7A', 'Business')
ON CONFLICT DO NOTHING;

INSERT INTO public.flights (pnr, last_name, flight_no, origin_code, origin_city, destination_code, destination_city, departure_iso, gate, terminal, status)
VALUES
  ('AG1234', 'PERERA', 'UL225', 'CMB', 'Colombo', 'DXB', 'Dubai', '2026-02-25T12:30:00+05:30', 'A12', 'T1', 'On Schedule'),
  ('AG1234', 'PERERA', 'UL226', 'DXB', 'Dubai', 'CMB', 'Colombo', '2026-03-02T09:10:00+04:00', 'C08', 'T2', 'On Schedule'),
  ('AG5678', 'SILVA', 'UL307', 'CMB', 'Colombo', 'SIN', 'Singapore', '2026-02-25T15:45:00+05:30', 'B03', 'T1', 'Delayed'),
  ('AG5678', 'SILVA', 'UL308', 'SIN', 'Singapore', 'CMB', 'Colombo', '2026-03-05T08:20:00+08:00', 'A04', 'T1', 'On Schedule')
ON CONFLICT DO NOTHING;

-- Seed airports
INSERT INTO public.airports (iata_code, name, city, country, latitude, longitude, timezone)
VALUES
  ('CMB', 'Bandaranaike International Airport', 'Colombo', 'Sri Lanka', 7.1808, 79.8842, 'Asia/Colombo'),
  ('DXB', 'Dubai International Airport', 'Dubai', 'UAE', 25.2532, 55.3657, 'Asia/Dubai'),
  ('SIN', 'Singapore Changi Airport', 'Singapore', 'Singapore', 1.3644, 103.9915, 'Asia/Singapore')
ON CONFLICT (iata_code) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 7. HELPER: updated_at auto-update trigger
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_passengers_updated_at
  BEFORE UPDATE ON public.passengers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_flights_updated_at
  BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
