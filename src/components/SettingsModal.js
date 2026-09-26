import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function SettingsModal({
  visible,
  onClose,
  settings,
  onSaveSettings,
}) {
  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled ?? true);
  const [receiptFooter, setReceiptFooter] = useState(settings?.receiptFooter || 'Thank you, come again! ❤️');
  const [receiptContact, setReceiptContact] = useState(settings?.receiptContact || '');
  const [language, setLanguage] = useState(settings?.language || 'english');

  useEffect(() => {
    if (visible && settings) {
      setSoundEnabled(settings.soundEnabled ?? true);
      setReceiptFooter(settings.receiptFooter || 'Thank you, come again! ❤️');
      setReceiptContact(settings.receiptContact || '');
      setLanguage(settings.language || 'english');
    }
  }, [visible, settings]);

  const handleSave = () => {
    onSaveSettings({
      soundEnabled,
      receiptFooter,
      receiptContact,
      language,
    });
    onClose();
  };

  const openLink = (url) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't open URL", err));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>⚙️ Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. GENERAL PREFERENCES */}
            <Text style={styles.sectionHeader}>PREFERENCES</Text>
            <View style={styles.cardBox}>
              <View style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>🔊 Sound Effects</Text>
                  <Text style={styles.itemSubtitle}>Play sound on scan, item add, and checkout</Text>
                </View>
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor={soundEnabled ? '#38BDF8' : '#94A3B8'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>🌐 Language</Text>
                  <Text style={styles.itemSubtitle}>Select app interface language</Text>
                </View>
                <View style={styles.langToggle}>
                  <TouchableOpacity
                    style={[styles.btnLang, language === 'english' && styles.btnLangActive]}
                    onPress={() => setLanguage('english')}
                  >
                    <Text style={[styles.btnLangText, language === 'english' && styles.btnLangTextActive]}>English</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnLang, language === 'tagalog' && styles.btnLangActive]}
                    onPress={() => setLanguage('tagalog')}
                  >
                    <Text style={[styles.btnLangText, language === 'tagalog' && styles.btnLangTextActive]}>Tagalog</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 2. RECEIPT & STORE CUSTOMIZATION */}
            <Text style={styles.sectionHeader}>RECEIPT CUSTOMIZATION</Text>
            <View style={styles.cardBox}>
              <Text style={styles.inputLabel}>RECEIPT FOOTER MESSAGE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Thank you, come again!"
                placeholderTextColor="#64748B"
                value={receiptFooter}
                onChangeText={setReceiptFooter}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>STORE CONTACT / GCASH NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0912-345-6789"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={receiptContact}
                onChangeText={setReceiptContact}
              />
            </View>

            {/* 3. ABOUT APPLICATION */}
            <Text style={styles.sectionHeader}>ABOUT APPLICATION</Text>
            <View style={styles.cardBox}>
              <Text style={styles.aboutAppName}>⚡ TindahanPOS</Text>
              <Text style={styles.aboutAppDesc}>
                Modern offline-first point-of-sale and stock management system designed for micro-retail businesses and stores.
              </Text>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Version:</Text>
                <Text style={styles.infoValue}>v1.0.1</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Developer:</Text>
                <Text style={styles.infoValue}>CjaN Dev Studios</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cloud Backup:</Text>
                <Text style={[styles.infoValue, { color: '#34D399' }]}>Supported</Text>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.btnSupportLink}
                onPress={() => openLink('https://github.com/cjnaguna')}
              >
                <Text style={styles.btnSupportLinkText}>🌐 Developer Portfolio / Support ↗</Text>
              </TouchableOpacity>
            </View>

            {/* SAVE BUTTON */}
            <TouchableOpacity style={styles.btnSave} activeOpacity={0.8} onPress={handleSave}>
              <Text style={styles.btnSaveText}>Save Settings ✓</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
  },
  cardBox: {
    backgroundColor: '#070B14',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
  },
  btnLang: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnLangActive: {
    backgroundColor: '#0284C7',
  },
  btnLangText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  btnLangTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  aboutAppName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 4,
  },
  aboutAppDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  btnSupportLink: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  btnSupportLinkText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '700',
  },
  btnSave: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});