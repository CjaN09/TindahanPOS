import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { translations } from '../utils/translations';

export default function HomeScreen({
  stores,
  currentUser,
  language = 'english',
  onOpenAuthModal,
  onOpenSettingsModal,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteStore,
  onSelectStore,
}) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const t = translations[language] || translations.english;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.brandContainer}>
          <View style={styles.brandSubtitleRow}>
            <Animated.View style={[styles.brandDot, { opacity: pulseAnim }]} />
            <Text style={styles.brandSubtitle}>{t.subtitle}</Text>
          </View>
          <Text style={styles.brandTitle}>
            Tindahan<Text style={{ color: '#38BDF8' }}>POS</Text>
          </Text>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={onOpenSettingsModal}
          >
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, currentUser && styles.btnUserAvatarActive]}
            activeOpacity={0.7}
            onPress={onOpenAuthModal}
          >
            <Text style={styles.avatarText}>
              {currentUser ? currentUser.name?.charAt(0).toUpperCase() || '👤' : '👤'}
            </Text>
            {currentUser && <View style={styles.avatarOnlineDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnAdd}
            activeOpacity={0.8}
            onPress={onOpenCreateModal}
          >
            <Text style={styles.btnAddText}>{t.addStore}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stat Banner */}
      <View style={styles.statBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t.stores}</Text>
          <Text style={styles.statValue}>{stores.length}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t.backup}</Text>
          <Text
            style={[
              styles.statValue,
              { color: currentUser ? '#34D399' : '#FBBF24', fontSize: 13, marginTop: 4 },
            ]}
          >
            {currentUser ? t.cloud : t.offline}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t.account}</Text>
          <Text
            style={[
              styles.statValue,
              { color: currentUser ? '#38BDF8' : '#94A3B8', fontSize: 12, marginTop: 4 },
            ]}
            numberOfLines={1}
          >
            {currentUser ? currentUser.name?.split(' ')[0] || t.active : t.guest}
          </Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t.myStores}</Text>
        <Text style={styles.sectionSub}>{stores.length} {t.activeCount}</Text>
      </View>

      {/* Store List */}
      <View style={styles.listWrapper}>
        {stores.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>🏪</Text>
            </View>
            <Text style={styles.emptyTitle}>{t.noStoresTitle}</Text>
            <Text style={styles.emptyDesc}>{t.noStoresDesc}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.8}
              onPress={onOpenCreateModal}
            >
              <Text style={styles.emptyBtnText}>{t.createStoreBtn}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.storeAvatar}>
                    <Text style={styles.storeAvatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.storeOwner} numberOfLines={1}>
                      {item.owner ? `${t.ownerPrefix} ${item.owner}` : `${t.ownerPrefix} ${t.notSpecified}`}
                    </Text>
                  </View>

                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{t.statusReady}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>{t.createdPrefix} {item.createdAt}</Text>

                  <View style={styles.actionButtonGroup}>
                    <TouchableOpacity
                      style={styles.btnActionIcon}
                      onPress={() => onOpenEditModal(item)}
                    >
                      <Text style={styles.btnActionIconText}>✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnActionIcon, styles.btnActionDelete]}
                      onPress={() => onDeleteStore(item.id, item.name)}
                    >
                      <Text style={styles.btnActionDeleteText}>🗑️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnLaunch}
                      activeOpacity={0.8}
                      onPress={() => onSelectStore(item)}
                    >
                      <Text style={styles.btnLaunchText}>{t.openPos}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Footer */}
      <View style={styles.bottomFooter}>
        <Text style={styles.footerBrandText}>
          TindahanPOS • v1.0.1
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandContainer: {
    flex: 1,
  },
  brandSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    position: 'relative',
  },
  iconText: {
    fontSize: 16,
  },
  avatarText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnUserAvatarActive: {
    borderColor: '#38BDF8',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
    borderWidth: 1.5,
    borderColor: '#070B14',
  },
  btnAdd: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnAddText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statBanner: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1E293B',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  listWrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  storeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  storeAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
  },
  cardInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  storeOwner: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderColor: '#1E293B',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  btnActionIcon: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnActionIconText: {
    fontSize: 11,
  },
  btnActionDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  btnActionDeleteText: {
    fontSize: 11,
  },
  btnLaunch: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnLaunchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 16,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyEmoji: {
    fontSize: 26,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 18,
  },
  emptyBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomFooter: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerBrandText: {
    fontSize: 11,
    color: '#64748B',
  },
});