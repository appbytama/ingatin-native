# Dev notes

## Running the dev server when your PC and phone are on different networks

If you're developing on a machine you're remoting into (e.g. an office PC
via remote desktop) and testing on a phone that's on a completely
different network, `npx expo start --tunnel` will NOT work out of the box
on Windows — `@expo/ngrok-bin-win32-x64`'s postinstall fails to download
the actual `ngrok.exe` binary (at least on this network), so `--tunnel`
throws `TypeError [ERR_INVALID_ARG_TYPE]: The "file" argument must be of
type string. Received null`.

Workaround — run ngrok manually instead of through Expo's wrapper:

1. Install the standalone ngrok CLI (`winget install ngrok.ngrok`), sign
   up free at ngrok.com, and run `ngrok config add-authtoken <token>`
   once.
2. Start Metro with `EXPO_PACKAGER_PROXY_URL` set to the tunnel URL you're
   about to create — this tells Metro what external URL to bake into the
   manifest/bundle URLs it returns, since otherwise it blindly appends
   its own local port (8081) to whatever hostname it sees, which breaks
   once that hostname is actually ngrok's https (443) endpoint:
   ```powershell
   $env:EXPO_PACKAGER_PROXY_URL="https://<your-ngrok-subdomain>.ngrok-free.dev"
   npx expo start
   ```
   (You have to know the ngrok subdomain before starting ngrok itself —
   ngrok free-tier subdomains are random per run, so start ngrok first,
   see step 3, note the URL, then restart Metro with that URL set. Or
   pay for a reserved ngrok domain to make this stable across restarts.)
3. In another terminal: `ngrok http 8081`
4. On the phone: open Safari, go to `exp://<your-ngrok-subdomain>.ngrok-free.dev`
   (swap `https://` for `exp://`) — this deep-links straight into Expo Go
   regardless of what the Expo Go app's own UI looks like that version
   (its "enter URL manually" affordance has moved around across recent
   Expo Go redesigns).

Once on the same network as your phone (e.g. testing from home), none of
this is needed — plain `npx expo start` and scanning the LAN QR code
works normally.

## Google OAuth setup (one-time, in the dashboards)

Email/password auth needs no extra config. Google sign-in
([lib/googleAuth.ts](lib/googleAuth.ts)) does:

1. Google Cloud Console — create an OAuth 2.0 Client ID (Web application
   type, since Supabase's server does the token exchange, not the app
   directly). Add authorized redirect URI:
   `https://alwroeyefndwwykyxhsh.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → Google — paste that
   Client ID/Secret, enable the provider.
3. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
   — add the app's own callback so Supabase allows redirecting back into
   it after Google. `AuthSession.makeRedirectUri()` builds this
   differently per environment:
   - Dev client / standalone build: `ingatin://google-auth` (the `scheme`
     in [app.json](app.json)) — stable, add it once.
   - **Expo Go**: `exp://<current-IP-or-tunnel-host>:8081/--/google-auth`
     — changes every time the LAN IP or ngrok subdomain changes, since
     Expo Go itself owns the redirect host, not the app's scheme. Add a
     wildcard entry (`exp://**`) to Supabase's redirect allow-list for
     dev, or expect to update this URL each session. This is a dev-only
     workaround — do not ship a build relying on `exp://**`.

Same random-subdomain caveat as the tunnel section above applies here: if
testing over ngrok, the Google Cloud redirect URI stays the Supabase one
(step 1) and doesn't change, but Supabase's own allow-list needs the
`exp://**` wildcard (or the exact tunnel host) covered by step 3.
