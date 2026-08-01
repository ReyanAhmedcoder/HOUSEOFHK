# Houseofhk

A polished one-page storefront for Houseofhk with a product catalog, COD order flow, and admin management UI.

## Deployment on Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Vercel will serve the static files automatically.

## Shared product syncing across devices

To make admin add/remove actions appear on every device, fill in the Firebase settings in firebase-config.js and enable Realtime Database rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

If Firebase is not configured yet, the site will continue to use browser local storage as a fallback.

## Files
- index.html — main page structure
- styles.css — visual design and responsive layout
- script.js — catalog, filters, order modal, and admin actions
- vercel.json — Vercel static deployment config
