# SVG Template Editor

A Next.js App Router SVG editor with image placeholder replacement, undo/redo, and Google Drive Picker support.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/editor/default`.

## Google Drive Picker setup

1. Create a Google Cloud project.
2. Enable both APIs:
- Google Picker API
- Google Drive API
3. Create an OAuth Client ID (`Web application`) and set authorized JavaScript origins (for example `http://localhost:3000` and your production domain).
4. Create an API key (restrict it to the above APIs if possible).
5. Add these environment variables in `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_API_KEY=...
NEXT_PUBLIC_GOOGLE_APP_ID=...
```

`NEXT_PUBLIC_GOOGLE_APP_ID` is your Google Cloud project number used by Picker.

6. Drive Picker sign-in scope used by this app:
- `https://www.googleapis.com/auth/drive.readonly`

## Usage

- Click an SVG element/group with id prefix `img:` to select an image placeholder.
- In `Assets`, use:
- `Upload from Computer`, or
- `Choose from Google Drive`
- Picked files are downloaded from Drive and embedded as `data:` URLs. The app never hotlinks Drive URLs inside the SVG.

If no `img:*` placeholder is selected and you choose an SVG file, the app imports it as the current canvas.
If no placeholder is selected and you choose PNG/JPG, the app shows `Select an image placeholder first.`.

## Notes

- Tokens are kept in memory only and are not stored in `localStorage`.
- SVG display is sanitized with DOMPurify.
- Image replacement supports:
- direct `<image>` nodes
- Figma-style pattern fills in `<defs>` referenced via `url(#patternId)`
