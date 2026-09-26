import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { exportSalesReportPDF } from '../utils/pdfExporter';

export default function SalesHistoryModal({
  visible,
  onClose,
  sales = [],
  storeName = 'Store',
  onViewReceipt,
}) {
  const [filterMode, setFilterMode] = useState('today'); // 'today' | '7days' | 'all'
  const [isExporting, setIsExporting] = useState(false);

  // Helper to check date matching based on the receipt's created time
  const isDateInRange = (timestampId, mode) => {
    if (mode === 'all') return true;
    
    const saleDate = new Date(parseInt(timestampId, 10));
    const today = new Date();
    
    if (mode === 'today') {
      return (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
    }
    
    if (mode === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return saleDate >= sevenDaysAgo;
    }
    
    return true;
  };

  // 1. Filter sales based on the selected tab
  // 2. Sort from newest to oldest
  const displayedSales = sales
    .filter((s) => isDateInRange(s.id, filterMode))
    .sort((a, b) => b.id - a.id);

  // Recalculate metrics dynamically based on active filter
  const totalRevenue = displayedSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = displayedSales.reduce((sum, s) => sum + s.totalProfit, 0);

  const handleExportPDF = async () => {
    setIsExporting(true);
    const filterLabel = filterMode === 'today' ? 'TODAY' : filterMode === '7days' ? 'LAST 7 DAYS' : 'ALL TIME';
    await exportSalesReportPDF(storeName, displayedSales, totalRevenue, totalProfit, filterLabel);
    setIsExporting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>📜 Sales History</Text>
              <Text style={styles.subtitle}>{displayedSales.length} transactions recorded</Text>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={styles.btnPdfHeader}
                activeOpacity={0.8}
                onPress={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnPdfHeaderText}>📄 PDF</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnCloseIcon} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.btnCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'today' && styles.filterTabActive]}
              onPress={() => setFilterMode('today')}
            >
              <Text style={[styles.filterTabText, filterMode === 'today' && styles.filterTabTextActive]}>
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterMode === '7days' && styles.filterTabActive]}
              onPress={() => setFilterMode('7days')}
            >
              <Text style={[styles.filterTabText, filterMode === '7days' && styles.filterTabTextActive]}>
                Last 7 Days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
              onPress={() => setFilterMode('all')}
            >
              <Text style={[styles.filterTabText, filterMode === 'all' && styles.filterTabTextActive]}>
                All Time
              </Text>
            </TouchableOpacity>
          </View>

          {/* Metrics summary */}
          <View style={styles.metricsBox}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>TOTAL REVENUE</Text>
              <Text style={styles.metricValue}>₱{totalRevenue.toFixed(2)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>TOTAL PROFIT</Text>
              <Text style={[styles.metricValue, { color: '#34D399' }]}>
                +₱{totalProfit.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* List of Transactions */}
          {displayedSales.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>No sales found</Text>
              <Text style={styles.emptyText}>
                {filterMode === 'today'
                  ? "You haven't made any sales today yet."
                  : 'Receipts will appear here after a successful checkout.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayedSales}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.saleCard}
                  activeOpacity={0.7}
                  onPress={() => onViewReceipt(item)}
                >
                  <View style={styles.saleHeader}>
                    <Text style={styles.trxId}>TRX #{item.id.slice(-6)}</Text>
                    <Text style={styles.timeText}>{item.createdAt}</Text>
                  </View>

                  <Text style={styles.itemsSummary} numberOfLines={1}>
                    {item.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </Text>

                  <View style={styles.saleFooter}>
                    <Text style={styles.totalPrice}>₱{item.totalAmount.toFixed(2)}</Text>
                    <Text style={styles.profitTag}>+₱{item.totalProfit.toFixed(2)} profit</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
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
    marginBottom: 16,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnPdfHeader: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnPdfHeaderText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
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
  btnCloseIcon: {
    padding: 6,
  },
  btnCloseIconText: {
    color: '#94A3B8',
    fontSize: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  metricsBox: {
    flexDirection: 'row',
    backgroundColor: '#070B14',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#1E293B',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
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
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  saleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  trxId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  itemsSummary: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 8,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 8,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  profitTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
});