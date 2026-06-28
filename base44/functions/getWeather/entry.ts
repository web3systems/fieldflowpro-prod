import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const lat = body.lat ?? 44.5588;
    const lon = body.lon ?? -72.5778;

    const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!apiKey) return Response.json({ error: 'OPENWEATHERMAP_API_KEY not set' }, { status: 500 });

    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial&cnt=8`)
    ]);

    if (!currentRes.ok) {
      const err = await currentRes.text();
      console.error('Weather API error:', err);
      return Response.json({ error: 'Weather API error', detail: err }, { status: 502 });
    }

    const w = await currentRes.json();
    const forecast = await forecastRes.json();
    const alerts = w.alerts || [];

    return Response.json({
      temp: Math.round(w.main.temp),
      feels_like: Math.round(w.main.feels_like),
      conditions: w.weather[0].description,
      humidity: w.main.humidity,
      wind_speed: Math.round(w.wind.speed),
      city: w.name,
      alerts: alerts.map(a => ({ event: a.event, description: a.description })),
      forecast: forecast.list.slice(0, 4).map(f => ({
        time: f.dt_txt,
        temp: Math.round(f.main.temp),
        conditions: f.weather[0].description
      }))
    });
  } catch (error) {
    console.error('getWeather error:', error);
    return Response.json({ error: 'Weather unavailable', detail: error.message }, { status: 500 });
  }
});