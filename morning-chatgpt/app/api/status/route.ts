export async function GET() {
  const weatherKeyConfigured = Boolean(
    process.env.PUBLIC_DATA_WEATHER_KEY || process.env.WEATHER_API_KEY || process.env.KMA_API_KEY || process.env.KMA_SERVICE_KEY
    || process.env.PUBLIC_DATA_API_KEY || process.env.DATA_GO_KR_API_KEY || process.env.NEXT_PUBLIC_WEATHER_API_KEY,
  );
  const airKeyConfigured = Boolean(
    process.env.PUBLIC_DATA_AIR_KEY || process.env.AIRKOREA_API_KEY || process.env.AIR_API_KEY || process.env.AIR_QUALITY_API_KEY
    || process.env.PUBLIC_DATA_API_KEY || process.env.DATA_GO_KR_API_KEY || process.env.NEXT_PUBLIC_AIRKOREA_API_KEY,
  );
  return Response.json({
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    publicDataKeyConfigured: Boolean(process.env.PUBLIC_DATA_API_KEY),
    weatherLive: weatherKeyConfigured,
    airLive: airKeyConfigured,
  });
}
