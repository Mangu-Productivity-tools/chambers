# Chambers studio

The running product in this repo.

## Flow

1. **Start** — paste a resume, upload `.txt`, or load Avery / Maya.
2. **Studio** — edit identity, roles, bullets; pick a sheet; print / PDF.
3. **Tailor** — paste a posting. Local tailor applies immediately. Compare Tailored / Original.
4. **Letter** — generate from the same facts. Print beside the sheet.
5. **Tools** — ATS score, bullet rewrite, summary, keyword extract.

## Templates

| Id | Look | ATS |
|---|---|---|
| `letter` | House default, vermilion labels | high |
| `compact` | Dense single column | high |
| `executive` | Night header | medium |
| `editorial` | Serif name on cream | high |
| `sidebar` | Cream rail | medium |
| `classic` | Centered, double rule | high |

## Persistence

Zustand + `localStorage` key `chambers-studio`. Debounced 400ms on typing. Structural writes (template, tailor, reset, letter) flush immediately.

## AI

Not shipped. `src/lib/ai/resume-ai.ts` holds server functions that call xAI (`grok-4.5`) when `XAI_API_KEY` is set, but every call site is gated by `VITE_ASSIST_ENABLED` (`src/lib/ai/assist-flag.ts`), which is off by default and unset in production. With the flag off, only the local paths run:

- `parseResumeText`
- `tailorLocal`
- `writeLetterLocal`
- `writeSummaryLocal`
- `localVariants`

Do not enable the flag before the Band C Assist engine ships. Never put an API key in a `VITE_` variable.
