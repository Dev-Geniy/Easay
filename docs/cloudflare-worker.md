# Deployment of Easay with the existing Cloudflare Worker

The existing cloud project named easay is a Worker. It is not necessary to create a new Pages project.
Use Workers Builds with build command: npm run build; deploy command: npx wrangler deploy; root: /.

## Connect the D1 database
1. Cloudflare dashboard > Storage & Databases > D1 SQL Database > Create database.
2. Create database named easay-certificates.
3. Open it, choose Console, paste SQL from db/schema.sql, click Execute. Confirm tables exam_attempts and certificates in Tables.
4. Return to Workers & Pages > easay > Settings > Bindings (or the Bindings tab in some UI versions).
5. Add binding > D1 database. Variable name: EASAY_DB. Select easay-certificates.
6. IMPORTANT: read the database UUID in the D1 Overview. Commit a real D1 binding to wrangler.toml using the following shape (without placeholder UUID):

[[d1_databases]]
binding = "EASAY_DB"
database_name = "easay-certificates"
database_id = "(real database UUID from Cloudflare)"

A permanent binding in the repo ensures the next GitHub deployment does not silently remove the dashboard change.

## Connect Groq and certificate security
Cloudflare > Workers & Pages > easay > Settings > Variables and Secrets > Add.
Type Secret, name GROQ_API_KEY, value: your Groq API key.
Type Secret, name CERT_HASH_SECRET, value: a strong private random 32+ character string.
Do not copy secret values into GitHub, a screenshot, or this chat.
After Deploy and retry build, test /api/exam?course=basics; success returns JSON mode: verified.
The /api/ai endpoint only accepts POST; opening it in a browser gives 405 even if the secret is configured. Test by using the app's Mentor chat.

## Important facts
- Static lessons and training exams run without D1 or Groq.
- Verified certificate requires D1 + CERT_HASH_SECRET. This is an Easay internal exam record, not a national qualification or independent accreditation.
- The user's name is public only when they opt in.
- keep_vars=true preserves dashboard-managed secrets across GitHub/Wrangler deployments.
- The old Netlify project is not necessary. Wait to delete until tests of the current Cloudflare site pass.
