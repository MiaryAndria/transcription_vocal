/**
 * Audio Chunker & Normalizer for Web / React Native (Web View)
 * Decodes audio, amplifies low voices, and slices into 30-second 16kHz PCM WAV Blobs.
 */

/**
 * Encodes an AudioBuffer slice into a 16kHz Mono 16-bit PCM WAV Blob
 * @param {AudioBuffer} audioBuffer 
 * @param {number} startSample 
 * @param {number} endSample 
 * @param {number} gainFactor Dynamic volume amplification factor
 * @returns {Blob}
 */
function bufferToWavBlob(audioBuffer, startSample, endSample, gainFactor = 1.0) {
  const targetSampleRate = 16000;
  const originalSampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  
  // Extract & mix down audio channels to mono
  const numOriginalSamples = endSample - startSample;
  const mixedChannel = new Float32Array(numOriginalSamples);

  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    for (let i = 0; i < numOriginalSamples; i++) {
      mixedChannel[i] += channelData[startSample + i] / numChannels;
    }
  }

  // Resample to 16kHz if needed
  let resampledData;
  if (originalSampleRate === targetSampleRate) {
    resampledData = mixedChannel;
  } else {
    const ratio = originalSampleRate / targetSampleRate;
    const targetLength = Math.floor(numOriginalSamples / ratio);
    resampledData = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const origIndex = Math.floor(i * ratio);
      resampledData[i] = mixedChannel[origIndex];
    }
  }

  // Apply Volume Boost / Gain Factor for soft voices
  const pcm16Data = new Int16Array(resampledData.length);
  for (let i = 0; i < resampledData.length; i++) {
    let sample = resampledData[i] * gainFactor;
    // Hard limit / clipping guard [-1.0, 1.0]
    if (sample > 1.0) sample = 1.0;
    if (sample < -1.0) sample = -1.0;
    // Convert float to 16-bit PCM (-32768 to 32767)
    pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  // Build WAV header
  const dataSize = pcm16Data.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 for Mono)
  view.setUint32(24, targetSampleRate, true); // SampleRate
  view.setUint32(28, targetSampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);  // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio data
  const pcmBytes = new Uint8Array(buffer, 44, dataSize);
  pcmBytes.set(new Uint8Array(pcm16Data.buffer));

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Splits an Audio File/Blob into 30-second normalized WAV chunks
 * @param {Blob|File} audioFile 
 * @param {number} chunkDurationSec Chunk size in seconds (default 30s)
 * @returns {Promise<{chunks: Array<{id: number, blob: Blob, startTime: number, endTime: number}>, durationSec: number}>}
 */
export async function sliceAudioIntoChunks(audioFile, chunkDurationSec = 30) {
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const durationSec = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const samplesPerChunk = chunkDurationSec * sampleRate;
  const totalSamples = audioBuffer.length;

  // Calculate overall audio peak volume to determine gain boost for soft voice
  let maxPeak = 0.001;
  const channelData = audioBuffer.getChannelData(0);
  // Sample 1 out of every 50 points to find peak quickly
  for (let i = 0; i < channelData.length; i += 50) {
    const abs = Math.abs(channelData[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  // Target peak normalization to ~0.8 (amplifies soft voice while avoiding distortion)
  const gainFactor = Math.min(4.0, 0.8 / maxPeak);

  const chunks = [];
  let currentSample = 0;
  let chunkId = 0;

  while (currentSample < totalSamples) {
    const endSample = Math.min(currentSample + samplesPerChunk, totalSamples);
    const startTime = currentSample / sampleRate;
    const endTime = endSample / sampleRate;

    const wavBlob = bufferToWavBlob(audioBuffer, currentSample, endSample, gainFactor);

    chunks.push({
      id: chunkId++,
      blob: wavBlob,
      startTime,
      endTime,
    });

    currentSample = endSample;
  }

  // Close context to release memory
  if (audioContext.state !== 'closed') {
    await audioContext.close();
  }

  return { chunks, durationSec };
}

/**
 * Formats seconds into HH:MM:SS or MM:SS string
 * @param {number} seconds 
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');

  if (h > 0) {
    const hStr = h.toString().padStart(2, '0');
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}
