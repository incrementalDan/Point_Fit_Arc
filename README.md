# Circle Fit (IN ⇄ MM)

A tiny static web app for least‑squares **circle fitting** with an **IN/MM** toggle inspired by the Apple Calculator style.

- **4 decimals** when units = inches, **3 decimals** when units = mm.
- Values are **interpreted** in the currently active unit (no auto‑rescale on toggle).
- CSV **import/export**.
- Canvas preview with fitted circle, center marker, and RMSE.

## Quick start (GitHub Pages)

1. Create a new repo, e.g. `circle-fit`.
2. Add these files to the repo root.
3. Enable **Settings → Pages → Source: Deploy from a branch**, pick `main` and `/ (root)`.
4. Open the Pages URL (usually `https://<user>.github.io/circle-fit/`).

## Files

- `index.html` — page shell (you can replace with your own).
- `style.css` — Apple‑style dark theme + IN/MM slider.
- `app.js` — logic (Pratt/Taubin algebraic fit, CSV import/export, canvas preview).
- `assets/logo.svg` — simple logo + favicon.
- `LICENSE` — MIT.

## Notes

- The IN/MM toggle changes formatting precision and the column labels. It **does not** convert existing numbers — this matches your “interpret as entered” workflow.
- The fitting routine is the classic stabilized algebraic method (fast and robust for most shop data). If you want a geometric least‑squares (Gauss‑Newton) refinement later, we can add an optional pass.

MIT © 2025
