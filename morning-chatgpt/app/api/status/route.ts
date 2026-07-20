export async function GET() {
  return Response.json({
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    publicDataKeyConfigured: Boolean(process.env.PUBLIC_DATA_API_KEY),
    weatherLive: false,
    airLive: false,
  });
}
