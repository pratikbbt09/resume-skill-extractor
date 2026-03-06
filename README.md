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

## Model selection behavior

- If `OPENROUTER_MODEL` is set, the script tries it first.
- If that fails with "No endpoints found" / `404`, the script automatically retries with other free models.
- The script also queries OpenRouter model list and includes any currently available `:free` models as fallback options.

## Notes

- Example fallback free models included in script:
  - `meta-llama/llama-3.3-8b-instruct:free`
  - `qwen/qwen-2.5-7b-instruct:free`
  - `mistralai/mistral-7b-instruct:free`
- You can override with `OPENROUTER_MODEL` in `.env`.
- The script returns normalized JSON even if the model responds with extra text.
