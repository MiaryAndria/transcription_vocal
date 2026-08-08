/**
 * Whisper API Client for Malagasy Audio Transcription
 * Routes calls via Next.js API Proxy (/api/transcribe) to avoid CORS / DNS browser errors.
 */

/**
 * Transcribes a single audio blob chunk (approx 30s WAV)
 * @param {Blob} audioBlob 
 * @returns {Promise<{text: string, error?: string}>}
 */
export async function transcribeChunk(audioBlob) {
  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "audio/wav",
      },
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
 * Traite plusieurs morceaux audio en parallèle pour accélérer les audios de 80 min
 * @param {Array<{id: number, blob: Blob, startTime: number, endTime: number}>} chunks 
 * @param {string} _unusedKey 
 * @param {function(number, number, string)} onProgress (completedCount, totalChunks, currentText)
 * @returns {Promise<Array<{id: number, startTime: number, endTime: number, text: string}>>}
 */
export async function processAudioChunksBatch(chunks, _unusedKey, onProgress) {
  const results = new Array(chunks.length);
  const CONCURRENCY = 2; // 2 requêtes simultanées
  let completed = 0;

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    
    await Promise.all(
      batch.map(async (chunk, batchIndex) => {
        const index = i + batchIndex;
        let attempts = 0;
        let success = false;
        let textResult = "";

        while (attempts < 3 && !success) {
          attempts++;
          const res = await transcribeChunk(chunk.blob);
          if (res.error && res.error.includes("chargement")) {
            // Attendre 4 secondes si le modèle se charge
            await new Promise((r) => setTimeout(r, 4000));
          } else if (res.error) {
            console.warn(`Morceau ${index} tentative ${attempts} échouée:`, res.error);
            await new Promise((r) => setTimeout(r, 1500));
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
