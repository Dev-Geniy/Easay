# Easay 3.0 — English-learning PWA + AI teacher

**Repository:** `easay` · **11 courses / 132 lessons** · No frontend build dependencies.

## Quick deployment (GitHub → Netlify)

1. Create a GitHub repository named **`easay`**.
2. Upload all project files and preserve folders `public/`, `netlify/functions/`, `scripts/`, `tests/`. The real API key must NEVER be included in GitHub.
3. Netlify → **Add new project → Import an existing project → GitHub** → select `easay`.
4. Build command: `node scripts/build.mjs`; publish directory: `dist`; functions directory: `netlify/functions` (already in `netlify.toml`).
5. Environment variables for the Netlify project: `GROQ_API_KEY` secret, **Functions scope**, with a **Production** value. The same Netlify project may already have this variable set.
6. Deploy → check `/api/ai` via the website (the endpoint requires POST), start a lesson, test the coach. The site works without the key, but AI responses will show a configuration error.

**Important:** Drag-and-drop uploading `public/` to Netlify Drop does not deploy serverless functions. Deploy from Git or use Netlify CLI.

## Local testing

`npm test` validates course structure. `npm run build` copies the static site into `dist/`.

To see UI only: `python3 -m http.server 8080 --directory public`. Open `http://localhost:8080` (Groq AI will not work without a function server).

To test AI: install Netlify CLI, set a local key in a file not committed to git, and use `netlify dev`. The server endpoint is `/api/ai` and must be served by Netlify functions.

## Curriculum and capabilities

- 11 independent paths: Basics, Everyday, Work, Business, Travel, Interviews, Tech, Social, Customer Service, Study, Advanced Speaking.
- 132 authored micro-lessons (12 per course). Each has a topic, 4 translated phrases, spoken sample sentence with translation, a teaching tip, a practice dialogue assembled from these phrases, and 3 multiple-choice comprehension tasks. **The dialogue is a drill assembled from the four phrases, not a natural-language transcript**. For richer context, students can ask AI for roleplay.
- Proactive mentor on first lesson visit and after quizzes; optional on/off. Adaptive explanations, plan generation, simulated roleplay.
- Local progress, achievements, courses, spaced-repetition review, saved words, import/export, PWA, dark theme.
- Browser speech synthesis and optional SpeechRecognition where supported. **No objective accent scoring.**
- Unlimited free static content in this MVP; $1 subscription is informational only, not a real checkout.

## Limitations before commercial launch

- No real login, Firebase sync, database, payment gateway, or subscription enforcement.
- Server endpoint is **public**. Browser same-origin checking does NOT provide real API security; in-memory IP throttling is best effort only, unreliable across serverless instances, and can be bypassed by non-browser clients. **Do not launch to large anonymous public audiences with your key until server authentication, persistent quota enforcement, anti-abuse controls and budget caps are in place**.
- Demo AI client permits 8 successful calls per day per browser. This is a UX guardrail, not an enforceable server-side quota. Groq/Netlify free tiers have their own limits.
- AI requires internet. Local browser storage is per-device, may be cleared by the user, and is not synced; exported JSON helps make a backup.
- Lesson pack is suitable for an MVP; formal pedagogical review, native-speaker dialogue editing, accessibility, privacy notice and legal/payment setup are still required before commercial scale.
- Groq model defaults to `openai/gpt-oss-20b` (the old `llama-3.3-70b-versatile` is deprecated for Free/Developer accounts as of August 2026).
- Brand and domain/trademark availability should be checked before public commercial use.

**Never paste a Groq API key into `public/` files, the README, chats, or a public repo.**


## Easay 4.0 — Free-first landing and introductory lesson

- The public entry `/` is a free product landing page with a 3-minute interactive introductory lesson.
- On successful completion the user sees a voluntary donation prompt; **Continue for free** is always available and no payment is checked or required.
- `public/app.html` contains the original course app, with the same localStorage progress, AI mentor, courses and a permanent support footer.
- Donation page: https://send.monobank.ua/jar/9ECZLkLXkq. Donation jar card number is shown for transparency. Project states that 50% of voluntary donations go to food and development activities at SkyKids.
- The first lesson only stores an optional nickname and motivation choice locally; it does not send either to a server.
- Changes to `manifest.webmanifest` set the installed PWA start page to `/app.html`.
- The AI key stays exclusively in Netlify Functions secrets; no credentials in browser code.
- The application is free. AI features remain subject to service availability and published usage limits.

## Easay 5.0 — guided teaching and streamlined onboarding

- All 132 lessons retain their four original stages (intro + phrase, four phrase cards, dialogue, three-question test).
- `public/teacher.js` provides four deterministic, per-lesson Russian narrations and tense examples. No API calls are consumed by the scripted teacher.
- Text is shown with a typing animation if speech is switched off or Russian speech synthesis is unavailable. Web Speech API support and voices vary by browser and operating system.
- The intro lesson stores the entered nickname locally (only when supplied) so the post-lesson onboarding does not ask twice. Onboarding chooses goal, level and pace.
- The home dashboard prioritizes a single Continue button with course progress and a short coach suggestion.
- The settings screen controls teacher speech and study pace. AI chat, repeat cards and quizzes remain.

## Easay 5.2 — Local tutor, friend invites, achievements, final exams

- Removed Russian browser TTS entirely; lesson coach instructions now type beneath each lesson's stage heading. English pronunciation remains.
- Each passed lesson offers a one-click shareable link to pair dialogue practice, and a permanent hidden option (saved locally). Pair practice is a shared-role script, NOT a built-in voice/video call.
- Four lightweight achievements based on genuine local completed lessons and saved vocabulary, accessible through expanded home statistics.
- A 20-question 100-point final assessment for every 12-lesson course, unlocked in the interface after completion.
- Offline exams are practice only. With Cloudflare Pages Functions + D1, answers are graded server-side and a verifiable Easay-internal certificate is issued at 90+/100.
- Certificate PDF: use the native browser print dialog from certificate.html and select Save as PDF. Public names are opt-in; certificates do not claim external accreditation or prove identity.
- Set up D1 by running db/schema.sql; bind D1 to EASAY_DB in Cloudflare Pages and set CERT_HASH_SECRET (random 24+ chars). See docs/certificates.md.

## Easay 5.3 — Visual marketing landing

Four optimized original Easay-generated WebP illustrations are stored in `public/images/` (hero, speaking practice, certificates, decorative US flag). The marketing home incorporates parallax on desktop, staggered reveal and a floating phrase note, while keeping all text readable and disabling motion for `prefers-reduced-motion`. No JavaScript, remote image host or extra packages are required for the images to display. The student dashboard reuses a subdued hero accent without changing course progress or functionality.

## Easay UI 5.4 — marketing visual polish

- Rebalanced the landing hero composition so the illustration does not bleed into the headline. Hero artwork uses a soft radial CSS mask and subtle parallax only for devices allowing motion.
- Speaking and certificate images use feathered masks and backgrounds chosen to blend into their sections. Removed redundant floating visual labels and dense highlight badges.
- The first lesson now focuses on a single phrase, listen action, highly visible name input, and one Continue button. Original voice control and all quiz and onboarding IDs are preserved.
- CSS respects reduced-motion preferences and keeps responsive mobile layouts and keyboard focus.

## Easay UI 5.5 — Less noise, more focus

- Permanently uses the light theme: previous theme choice is ignored, no toggle remains, and local progress is preserved under the same storage key.
- Removed the repeated level indicator in the header; level and pace remain visible on the learning homepage.
- One-column AI mentor: quick prompts, a simple conversation, and a message composer. Personal course details are tucked into an optional disclosure; the weekly plan still works.
- Replaced the review empty state with a compact SVG mark, one clear next action, and a light explanatory disclosure. Kept the same spaced-repetition data and review controls.
- Removed redundant sidebar AI promotion and made AI Mentor available in mobile bottom navigation; settings remain accessible via the top-right avatar.
- Added a small pastel-based design system in `public/minimal.css`, accessible focus indicators, and reduced-motion support.

## Easay 5.6 — optional guided walkthrough and visual focus

- A **15-step guided tour** highlights one real control at a time. It walks through Home, Courses, Course overview, Lesson, Review, Speaking Practice, AI Mentor and Settings. Each step positions its explanation next to the focused control and navigates to the correct screen.
- Next / Back / Skip, Escape, keyboard arrows and mobile layouts are supported. It runs once after onboarding (or after upgrade), excluding invitation deep links. Restart via Settings.
- Tour completion uses a separate localStorage flag `easay:tour:v1`; the tour never changes saved learner progress or sends AI requests.
- `public/tour.css` boosts the single primary action per screen with restrained contrast and supports reduced-motion preferences.

## Easay 5.7 — support and SkyKids in onboarding tour

- The penultimate guided-tour step spotlights the **existing donation card in the app footer** after navigating to Settings and scrolling the card into view.
- The tooltip explains that Easay is free, support is voluntary, and **50% of donations** are directed to meals and development for children in the SkyKids children's club and teen center.
- The final step returns to the main Continue Learning button. No donation click, payment or outbound navigation is triggered by the tour.
- Offline cache advanced to v5.7; the spotlight step is covered by automated tests.

## Easay 5.8 — extended learning and spaced revision

- Original 12 lessons per course remain unchanged and keep the same IDs and completion data.
- Each of 11 tracks now has 24 authored lessons, totaling 264 lessons and 1,056 learning phrase cards.
- The lesson flow adds 4 end-of-lesson flashcards after the dialogue and before the 3-question quiz.
- A full-course 96-card optional revision deck appears before the final 40-question exam, which is drawn from all 24 lessons (2.5 points per question; 90+/100 required for the internal Easay certificate).
- A returning learner who completed any lessons receives a two-choice welcome popup once per browser session: Skip or Go to Review.
- The existing storage key is preserved to retain earlier progress. The certificate is based on a server-graded Easay assessment, not an accredited academic qualification.
