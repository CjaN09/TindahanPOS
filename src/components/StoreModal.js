import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

export default function StoreModal({
  visible,
  onClose,
  onSave,
  storeName,
  setStoreName,
  ownerName,
  setOwnerName,
  isEditing,
}) {
  const ownerInputRef = useRef(null);

  const handleSave = () => {
    Keyboard.dismiss();
    onSave();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Header Badge */}
            <View style={styles.modalHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>{isEditing ? '✏️' : '🏪'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Store Profile' : 'New Store Profile'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditing
                    ? 'Update store identity and owner details'
                    : 'Register a new store branch or register'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Input Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                STORE NAME <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Downtown Retail Branch"
                placeholderTextColor="#475569"
                value={storeName}
                onChangeText={setStoreName}
                returnKeyType="next"
                onSubmitEditing={() => ownerInputRef.current?.focus()}
                blurOnSubmit={false}
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>OWNER / MANAGER NAME</Text>
              <TextInput
                ref={ownerInputRef}
                style={styles.input}
                placeholder="e.g., Alex Santos"
                placeholderTextColor="#475569"
                value={ownerName}
                onChangeText={setOwnerName}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                activeOpacity={0.7}
                onPress={onClose}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimary}
                activeOpacity={0.8}
                onPress={handleSave}
              >
                <Text style={styles.btnPrimaryText}>
                  {isEditing ? 'Save Changes' : 'Create Store 🚀'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  icon: {
    fontSize: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginBottom: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  required: {
    color: '#38BDF8',
  },
  input: {
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1.5,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});