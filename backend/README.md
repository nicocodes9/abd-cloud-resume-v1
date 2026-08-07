# Backend — Visitor Counter (Cloudflare Worker + KV)

A tiny API with one job: increment a number in KV and return it. This is the
"Lambda + DynamoDB" equivalent from the AWS version of the Cloud Resume
Challenge, built on Cloudflare instead.

## Files

```
backend/
├── src/
│   └── index.js      ← the Worker (handles the request, CORS, KV read/write)
├── wrangler.toml      ← infrastructure-as-code: Worker name + KV binding
├── package.json
└── README.md
```

## 1. Install Wrangler and log in

```bash
npm install -g wrangler
wrangler login
```

This opens a browser tab to authorize Wrangler against your Cloudflare
account. Once it confirms, Wrangler can deploy on your behalf.

## 2. Get your Account ID

Cloudflare dashboard → **Workers & Pages** → Account ID is shown in the
right-hand panel. Copy it.

## 3. Create the KV namespace (this is your "database")

From inside `backend/`:

```bash
wrangler kv namespace create "VISIT_COUNTER"
```

Wrangler prints something like:

```
{ binding = "VISIT_COUNTER", id = "abc123def456..." }
```

## 4. Fill in `wrangler.toml`

Open `wrangler.toml` and replace:
- `YOUR_CLOUDFLARE_ACCOUNT_ID` → the Account ID from step 2
- `PASTE_YOUR_KV_NAMESPACE_ID_HERE` → the `id` from step 3

## 5. Test locally

```bash
npm install
wrangler dev
```

In another terminal:

```bash
curl -X POST http://localhost:8787/visits
# {"count":1}

curl -X POST http://localhost:8787/visits
# {"count":2}
```

If the number goes up each time, the Worker and KV are wired correctly.

## 6. Deploy

```bash
wrangler deploy
```

Wrangler prints your live Worker URL, e.g.:

```
https://cloud-resume-counter.YOUR_SUBDOMAIN.workers.dev
```

Verify it live:

```bash
curl -X POST https://cloud-resume-counter.YOUR_SUBDOMAIN.workers.dev/visits
```

## 7. Connect the frontend

Open `script.js` in the frontend and update:

```javascript
// Before:
const COUNTER_API_URL = 'https://PLACEHOLDER.workers.dev/visits'

// After (use your real Worker URL from step 6):
const COUNTER_API_URL = 'https://cloud-resume-counter.YOUR_SUBDOMAIN.workers.dev/visits'
```

Reload your site — the footer counter should animate up on every visit.

## 8. Lock down CORS (do this once the frontend is deployed)

While developing, `src/index.js` allows requests from any origin:

```javascript
const ALLOWED_ORIGIN = '*'
```

Once your frontend is live on Cloudflare Pages, tighten this to your real
Pages URL so only your site can call the counter:

```javascript
const ALLOWED_ORIGIN = 'https://your-project.pages.dev'
```

Redeploy after changing it:

```bash
wrangler deploy
```

Reload your live site and confirm the counter still increments, and that
DevTools → Console shows no CORS errors.

## Troubleshooting

| Symptom                                   | Likely cause                                                              |
|--------------------------------------------|----------------------------------------------------------------------------|
| Counter shows "—" forever                  | `COUNTER_API_URL` still says `PLACEHOLDER`, or the Worker isn't deployed  |
| CORS error in console                      | `ALLOWED_ORIGIN` doesn't match your actual Pages URL exactly (no trailing slash) |
| `{"error":"Counter unavailable"}`          | KV namespace id in `wrangler.toml` is wrong or missing                    |
| Count resets to 1                          | You created a second KV namespace by mistake — check `wrangler kv namespace list` and make sure `wrangler.toml` points at the right one |
