/**
 * Whisper API Client for Malagasy Audio Transcription
 * Routes calls via Next.js API Proxy (/api/transcribe) to avoid CORS / DNS browser errors.
 */

/**
 * Transcribes a single audio blob chunk (approx 60s WAV)
 * @param {Blob} audioBlob 
 * @param {string} apiKey Optionnel: Clé API (sk-..., gsk_..., hf_...)
 * @returns {Promise<{text: string, error?: string}>}
 */
export async function transcribeChunk(audioBlob, apiKey = '') {
  try {
    const headers = {
      "Content-Type": "audio/wav",
    };
    if (apiKey) {
      headers["x-hf-api-key"] = apiKey;
    }

    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers,
      body: audioBlob,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 503) {
        return { text: "", error: "chargement" };
      }
      throw new Error(data.error || `Erreur serveur (${response.status})`);
    }

    return { text: data.text || "", raw: data };
  } catch (error) {
    console.error("Erreur de transcription chunk:", error);
    return { text: "", error: error.message };
  }
}

/**
 * Traite tous les morceaux audio en parallèle de façon ultra-robuste (pour audios de 1h10+)
 * @param {Array<{id: number, blob: Blob, startTime: number, endTime: number}>} chunks 
 * @param {string} apiKey Optionnel: Clé API
 * @param {function(number, number, string)} onProgress (completedCount, totalChunks, currentText)
 * @returns {Promise<Array<{id: number, startTime: number, endTime: number, text: string}>>}
 */
export async function processAudioChunksBatch(chunks, apiKey = '', onProgress) {
  const results = new Array(chunks.length);
  const CONCURRENCY = 3; // 3 requêtes simultanées pour éviter les erreurs de surcharge tout en restant ultra-rapide
  let completed = 0;

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    
    await Promise.all(
      batch.map(async (chunk, batchIndex) => {
        const index = i + batchIndex;
        let attempts = 0;
        let success = false;
        let textResult = "";

        while (attempts < 4 && !success) {
          attempts++;
          const res = await transcribeChunk(chunk.blob, apiKey);

          if (res.error && res.error.includes("chargement")) {
            await new Promise((r) => setTimeout(r, 4000));
          } else if (res.error) {
            console.warn(`Morceau ${index} (min ${Math.floor(chunk.startTime / 60)}) tentative ${attempts} échouée:`, res.error);
            if (res.error.includes("401") || res.error.includes("Accès non autorisé")) {
              throw new Error(res.error);
            }
            await new Promise((r) => setTimeout(r, 1000 * attempts));
          } else {
            textResult = res.text.trim();
            success = true;
          }
        }

        results[index] = {
          id: chunk.id,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          text: textResult || "",
        };

        completed++;
        if (onProgress) {
          onProgress(completed, chunks.length, textResult);
        }
      })
    );
  }

  return results;
}
