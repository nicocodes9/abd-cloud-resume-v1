# Cloud Resume Challenge — Portfolio Project

```
cloud-resume-challenge/
├── frontend/              ← your portfolio site (deploys to Cloudflare Pages)
│   ├── index.html
│   ├── styles.css
│   └── script.js          ← includes the visitor counter logic
│
└── backend/                ← the visitor counter API (deploys to Cloudflare Workers)
    ├── src/
    │   └── index.js         ← the Worker itself
    ├── wrangler.toml         ← infra-as-code: Worker name + KV binding
    ├── package.json
    ├── .gitignore
    └── README.md             ← full backend setup + connection instructions
```

## Where to start

Open `backend/README.md` — it walks through creating the KV namespace,
deploying the Worker, and pointing `frontend/script.js` at your live Worker
URL.

## Deploying

- **Frontend** → Cloudflare Pages, build output directory: `frontend`
- **Backend** → Cloudflare Workers, via `wrangler deploy` from inside `backend/`
