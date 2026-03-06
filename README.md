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

## Run

```bash
node extract-resume.js ./resume.pdf
```

Or with npm script:

```bash
npm run extract -- ./resume.pdf
```

## Notes

- Default model: `meta-llama/llama-3.1-8b-instruct:free`.
- You can override with `OPENROUTER_MODEL` in `.env`.
- The script returns normalized JSON even if the model responds with extra text.
