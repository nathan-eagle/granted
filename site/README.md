Granted Marketing Site (Next.js on Vercel)

Overview
- App Router Next.js marketing site for grantedai.com under `site/`.
- MDX-based blog in `content/blog` using App Router + next-mdx-remote.
- Contact form posts to `/api/contact` and relays via Resend to `info@grantedai.com`.

Local Dev
1) Use Node >= 18.18.
2) `npm install`
3) `npm run dev`

Environment
Copy `.env.example` to `.env.local` and set:
- `RESEND_API_KEY`: API key from Resend (for contact email).
- `CONTACT_TO_EMAIL`: Defaults to `info@grantedai.com` if omitted.
- `CONTACT_FROM_EMAIL`: Verified Resend sender (e.g. `contact@grantedai.com`).

Blog Content
- Add MDX files to `content/blog/*.mdx` with frontmatter: `title`, `description`, `date`.
- Slug = filename. Example: `content/blog/the-perfect-project-pitch.mdx` => `/blog/the-perfect-project-pitch`.

SEO
- `app/sitemap.ts` auto-includes static pages and MDX posts.
- `app/robots.ts` points crawlers to `/sitemap.xml`.

Vercel Setup
- Project root: `site/`.
- Build command: `next build`.
- Add env vars above to Vercel Environment (Production + Preview).
- Domains: set `grantedai.com` -> this project.
- For product app (in `web/`), deploy as separate Vercel project and point `app.grantedai.com` to it.

Notes
- If the Vercel URL shows 404, set Project Settings → Root Directory to `site/` and redeploy.
