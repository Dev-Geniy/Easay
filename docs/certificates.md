# Cloudflare Pages deployment and certificate verification

Easay source: https://github.com/Dev-Geniy/Easay

## Deploy (free plan)
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Choose Dev-Geniy/Easay, main branch, build command: node scripts/build.mjs, build output: dist.
3. Deploy. The static landing, lessons, sharing, badge system, and practice examinations work without API setup.
4. To enable online certificates: create Cloudflare D1 database easay-certificates; execute SQL in db/schema.sql in the D1 console.
5. In Pages project Settings → Functions → D1 database binding: variable EASAY_DB, database easay-certificates. Set an environment secret CERT_HASH_SECRET to a random string of at least 24 characters (not committed to code).
6. Redeploy to activate /api/exam and /api/certificate. A verified GET /api/exam?course=basics should return mode: verified and questions.
7. On Netlify or unbound Cloudflare, exams run as practice and cannot issue certificates; do not claim otherwise.

## Notes
- The existing /api/ai uses Netlify Functions and requires separate Cloudflare Workers port before Groq chat works on Cloudflare.
- Each exam has 20 questions (5 points each). Pass >=90. The exam verifies answers on the server, but not legal identity or previous offline course progress.
- Certificates are issued only by Easay, not accredited by an education regulator. Shareable verification URLs expose the name only when the learner explicitly opted in.
- Print as PDF from the verified certificate page. Never fabricate a certification when backend is unavailable.
- Start with a test migration and verify the full flow before public promotion. Free service quotas and plan terms may change.
