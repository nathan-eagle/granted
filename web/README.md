Granted (Next.js + Prisma)

Local development
- Copy `.env.example` to `.env.local` and fill values.
- `nvm use 20`
- `npm install`
- `npx prisma migrate dev`
- `npm run dev`

Deploy notes
- Root directory is `web/`.
- Install: `npm ci`
- Build: `npm run build`
- Output: `.next`

