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

    // Récupération de la clé API (soit envoyée par le client, soit en variable d'environnement)
    const userApiKey = request.headers.get("x-hf-api-key");
    const apiKey = (userApiKey || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "").trim();
    const base64Audio = Buffer.from(audioData).toString('base64');

    // 1. Si la clé est une clé OpenAI (sk-...) -> Utilisation de OpenAI Whisper + Perfectionnement ChatGPT (GPT-4o-mini)
    if (apiKey.startsWith("sk-")) {
      try {
        const formData = new FormData();
        const blob = new Blob([audioData], { type: 'audio/wav' });
        formData.append('file', blob, 'audio.wav');
        formData.append('model', 'whisper-1');
        formData.append('language', 'mg');
        formData.append('prompt', "Transcription audio amin'ny teny malagasy madio sy mazava:");

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`
          },
          body: formData
        });

        if (whisperRes.ok) {
          const wData = await whisperRes.json();
          let text = wData.text || "";

          // Perfectionnement via GPT-4o-mini pour restituer du vrai malgache naturel
          try {
            const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: "Ianao dia mpanitsy teny malagasy. Correct and polish the following raw audio transcription into clean, natural, human-written Malagasy text (e.g. 'Zay mampatonga anah rehefa pro...'). Keep the exact original meaning and spoken Malagasy words. Do NOT translate to French. Output ONLY the polished Malagasy text."
                  },
                  {
                    role: "user",
                    content: text
                  }
                ],
                temperature: 0.2
              })
            });

            if (gptRes.ok) {
              const gData = await gptRes.json();
              if (gData.choices && gData.choices[0] && gData.choices[0].message) {
                text = gData.choices[0].message.content.trim();
              }
            }
          } catch (e) {
            console.warn("GPT polish warning:", e);
          }

          return NextResponse.json({ text });
        }
      } catch (err) {
        console.warn("OpenAI API error, fallback to HF:", err);
      }
    }

    // 2. Si la clé est une clé Groq (gsk_...) -> Groq Whisper + Llama 3.3 70B
    if (apiKey.startsWith("gsk_")) {
      try {
        const formData = new FormData();
        const blob = new Blob([audioData], { type: 'audio/wav' });
        formData.append('file', blob, 'audio.wav');
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'mg');

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`
          },
          body: formData
        });

        if (groqRes.ok) {
          const gData = await groqRes.json();
          let text = gData.text || "";

          try {
            const llmRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  {
                    role: "system",
                    content: "Ianao dia mpanitsy teny malagasy. Correct and polish the following raw audio transcription into clean, natural, human-written Malagasy text (e.g. 'Zay mampatonga anah rehefa pro...'). Keep the exact original meaning and spoken Malagasy words. Do NOT translate to French. Output ONLY the polished Malagasy text."
                  },
                  {
                    role: "user",
                    content: text
                  }
                ],
                temperature: 0.2
              })
            });

            if (llmRes.ok) {
              const lData = await llmRes.json();
              if (lData.choices && lData.choices[0] && lData.choices[0].message) {
                text = lData.choices[0].message.content.trim();
              }
            }
          } catch (e) {
            console.warn("Groq LLM polish warning:", e);
          }

          return NextResponse.json({ text });
        }
      } catch (err) {
        console.warn("Groq API error, fallback to HF:", err);
      }
    }

    // 3. Fallback Hugging Face Router
    let lastError = null;

    for (const endpoint of HUGGINGFACE_ENDPOINTS) {
      try {
        const authHeaders = (apiKey && apiKey.startsWith("hf_")) ? { "Authorization": `Bearer ${apiKey}` } : {};

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
            { error: "Le modèle IA est en cours de chargement. Nouvelle tentative automatique..." },
            { status: 503 }
          );
        }

        if (response.status === 401) {
          return NextResponse.json(
            { error: "Accès non autorisé (Statut 401). Une clé API valide (OpenAI sk-..., Groq gsk_... ou Hugging Face hf_...) est requise." },
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



