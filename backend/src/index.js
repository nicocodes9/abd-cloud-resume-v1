/**
 * Cloud Resume Challenge — Visitor Counter Worker
 * ------------------------------------------------
 * POST /visits  -> increments the counter in KV and returns { count }
 * OPTIONS       -> handles CORS preflight
 * anything else -> 405
 *
 * Storage: Cloudflare KV, bound as VISIT_COUNTER (configured in wrangler.toml)
 */

// During local development, "*" is fine. Once your Pages site is live,
// change this to your real Pages URL (see README "Locking down CORS").
// Making the change in this file as a comment to trigger the CI?CD workflow to redeploy the worker with the new CORS header.
const ALLOWED_ORIGIN = 'https://abd-cloud-resume-v1.pages.dev'
// updating the CORS header to allow only the deployed Page site to access the worker.

const KV_KEY = 'visit_count'

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function incrementVisitCount(kvNamespace) {
  const currentValue = await kvNamespace.get(KV_KEY)
  const currentCount = currentValue ? parseInt(currentValue, 10) : 0
  const newCount = currentCount + 1

  await kvNamespace.put(KV_KEY, newCount.toString())

  return newCount
}

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders()

    // Browsers send an OPTIONS preflight before cross-origin POSTs
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
    }

    try {
      const count = await incrementVisitCount(env.VISIT_COUNTER)
      return jsonResponse({ count }, 200, corsHeaders)
    } catch (error) {
      console.error('Failed to update visit count:', error)
      return jsonResponse({ error: 'Counter unavailable' }, 500, corsHeaders)
    }
  },
}
