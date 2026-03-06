#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const FALLBACK_FREE_MODELS = [
  'meta-llama/llama-3.3-8b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'mistralai/mistral-7b-instruct:free'
];

async function extractPdfText(pdfPath) {
  const absolutePath = path.resolve(pdfPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`PDF file not found: ${absolutePath}`);
  }

  const dataBuffer = fs.readFileSync(absolutePath);
  const parsed = await pdfParse(dataBuffer);

  if (!parsed.text || !parsed.text.trim()) {
    throw new Error('No readable text found in the PDF file.');
  }

  return parsed.text.trim();
}

function sanitizeJson(text) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1).trim();
  }

  return candidate.trim();
}

function normalizeOutput(result) {
  return {
    name: typeof result.name === 'string' ? result.name : '',
    skills: Array.isArray(result.skills) ? result.skills.filter(Boolean) : [],
    experience: Number.isFinite(Number(result.experience)) ? Number(result.experience) : 0,
    roles: Array.isArray(result.roles) ? result.roles.filter(Boolean) : [],
    keywords: Array.isArray(result.keywords) ? result.keywords.filter(Boolean) : []
  };
}

async function fetchAvailableFreeModels() {
  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const models = Array.isArray(payload?.data) ? payload.data : [];

  const freeModels = models
    .filter((model) => model?.id?.endsWith(':free'))
    .map((model) => model.id);

  // console.log("[Free available Models]: ", freeModels);

  return freeModels;
}

function buildModelCandidates(discoveredFreeModels) {
  const candidates = [];

  if (OPENROUTER_MODEL) {
    candidates.push(OPENROUTER_MODEL);
  }

  candidates.push(...FALLBACK_FREE_MODELS);
  candidates.push(...discoveredFreeModels);

  return [...new Set(candidates.filter(Boolean))];
}

async function requestExtraction(model, prompt) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://localhost',
      'X-Title': 'resume-skill-extractor'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Return strict JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    const error = new Error(`LLM API request failed for model '${model}' (${response.status}): ${errBody}`);
    error.status = response.status;
    throw error;
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`LLM API returned an empty response for model '${model}'.`);
  }

  const jsonText = sanitizeJson(content);
  const parsed = JSON.parse(jsonText);

  return normalizeOutput(parsed);
}

function isRetryableModelError(error) {
  if (!error || typeof error.status !== 'number') {
    return false;
  }

  return error.status === 404 || error.status === 429;
}

async function extractResumeDetailsWithLlm(resumeText) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY in environment variables.');
  }

  const prompt = `You are an information extraction assistant.
Extract details from the resume text and return ONLY valid JSON with this exact schema:
{
  "name": "",
  "skills": [""],
  "experience": 0,
  "roles": [""],
  "keywords": [""]
}

Rules:
- name: candidate full name.
- skills: technical skills only.
- experience: total years of professional experience as a number.
- roles: job titles/roles from work history.
- keywords: short recruiter-relevant keyword phrases.
- If unknown, use empty string/empty array/0.
- Do not include explanations.

Resume text:
"""
${resumeText.slice(0, 35000)}
"""`;

  const discoveredFreeModels = await fetchAvailableFreeModels();
  const modelCandidates = buildModelCandidates(discoveredFreeModels);

  if (modelCandidates.length === 0) {
    throw new Error('No free models available. Set OPENROUTER_MODEL in .env to a working model id.');
  }

  const errors = [];

  for (const model of modelCandidates) {
    try {
      const res = await requestExtraction(model, prompt);
      // console.log("[Model name]: ", model)
      return res;
    } catch (error) {
      errors.push(error.message);

      if (!isRetryableModelError(error)) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to process with available models. Tried: ${modelCandidates.join(', ')}. Errors: ${errors.join(' | ')}`
  );
}

async function main() {
  const pdfPath = process.argv[2];

  if (!pdfPath) {
    console.error('Usage: node extract-resume.js <path-to-resume.pdf>');
    process.exit(1);
  }

  try {
    const resumeText = await extractPdfText(pdfPath);
    const extracted = await extractResumeDetailsWithLlm(resumeText);
    console.log(JSON.stringify(extracted, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
