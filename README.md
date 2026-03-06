# Resume Skill Extractor (Node.js)

This script reads a PDF resume and extracts structured details using a free LLM model through OpenRouter.

## Output format

```json
{
  "name": "Hardik",
  "skills": ["React Native", "Laravel", "Supabase", "Node.js"],
  "experience": 5,
  "roles": ["Full Stack Developer"],
  "keywords": ["mobile developer", "react native developer"]
}
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and add your API key:
   ```bash
   cp .env.example .env
   ```
3. Set `OPENROUTER_API_KEY` in `.env`.
4. (Optional) Set `OPENROUTER_MODEL` to force a specific model ID.

## Run

```bash
node extract-resume.js ./resume.pdf
```

Or with npm script:

```bash
npm run extract -- ./resume.pdf
```

## Faster model selection (reduced response time)

- The script now fetches available free models first and only tries a **small bounded list**.
- Default max attempts is 3 models (`MAX_MODEL_ATTEMPTS=3`).
- Each model call has a timeout (`MODEL_TIMEOUT_MS=15000`) so a slow model won't block too long.

You can tune in `.env`:

```bash
MAX_MODEL_ATTEMPTS=2
MODEL_TIMEOUT_MS=10000
```

## Model selection behavior

- If `OPENROUTER_MODEL` is set, the script tries it first.
- Then it prioritizes known fallback free models that are currently available.
- Then it tries other discovered `:free` models, up to `MAX_MODEL_ATTEMPTS` total.

## Notes

- Example fallback free models included in script:
  - `meta-llama/llama-3.3-8b-instruct:free`
  - `qwen/qwen-2.5-7b-instruct:free`
  - `mistralai/mistral-7b-instruct:free`
- The script returns normalized JSON even if the model responds with extra text.
