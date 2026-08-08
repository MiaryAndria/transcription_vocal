import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AudioUploader({ onFileSelected, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handlePickFile = (e) => {
    let file = null;
    if (e.target && e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    }
    if (file) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i)) {
        setSelectedFile(file);
        onFileSelected(file);
      } else {
        alert("Veuillez sélectionner un fichier audio valide (MP3, WAV, M4A, OGG, WEBM, AAC...)");
      }
    }
  };

  return (
    <View style={styles.container}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: dragOver ? '2px dashed #6366f1' : '2px dashed #cbd5e1',
          backgroundColor: dragOver ? '#f0f3ff' : '#f8fafc',
          borderRadius: '16px',
          padding: '36px 20px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm"
          id="audioFileInput"
          onChange={handlePickFile}
          disabled={disabled}
          style={{ display: 'none' }}
        />
        <label htmlFor="audioFileInput" style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'block' }}>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <Text style={styles.title}>
            {selectedFile ? selectedFile.name : "Cliquez ici ou déposez votre fichier audio"}
          </Text>
          <Text style={styles.subtitle}>
            Tous formats supportés : MP3, WAV, M4A, AAC, OGG, FLAC, WEBM (jusqu'à 80 min)
          </Text>
          {selectedFile && (
            <View style={styles.fileBadge}>
              <Text style={styles.fileBadgeText}>
                Fichier sélectionné : {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
            </View>
          )}
        </label>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  fileBadge: {
    marginTop: 14,
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
  },
  fileBadgeText: {
    fontSize: 13,
    color: '#4338ca',
    fontWeight: '600',
  },
});
