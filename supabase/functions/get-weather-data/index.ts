import { serve } from "std/http/server.ts";
import { create, getNumericDate } from "djwt";
import { decode as b64decode } from "base64";

// 1️⃣ Load the full PEM *or* just the base64 body.
//    If you load the full PEM, strip the header/footer first.
function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  return b64decode(body);
}

const TEAM_ID    = Deno.env.get("WEATHERKIT_TEAM_ID")!;     // e.g. 9VA2Z2CHHS
const KEY_ID     = Deno.env.get("WEATHERKIT_KEY_ID")!;      // e.g. PSDX8655C9
const SERVICE_ID = Deno.env.get("WEATHERKIT_SERVICE_ID")!;  // e.g. com.yourapp.weather
const P8_KEY     = Deno.env.get("WEATHERKIT_P8_KEY")!;      // contents of AuthKey_….p8

async function generateJwt() {
  const binaryDer = pemToDer(P8_KEY);

  // importKey expects raw PKCS8 DER
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  // 🔑  Add **id** to the header
  const header = {
    alg: "ES256",
    typ: "JWT",
    kid: KEY_ID,
    id: `${TEAM_ID}.${SERVICE_ID}`,
  };

  const now = getNumericDate(0);
  const payload = {
    iss: TEAM_ID,
    sub: SERVICE_ID,
    iat: now,
    exp: now + 3600,      // 1 h
  };

  return await create(header, payload, key);
}

serve(async (req) => {
  const { latitude, longitude } = await req.json();

  if (!latitude || !longitude) {
    return new Response(
      JSON.stringify({ error: "Latitude and longitude are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const jwt = await generateJwt();
    const url = `https://weatherkit.apple.com/api/v1/weather/en/${latitude}/${longitude}?dataSets=currentWeather,forecastDaily,airQuality&country=US&timezone=auto`;

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("WeatherKit API error:", text);
      return new Response(JSON.stringify({ error: text }), {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { currentWeather, airQuality } = await resp.json();
    return new Response(
      JSON.stringify({
        uvIndex: currentWeather.uvIndex,
        humidity: currentWeather.humidity,
        aqi: airQuality?.metadata?.airQualityIndex ?? null,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
