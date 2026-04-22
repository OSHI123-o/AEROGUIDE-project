export type Coordinates = {
  lat: number;
  lon: number;
};

export type WeatherSnapshot = {
  temperature: number;
  wind: number;
  code: number;
  source: "openweather" | "open-meteo";
};

const FALLBACK_WEATHER: WeatherSnapshot = {
  temperature: 30,
  wind: 14,
  code: 1,
  source: "open-meteo",
};

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function fetchFromOpenWeather(coords: Coordinates, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const key = import.meta.env.VITE_OPENWEATHER_API_KEY?.trim();
  if (!key) {
    throw new Error("missing_openweather_key");
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${encodeURIComponent(key)}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error("openweather_failed");
  }

  const data = (await res.json()) as {
    main?: { temp?: number };
    wind?: { speed?: number };
    weather?: Array<{ id?: number }>;
  };

  const tempC = Math.round(toNumber(data.main?.temp, FALLBACK_WEATHER.temperature));
  const windKmh = Math.round(toNumber(data.wind?.speed, FALLBACK_WEATHER.wind / 3.6) * 3.6);
  const code = Math.round(toNumber(data.weather?.[0]?.id, FALLBACK_WEATHER.code));

  return {
    temperature: tempC,
    wind: windKmh,
    code,
    source: "openweather",
  };
}

async function fetchFromOpenMeteo(coords: Coordinates, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto&forecast_days=1`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error("open_meteo_failed");
  }

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      wind_speed_10m?: number;
      weather_code?: number;
    };
  };

  return {
    temperature: Math.round(toNumber(data.current?.temperature_2m, FALLBACK_WEATHER.temperature)),
    wind: Math.round(toNumber(data.current?.wind_speed_10m, FALLBACK_WEATHER.wind)),
    code: Math.round(toNumber(data.current?.weather_code, FALLBACK_WEATHER.code)),
    source: "open-meteo",
  };
}

export async function fetchLiveWeather(coords: Coordinates, signal?: AbortSignal): Promise<WeatherSnapshot> {
  try {
    return await fetchFromOpenWeather(coords, signal);
  } catch {
    try {
      return await fetchFromOpenMeteo(coords, signal);
    } catch {
      return FALLBACK_WEATHER;
    }
  }
}

