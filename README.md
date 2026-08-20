# Constitutional Law Case Prep (frontend)

**Author:** Tobi Bamisaye

Vite + React workspace for YUMC / AMCA prep: read cases, take notes, build arguments. Visual language follows the Bronner case guide (paper/ink, Newsreader + Bricolage).

Backend: [Constitutional-Law-Case-Prep-AI](https://github.com/tbamisaye1/Constitutional-Law-Case-Prep-AI).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to FastAPI on port 8000.

## Deploy

Connect the repo to Vercel. Set `VITE_API_BASE` to your backend URL when the API is hosted.

## Structure

```
src/
  api/           fetch helpers
  components/    TipTap NoteEditor, cmdk CommandPalette, CaseCard, GroundingBadge
  components/ui/ Radix wrappers (Tabs)
  data/          seed matter / cases / nav
  hooks/         local notes persistence
  layout/        Shell, TopBar, SideRail
  pages/         interactive rooms (facts, library, notes, arguments, …)
  styles/        tokens + layout CSS
```

UI libraries: [TipTap](https://github.com/ueberdosis/tiptap), [cmdk](https://github.com/pacocoursey/cmdk), [Radix](https://github.com/radix-ui/primitives), [Lucide](https://github.com/lucide-icons/lucide).
