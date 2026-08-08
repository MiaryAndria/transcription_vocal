import { NextResponse } from 'next/server';

export const maxDuration = 60; // 60 seconds max execution on Vercel

const HUGGINGFACE_ENDPOINTS = [
  "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
  "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo",
  "https://router.huggingface.co/hf-inference/models/openai/whisper-medium",
];

function cleanRepetitiveText(text) {
  if (!text) return '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  const cleaned = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].toLowerCase() === trimmed.toLowerCase()) {
      continue;
    }
    cleaned.push(trimmed);
  }
  return cleaned.join(' ');
}

export async function POST(request) {
  try {
    const audioData = await request.arrayBuffer();
    
    if (!audioData || audioData.byteLength === 0) {
      return NextResponse.json({ error: "Aucun fichier audio reçu" }, { status: 400 });
    }

    // Récupération de la clé API (envoyée dans les en-têtes ou variable d'environnement)
    const userApiKey = request.headers.get("x-hf-api-key");
    const apiKey = (userApiKey || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "").trim();
    const base64Audio = Buffer.from(audioData).toString('base64');

    let lastError = null;

    // Tentative sur les endpoints d'inférence Hugging Face avec forçage de la langue malgache
    for (const endpoint of HUGGINGFACE_ENDPOINTS) {
      try {
        const authHeaders = apiKey ? { "Authorization": `Bearer ${apiKey}` } : {};

        // Tentative 1 : Payload JSON avec paramètre de langue malgache et anti-répétition
        let response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
            ...authHeaders,
          },
          body: JSON.stringify({
            inputs: base64Audio,
            parameters: {
              generate_kwargs: {
                language: "malagasy",
                task: "transcribe",
                no_repeat_ngram_size: 3
              }
            }
          }),
        });

        // Tentative 2 : Fallback binaire brut si le JSON échoue
        if (!response.ok && response.status !== 401 && response.status !== 503) {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "audio/wav",
              "x-wait-for-model": "true",
              ...authHeaders,
            },
            body: audioData,
          });
        }

        if (response.ok) {
          const result = await response.json();
          let text = "";
          if (typeof result === 'string') {
            text = result;
          } else if (result && result.text) {
            text = result.text;
          } else if (Array.isArray(result) && result[0] && result[0].text) {
            text = result[0].text;
          } else if (result && result.chunks) {
            text = result.chunks.map(c => c.text).join(' ');
          }
          return NextResponse.json({ text: cleanRepetitiveText(text) });
        }

        if (response.status === 503) {
          return NextResponse.json(
            { error: "Le modèle IA est en cours de chargement sur Hugging Face. Nouvelle tentative automatique..." },
            { status: 503 }
          );
        }

        if (response.status === 401) {
          return NextResponse.json(
            { error: "Accès non autorisé (Statut 401). Une clé API Hugging Face (hf_...) est requise. Veuillez renseigner votre Token gratuit dans l'option 'Clé API Hugging Face' en haut de la page." },
            { status: 401 }
          );
        }

        const errText = await response.text();
        lastError = `Statut ${response.status}: ${errText.substring(0, 150)}`;
      } catch (e) {
        lastError = e.message;
      }
    }

    return NextResponse.json(
      { error: `Erreur API de transcription (${lastError})` },
      { status: 500 }
    );
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


