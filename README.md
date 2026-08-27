# Hardcore Respawn

A local-only web tool for resetting a single dead player's saved data in a modded
Minecraft Java world (CurseForge / Essential mod instances included).

It looks up a player's UUID via Minecraft's public profile service, finds that
player's `<uuid>.dat` / `<uuid>.dat_old` files inside your world's
`playerdata` (or `players/data`) folder, and produces a ZIP containing:

- `RESET/`: a copy of that folder with the selected player's files removed
- `BACKUP/`: untouched copies of exactly the files that were removed

Your world folder is **never uploaded**. Everything is read and processed in
your browser. The only network request made is sending the username you type
to [playerdb.co](https://playerdb.co) (a CORS-friendly public wrapper around
Mojang's username → UUID lookup, since Mojang's own API can't be called
directly from a browser).

## Running it

This project needs [Node.js](https://nodejs.org/) (18+) installed. It wasn't
available in the environment this was built in, so it hasn't been installed
or type-checked yet. From this folder:

```sh
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

To build a static production bundle you can host anywhere (or just open
locally):

```sh
npm run build
npm run preview
```

## How matching works

- You select your world's save folder (or the `playerdata` /
  `players/data` folder directly). The app scans the folder tree for either
  layout, since vanilla Minecraft actually uses `playerdata/` with no
  `players` parent folder, so both are supported.
- Only the player-data directory's files are ever read into memory. Region
  files, chunks, etc. are enumerated (for the file picker) but never opened.
- The UUID returned by the lookup is the only thing used to decide which
  files to touch; a malformed UUID is rejected before any matching happens.

## Deleting vs. replacing

The app's own output distinguishes two ways to apply the result, explained
again in the app itself once you're done:

1. **Delete the two named files directly** from your real world's player-data
   folder. This is the safest option, and unaffected by anything that's
   happened in the world since you exported it.
2. **Replace the whole player-data folder** with `RESET/`'s copy. This is
   only safe if nobody has played (and generated new/updated player files)
   since you exported the world, since it fully overwrites the folder.
