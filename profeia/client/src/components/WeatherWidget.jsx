import { useState, useEffect } from 'react'
import { Wind, Droplets, Thermometer, MapPin, RefreshCw } from 'lucide-react'

const WMO_CODES = {
  0:  { label: 'Despejado',       icon: '☀️' },
  1:  { label: 'Casi despejado',  icon: '🌤️' },
  2:  { label: 'Parcialmente nublado', icon: '⛅' },
  3:  { label: 'Nublado',         icon: '☁️' },
  45: { label: 'Neblina',         icon: '🌫️' },
  48: { label: 'Neblina helada',  icon: '🌫️' },
  51: { label: 'Llovizna ligera', icon: '🌦️' },
  53: { label: 'Llovizna',        icon: '🌦️' },
  55: { label: 'Llovizna intensa',icon: '🌧️' },
  61: { label: 'Lluvia ligera',   icon: '🌧️' },
  63: { label: 'Lluvia',          icon: '🌧️' },
  65: { label: 'Lluvia intensa',  icon: '🌧️' },
  71: { label: 'Nieve ligera',    icon: '🌨️' },
  73: { label: 'Nieve',           icon: '❄️' },
  75: { label: 'Nieve intensa',   icon: '❄️' },
  77: { label: 'Granizo',         icon: '🌨️' },
  80: { label: 'Chubascos',       icon: '🌦️' },
  81: { label: 'Chubascos fuertes', icon: '🌧️' },
  82: { label: 'Chubascos muy fuertes', icon: '⛈️' },
  85: { label: 'Chubascos de nieve', icon: '🌨️' },
  86: { label: 'Chubascos de nieve fuertes', icon: '❄️' },
  95: { label: 'Tormenta eléctrica', icon: '⛈️' },
  96: { label: 'Tormenta con granizo', icon: '⛈️' },
  99: { label: 'Tormenta fuerte', icon: '⛈️' },
}

function getWeatherInfo(code) {
  return WMO_CODES[code] ?? { label: 'Variable', icon: '🌡️' }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [city, setCity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchWeather = async (lat, lon) => {
    try {
      const [weatherRes, geoRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
          `&wind_speed_unit=kmh&timezone=auto`
        ),
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        )
      ])

      const weatherData = await weatherRes.json()
      const geoData = await geoRes.json()

      setWeather(weatherData.current)
      setCity(
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.county ||
        'Mi ubicación'
      )
      setLastUpdated(new Date())
      setError(null)
    } catch {
      setError('No se pudo obtener el clima')
    } finally {
      setLoading(false)
    }
  }

  const initWeather = () => {
    setLoading(true)
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchWeather(coords.latitude, coords.longitude),
      () => {
        // fallback: CDMX
        fetchWeather(19.4326, -99.1332)
      },
      { timeout: 8000 }
    )
  }

  useEffect(() => {
    initWeather()
    const interval = setInterval(initWeather, 30 * 60 * 1000) // 30 min
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="mt-auto pt-4 border-t border-[#f1f3f4]">
        <div className="rounded-xl p-3 bg-gradient-to-br from-[#4285F4]/5 to-[#34A853]/5 border border-[#e8eaed]">
          <div className="flex items-center gap-2 mb-2">
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="skeleton w-24 h-4 rounded" />
          </div>
          <div className="skeleton w-16 h-7 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-auto pt-4 border-t border-[#f1f3f4]">
        <div className="rounded-xl p-3 bg-[#f8f9fa] border border-[#e8eaed] text-center">
          <p className="text-xs text-[#9aa0a6]">{error}</p>
          <button
            onClick={initWeather}
            className="mt-1.5 text-xs text-[#4285F4] hover:underline flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!weather) return null

  const { label, icon } = getWeatherInfo(weather.weather_code)
  const temp = Math.round(weather.temperature_2m)
  const feelsLike = Math.round(weather.apparent_temperature)

  return (
    <div className="mt-auto pt-4 border-t border-[#f1f3f4]">
      <div className="rounded-xl p-3 bg-gradient-to-br from-[#4285F4]/5 via-white to-[#34A853]/5 border border-[#e8eaed] hover:shadow-sm transition-shadow">
        {/* City + icon */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[#5f6368]">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="text-[11px] truncate max-w-[90px]">{city}</span>
          </div>
          <button
            onClick={initWeather}
            className="text-[#9aa0a6] hover:text-[#4285F4] transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Main temp + icon */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl leading-none">{icon}</span>
          <div>
            <div className="text-2xl font-bold text-[#202124] leading-none">{temp}°C</div>
            <div className="text-[11px] text-[#5f6368] mt-0.5">{label}</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="flex flex-col items-center gap-0.5 bg-white/70 rounded-lg p-1.5">
            <Thermometer className="w-3 h-3 text-[#EA4335]" />
            <span className="text-[10px] font-medium text-[#202124]">{feelsLike}°</span>
            <span className="text-[9px] text-[#9aa0a6]">Sens.</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-white/70 rounded-lg p-1.5">
            <Droplets className="w-3 h-3 text-[#4285F4]" />
            <span className="text-[10px] font-medium text-[#202124]">{weather.relative_humidity_2m}%</span>
            <span className="text-[9px] text-[#9aa0a6]">Hum.</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-white/70 rounded-lg p-1.5">
            <Wind className="w-3 h-3 text-[#34A853]" />
            <span className="text-[10px] font-medium text-[#202124]">{Math.round(weather.wind_speed_10m)}</span>
            <span className="text-[9px] text-[#9aa0a6]">km/h</span>
          </div>
        </div>

        {lastUpdated && (
          <p className="text-[9px] text-[#9aa0a6] text-center mt-2">
            Actualizado: {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
