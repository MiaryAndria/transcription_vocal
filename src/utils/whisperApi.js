/**
 * Whisper API Client for Malagasy Audio Transcription
 * Uses OpenAI Whisper large v3 via Hugging Face Inference API
 */

const DEFAULT_MODEL = "openai/whisper-large-v3";

/**
 * Transcribes a single audio blob chunk (approx 30s WAV)
 * @param {Blob} audioBlob 
 * @param {string} apiKey Optional Hugging Face API key
 * @returns {Promise<{text: string, error?: string}>}
 */
export async function transcribeChunk(audioBlob, apiKey = "") {
  const url = `https://api-inference.huggingface.co/models/${DEFAULT_MODEL}`;

  const headers = {};
  if (apiKey && apiKey.trim().length > 0) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "audio/wav",
        "x-wait-for-model": "true",
      },
      body: audioBlob,
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 503) {
        return { text: "", error: "Le modèle IA est en cours de chargement sur Hugging Face (réessai automatique dans quelques secondes...)" };
      }
      throw new Error(`Erreur API (${response.status}): ${errText}`);
    }

    const result = await response.json();
    return { text: result.text || "", raw: result };
  } catch (error) {
    console.error("Transcribe chunk error:", error);
    return { text: "", error: error.message };
  }
}

/**
 * Processes multiple chunks concurrently in batches to maximize transcription speed for 80min audios
 * @param {Array<{id: number, blob: Blob, startTime: number, endTime: number}>} chunks 
 * @param {string} apiKey 
 * @param {function(number, number, string)} onProgress (completedCount, totalChunks, currentText)
 * @returns {Promise<Array<{id: number, startTime: number, endTime: number, text: string}>>}
 */
export async function processAudioChunksBatch(chunks, apiKey = "", onProgress) {
  const results = new Array(chunks.length);
  const CONCURRENCY = 3; // 3 concurrent requests for fast processing
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
          const res = await transcribeChunk(chunk.blob, apiKey);
          if (res.error && res.error.includes("chargement")) {
            await new Promise((r) => setTimeout(r, 5000));
          } else if (res.error) {
            console.warn(`Chunk ${index} attempt ${attempts} failed:`, res.error);
            await new Promise((r) => setTimeout(r, 2000));
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
