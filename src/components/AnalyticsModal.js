import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsModal({ visible, onClose, sales = [], storeName }) {
  const [filterMode, setFilterMode] = useState('today'); // 'today' | '7days' | 'all'

  // Helper to filter dates
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

  // Filter sales based on active tab
  const filteredSales = sales.filter((s) => isDateInRange(s.id, filterMode));

  // 1. Calculate Summary Totals based on filtered data
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);
  const totalOrders = filteredSales.length;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // 2. Aggregate Top Selling Products based on filtered data
  const productSalesMap = {};
  filteredSales.forEach((receipt) => {
    (receipt.items || []).forEach((item) => {
      if (!productSalesMap[item.name]) {
        productSalesMap[item.name] = { name: item.name, count: 0, revenue: 0 };
      }
      productSalesMap[item.name].count += item.quantity;
      productSalesMap[item.name].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 3. Prepare Chart Data for Last 5 Transactions within the filtered period
  const chartSalesSlice = [...filteredSales].sort((a, b) => b.id - a.id).slice(0, 5).reverse();
  const chartLabels = chartSalesSlice.length > 0
    ? chartSalesSlice.map((s, idx) => `T${idx + 1}`)
    : ['No Data'];
  const chartDataPoints = chartSalesSlice.length > 0
    ? chartSalesSlice.map((s) => s.totalAmount)
    : [0];

  const barData = {
    labels: chartLabels,
    datasets: [{ data: chartDataPoints }],
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>📊 Sales & Profit Analytics</Text>
              <Text style={styles.subtitle}>{storeName} Overview</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* KPI Metric Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TOTAL REVENUE</Text>
                <Text style={styles.kpiValue}>₱{totalRevenue.toFixed(2)}</Text>
              </View>

              <View style={[styles.kpiCard, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                <Text style={[styles.kpiLabel, { color: '#38BDF8' }]}>NET PROFIT</Text>
                <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>₱{totalProfit.toFixed(2)}</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TRANSACTIONS</Text>
                <Text style={styles.kpiValue}>{totalOrders} sales</Text>
              </View>

              <View style={[styles.kpiCard, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}>
                <Text style={[styles.kpiLabel, { color: '#34D399' }]}>PROFIT MARGIN</Text>
                <Text style={[styles.kpiValue, { color: '#34D399' }]}>{profitMargin}%</Text>
              </View>
            </View>

            {/* Sales Volume Bar Chart */}
            <Text style={styles.sectionHeader}>📈 Sales Performance (Recent Transactions)</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={barData}
                width={screenWidth - 72}
                height={180}
                yAxisLabel="₱"
                yAxisSuffix=""
                fromZero={true}
                showValuesOnTopOfBars={true}
                chartConfig={{
                  backgroundColor: '#070B14',
                  backgroundGradientFrom: '#070B14',
                  backgroundGradientTo: '#070B14',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                  barPercentage: 0.6,
                  propsForBackgroundLines: {
                    strokeDasharray: '4',
                    stroke: '#1E293B',
                  },
                }}
                style={{ borderRadius: 12 }}
              />
            </View>

            {/* Top Products Leaderboard */}
            <Text style={styles.sectionHeader}>🏆 Top Selling Products (Best Sellers)</Text>
            {topProducts.length === 0 ? (
              <Text style={styles.emptyText}>No sales recorded for this period.</Text>
            ) : (
              topProducts.map((prod, idx) => (
                <View key={prod.name} style={styles.topProdCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topProdName}>{prod.name}</Text>
                    <Text style={styles.topProdSub}>Total Sold: {prod.count} qty</Text>
                  </View>
                  <Text style={styles.topProdRevenue}>₱{prod.revenue.toFixed(2)}</Text>
                </View>
              ))
            )}
          </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    paddingBottom: 10,
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
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#070B14',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginTop: 8,
    marginBottom: 10,
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: '#070B14',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
  topProdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B14',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  topProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  topProdSub: {
    fontSize: 10,
    color: '#64748B',
  },
  topProdRevenue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34D399',
  },
});