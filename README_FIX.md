Royal Square frontend encoding + stale service-worker fix

This patch does two things:
1. Repairs common mojibake sequences in the current frontend source.
2. Replaces the emergency service worker with v4, which caches only the emergency page/resources and no longer intercepts or caches the main React/Vite app.

After extracting to the project root, run:

python .\scripts\repair_frontend_encoding.py
cd .\frontend
npm run build

Then clear the OLD service worker once in the browser:
DevTools > Application > Service Workers > Unregister
DevTools > Application > Storage > Clear site data
Close the tab, run npm run dev, and reopen the Vite URL.
