import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function ApiKeyModal({ apiKey, onSaveApiKey }) {
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setKeyInput(apiKey || '');
  }, [apiKey]);

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsOpen(!isOpen)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <Text style={styles.toggleBtnText}>
            Clé API Hugging Face {apiKey ? "(Configurée)" : "(Recommandée)"}
          </Text>
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Configuration Clé API Hugging Face</Text>
          <Text style={styles.modalSub}>
            Collez votre Token d'accès gratuit Hugging Face (disponible sur huggingface.co/settings/tokens avec permission Read) pour un accès illimité.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx"
            value={keyInput}
            onChangeText={setKeyInput}
            secureTextEntry={true}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setIsOpen(false)}>
              <Text style={styles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  toggleBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalBox: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 450,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  closeBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
});
