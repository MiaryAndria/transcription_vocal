import { NextResponse } from 'next/server';

export const maxDuration = 60; // 60 seconds max execution on Vercel

const HUGGINGFACE_ENDPOINTS = [
  "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo",
  "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
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

    const clientKey = (request.headers.get("x-hf-api-key") || "").trim();

    // Clés spécifiques par service (client ou variables d'environnement Vercel)
    const openaiKey = clientKey.startsWith("sk-") ? clientKey : (process.env.OPENAI_API_KEY || "").trim();
    const groqKey = clientKey.startsWith("gsk_") ? clientKey : (process.env.GROQ_API_KEY || "").trim();
    const hfKey = clientKey.startsWith("hf_") ? clientKey : (process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "").trim();

    // Si aucune clé n'est disponible, renvoyer un message clair immédiatement
    if (!openaiKey && !groqKey && !hfKey) {
      return NextResponse.json(
        { error: "Aucune clé API configurée. Ajoutez OPENAI_API_KEY, GROQ_API_KEY ou HUGGINGFACE_API_KEY sur Vercel." },
        { status: 401 }
      );
    }

    const base64Audio = Buffer.from(audioData).toString('base64');

    // 1. Essai avec OpenAI (Priorité absolue pour qualité 99% + Pipeline 3 étapes ChatGPT)
    if (openaiKey) {
      for (let attempt = 1; attempt <= 3; attempt++) {
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
              "Authorization": `Bearer ${openaiKey}`
            },
            body: formData
          });

          if (whisperRes.ok) {
            const wData = await whisperRes.json();
            let rawText = (wData.text || "").trim();

            if (!rawText) {
              return NextResponse.json({ text: "" });
            }

            // Pipeline à 3 étapes recommandé :
            // 🎙️ Audio malgache -> 📝 Raw malgache -> 🇫🇷 Traduction de compréhension en français -> 🇲🇬 Rédaction en VRAI malgache naturel
            try {
              const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${openaiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [
                    {
                      role: "system",
                      content: `Ianao dia mpanitsy teny malagasy sy mpandika teny matihanina.
Étape 1 : Analyse le sens exact de cette transcription audio malgache brute.
Étape 2 : Traduis-la mentalement en français naturel pour bien comprendre le contexte et toutes les phrases.
Étape 3 : Rédige le texte final en VRAI MALGACHE ÉCRIT, naturel, fluide et idiomatique (par exemple : 'Zay mampatonga anah rehefa pro iny ahantoko aloha...').
Règles strictes :
- Garde 100% du sens et des mots d'origine du vocal.
- Ne traduis PAS le résultat final en français, retourne UNIQUEMENT le texte final rédigé en malgache naturel.
- Corrige l'orthographe phonétique et supprime les hésitations/répétitions inutiles.`
                    },
                    {
                      role: "user",
                      content: rawText
                    }
                  ],
                  temperature: 0.2
                })
              });

              if (gptRes.ok) {
                const gData = await gptRes.json();
                if (gData.choices && gData.choices[0] && gData.choices[0].message) {
                  const polishedText = gData.choices[0].message.content.trim();
                  if (polishedText) {
                    return NextResponse.json({ text: polishedText });
                  }
                }
              }
            } catch (e) {
              console.warn("GPT polish warning:", e);
            }

            return NextResponse.json({ text: rawText });
          } else {
            const errText = await whisperRes.text();
            console.warn(`OpenAI Whisper tentative ${attempt} non OK (${whisperRes.status}):`, errText);
            
            if (errText.includes("insufficient_quota") || errText.includes("credit_balance_exhausted") || errText.includes("no credits remaining")) {
              return NextResponse.json(
                { error: "Votre solde de compte OpenAI est épuisé ($0 de crédit restant). Veuillez ajouter des crédits sur platform.openai.com/settings/organization/billing ou utiliser une clé gratuite Groq (gsk_...)." },
                { status: 402 }
              );
            }

            if (whisperRes.status === 429 || whisperRes.status >= 500) {
              await new Promise((r) => setTimeout(r, 1500 * attempt));
              continue;
            }
            break;
          }
        } catch (err) {
          console.warn(`OpenAI API error tentative ${attempt}:`, err);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
    }

    // 2. Essai avec Groq (si la clé Groq est présente)
    if (groqKey) {
      try {
        const formData = new FormData();
        const blob = new Blob([audioData], { type: 'audio/wav' });
        formData.append('file', blob, 'audio.wav');
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'mg');

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`
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
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  {
                    role: "system",
                    content: `Ianao dia mpanitsy teny malagasy sy mpandika teny matihanina.
Étape 1 : Analyse le sens exact de cette transcription audio malgache brute.
Étape 2 : Traduis-la mentalement en français naturel pour bien comprendre le contexte et toutes les phrases.
Étape 3 : Rédige le texte final en VRAI MALGACHE ÉCRIT, naturel, fluide et idiomatique (par exemple : 'Zay mampatonga anah rehefa pro iny ahantoko aloha...').
Règles strictes :
- Garde 100% du sens et des mots d'origine du vocal.
- Ne traduis PAS le résultat final en français, retourne UNIQUEMENT le texte final rédigé en malgache naturel.
- Corrige l'orthographe phonétique et supprime les hésitations/répétitions inutiles.`
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
        console.warn("Groq API error:", err);
      }
    }

    // 3. Fallback Hugging Face Router (Uniquement si OpenAI / Groq n'ont pas fonctionné)
    let lastError = null;

    if (hfKey) {
      for (const endpoint of HUGGINGFACE_ENDPOINTS) {
        try {
          let response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-wait-for-model": "true",
              "Authorization": `Bearer ${hfKey}`
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
                "Authorization": `Bearer ${hfKey}`
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

          if (response.status === 402) {
            return NextResponse.json(
              { error: "Les crédits gratuits du compte Hugging Face sont épuisés (Erreur 402). Veuillez entrer votre clé API OpenAI (sk-...) ou Groq (gsk_...) dans les paramètres du site pour continuer." },
              { status: 402 }
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
    }

    return NextResponse.json(
      { error: `Erreur API de transcription (${lastError || 'Service indisponible'})` },
      { status: 500 }
    );
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
