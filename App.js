import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AudioUploader from './src/components/AudioUploader';
import MicrophoneRecorder from './src/components/MicrophoneRecorder';
import AudioPlayerSync from './src/components/AudioPlayerSync';
import TranscriptionViewer from './src/components/TranscriptionViewer';
import ApiKeyModal from './src/components/ApiKeyModal';
import { sliceAudioIntoChunks, formatTime } from './src/utils/audioChunker';
import { processAudioChunksBatch } from './src/utils/whisperApi';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'record'
  const [selectedMode, setSelectedMode] = useState('sync'); // 'sync' (Mode 1) | 'direct' (Mode 2)
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  // Clé API Hugging Face
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hf_api_key') || '';
    }
    return '';
  });

  const handleSaveApiKey = (newKey) => {
    setApiKey(newKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hf_api_key', newKey);
    }
  };

  // States d'exécution
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState({ completed: 0, total: 0, percent: 0, currentText: '' });
  const [segments, setSegments] = useState([]);
  const [fullTranscription, setFullTranscription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAudioSelected = (file) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setSegments([]);
    setFullTranscription('');
    setErrorMessage('');
    
    // Lancement automatique de la transcription
    startTranscriptionProcess(file);
  };

  const startTranscriptionProcess = async (fileToProcess) => {
    const file = fileToProcess || audioFile;
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage('');
    setSegments([]);
    setFullTranscription('');

    try {
      // Étape 1 : Découpage audio + Normalisation pour voix basses
      const { chunks } = await sliceAudioIntoChunks(file, 30);
      setProgressInfo({ completed: 0, total: chunks.length, percent: 0, currentText: '' });

      // Étape 2 : Traitement IA séquentiel/parallèle via OpenAI Whisper
      const results = await processAudioChunksBatch(chunks, apiKey, (completed, total, latestText) => {
        const percent = Math.round((completed / total) * 100);
        setProgressInfo({ completed, total, percent, currentText: latestText });
      });

      // Étape 3 : Consolidation du texte
      setSegments(results);
      const combinedText = results.map((r) => r.text).filter(Boolean).join(' ');
      setFullTranscription(combinedText);
    } catch (err) {
      console.error("Erreur transcription:", err);
      setErrorMessage(err.message || "Une erreur est survenue lors de la transcription audio.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* En-tête de l'application */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <div style={{ display: 'flex', alignItems: 'center', marginRight: 12 }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <View>
              <Text style={styles.appTitle}>Transcription Audio Malgache</Text>
              <Text style={styles.appSubtitle}>Service IA Haute Précision (Prise en charge jusqu'à 80 min)</Text>
            </View>
          </View>

          <ApiKeyModal apiKey={apiKey} onSaveApiKey={handleSaveApiKey} />
        </View>

        {/* Sélection du mode de transcription */}
        <View style={styles.modeCard}>
          <Text style={styles.modeCardTitle}>Mode de transcription :</Text>
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeBtn, selectedMode === 'sync' && styles.modeBtnActive]}
              onPress={() => setSelectedMode('sync')}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedMode === 'sync' ? '#ffffff' : '#475569'} strokeWidth="2">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
                <Text style={[styles.modeBtnText, selectedMode === 'sync' && styles.modeBtnTextActive]}>
                  1. Écoute + Transcription Synchronisée
                </Text>
              </div>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, selectedMode === 'direct' && styles.modeBtnActive]}
              onPress={() => setSelectedMode('direct')}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedMode === 'direct' ? '#ffffff' : '#475569'} strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <Text style={[styles.modeBtnText, selectedMode === 'direct' && styles.modeBtnTextActive]}>
                  2. Transcription Intégrale Directe
                </Text>
              </div>
            </TouchableOpacity>
          </View>
        </View>

        {/* Onglets de source d'entrée (Fichier vs Micro) */}
        <View style={styles.tabCard}>
          <View style={styles.tabHeader}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'upload' && styles.tabItemActive]}
              onPress={() => setActiveTab('upload')}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'upload' ? '#4f46e5' : '#64748b'} strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>
                  Fichier Audio (Importation)
                </Text>
              </div>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'record' && styles.tabItemActive]}
              onPress={() => setActiveTab('record')}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'record' ? '#4f46e5' : '#64748b'} strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
                <Text style={[styles.tabText, activeTab === 'record' && styles.tabTextActive]}>
                  Enregistrement Microphone
                </Text>
              </div>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBody}>
            {activeTab === 'upload' ? (
              <AudioUploader onFileSelected={handleAudioSelected} disabled={isProcessing} />
            ) : (
              <MicrophoneRecorder onRecordingComplete={handleAudioSelected} disabled={isProcessing} />
            )}
          </View>
        </View>

        {/* Message d'erreur s'il y a lieu */}
        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Barre de progression pendant le traitement IA */}
        {isProcessing && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ActivityIndicator size="small" color="#4f46e5" style={{ marginRight: 10 }} />
              <Text style={styles.progressTitle}>
                Transcription audio en cours... ({progressInfo.percent}%)
              </Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressInfo.percent}%` }]} />
            </View>

            <Text style={styles.progressDetailText}>
              Segment {progressInfo.completed} sur {progressInfo.total} ({formatTime(progressInfo.completed * 30)} traités)
            </Text>
            {progressInfo.currentText ? (
              <Text style={styles.liveSnippetText}>
                "{progressInfo.currentText}"
              </Text>
            ) : null}
          </View>
        )}

        {/* Affichage des résultats de transcription */}
        {audioUrl && !isProcessing && (
          <View style={styles.resultsContainer}>
            {selectedMode === 'sync' ? (
              <AudioPlayerSync
                audioUrl={audioUrl}
                segments={segments}
              />
            ) : null}

            <TranscriptionViewer
              fullText={fullTranscription}
              segments={segments}
              audioFileName={audioFile?.name}
            />
          </View>
        )}

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Transcription Audio Malgache • Propulsé par OpenAI Whisper
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  modeCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  modeBtn: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modeBtnActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  tabCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 3,
    borderBottomColor: '#4f46e5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  tabBody: {
    padding: 16,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3730a3',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#e0e7ff',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
  },
  progressDetailText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  liveSnippetText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  resultsContainer: {
    width: '100%',
  },
  footer: {
    marginTop: 30,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
