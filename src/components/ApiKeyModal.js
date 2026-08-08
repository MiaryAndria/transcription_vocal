import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function ApiKeyModal({ apiKey, onSaveApiKey }) {
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onSaveApiKey(keyInput);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsOpen(!isOpen)}>
        <Text style={styles.toggleBtnText}>
           Key API Hugging Face {apiKey ? "(Actif )" : "(Optionnel )"}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Clé API Hugging Face (Optionnel)</Text>
          <Text style={styles.modalSub}>
            L'API gratuite par défaut fonctionne directement. Si vous voulez des vitesses encore plus rapides sans limite, collez votre Token gratuit de huggingface.co/settings/tokens
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
