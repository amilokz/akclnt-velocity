# AKCLNT VELOCITY — VX-1 Aero

A cinematic 3D shoe-store demo by **AKCLNT Studio** (Rawalpindi, Pakistan).
Scroll to pull the VX-1 Aero racing shoe apart layer by layer, switch its
colourways live on the 3D model, watch the drop countdown, and shop the
collection. Built with three.js on the AKCLNT Studio engine core.

**The live demo is frontend-only** (by design): the shop runs on a built-in
catalogue with demo checkout, and the admin panel shows a demo-mode notice.
The full Express backend is included in `backend/` for code showcase / local
runs — it is not hosted.

## Run it

Frontend (Vite):

```bash
npm install
npm run dev      # http://localhost:5190
npm run build    # production build → dist/
```

Backend (optional, local only):

```bash
cd backend
cp .env.example .env   # set PORT, JWT_SECRET, ADMIN credentials
npm install
npm start              # http://localhost:5000
```

Then set `USE_BACKEND = true` in `shop.js` to talk to it.

## The shoe model

The hero shoe starts life as Shopify's "Materials Variants Shoe" sample
(CC BY 4.0). AKCLNT Studio split its single mesh into four layers —
Outsole / Midsole / Upper / Collar & Laces — so the scroll choreography can
explode it along the stack, and wired its three diffuse variants (Midnight /
Beach / Street) to the colourway switcher.

## Credits

- three.js and the open-source ecosystem around it
- "Materials Variants Shoe" © Shopify, Inc., CC BY 4.0
- Product photography: AI-generated for AKCLNT Studio

© 2026 AKCLNT Studio — demo project.
