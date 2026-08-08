import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

export default function TranscriptionViewer({ fullText, audioFileName }) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const fileNameClean = audioFileName ? audioFileName.replace(/\.[^/.]+$/, "") : "transcription";
    element.download = `${fileNameClean}_malagasy.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const wordCount = fullText ? fullText.trim().split(/\s+/).length : 0;
  const charCount = fullText ? fullText.length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Transcription Intégrale (Texte Complet)</Text>
          <Text style={styles.statsText}>
            {wordCount} mots • {charCount} caractères
          </Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
              {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              <Text style={[styles.actionBtnText, copied && { color: '#16a34a' }]}>
                {copied ? "Copié !" : "Copier"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={handleDownload}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <Text style={[styles.actionBtnText, styles.downloadBtnText]}>
                Télécharger (.txt)
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Champ de recherche */}
      <View style={styles.searchBox}>
        <View style={{ alignItems: 'center', marginRight: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher dans le texte..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Zone de texte de transcription */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          maxHeight: '450px',
          overflowY: 'auto',
          fontSize: '16px',
          lineHeight: '1.7',
          color: '#1e293b',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {fullText ? (
          searchQuery.trim() ? (
            fullText.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
              part.toLowerCase() === searchQuery.toLowerCase() ? (
                <mark key={i} style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0 2px', borderRadius: '2px' }}>
                  {part}
                </mark>
              ) : (
                part
              )
            )
          ) : (
            fullText
          )
        ) : (
          <Text style={styles.emptyText}>Aucune transcription disponible pour le moment...</Text>
        )}
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statsText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  downloadBtn: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  downloadBtnText: {
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#1e293b',
  },
  emptyText: {
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
