import { useEffect, useState } from "react";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const THEMES = {
  clear: "from-amber-200 to-sky-400 text-slate-900",
  cloudy: "from-slate-300 to-slate-500 text-slate-900",
  rain: "from-slate-600 to-blue-900 text-white",
  snow: "from-slate-100 to-sky-300 text-slate-900",
  storm: "from-slate-700 to-indigo-950 text-white",
};

function describeWeather(code) {
  if (code === 0) return { label: "Clear sky", theme: THEMES.clear };
  if (code <= 3) return { label: "Partly cloudy", theme: THEMES.cloudy };
  if (code === 45 || code === 48) return { label: "Fog", theme: THEMES.cloudy };
  if (code >= 51 && code <= 57) return { label: "Drizzle", theme: THEMES.rain };
  if (code >= 61 && code <= 67) return { label: "Rain", theme: THEMES.rain };
  if (code >= 71 && code <= 77) return { label: "Snow", theme: THEMES.snow };
  if (code >= 80 && code <= 82) return { label: "Rain showers", theme: THEMES.rain };
  if (code === 85 || code === 86) return { label: "Snow showers", theme: THEMES.snow };
  if (code >= 95) return { label: "Thunderstorm", theme: THEMES.storm };
  return { label: "Unknown", theme: THEMES.cloudy };
}

async function getCoordinates(city) {
  const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1`);
  if (!res.ok) throw new Error("Could not reach the location service.");
  const data = await res.json();
  if (!data.results?.length) throw new Error(`No city found for "${city}".`);
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

async function getWeather({ latitude, longitude }, unit) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "5",
    temperature_unit: unit,
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error("Could not load the weather. Try again.");
  return res.json();
}

export default function App() {
  const [text, setText] = useState("");
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [unit, setUnit] = useState("celsius");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(city) {
    setLoading(true);
    setError("");
    try {
      setPlace(await getCoordinates(city));
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const city = text.trim();
    if (city) handleSearch(city);
  }

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    setLoading(true);
    getWeather(place, unit)
      .then((data) => !cancelled && (setWeather(data), setError("")))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [place, unit]);

  useEffect(() => {
    handleSearch("Delhi");
  }, []);

  const theme = weather
    ? describeWeather(weather.current.weather_code).theme
    : "from-slate-200 to-slate-400 text-slate-900";
  const symbol = unit === "celsius" ? "°C" : "°F";

  return (
    <main className={`min-h-screen bg-gradient-to-b ${theme} px-4 py-8`}>
      <div className="mx-auto max-w-md space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search a city"
            aria-label="City name"
            className="min-w-0 flex-1 rounded-lg bg-white/70 px-4 py-2 text-slate-900"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            Search
          </button>
        </form>

        <button
          onClick={() => setUnit(unit === "celsius" ? "fahrenheit" : "celsius")}
          className="text-sm underline"
        >
          Switch to {unit === "celsius" ? "°F" : "°C"}
        </button>

        {error && (
          <p role="alert" className="rounded-lg bg-red-100 px-4 py-3 text-red-900">
            {error}
          </p>
        )}
        {loading && !weather && <p>Loading weather…</p>}

        {weather && place && (
          <>
            <section className="py-6">
              <h1 className="text-xl font-semibold">
                {place.name}, {place.country}
              </h1>
              <p className="mt-4 text-7xl font-bold">
                {Math.round(weather.current.temperature_2m)}
                {symbol}
              </p>
              <p className="mt-1 text-lg">
                {describeWeather(weather.current.weather_code).label}
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="opacity-70">Feels like</p>
                  <p className="font-medium">
                    {Math.round(weather.current.apparent_temperature)}
                    {symbol}
                  </p>
                </div>
                <div>
                  <p className="opacity-70">Humidity</p>
                  <p className="font-medium">{weather.current.relative_humidity_2m}%</p>
                </div>
                <div>
                  <p className="opacity-70">Wind</p>
                  <p className="font-medium">{weather.current.wind_speed_10m} km/h</p>
                </div>
              </div>
            </section>

            <ul className="rounded-lg bg-white/40">
              {weather.daily.time.map((date, i) => (
                <li key={date} className="flex items-center justify-between px-4 py-3">
                  <span className="w-28 font-medium">
                    {i === 0
                      ? "Today"
                      : new Date(date).toLocaleDateString("en-IN", { weekday: "long" })}
                  </span>
                  <span className="flex-1 text-sm">
                    {describeWeather(weather.daily.weather_code[i]).label}
                  </span>
                  <span>
                    {Math.round(weather.daily.temperature_2m_max[i])}° /{" "}
                    {Math.round(weather.daily.temperature_2m_min[i])}°
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}