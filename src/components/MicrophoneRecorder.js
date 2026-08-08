import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function MicrophoneRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `enregistrement_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.webm`, {
          type: 'audio/webm',
        });
        
        stream.getTracks().forEach((track) => track.stop());
        onRecordingComplete(file);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(500);
      setIsRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erreur d'accès au microphone:", err);
      alert("Impossible d'accéder au microphone. Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.container}>
      {!isRecording ? (
        <TouchableOpacity
          style={[styles.recordBtn, disabled && styles.disabledBtn]}
          onPress={startRecording}
          disabled={disabled}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <Text style={styles.recordBtnText}>Démarrer l'enregistrement vocal</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.activeRecordingBox}>
          <View style={styles.timerRow}>
            <View style={styles.redDot} />
            <Text style={styles.timerText}>{formatTimer(seconds)}</Text>
          </View>
          <Text style={styles.recordingStatusText}>Enregistrement audio en cours...</Text>

          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <Text style={styles.stopBtnText}>Arrêter et transcrire</Text>
            </div>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  recordBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#9ca3af',
  },
  recordBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  activeRecordingBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 10,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#991b1b',
    fontFamily: 'monospace',
  },
  recordingStatusText: {
    fontSize: 13,
    color: '#7f1d1d',
    marginBottom: 16,
  },
  stopBtn: {
    backgroundColor: '#b91c1c',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  stopBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
