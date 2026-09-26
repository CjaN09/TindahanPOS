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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const CATEGORIES = ['Cigarettes', 'Snacks', 'Beverages', 'Canned Goods', 'Coffee', 'Others'];

export default function ProductModal({
  visible,
  onClose,
  onSave,
  initialProduct,
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [stockPacks, setStockPacks] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPricePack, setSellingPricePack] = useState('');
  
  // Tingi Options
  const [isTingiEnabled, setIsTingiEnabled] = useState(false);
  const [piecesPerPack, setPiecesPerPack] = useState('20');
  const [sellingPricePiece, setSellingPricePiece] = useState('');

  // Reset or fill data when modal opens
  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setCategory(initialProduct.category);
      setCostPrice(initialProduct.costPrice.toString());
      setSellingPricePack(initialProduct.sellingPricePack.toString());
      setIsTingiEnabled(initialProduct.isTingiEnabled);
      setPiecesPerPack((initialProduct.piecesPerPack || 20).toString());
      setSellingPricePiece((initialProduct.sellingPricePiece || '').toString());
      
      const packs = Math.floor(initialProduct.totalPiecesStock / (initialProduct.piecesPerPack || 1));
      setStockPacks(packs.toString());
    } else {
      setName('');
      setCategory(CATEGORIES[0]);
      setStockPacks('1');
      setCostPrice('');
      setSellingPricePack('');
      setIsTingiEnabled(false);
      setPiecesPerPack('20');
      setSellingPricePiece('');
    }
  }, [initialProduct, visible]);

  // AUTOMATED PRICING ENGINE
  const handleCostPriceChange = (value) => {
    setCostPrice(value);
    const cost = parseFloat(value);
    if (!isNaN(cost) && cost > 0) {
      // Auto-suggest: +15% for pack
      const suggestedPack = Math.ceil(cost * 1.15);
      setSellingPricePack(suggestedPack.toString());

      // Auto-suggest for tingi if enabled
      const pieces = parseInt(piecesPerPack) || 1;
      if (pieces > 0) {
        const costPerPiece = cost / pieces;
        // Auto-suggest: +25% for tingi
        const suggestedPiece = Math.ceil(costPerPiece * 1.25);
        setSellingPricePiece(suggestedPiece.toString());
      }
    }
  };

  const handlePiecesChange = (val) => {
    setPiecesPerPack(val);
    const cost = parseFloat(costPrice);
    const pieces = parseInt(val) || 1;
    if (!isNaN(cost) && cost > 0 && pieces > 0) {
      const costPerPiece = cost / pieces;
      const suggestedPiece = Math.ceil(costPerPiece * 1.25);
      setSellingPricePiece(suggestedPiece.toString());
    }
  };

  // PROFIT COMPUTATIONS
  const costNum = parseFloat(costPrice) || 0;
  const packPriceNum = parseFloat(sellingPricePack) || 0;
  const packProfit = packPriceNum - costNum;

  const piecesNum = parseInt(piecesPerPack) || 1;
  const piecePriceNum = parseFloat(sellingPricePiece) || 0;
  const totalRevenueTingi = piecePriceNum * piecesNum;
  const tingiProfit = totalRevenueTingi - costNum;

  // SUBMIT WITH STRICT VALIDATION
  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter the name of the product.');
      return;
    }
    if (costNum <= 0) {
      Alert.alert('Invalid Cost', 'Please enter a valid cost price (Puhunan).');
      return;
    }
    if (packPriceNum <= costNum) {
      Alert.alert(
        'Negative Profit!',
        `The pack selling price (₱${packPriceNum}) must be higher than the cost price (₱${costNum}).`
      );
      return;
    }

    if (isTingiEnabled) {
      if (piecesNum <= 1) {
        Alert.alert('Invalid Quantity', 'Pieces per pack must be 2 or more.');
        return;
      }
      if (piecePriceNum <= 0 || totalRevenueTingi <= costNum) {
        Alert.alert(
          'Loss on Tingi!',
          `Total retail revenue for tingi (₱${totalRevenueTingi}) cannot be less than or equal to the cost price (₱${costNum}).`
        );
        return;
      }
    }

    const qtyPacks = parseInt(stockPacks) || 1;
    const finalTotalPieces = isTingiEnabled ? qtyPacks * piecesNum : qtyPacks;

    const productPayload = {
      id: initialProduct ? initialProduct.id : Date.now().toString(),
      name: name.trim(),
      category,
      costPrice: costNum,
      sellingPricePack: packPriceNum,
      isTingiEnabled,
      piecesPerPack: isTingiEnabled ? piecesNum : 1,
      sellingPricePiece: isTingiEnabled ? piecePriceNum : 0,
      totalPiecesStock: finalTotalPieces,
    };

    onSave(productPayload);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialProduct ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Category Selector */}
            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Basic Info */}
            <Text style={styles.label}>PRODUCT NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Nescafe Original 3-in-1"
              placeholderTextColor="#475569"
              value={name}
              onChangeText={setName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>STOCK (PACKS/BOXES)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  keyboardType="number-pad"
                  placeholderTextColor="#475569"
                  value={stockPacks}
                  onChangeText={setStockPacks}
                />
              </View>

              <View style={{ flex: 1.2 }}>
                <Text style={styles.label}>COST PRICE (PUHUNAN) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₱ 150.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#475569"
                  value={costPrice}
                  onChangeText={handleCostPriceChange}
                />
              </View>
            </View>

            {/* Pack Selling Price with Guard */}
            <Text style={styles.label}>SELLING PRICE (WHOLE PACK) *</Text>
            <TextInput
              style={[
                styles.input,
                packProfit <= 0 && costNum > 0 && styles.inputError,
              ]}
              placeholder="₱ 180.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#475569"
              value={sellingPricePack}
              onChangeText={setSellingPricePack}
            />

            {/* Pack Profit Indicator */}
            {costNum > 0 && (
              <View style={[styles.profitBadge, packProfit <= 0 ? styles.profitBadgeRed : styles.profitBadgeGreen]}>
                <Text style={[styles.profitText, packProfit <= 0 ? styles.profitTextRed : styles.profitTextGreen]}>
                  {packProfit > 0
                    ? `✓ Profit per pack: +₱${packProfit.toFixed(2)}`
                    : '⚠ Negative profit! Increase selling price.'}
                </Text>
              </View>
            )}

            {/* Tingi Mode Switch */}
            <View style={styles.tingiToggleBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tingiTitle}>Sell per piece (Tingi)?</Text>
                <Text style={styles.tingiSubtitle}>Enable to sell individual units from a pack</Text>
              </View>
              <Switch
                value={isTingiEnabled}
                onValueChange={setIsTingiEnabled}
                trackColor={{ false: '#1e293b', true: '#0284c7' }}
                thumbColor={isTingiEnabled ? '#38bdf8' : '#64748b'}
              />
            </View>

            {/* Tingi Fields */}
            {isTingiEnabled && (
              <View style={styles.tingiContainer}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>PIECES PER PACK</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="20"
                      keyboardType="number-pad"
                      placeholderTextColor="#475569"
                      value={piecesPerPack}
                      onChangeText={handlePiecesChange}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>TINGI SELLING PRICE</Text>
                    <TextInput
                      style={[styles.input, tingiProfit <= 0 && costNum > 0 && styles.inputError]}
                      placeholder="₱ 10.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#475569"
                      value={sellingPricePiece}
                      onChangeText={setSellingPricePiece}
                    />
                  </View>
                </View>

                {/* Tingi Profit Indicator */}
                {costNum > 0 && (
                  <View style={[styles.profitBadge, tingiProfit <= 0 ? styles.profitBadgeRed : styles.profitBadgeGreen]}>
                    <Text style={[styles.profitText, tingiProfit <= 0 ? styles.profitTextRed : styles.profitTextGreen]}>
                      {tingiProfit > 0
                        ? `✓ Profit if all tingi sold: +₱${tingiProfit.toFixed(2)}`
                        : '⚠ Loss on tingi! Increase per-piece price.'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity style={styles.btnSave} activeOpacity={0.8} onPress={handleSubmit}>
              <Text style={styles.btnSaveText}>{initialProduct ? 'Update Product' : 'Save to Inventory'}</Text>
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeText: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  catRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  catChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  catChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  profitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
  },
  profitBadgeGreen: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  profitBadgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  profitText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profitTextGreen: {
    color: '#34D399',
  },
  profitTextRed: {
    color: '#EF4444',
  },
  tingiToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  tingiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  tingiSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  tingiContainer: {
    backgroundColor: '#0B1120',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  btnSave: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});