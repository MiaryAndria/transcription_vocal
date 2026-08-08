import { NextResponse } from 'next/server';

export const maxDuration = 60; // 60 seconds max execution on Vercel

const HUGGINGFACE_ENDPOINTS = [
  "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
  "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo",
  "https://router.huggingface.co/hf-inference/v1/audio/transcriptions",
];

export async function POST(request) {
  try {
    const audioData = await request.arrayBuffer();
    
    if (!audioData || audioData.byteLength === 0) {
      return NextResponse.json({ error: "Aucun fichier audio reçu" }, { status: 400 });
    }

    let lastError = null;

    // Try endpoints with auto-fallback
    for (const endpoint of HUGGINGFACE_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "audio/wav",
            "x-wait-for-model": "true",
          },
          body: audioData,
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.text || (result.chunks ? result.chunks.map(c => c.text).join(' ') : "");
          return NextResponse.json({ text: text || "" });
        }

        if (response.status === 503) {
          // Model is loading
          return NextResponse.json(
            { error: "Le modèle IA est en cours de chargement sur le serveur. Réessai automatique dans 5 secondes..." },
            { status: 503 }
          );
        }

        const errText = await response.text();
        lastError = `Statut ${response.status}: ${errText}`;
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
