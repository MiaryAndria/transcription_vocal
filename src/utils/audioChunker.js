/**
 * Audio Chunker, Noise Reducer & Voice Normalizer
 * Cuts background noise, isolates human vocal frequencies (80Hz-4000Hz), amplifies soft voices,
 * and slices long audio files into 30-second 16kHz PCM WAV Blobs.
 */

/**
 * Encodes an AudioBuffer slice into a 16kHz Mono 16-bit PCM WAV Blob
 */
function bufferToWavBlob(audioBuffer, startSample, endSample, gainFactor = 1.0) {
  const targetSampleRate = 16000;
  const originalSampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  
  const numOriginalSamples = endSample - startSample;
  const mixedChannel = new Float32Array(numOriginalSamples);

  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    for (let i = 0; i < numOriginalSamples; i++) {
      mixedChannel[i] += channelData[startSample + i] / numChannels;
    }
  }

  // Resample to 16kHz
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

  // Apply Volume Boost / Gain Factor with Voice Normalization
  const pcm16Data = new Int16Array(resampledData.length);
  for (let i = 0; i < resampledData.length; i++) {
    let sample = resampledData[i] * gainFactor;
    if (sample > 1.0) sample = 1.0;
    if (sample < -1.0) sample = -1.0;
    pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  // Build WAV header
  const dataSize = pcm16Data.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

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
 * Applies Bandpass Noise Filter (80Hz to 4000Hz) to isolate human voice
 * and reduce background noise (wind, traffic, AC hum, static noise).
 * @param {AudioBuffer} audioBuffer 
 * @returns {Promise<AudioBuffer>}
 */
async function applyVoiceNoiseFilter(audioBuffer) {
  try {
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // High-pass filter at 80Hz (Cuts low rumble, wind noise, hum)
    const highPass = offlineCtx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 80;

    // Low-pass filter at 3800Hz (Cuts high hiss, static noise)
    const lowPass = offlineCtx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 3800;

    source.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  } catch (err) {
    console.warn("Noise filter warning, using raw audio:", err);
    return audioBuffer;
  }
}

/**
 * Splits an Audio File/Blob into 30-second normalized WAV chunks
 * @param {Blob|File} audioFile 
 * @param {number} chunkDurationSec 
 * @returns {Promise<{chunks: Array<{id: number, blob: Blob, startTime: number, endTime: number}>, durationSec: number}>}
 */
export async function sliceAudioIntoChunks(audioFile, chunkDurationSec = 30) {
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Apply vocal frequency noise filter
  const audioBuffer = await applyVoiceNoiseFilter(decodedBuffer);

  const durationSec = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const samplesPerChunk = chunkDurationSec * sampleRate;
  const totalSamples = audioBuffer.length;

  // Calculate dynamic volume gain for soft voices
  let maxPeak = 0.001;
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i += 50) {
    const abs = Math.abs(channelData[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  const gainFactor = Math.min(5.0, 0.85 / maxPeak);

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
