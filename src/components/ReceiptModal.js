import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';

export default function ReceiptModal({
  visible,
  onClose,
  receiptData,
  storeName,
  receiptFooter = 'Thank you, please come again! ❤️',
  receiptContact = '',
}) {
  if (!receiptData) return null;

  const isDebt = receiptData.paymentType === 'debt';

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.receiptContainer}>
          {/* Paper Receipt Header */}
          <View style={styles.header}>
            <Text style={styles.storeTitle}>{storeName}</Text>
            <Text style={styles.subText}>OFFICIAL SALES RECEIPT</Text>
            {receiptContact ? (
              <Text style={styles.contactText}>📞 {receiptContact}</Text>
            ) : null}
            <Text style={styles.dateText}>{receiptData.createdAt}</Text>
            <Text style={styles.receiptId}>TRX #{receiptData.id.slice(-6)}</Text>
          </View>

          <View style={styles.dashedLine} />

          {/* Itemized list */}
          <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
            {receiptData.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={{ flex: 2, paddingRight: 10 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemType}>
                    {item.type === 'pack' ? 'Pack' : 'Piece'} x{item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₱{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dashedLine} />

          {/* Totals & Payments */}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.totalAmount}>₱{receiptData.totalAmount.toFixed(2)}</Text>
          </View>

          {/* Conditional Rendering: Cash vs Debt */}
          {isDebt ? (
            <>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>CUSTOMER</Text>
                <Text style={[styles.calcValue, { fontWeight: '800' }]}>
                  {receiptData.customerName}
                </Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>PAYMENT TYPE</Text>
                <Text style={[styles.calcValue, { color: '#EF4444', fontWeight: '800' }]}>
                  CREDIT / UNPAID
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>CASH TENDERED</Text>
                <Text style={styles.calcValue}>₱{receiptData.cashTendered.toFixed(2)}</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>CHANGE</Text>
                <Text style={[styles.calcValue, { color: '#0284C7' }]}>
                  ₱{receiptData.change.toFixed(2)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.dashedLine} />

          {/* Custom Footer Note */}
          {receiptFooter ? (
            <View style={styles.footerNoteContainer}>
              <Text style={styles.footerNoteText}>{receiptFooter}</Text>
            </View>
          ) : null}

          {/* Close button */}
          <TouchableOpacity style={styles.btnClose} activeOpacity={0.8} onPress={onClose}>
            <Text style={styles.btnCloseText}>Close Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  receiptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
  },
  storeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  subText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 2,
  },
  contactText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
    marginTop: 3,
  },
  dateText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  receiptId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  itemList: {
    maxHeight: 180,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemType: {
    fontSize: 11,
    color: '#64748B',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  footerNoteContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  footerNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  btnClose: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});