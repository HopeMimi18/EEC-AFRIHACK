# Royal Square Bonus Feature — Offline Emergency Access

## What it adds
- Public **Emergency Access** entry point on the role landing page.
- Public **Emergency Access** link on both client and adviser sign-in screens.
- No authentication or backend API call is required.
- Standalone `/emergency.html` page with:
  - 112 — General Emergency (mobile)
  - 10111 — Police Emergency
  - 10177 — Ambulance
  - 0861 000 234 — AA South Africa Roadside Assistance / Towing (membership or service terms may apply)
  - Optional personal ICE contact stored only in browser localStorage.
- Service worker caches the emergency page for offline use.
- In production, the service worker also attempts to cache the built Vite app shell.
- Web app manifest includes an Emergency Access shortcut.

## Important prototype behavior
The emergency page is offline-capable after the service worker has installed successfully at least once. Phone calls still depend on the user's device and available telephone/mobile service.

## Apply
1. Extract this ZIP into the project root:
   `C:\Users\hopel\Music\EEC-AFRIHACK`
2. From the project root run:
   `powershell -ExecutionPolicy Bypass -File .\scripts\APPLY_BONUS_EMERGENCY_FEATURE.ps1`
3. Build:
   `cd .\frontend`
   `npm run build`

## Test normal public access
`npm run dev`
Open the Vite URL and verify Emergency Access is visible before login.

## Test true offline behavior
Service workers are registered by the React app in production mode. Build and preview:

`npm run build`
`npm run preview`

Open the preview URL once while online, open Emergency Access once, then use browser DevTools Network > Offline and reload `/emergency.html`.

## Security / privacy
- No login required.
- No client FNA data is exposed.
- No emergency data is sent to the backend.
- Optional ICE contact is stored on the device only.
- The page does not send location or automatically contact emergency services.

## Tow / roadside line
The bonus screen includes the Automobile Association of South Africa (AA) roadside assistance contact:
`0861 000 234`.

It is labelled as roadside assistance/towing rather than a universal public emergency number.
Membership, eligibility, towing benefits, and service charges may apply.

The service-worker cache was bumped to `royal-square-emergency-v2` so the updated offline page can replace the earlier cached version.

## UI cleanup
The visible Online / Offline status badge was removed from the emergency screen.
Offline caching still works; only the network-status indicator was removed.
The service-worker cache was bumped to `royal-square-emergency-v3`.
