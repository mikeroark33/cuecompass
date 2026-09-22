# CueCompass Live v1

This is the first CueCompass build wired to the live Supabase project.

## What works
- Supabase email/password sign-in
- Reads published tournaments from the live `tournaments` table
- Reads venue information from `venues`
- Recognizes Player / TD / Both profile roles
- Tournament Director posting form
- City/state/ZIP/name and game filtering
- Installable-web-app manifest

## Important limitation
Radius search is not active yet because venue geographic coordinates are not populated. The next backend step is geocoding addresses and saving PostGIS `location` values.

## Running it
Because this app uses JavaScript modules, don't open index.html directly from the Files app. It needs to be served by a web host or local web server.

For a quick desktop test:
`python3 -m http.server 8080`
then open `http://localhost:8080`.

For iPhone use, deploy this folder to a static host. Once hosted, Safari can use **Share → Add to Home Screen**.

## Security
Only the Supabase publishable client key is included. Never add a Supabase secret/service-role key or database password to these files.
