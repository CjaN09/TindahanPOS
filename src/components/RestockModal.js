import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function RestockModal({
  visible,
  onClose,
  product,
  onConfirmRestock,
}) {
  const [restockType, setRestockType] = useState('pack'); // 'pack' | 'piece'
  const [amount, setAmount] = useState('1');

  if (!product) return null;

  const handleRestock = () => {
    const qty = parseInt(amount, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid number to restock.');
      return;
    }

    const addedPieces = restockType === 'pack' ? qty * product.piecesPerPack : qty;
    onConfirmRestock(product.id, addedPieces);
    setAmount('1');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          <Text style={styles.title}>📦 Restock Inventory</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.currentStockText}>
            Current Stock: {product.totalPiecesStock} pcs ({Math.floor(product.totalPiecesStock / product.piecesPerPack)} pk | {product.totalPiecesStock % product.piecesPerPack} pcs)
          </Text>

          {/* Unit Toggle */}
          {product.isTingiEnabled && (
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.btnToggle, restockType === 'pack' && styles.btnToggleActive]}
                onPress={() => setRestockType('pack')}
              >
                <Text style={[styles.btnToggleText, restockType === 'pack' && styles.btnToggleTextActive]}>
                  📦 Whole Pack (+{product.piecesPerPack} pcs each)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnToggle, restockType === 'piece' && styles.btnToggleActive]}
                onPress={() => setRestockType('piece')}
              >
                <Text style={[styles.btnToggleText, restockType === 'piece' && styles.btnToggleTextActive]}>
                  🥢 Per Piece / Tingi
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <Text style={styles.inputLabel}>
            HOW MANY {restockType === 'pack' ? 'PACKS' : 'PIECES'} TO ADD?
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />

          {/* Actions */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSave} onPress={handleRestock}>
              <Text style={styles.btnSaveText}>Add to Stock ✓</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 4,
  },
  currentStockText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 16,
  },
  toggleRow: {
    gap: 8,
    marginBottom: 14,
  },
  btnToggle: {
    backgroundColor: '#070B14',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  btnToggleActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  btnToggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  btnToggleTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSave: {
    flex: 2,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});