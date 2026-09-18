/**
 * SameSalt Scan Worker
 *
 * Proxies medicine strip photos to OpenRouter's vision API.
 * Keeps the API key server-side so it never ships in the app bundle.
 *
 * POST /scan  { image: "base64..." }
 * → { brand_name, salt_composition, strength, dosage_form, pack_size }
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-App-Secret",
};

const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8MB — well above a compressed strip photo
const RATE_LIMIT_PER_MINUTE = 10;

// In-memory per-isolate rate limiting. This is not durable across Cloudflare
// isolate restarts/regions — it's a cheap backstop against casual abuse of a
// free/hackathon-tier worker, not a hard guarantee. A Durable Object would be
// the correct fix for real production traffic.
const requestLog = new Map(); // ip -> timestamps[]

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (requestLog.get(ip) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_PER_MINUTE;
}

const SYSTEM_PROMPT = `You are a medicine strip OCR assistant for the Indian pharmaceutical market.

Given a photo of a medicine strip, blister pack, or medicine box, extract:
1. brand_name — the commercial brand name (e.g. "Crocin", "Augmentin")
2. salt_composition — the full salt/active ingredient composition with strengths (e.g. "Amoxicillin (500mg) + Clavulanic Acid (125mg)")
3. strength — the primary strength (e.g. "500mg")
4. dosage_form — one of: tablet, capsule, syrup, injection, cream, ointment, gel, drops, inhaler, suspension, powder, spray, patch, lozenge, suppository, solution
5. pack_size — number of units in the pack if visible (e.g. "10 tablets")
6. manufacturer — the manufacturer name if visible

Respond with ONLY a JSON object, no markdown, no explanation:
{"brand_name": "...", "salt_composition": "...", "strength": "...", "dosage_form": "...", "pack_size": "...", "manufacturer": "..."}

If a field is not visible, use null. For salt_composition, use the format "SaltName (Strength)" separated by " + " for combinations.
Always prefer the generic/salt name printed on the strip over marketing text.`;

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({ status: "ok" });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/scan") {
      return handleScan(request, env);
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};

async function handleScan(request, env) {
  try {
    // Weak but real: a shared secret baked into the app bundle. It stops
    // drive-by scripts hitting the endpoint cold; it does not stop someone
    // who decompiles the APK. Combined with the rate limit and OpenRouter's
    // own account spend cap, that's the realistic ceiling for a hackathon
    // worker with no user accounts.
    if (!env.APP_SHARED_SECRET) {
      // Fail closed: if the secret binding is ever missing (cleared, or lost
      // on a redeploy), refuse rather than silently becoming an open proxy
      // to a paid API.
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }
    const provided = request.headers.get("X-App-Secret");
    if (provided !== env.APP_SHARED_SECRET) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return jsonResponse({ error: "Too many requests, try again in a minute" }, 429);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request too large" }, 413);
    }

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return jsonResponse({ error: "Missing 'image' field (base64)" }, 400);
    }

    if (image.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Image too large" }, 413);
    }

    if (!env.OPENROUTER_API_KEY) {
      return jsonResponse({ error: "Server misconfigured: missing API key" }, 500);
    }

    // Detect MIME type from base64 header or default to jpeg
    let mimeType = "image/jpeg";
    let imageData = image;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        imageData = match[2];
      }
    }

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://samesalt.app",
          "X-Title": "SameSalt",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageData}`,
                  },
                },
                {
                  type: "text",
                  text: "Extract the medicine information from this strip/pack.",
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0,
        }),
      }
    );

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      console.error("OpenRouter error:", openRouterResponse.status, errText);
      return jsonResponse(
        {
          error: "Vision API error",
          status: openRouterResponse.status,
          detail: errText.slice(0, 500),
        },
        502
      );
    }

    const data = await openRouterResponse.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse({ error: "No response from vision model" }, 502);
    }

    // Parse the JSON from the model response
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return raw content for client-side handling
      return jsonResponse({
        error: "Could not parse vision response",
        raw: content,
      }, 422);
    }

    return jsonResponse({
      success: true,
      data: {
        brand_name: parsed.brand_name || null,
        salt_composition: parsed.salt_composition || null,
        strength: parsed.strength || null,
        dosage_form: parsed.dosage_form || null,
        pack_size: parsed.pack_size || null,
        manufacturer: parsed.manufacturer || null,
      },
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    console.error("Scan error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}
