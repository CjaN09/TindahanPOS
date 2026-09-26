import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function DebtModal({
  visible,
  onClose,
  debts = [],
  onPayDebt,
}) {
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('oldest'); // 'oldest' | 'newest' | 'amount'

  const totalUnpaid = debts.reduce((sum, d) => sum + (d.status === 'unpaid' ? d.balance : 0), 0);
  
  // Filter active debts matching search
  const filteredDebts = debts.filter((d) => {
    if (d.status !== 'unpaid') return false;
    if (!searchQuery.trim()) return true;
    return d.customerName.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  // Sort logic
  const sortedDebts = [...filteredDebts].sort((a, b) => {
    const timeA = parseInt(a.id, 10) || 0;
    const timeB = parseInt(b.id, 10) || 0;

    if (sortBy === 'oldest') {
      return timeA - timeB; // Oldest debts first (priority collection)
    }
    if (sortBy === 'newest') {
      return timeB - timeA; // Recent credit first
    }
    if (sortBy === 'amount') {
      return b.balance - a.balance; // Highest debt first
    }
    return 0;
  });

  const handleOpenPayModal = (debt) => {
    setSelectedDebt(debt);
    setPayAmount(debt.balance.toString());
  };

  const handleClosePayModal = () => {
    setSelectedDebt(null);
    setPayAmount('');
  };

  const handleProcessPayment = () => {
    const cashTendered = parseFloat(payAmount);
    if (isNaN(cashTendered) || cashTendered <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    const paymentDeduction = Math.min(cashTendered, selectedDebt.balance);
    const change = cashTendered > selectedDebt.balance ? cashTendered - selectedDebt.balance : 0;

    onPayDebt(selectedDebt.id, paymentDeduction);

    if (change > 0) {
      Alert.alert(
        'Payment Recorded!',
        `Excess amount received.\n\nChange: ₱${change.toFixed(2)}`
      );
    } else if (paymentDeduction < selectedDebt.balance) {
      Alert.alert(
        'Payment Recorded!',
        `Partial payment accepted. Remaining balance: ₱${(selectedDebt.balance - paymentDeduction).toFixed(2)}`
      );
    }

    handleClosePayModal();
  };

  const parsedPayAmount = parseFloat(payAmount) || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>📒 Credit Book</Text>
              <Text style={styles.subtitle}>{debts.filter(d => d.status === 'unpaid').length} active records</Text>
            </View>
            <TouchableOpacity style={styles.btnClose} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.btnCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Total Unpaid Banner */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>TOTAL OUTSTANDING BALANCE</Text>
            <Text style={styles.summaryValue}>₱{totalUnpaid.toFixed(2)}</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer name..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.searchClearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Selection Chips */}
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>SORT BY:</Text>
            <TouchableOpacity
              style={[styles.sortChip, sortBy === 'oldest' && styles.sortChipActive]}
              onPress={() => setSortBy('oldest')}
            >
              <Text style={[styles.sortChipText, sortBy === 'oldest' && styles.sortChipTextActive]}>
                ⏳ Oldest
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortChip, sortBy === 'newest' && styles.sortChipActive]}
              onPress={() => setSortBy('newest')}
            >
              <Text style={[styles.sortChipText, sortBy === 'newest' && styles.sortChipTextActive]}>
                ⚡ Newest
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortChip, sortBy === 'amount' && styles.sortChipActive]}
              onPress={() => setSortBy('amount')}
            >
              <Text style={[styles.sortChipText, sortBy === 'amount' && styles.sortChipTextActive]}>
                💰 Highest
              </Text>
            </TouchableOpacity>
          </View>

          {/* Debt List */}
          {sortedDebts.length === 0 ? (
            <View style={styles.emptyBox}>
              {searchQuery ? (
                <>
                  <Text style={styles.emptyEmoji}>🔎</Text>
                  <Text style={styles.emptyTitle}>No matches found</Text>
                  <Text style={styles.emptySub}>No record matching "{searchQuery}".</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyEmoji}>🎉</Text>
                  <Text style={styles.emptyTitle}>All Clear!</Text>
                  <Text style={styles.emptySub}>All customer credit balances have been fully settled.</Text>
                </>
              )}
            </View>
          ) : (
            <FlatList
              data={sortedDebts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <View style={styles.debtCard}>
                  <View style={styles.debtHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.customerName}>👤 {item.customerName}</Text>
                      <Text style={styles.dateText}>{item.createdAt}</Text>
                    </View>
                    <View style={styles.balanceBadge}>
                      <Text style={styles.balanceText}>₱{item.balance.toFixed(2)}</Text>
                    </View>
                  </View>

                  <Text style={styles.itemsText} numberOfLines={1}>
                    Items: {item.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </Text>

                  <View style={styles.debtActions}>
                    <TouchableOpacity
                      style={styles.btnPayPartial}
                      activeOpacity={0.8}
                      onPress={() => handleOpenPayModal(item)}
                    >
                      <Text style={styles.btnPayPartialText}>Pay / Settle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>

      {/* Payment Dialog Modal */}
      <Modal
        visible={!!selectedDebt}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClosePayModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.payModalOverlay}
        >
          <View style={styles.payBox}>
            {selectedDebt && (
              <>
                <View style={styles.payBoxHeader}>
                  <Text style={styles.payBoxTitle}>Payment from {selectedDebt.customerName}</Text>
                  <Text style={styles.payBoxSub}>Current Balance: ₱{selectedDebt.balance.toFixed(2)}</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefix}>₱</Text>
                  <TextInput
                    style={styles.payInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#475569"
                    value={payAmount}
                    onChangeText={setPayAmount}
                    autoFocus
                  />
                </View>

                {/* Change Indicator */}
                {parsedPayAmount > selectedDebt.balance && (
                  <View style={styles.changeBox}>
                    <Text style={styles.changeLabel}>CHANGE:</Text>
                    <Text style={styles.changeValue}>
                      ₱{(parsedPayAmount - selectedDebt.balance).toFixed(2)}
                    </Text>
                  </View>
                )}

                {/* Remaining Balance Indicator */}
                {parsedPayAmount > 0 && parsedPayAmount < selectedDebt.balance && (
                  <View style={styles.partialBox}>
                    <Text style={styles.partialLabel}>Remaining Balance:</Text>
                    <Text style={styles.partialValue}>
                      ₱{(selectedDebt.balance - parsedPayAmount).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.payButtonRow}>
                  <TouchableOpacity
                    style={styles.btnCancelPay}
                    onPress={handleClosePayModal}
                  >
                    <Text style={styles.btnCancelPayText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnConfirmPay}
                    activeOpacity={0.8}
                    onPress={handleProcessPayment}
                  >
                    <Text style={styles.btnConfirmPayText}>Record Payment ✓</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: '88%',
    borderWidth: 1,
    borderColor: '#1E293B',
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
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  btnClose: {
    padding: 6,
  },
  btnCloseText: {
    color: '#94A3B8',
    fontSize: 18,
  },
  summaryBox: {
    backgroundColor: '#070B14',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F87171',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  searchClearBtn: {
    color: '#94A3B8',
    fontSize: 14,
    paddingHorizontal: 6,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sortLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  sortChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sortChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  sortChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  debtCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  balanceBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  balanceText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '800',
  },
  itemsText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
  },
  debtActions: {
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  btnPayPartial: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnPayPartialText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  payModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  payBox: {
    width: '100%',
    backgroundColor: '#0B1120',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  payBoxHeader: {
    marginBottom: 14,
  },
  payBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  payBoxSub: {
    fontSize: 13,
    color: '#F87171',
    fontWeight: '600',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  inputPrefix: {
    color: '#94A3B8',
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  payInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    paddingVertical: 10,
  },
  changeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  changeLabel: {
    color: '#34D399',
    fontWeight: '800',
    fontSize: 12,
  },
  changeValue: {
    color: '#34D399',
    fontWeight: '800',
    fontSize: 16,
  },
  partialBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  partialLabel: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 12,
  },
  partialValue: {
    color: '#F59E0B',
    fontWeight: '800',
    fontSize: 16,
  },
  payButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancelPay: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancelPayText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  btnConfirmPay: {
    flex: 1.5,
    backgroundColor: '#34D399',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnConfirmPayText: {
    color: '#070B14',
    fontSize: 13,
    fontWeight: '800',
  },
});