import * as SecureStore from 'expo-secure-store';
import React, { useState, useEffect, useMemo } from 'react';
import { playBeep, playCash } from '../utils/soundHelper';
import { translations } from '../utils/translations';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ProductModal from '../components/ProductModal';
import ReceiptModal from '../components/ReceiptModal';
import SalesHistoryModal from '../components/SalesHistoryModal';
import DebtModal from '../components/DebtModal';
import RestockModal from '../components/RestockModal';
import AnalyticsModal from '../components/AnalyticsModal';

export default function DashboardScreen({
  activeStore,
  products = [],
  sales = [],
  debts = [],
  cashMovements = [],
  startingCashValue = 0,
  language = 'english',
  soundEnabled = true,
  receiptSettings,
  onSaveStartingCash,
  onAddCashMovement,
  onSaveProduct,
  onDeleteProduct,
  onCompleteSale,
  onPayDebt,
  onRestockProduct,
  onBack,
}) {
  const t = translations[language] || translations.english;

  // ------------------------------------------------------------
  // SEARCH
  // ------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('');

  // ------------------------------------------------------------
  // PIN / ACCESS CONTROL
  // ------------------------------------------------------------

  const PIN_STORAGE_KEY = 'admin_security_pin';
  const LEGACY_PIN_STORAGE_KEY = '@admin_security_pin';

  const [isCashierMode, setIsCashierMode] = useState(false);
  const [savedPin, setSavedPin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('unlock');

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // ------------------------------------------------------------
  // CASH DRAWER
  // ------------------------------------------------------------

  const [isSetCashModalOpen, setIsSetCashModalOpen] = useState(false);
  const [drawerModalTab, setDrawerModalTab] = useState('starting');
  const [tempStartingCashInput, setTempStartingCashInput] = useState('');
  const [movementType, setMovementType] = useState('out');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // ------------------------------------------------------------
  // PRODUCTS
  // ------------------------------------------------------------

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');

  const [restockProduct, setRestockProduct] = useState(null);

  // ------------------------------------------------------------
  // POS CART
  // ------------------------------------------------------------

  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [customerName, setCustomerName] = useState('');

  // ------------------------------------------------------------
  // OTHER MODALS
  // ------------------------------------------------------------

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const categories = [
    'All',
    'Cigarettes',
    'Snacks',
    'Beverages',
    'Canned Goods',
    'Coffee',
    'Others',
  ];

  // ------------------------------------------------------------
  // LOAD PIN
  // ------------------------------------------------------------

  useEffect(() => {
    loadSavedPin();
  }, []);

  const loadSavedPin = async () => {
  try {
    let pin = await SecureStore.getItemAsync(
      PIN_STORAGE_KEY
    );

    // Migrate existing plaintext PIN from AsyncStorage
    if (!pin) {
      const legacyPin =
        await AsyncStorage.getItem(
          LEGACY_PIN_STORAGE_KEY
        );

      if (legacyPin) {
        await SecureStore.setItemAsync(
          PIN_STORAGE_KEY,
          legacyPin
        );

        await AsyncStorage.removeItem(
          LEGACY_PIN_STORAGE_KEY
        );

        pin = legacyPin;
      }
    }

    if (pin) {
      setSavedPin(pin);
    }
  } catch (error) {
    console.error(
      'Error loading Security PIN:',
      error
    );
  }
};

  // ------------------------------------------------------------
  // PIN LOCKOUT TIMER
  // ------------------------------------------------------------

  useEffect(() => {
    let timer;

    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((previous) => previous - 1);
      }, 1000);
    } else if (lockoutTimer === 0 && failedAttempts >= 3) {
      setFailedAttempts(0);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [lockoutTimer, failedAttempts]);

  // ------------------------------------------------------------
  // DATE HELPERS
  // ------------------------------------------------------------

  const isToday = (record) => {
    if (!record) {
      return false;
    }

    let dateValue = null;

    if (record.createdAtISO) {
      dateValue = new Date(record.createdAtISO);
    } else if (record.createdAt) {
      dateValue = new Date(record.createdAt);
    }

    if (!dateValue || Number.isNaN(dateValue.getTime())) {
      return false;
    }

    const now = new Date();

    return (
      dateValue.getFullYear() === now.getFullYear() &&
      dateValue.getMonth() === now.getMonth() &&
      dateValue.getDate() === now.getDate()
    );
  };

  // ------------------------------------------------------------
  // CASH DRAWER
  // ------------------------------------------------------------

  const handleSaveStartingCashSubmit = () => {
    const amount = parseFloat(tempStartingCashInput) || 0;

    onSaveStartingCash(amount);

    setIsSetCashModalOpen(false);
    setTempStartingCashInput('');

    Alert.alert(
      'Saved!',
      `Starting cash set to ₱${amount.toFixed(2)}.`
    );
  };

  const handleAddMovementSubmit = () => {
    const amount = parseFloat(movementAmount);

    if (Number.isNaN(amount) || amount <= 0) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid cash amount.'
      );
      return;
    }

    const defaultReason =
      movementType === 'out'
        ? 'Expense / Cash Out'
        : 'Cash In / Addition';

    const finalReason = movementReason.trim()
      ? movementReason.trim()
      : defaultReason;

    const newMovement = {
      id: Date.now().toString(),
      storeId: activeStore.id,
      type: movementType,
      amount,
      reason: finalReason,
      createdAtISO: new Date().toISOString(),
      createdAt: new Date().toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    onAddCashMovement(newMovement);

    setMovementAmount('');
    setMovementReason('');
    setIsSetCashModalOpen(false);

    Alert.alert(
      'Recorded!',
      movementType === 'out'
        ? `Recorded an expense of ₱${amount.toFixed(
            2
          )} (${finalReason}).`
        : `Recorded cash inflow of ₱${amount.toFixed(
            2
          )} (${finalReason}).`
    );
  };

  // ------------------------------------------------------------
  // PIN
  // ------------------------------------------------------------

  const handlePinSubmit = async () => {
    if (lockoutTimer > 0) {
      Alert.alert(
        'Locked Out',
        `Too many failed attempts. Please wait ${lockoutTimer}s.`
      );
      return;
    }

    if (pinInput.length !== 4) {
      Alert.alert(
        'Invalid Length',
        'The PIN must be exactly 4 digits.'
      );
      return;
    }

    if (
      pinModalMode === 'create' ||
      pinModalMode === 'change'
    ) {
      if (pinInput !== pinConfirmInput) {
        Alert.alert(
          'PIN Mismatch',
          'The two PINs do not match. Try again.'
        );
        return;
      }

      await SecureStore.setItemAsync(
  PIN_STORAGE_KEY,
  pinInput
    );

      setSavedPin(pinInput);
      setIsPinModalOpen(false);
      setPinInput('');
      setPinConfirmInput('');

      if (pinModalMode === 'create') {
        setIsCashierMode(true);

        Alert.alert(
          'PIN Set!',
          'Your Security PIN is saved and Cashier Mode is active.'
        );
      } else {
        Alert.alert(
          'PIN Changed!',
          'Your Security PIN has been updated successfully.'
        );
      }

      return;
    }

    if (pinInput === savedPin) {
      setIsCashierMode(false);
      setIsPinModalOpen(false);
      setPinInput('');
      setFailedAttempts(0);

      Alert.alert(
        'Admin Mode',
        'Full Admin features are now unlocked.'
      );
    } else {
      const newAttempts = failedAttempts + 1;

      setFailedAttempts(newAttempts);
      setPinInput('');

      if (newAttempts >= 3) {
        setLockoutTimer(30);

        Alert.alert(
          'Locked Out! 🔒',
          'Too many incorrect attempts. PIN entry is locked for 30 seconds.'
        );
      } else {
        Alert.alert(
          'Incorrect PIN',
          `Incorrect PIN. ${3 - newAttempts} attempt(s) remaining.`
        );
      }
    }
  };

  const handleToggleModeClick = () => {
    if (isCashierMode) {
      setPinModalMode('unlock');
      setPinInput('');
      setIsPinModalOpen(true);
    } else {
      if (!savedPin) {
        setPinModalMode('create');
        setPinInput('');
        setPinConfirmInput('');
        setIsPinModalOpen(true);
      } else {
        setIsCashierMode(true);
      }
    }
  };

  // ------------------------------------------------------------
  // STOCK STATUS
  // ------------------------------------------------------------

  const getStockStatus = (prod) => {
    const pieces = Number(prod.totalPiecesStock) || 0;
    const piecesPerPack = Number(prod.piecesPerPack) || 1;

    const packsCount = Math.floor(
      pieces / piecesPerPack
    );

    const remainingPieces = pieces % piecesPerPack;

    if (pieces === 0) {
      return {
        label: 'Out of Stock',
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#F87171',
      };
    }

    if (pieces <= 5 || packsCount === 0) {
      return {
        label: `⚠️ Low! (${packsCount} pk | ${remainingPieces} pcs)`,
        bg: 'rgba(239, 68, 68, 0.12)',
        text: '#F87171',
      };
    }

    if (packsCount <= 1) {
      return {
        label: `Running Low (${packsCount} pk | ${remainingPieces} pcs)`,
        bg: 'rgba(251, 191, 36, 0.12)',
        text: '#FBBF24',
      };
    }

    return {
      label: prod.isTingiEnabled
        ? `${packsCount} pk | ${remainingPieces} pcs`
        : `${pieces} in stock`,
      bg: 'rgba(52, 211, 153, 0.12)',
      text: '#34D399',
    };
  };

  // ------------------------------------------------------------
  // ADD PRODUCT TO CART
  // ------------------------------------------------------------

  const handleAddToCart = (product, type) => {
    const piecesPerPack =
      Number(product.piecesPerPack) || 1;

    const isPack = type === 'pack';

    const piecesNeeded = isPack
      ? piecesPerPack
      : 1;

    const inCartPieces = cart
      .filter(
        (item) =>
          item.productId === product.id
      )
      .reduce(
        (sum, item) =>
          sum +
          (item.type === 'pack'
            ? item.quantity * piecesPerPack
            : item.quantity),
        0
      );

    const availableStock =
      Number(product.totalPiecesStock) || 0;

    if (
      availableStock <
      inCartPieces + piecesNeeded
    ) {
      Alert.alert(
        'Out of Stock!',
        `Not enough stock available for ${product.name}. Please restock.`
      );
      return;
    }

    playBeep(soundEnabled);

    const price = isPack
      ? Number(product.sellingPricePack) || 0
      : Number(product.sellingPricePiece) || 0;

    const costPerPiece =
      (Number(product.costPrice) || 0) /
      piecesPerPack;

    const cost = isPack
      ? Number(product.costPrice) || 0
      : costPerPiece;

    const profit = price - cost;

    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.type === type
    );

    if (existingIndex > -1) {
      const updated = [...cart];

      updated[existingIndex].quantity += 1;

      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          type,
          price,
          cost,
          profit,
          quantity: 1,
          piecesPerUnit: piecesNeeded,
        },
      ]);
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // ------------------------------------------------------------
  // CART TOTALS
  // ------------------------------------------------------------

  const cartTotalAmount = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );
  }, [cart]);

  const cartTotalProfit = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + item.profit * item.quantity,
      0
    );
  }, [cart]);

  const cartTotalItemsCount = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );
  }, [cart]);

  // ------------------------------------------------------------
  // CHECKOUT
  // ------------------------------------------------------------

  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert(
        'Empty Cart',
        'Please add at least one product before checkout.'
      );
      return;
    }

    const createdAtISO =
      new Date().toISOString();

    const createdAt =
      new Date().toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    if (paymentType === 'cash') {
      const cash =
        parseFloat(cashTendered) || 0;

      if (cash < cartTotalAmount) {
        Alert.alert(
          'Insufficient Amount',
          `The total amount is ₱${cartTotalAmount.toFixed(
            2
          )}.`
        );
        return;
      }

      const change =
        cash - cartTotalAmount;

      const newReceipt = {
        id: Date.now().toString(),
        storeId: activeStore.id,
        items: [...cart],
        totalAmount: cartTotalAmount,
        totalProfit: cartTotalProfit,
        paymentType: 'cash',
        cashTendered: cash,
        change,
        createdAtISO,
        createdAt,
      };

      

      await onCompleteSale(
  newReceipt,
  cart,
  null
);
playCash(soundEnabled);
setActiveReceipt(newReceipt);
    } else {
      if (!customerName.trim()) {
        Alert.alert(
          'Missing Name',
          'Please enter the name of the customer for the credit record.'
        );
        return;
      }

      const trimmedCustomerName =
        customerName.trim();

      const newDebt = {
        id: Date.now().toString(),
        storeId: activeStore.id,
        customerName: trimmedCustomerName,
        items: [...cart],
        totalAmount: cartTotalAmount,
        balance: cartTotalAmount,
        totalProfit: cartTotalProfit,
        status: 'unpaid',
        createdAtISO,
        createdAt,
      };

      const newReceipt = {
        id: Date.now().toString(),
        storeId: activeStore.id,
        items: [...cart],
        totalAmount: cartTotalAmount,
        totalProfit: cartTotalProfit,
        paymentType: 'debt',
        customerName: trimmedCustomerName,
        cashTendered: 0,
        change: 0,
        createdAtISO,
        createdAt,
      };

      await onCompleteSale(
        newReceipt,
        cart,
        newDebt
      );

      Alert.alert(
        'Credit Recorded!',
        `Recorded ₱${cartTotalAmount.toFixed(
          2
        )} under ${trimmedCustomerName}'s name.`
      );
    }

    setCart([]);
    setIsCheckoutOpen(false);
    setCashTendered('');
    setCustomerName('');
  };

  // ------------------------------------------------------------
  // STORE-SPECIFIC DATA
  // ------------------------------------------------------------

  const storeProducts = useMemo(() => {
    if (!activeStore?.id) {
      return [];
    }

    return products.filter(
      (product) =>
        product.storeId === activeStore.id
    );
  }, [products, activeStore]);

  const storeSales = useMemo(() => {
    if (!activeStore?.id) {
      return [];
    }

    return sales.filter(
      (sale) =>
        sale.storeId === activeStore.id
    );
  }, [sales, activeStore]);

  const storeDebts = useMemo(() => {
    if (!activeStore?.id) {
      return [];
    }

    return debts.filter(
      (debt) =>
        debt.storeId === activeStore.id
    );
  }, [debts, activeStore]);

  const storeCashMovements = useMemo(() => {
    if (!activeStore?.id) {
      return [];
    }

    return cashMovements.filter(
      (movement) =>
        movement.storeId === activeStore.id
    );
  }, [cashMovements, activeStore]);

  // ------------------------------------------------------------
  // TODAY'S DATA
  // ------------------------------------------------------------

  const todaysSales = useMemo(() => {
    return storeSales.filter(isToday);
  }, [storeSales]);

  const todaysCashMovements = useMemo(() => {
    return storeCashMovements.filter(isToday);
  }, [storeCashMovements]);

  const todaysSalesAmount = useMemo(() => {
    return todaysSales.reduce(
      (sum, sale) =>
        sum +
        (Number(sale.totalAmount) || 0),
      0
    );
  }, [todaysSales]);

  const todaysProfitAmount = useMemo(() => {
    return todaysSales.reduce(
      (sum, sale) =>
        sum +
        (Number(sale.totalProfit) || 0),
      0
    );
  }, [todaysSales]);

  const actualCashSales = useMemo(() => {
    return todaysSales
      .filter(
        (sale) =>
          sale.paymentType === 'cash'
      )
      .reduce(
        (sum, sale) =>
          sum +
          (Number(sale.totalAmount) || 0),
        0
      );
  }, [todaysSales]);

  const totalCashIn = useMemo(() => {
    return todaysCashMovements
      .filter(
        (movement) =>
          movement.type === 'in'
      )
      .reduce(
        (sum, movement) =>
          sum +
          (Number(movement.amount) || 0),
        0
      );
  }, [todaysCashMovements]);

  const totalCashOut = useMemo(() => {
    return todaysCashMovements
      .filter(
        (movement) =>
          movement.type === 'out'
      )
      .reduce(
        (sum, movement) =>
          sum +
          (Number(movement.amount) || 0),
        0
      );
  }, [todaysCashMovements]);

  const currentCashOnHand =
    (Number(startingCashValue) || 0) +
    actualCashSales +
    totalCashIn -
    totalCashOut;

  // ------------------------------------------------------------
  // PRODUCT FILTER
  // ------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase();

    return storeProducts.filter(
      (product) => {
        const matchesCategory =
          filterCategory === 'All' ||
          product.category ===
            filterCategory;

        const productName =
          String(product.name || '')
            .toLowerCase();

        const matchesSearch =
          productName.includes(query);

        return (
          matchesCategory &&
          matchesSearch
        );
      }
    );
  }, [
    storeProducts,
    filterCategory,
    searchQuery,
  ]);

  const cashValueCheckout =
    parseFloat(cashTendered) || 0;

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnBack}
          activeOpacity={0.7}
          onPress={onBack}
        >
          <Text style={styles.btnBackText}>
            {t.backToStores || t.stores}
          </Text>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.headerScrollContainer
          }
        >
          <TouchableOpacity
            style={[
              styles.btnModeToggle,
              isCashierMode &&
                styles.btnModeCashierActive,
            ]}
            onPress={handleToggleModeClick}
          >
            <Text
              style={[
                styles.btnModeToggleText,
                isCashierMode &&
                  styles.btnModeCashierActiveText,
              ]}
            >
              {isCashierMode
                ? t.cashierMode
                : t.adminMode}
            </Text>
          </TouchableOpacity>

          {!isCashierMode && (
            <TouchableOpacity
              style={styles.btnPinSettings}
              onPress={() => {
                setPinModalMode('change');
                setPinInput('');
                setPinConfirmInput('');
                setIsPinModalOpen(true);
              }}
            >
              <Text
                style={styles.btnPinSettingsText}
              >
                {t.pin}
              </Text>
            </TouchableOpacity>
          )}

          {!isCashierMode && (
            <TouchableOpacity
              style={styles.btnAnalytics}
              onPress={() =>
                setIsAnalyticsOpen(true)
              }
            >
              <Text
                style={styles.btnAnalyticsText}
              >
                {t.stats}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnDebtHeader}
            onPress={() =>
              setIsDebtOpen(true)
            }
          >
            <Text
              style={styles.btnDebtHeaderText}
            >
              {t.debt} (
              {
                storeDebts.filter(
                  (debt) =>
                    debt.status ===
                    'unpaid'
                ).length
              }
              )
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnHistory}
            onPress={() =>
              setIsHistoryOpen(true)
            }
          >
            <Text
              style={styles.btnHistoryText}
            >
              {t.history}
            </Text>
          </TouchableOpacity>

          {!isCashierMode && (
            <TouchableOpacity
              style={styles.btnAddProd}
              onPress={() => {
                setSelectedProduct(null);
                setIsProductModalOpen(true);
              }}
            >
              <Text
                style={styles.btnAddProdText}
              >
                {t.addItem}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Store Banner */}
      <View style={styles.bannerCard}>
        <View style={{ flex: 1 }}>
          <Text
            style={styles.storeName}
            numberOfLines={1}
          >
            {activeStore.name}
          </Text>

          <Text style={styles.ownerText}>
            {isCashierMode
              ? t.staffView
              : activeStore.owner
              ? `In-Charge: ${activeStore.owner}`
              : t.posTerminal}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          {!isCashierMode && (
            <>
              <TouchableOpacity
                style={styles.statBox}
                activeOpacity={0.7}
                onPress={() => {
                  setTempStartingCashInput(
                    String(
                      startingCashValue || 0
                    )
                  );
                  setDrawerModalTab(
                    'starting'
                  );
                  setIsSetCashModalOpen(
                    true
                  );
                }}
              >
                <Text
                  style={[
                    styles.dailyStatLabel,
                    { color: '#FBBF24' },
                  ]}
                >
                  {t.cashDrawer}
                </Text>

                <Text
                  style={[
                    styles.dailyStatValue,
                    { color: '#FBBF24' },
                  ]}
                >
                  ₱
                  {currentCashOnHand.toFixed(
                    2
                  )}
                </Text>
              </TouchableOpacity>

              <View
                style={
                  styles.statDividerVertical
                }
              />
            </>
          )}

          <View style={styles.statBox}>
            <Text
              style={styles.dailyStatLabel}
            >
              {t.salesToday}
            </Text>

            <Text
              style={styles.dailyStatValue}
            >
              ₱
              {todaysSalesAmount.toFixed(
                2
              )}
            </Text>
          </View>

          {!isCashierMode && (
            <>
              <View
                style={
                  styles.statDividerVertical
                }
              />

              <View style={styles.statBox}>
                <Text
                  style={[
                    styles.dailyStatLabel,
                    { color: '#38BDF8' },
                  ]}
                >
                  {t.profit}
                </Text>

                <Text
                  style={[
                    styles.dailyStatValue,
                    { color: '#38BDF8' },
                  ]}
                >
                  ₱
                  {todaysProfitAmount.toFixed(
                    2
                  )}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>
          🔍
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              setSearchQuery('')
            }
            hitSlop={{
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            }}
          >
            <Text
              style={
                styles.searchClearBtn
              }
            >
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={{ marginBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.pill,
                filterCategory ===
                  item &&
                  styles.pillActive,
              ]}
              onPress={() =>
                setFilterCategory(item)
              }
            >
              <Text
                style={[
                  styles.pillText,
                  filterCategory ===
                    item &&
                    styles.pillTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) =>
          String(item.id)
        }
        contentContainerStyle={{
          paddingBottom:
            cart.length > 0
              ? 120
              : 24,
        }}
        ListEmptyComponent={
          <View
            style={
              styles.emptyContainer
            }
          >
            <Text
              style={styles.emptyEmoji}
            >
              🔎
            </Text>

            <Text
              style={styles.emptyText}
            >
              No products found
            </Text>

            <Text
              style={
                styles.emptySubText
              }
            >
              {searchQuery
                ? `No matches for "${searchQuery}"`
                : 'Tap "+ Item" above to add products to your inventory.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status =
            getStockStatus(item);

          const piecesPerPack =
            Number(
              item.piecesPerPack
            ) || 1;

          const costPrice =
            Number(
              item.costPrice
            ) || 0;

          const sellingPricePack =
            Number(
              item.sellingPricePack
            ) || 0;

          const sellingPricePiece =
            Number(
              item.sellingPricePiece
            ) || 0;

          return (
            <View
              style={
                styles.productCard
              }
            >
              <View
                style={
                  styles.prodHeader
                }
              >
                <View
                  style={{
                    flex: 1,
                    paddingRight: 6,
                  }}
                >
                  <Text
                    style={
                      styles.prodCategory
                    }
                  >
                    {String(
                      item.category ||
                        'Others'
                    ).toUpperCase()}
                  </Text>

                  <Text
                    style={
                      styles.prodName
                    }
                  >
                    {item.name}
                  </Text>
                </View>

                <View
                  style={[
                    styles.stockBadge,
                    {
                      backgroundColor:
                        status.bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockBadgeText,
                      {
                        color:
                          status.text,
                      },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>

              {!isCashierMode ? (
                <View
                  style={
                    styles.priceRow
                  }
                >
                  <View
                    style={
                      styles.priceBlock
                    }
                  >
                    <Text
                      style={
                        styles.priceLabel
                      }
                    >
                      {t.cost}
                    </Text>

                    <Text
                      style={[
                        styles.priceValue,
                        {
                          color:
                            '#94A3B8',
                        },
                      ]}
                    >
                      ₱
                      {costPrice.toFixed(
                        2
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.priceBlock
                    }
                  >
                    <Text
                      style={
                        styles.priceLabel
                      }
                    >
                      {t.packPrice}
                    </Text>

                    <Text
                      style={
                        styles.priceValue
                      }
                    >
                      ₱
                      {sellingPricePack.toFixed(
                        2
                      )}{' '}
                      <Text
                        style={{
                          fontSize: 10,
                          color:
                            '#34D399',
                        }}
                      >
                        (+₱
                        {(
                          sellingPricePack -
                          costPrice
                        ).toFixed(1)}
                        )
                      </Text>
                    </Text>
                  </View>

                  {item.isTingiEnabled && (
                    <View
                      style={
                        styles.priceBlock
                      }
                    >
                      <Text
                        style={
                          styles.priceLabel
                        }
                      >
                        {t.tingiPrice}
                      </Text>

                      <Text
                        style={[
                          styles.priceValue,
                          {
                            color:
                              '#38BDF8',
                          },
                        ]}
                      >
                        ₱
                        {sellingPricePiece.toFixed(
                          2
                        )}{' '}
                        <Text
                          style={{
                            fontSize: 10,
                            color:
                              '#34D399',
                          }}
                        >
                          (+₱
                          {(
                            sellingPricePiece -
                            costPrice /
                              piecesPerPack
                          ).toFixed(1)}
                          )
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View
                  style={
                    styles.priceRow
                  }
                >
                  <View
                    style={[
                      styles.priceBlock,
                      {
                        flex: 1,
                        alignItems:
                          'flex-start',
                        paddingLeft: 6,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.priceLabel
                      }
                    >
                      {t.pricePackOnly}
                    </Text>

                    <Text
                      style={
                        styles.priceValue
                      }
                    >
                      ₱
                      {sellingPricePack.toFixed(
                        2
                      )}
                    </Text>
                  </View>

                  {item.isTingiEnabled && (
                    <View
                      style={[
                        styles.priceBlock,
                        {
                          flex: 1,
                          alignItems:
                            'flex-end',
                          paddingRight: 6,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.priceLabel
                        }
                      >
                        {t.priceTingiOnly}
                      </Text>

                      <Text
                        style={[
                          styles.priceValue,
                          {
                            color:
                              '#38BDF8',
                          },
                        ]}
                      >
                        ₱
                        {sellingPricePiece.toFixed(
                          2
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View
                style={
                  styles.cardFooterRow
                }
              >
                {/* Restock is now Admin Only */}
                {!isCashierMode && (
                  <TouchableOpacity
                    style={
                      styles.btnRestock
                    }
                    onPress={() =>
                      setRestockProduct(
                        item
                      )
                    }
                  >
                    <Text
                      style={
                        styles.btnRestockText
                      }
                    >
                      {t.restock}
                    </Text>
                  </TouchableOpacity>
                )}

                {!isCashierMode && (
                  <>
                    <TouchableOpacity
                      style={
                        styles.btnActionSmall
                      }
                      onPress={() => {
                        setSelectedProduct(
                          item
                        );
                        setIsProductModalOpen(
                          true
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.btnActionSmallText
                        }
                      >
                        {t.edit}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.btnActionSmall,
                        {
                          backgroundColor:
                            'rgba(239, 68, 68, 0.12)',
                        },
                      ]}
                      onPress={() =>
                        onDeleteProduct(
                          item.id,
                          item.name
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.btnActionSmallText,
                          {
                            color:
                              '#F87171',
                          },
                        ]}
                      >
                        {t.delete}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <View
                  style={
                    styles.buyButtonRow
                  }
                >
                  {item.isTingiEnabled && (
                    <TouchableOpacity
                      style={
                        styles.btnBuyTingi
                      }
                      onPress={() =>
                        handleAddToCart(
                          item,
                          'piece'
                        )
                      }
                    >
                      <Text
                        style={
                          styles.btnBuyTingiText
                        }
                      >
                        {t.addTingi}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={
                      styles.btnBuyPack
                    }
                    onPress={() =>
                      handleAddToCart(
                        item,
                        'pack'
                      )
                    }
                  >
                    <Text
                      style={
                        styles.btnBuyPackText
                      }
                    >
                      {t.addPack}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Floating Cart */}
      {cart.length > 0 && (
        <View
          style={
            styles.cartFloatingBar
          }
        >
          <View>
            <Text
              style={
                styles.cartCount
              }
            >
              {cartTotalItemsCount}{' '}
              {t.itemsInCart}
            </Text>

            <Text
              style={
                styles.cartPrice
              }
            >
              {t.total}: ₱
              {cartTotalAmount.toFixed(
                2
              )}
            </Text>
          </View>

          <View
            style={{
              flexDirection:
                'row',
              gap: 8,
            }}
          >
            <TouchableOpacity
              style={
                styles.btnClearCart
              }
              onPress={
                handleClearCart
              }
            >
              <Text
                style={
                  styles.btnClearCartText
                }
              >
                {t.clear}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.btnCheckout
              }
              activeOpacity={0.8}
              onPress={() => {
                setPaymentType(
                  'cash'
                );
                setCashTendered(
                  cartTotalAmount.toString()
                );
                setIsCheckoutOpen(
                  true
                );
              }}
            >
              <Text
                style={
                  styles.btnCheckoutText
                }
              >
                {t.checkoutBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CHECKOUT MODAL */}
      <Modal
        visible={isCheckoutOpen}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={
            styles.checkoutOverlay
          }
        >
          <View
            style={
              styles.checkoutCard
            }
          >
            <Text
              style={
                styles.checkoutTitle
              }
            >
              {t.choosePayment}
            </Text>

            <View
              style={
                styles.paymentMethodRow
              }
            >
              <TouchableOpacity
                style={[
                  styles.btnPayType,
                  paymentType ===
                    'cash' &&
                    styles.btnPayTypeActive,
                ]}
                onPress={() =>
                  setPaymentType(
                    'cash'
                  )
                }
              >
                <Text
                  style={[
                    styles.btnPayTypeText,
                    paymentType ===
                      'cash' &&
                      styles.btnPayTypeTextActive,
                  ]}
                >
                  {t.cashPayment}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnPayType,
                  paymentType ===
                    'debt' &&
                    styles.btnPayTypeActiveRed,
                ]}
                onPress={() =>
                  setPaymentType(
                    'debt'
                  )
                }
              >
                <Text
                  style={[
                    styles.btnPayTypeText,
                    paymentType ===
                      'debt' &&
                      styles.btnPayTypeTextActiveRed,
                  ]}
                >
                  {t.debtPayment}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={
                styles.checkoutAmountLabel
              }
            >
              {t.totalAmountLabel}
            </Text>

            <Text
              style={
                styles.checkoutAmount
              }
            >
              ₱
              {cartTotalAmount.toFixed(
                2
              )}
            </Text>

            {paymentType ===
            'cash' ? (
              <>
                <Text
                  style={
                    styles.checkoutInputLabel
                  }
                >
                  {t.cashTenderedLabel}
                </Text>

                <TextInput
                  style={
                    styles.checkoutInput
                  }
                  keyboardType="decimal-pad"
                  value={
                    cashTendered
                  }
                  onChangeText={
                    setCashTendered
                  }
                  autoFocus
                />

                {cashValueCheckout >=
                  cartTotalAmount && (
                  <View
                    style={
                      styles.changeBadge
                    }
                  >
                    <Text
                      style={
                        styles.changeLabel
                      }
                    >
                      {t.changeLabel}
                    </Text>

                    <Text
                      style={
                        styles.changeValue
                      }
                    >
                      ₱
                      {(
                        cashValueCheckout -
                        cartTotalAmount
                      ).toFixed(2)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text
                  style={
                    styles.checkoutInputLabel
                  }
                >
                  {t.customerNameLabel}
                </Text>

                <TextInput
                  style={
                    styles.checkoutInput
                  }
                  placeholder="e.g., Alex Santos"
                  placeholderTextColor="#64748B"
                  value={
                    customerName
                  }
                  onChangeText={
                    setCustomerName
                  }
                  autoFocus
                />
              </>
            )}

            <View
              style={
                styles.checkoutButtonsRow
              }
            >
              <TouchableOpacity
                style={
                  styles.btnCancelCheckout
                }
                onPress={() =>
                  setIsCheckoutOpen(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.btnCancelCheckoutText
                  }
                >
                  {t.backBtn}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnConfirmSale,
                  paymentType ===
                    'debt' && {
                    backgroundColor:
                      '#EF4444',
                  },
                ]}
                onPress={
                  handleProcessCheckout
                }
              >
                <Text
                  style={
                    styles.btnConfirmSaleText
                  }
                >
                  {paymentType ===
                  'cash'
                    ? t.printReceiptBtn
                    : t.recordDebtBtn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PIN MODAL */}
      <Modal
        visible={isPinModalOpen}
        animationType="fade"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={
            styles.checkoutOverlay
          }
        >
          <View
            style={
              styles.checkoutCard
            }
          >
            <Text
              style={
                styles.checkoutTitle
              }
            >
              {pinModalMode ===
              'create'
                ? '🔒 Set 4-Digit PIN'
                : pinModalMode ===
                  'change'
                ? '⚙️ Change Admin PIN'
                : '🔐 Admin PIN Required'}
            </Text>

            <Text
              style={
                styles.pinSubText
              }
            >
              {pinModalMode ===
              'create'
                ? 'Create a 4-digit Security PIN before switching to Cashier Mode.'
                : pinModalMode ===
                  'change'
                ? 'Enter a new 4-digit PIN for your store terminal.'
                : 'Enter your 4-digit PIN to unlock Admin Mode.'}
            </Text>

            {lockoutTimer > 0 && (
              <View
                style={
                  styles.lockoutBanner
                }
              >
                <Text
                  style={
                    styles.lockoutBannerEmoji
                  }
                >
                  ⏳
                </Text>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.lockoutBannerTitle
                    }
                  >
                    Too many attempts!
                  </Text>

                  <Text
                    style={
                      styles.lockoutBannerText
                    }
                  >
                    PIN entry is locked.
                    Try again in{' '}
                    <Text
                      style={
                        styles.lockoutCountdown
                      }
                    >
                      {lockoutTimer}s
                    </Text>
                  </Text>
                </View>
              </View>
            )}

            <Text
              style={
                styles.checkoutInputLabel
              }
            >
              {pinModalMode ===
              'unlock'
                ? 'ADMIN PIN'
                : 'NEW 4-DIGIT PIN'}
            </Text>

            <TextInput
              style={[
                styles.checkoutInput,
                {
                  textAlign:
                    'center',
                  fontSize: 24,
                  letterSpacing: 8,
                },
                lockoutTimer >
                  0 &&
                  styles.inputLocked,
              ]}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={pinInput}
              onChangeText={
                setPinInput
              }
              editable={
                lockoutTimer === 0
              }
              placeholder={
                lockoutTimer > 0
                  ? 'LOCKED'
                  : '••••'
              }
              placeholderTextColor="#475569"
              autoFocus={
                lockoutTimer === 0
              }
            />

            {(pinModalMode ===
              'create' ||
              pinModalMode ===
                'change') && (
              <>
                <Text
                  style={
                    styles.checkoutInputLabel
                  }
                >
                  CONFIRM PIN
                </Text>

                <TextInput
                  style={[
                    styles.checkoutInput,
                    {
                      textAlign:
                        'center',
                      fontSize: 24,
                      letterSpacing: 8,
                    },
                  ]}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  value={
                    pinConfirmInput
                  }
                  onChangeText={
                    setPinConfirmInput
                  }
                />
              </>
            )}

            <View
              style={
                styles.checkoutButtonsRow
              }
            >
              <TouchableOpacity
                style={
                  styles.btnCancelCheckout
                }
                onPress={() => {
                  setIsPinModalOpen(
                    false
                  );
                  setPinInput('');
                  setPinConfirmInput(
                    ''
                  );
                }}
              >
                <Text
                  style={
                    styles.btnCancelCheckoutText
                  }
                >
                  {t.cancelBtn}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnConfirmSale,
                  lockoutTimer > 0 && {
                    backgroundColor:
                      '#334155',
                  },
                ]}
                onPress={
                  handlePinSubmit
                }
                disabled={
                  lockoutTimer > 0
                }
              >
                <Text
                  style={
                    styles.btnConfirmSaleText
                  }
                >
                  {lockoutTimer > 0
                    ? `Locked (${lockoutTimer}s)`
                    : pinModalMode ===
                      'unlock'
                    ? 'Unlock ✓'
                    : t.saveBtn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CASH DRAWER MODAL */}
      <Modal
        visible={isSetCashModalOpen}
        animationType="fade"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={
            styles.checkoutOverlay
          }
        >
          <View
            style={
              styles.checkoutCard
            }
          >
            <Text
              style={
                styles.checkoutTitle
              }
            >
              💵 Cash Drawer Management
            </Text>

            <View
              style={[
                styles.paymentMethodRow,
                { gap: 4 },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.btnPayTypeMini,
                  drawerModalTab ===
                    'starting' &&
                    styles.btnPayTypeActive,
                ]}
                onPress={() =>
                  setDrawerModalTab(
                    'starting'
                  )
                }
              >
                <Text
                  style={[
                    styles.btnPayTypeMiniText,
                    drawerModalTab ===
                      'starting' &&
                      styles.btnPayTypeTextActive,
                  ]}
                >
                  Starting Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnPayTypeMini,
                  drawerModalTab ===
                    'movement' &&
                    styles.btnPayTypeActive,
                ]}
                onPress={() =>
                  setDrawerModalTab(
                    'movement'
                  )
                }
              >
                <Text
                  style={[
                    styles.btnPayTypeMiniText,
                    drawerModalTab ===
                      'movement' &&
                      styles.btnPayTypeTextActive,
                  ]}
                >
                  Expense / Inflow
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnPayTypeMini,
                  drawerModalTab ===
                    'history' &&
                    styles.btnPayTypeActive,
                ]}
                onPress={() =>
                  setDrawerModalTab(
                    'history'
                  )
                }
              >
                <Text
                  style={[
                    styles.btnPayTypeMiniText,
                    drawerModalTab ===
                      'history' &&
                      styles.btnPayTypeTextActive,
                  ]}
                >
                  Log (
                  {
                    storeCashMovements.length
                  }
                  )
                </Text>
              </TouchableOpacity>
            </View>

            {drawerModalTab ===
              'starting' && (
              <>
                <Text
                  style={
                    styles.pinSubText
                  }
                >
                  Set the starting cash amount in your drawer at the beginning of the day.
                </Text>

                <Text
                  style={
                    styles.checkoutInputLabel
                  }
                >
                  STARTING CASH:
                </Text>

                <TextInput
                  style={[
                    styles.checkoutInput,
                    { fontSize: 20 },
                  ]}
                  keyboardType="decimal-pad"
                  placeholder="e.g., 1000"
                  placeholderTextColor="#64748B"
                  value={
                    tempStartingCashInput
                  }
                  onChangeText={
                    setTempStartingCashInput
                  }
                  autoFocus
                />

                <View
                  style={
                    styles.checkoutButtonsRow
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.btnCancelCheckout
                    }
                    onPress={() =>
                      setIsSetCashModalOpen(
                        false
                      )
                    }
                  >
                    <Text
                      style={
                        styles.btnCancelCheckoutText
                      }
                    >
                      {t.cancelBtn}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.btnConfirmSale
                    }
                    onPress={
                      handleSaveStartingCashSubmit
                    }
                  >
                    <Text
                      style={
                        styles.btnConfirmSaleText
                      }
                    >
                      {t.saveBtn}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {drawerModalTab ===
              'movement' && (
              <>
                <View
                  style={[
                    styles.paymentMethodRow,
                    { marginBottom: 12 },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.btnPayType,
                      movementType ===
                        'out' &&
                        styles.btnPayTypeActiveRed,
                    ]}
                    onPress={() =>
                      setMovementType(
                        'out'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.btnPayTypeText,
                        movementType ===
                          'out' &&
                          styles.btnPayTypeTextActiveRed,
                      ]}
                    >
                      💸 Expense / Out
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btnPayType,
                      movementType ===
                        'in' &&
                        styles.btnPayTypeActive,
                    ]}
                    onPress={() =>
                      setMovementType(
                        'in'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.btnPayTypeText,
                        movementType ===
                          'in' &&
                          styles.btnPayTypeTextActive,
                      ]}
                    >
                      💰 Add Cash / In
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={
                    styles.checkoutInputLabel
                  }
                >
                  AMOUNT (₱):
                </Text>

                <TextInput
                  style={[
                    styles.checkoutInput,
                    { fontSize: 18 },
                  ]}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#64748B"
                  value={
                    movementAmount
                  }
                  onChangeText={
                    setMovementAmount
                  }
                  autoFocus
                />

                <Text
                  style={
                    styles.checkoutInputLabel
                  }
                >
                  REASON / DESCRIPTION (OPTIONAL):
                </Text>

                <TextInput
                  style={
                    styles.checkoutInput
                  }
                  placeholder="e.g., Bought ice, Delivery fee"
                  placeholderTextColor="#64748B"
                  value={
                    movementReason
                  }
                  onChangeText={
                    setMovementReason
                  }
                />

                <View
                  style={
                    styles.checkoutButtonsRow
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.btnCancelCheckout
                    }
                    onPress={() =>
                      setIsSetCashModalOpen(
                        false
                      )
                    }
                  >
                    <Text
                      style={
                        styles.btnCancelCheckoutText
                      }
                    >
                      {t.cancelBtn}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btnConfirmSale,
                      movementType ===
                        'out' && {
                        backgroundColor:
                          '#EF4444',
                      },
                    ]}
                    onPress={
                      handleAddMovementSubmit
                    }
                  >
                    <Text
                      style={
                        styles.btnConfirmSaleText
                      }
                    >
                      Record ✓
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {drawerModalTab ===
              'history' && (
              <View
                style={{
                  maxHeight: 260,
                }}
              >
                {storeCashMovements.length ===
                0 ? (
                  <View
                    style={{
                      paddingVertical: 30,
                      alignItems:
                        'center',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          '#64748B',
                        fontSize: 13,
                      }}
                    >
                      No cash movements recorded.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={
                      false
                    }
                    style={{
                      marginVertical: 8,
                    }}
                  >
                    {storeCashMovements.map(
                      (item) => (
                        <View
                          key={String(
                            item.id
                          )}
                          style={
                            styles.movementItemRow
                          }
                        >
                          <View
                            style={{
                              flex: 1,
                              paddingRight: 8,
                            }}
                          >
                            <Text
                              style={
                                styles.movementItemReason
                              }
                            >
                              {
                                item.reason
                              }
                            </Text>

                            <Text
                              style={
                                styles.movementItemDate
                              }
                            >
                              {
                                item.createdAt
                              }
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.movementItemAmount,
                              {
                                color:
                                  item.type ===
                                  'out'
                                    ? '#F87171'
                                    : '#34D399',
                              },
                            ]}
                          >
                            {item.type ===
                            'out'
                              ? '-'
                              : '+'}
                            ₱
                            {(
                              Number(
                                item.amount
                              ) || 0
                            ).toFixed(
                              2
                            )}
                          </Text>
                        </View>
                      )
                    )}
                  </ScrollView>
                )}

                <TouchableOpacity
                  style={[
                    styles.btnCancelCheckout,
                    { marginTop: 10 },
                  ]}
                  onPress={() =>
                    setIsSetCashModalOpen(
                      false
                    )
                  }
                >
                  <Text
                    style={
                      styles.btnCancelCheckoutText
                    }
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* RESTOCK */}
      <RestockModal
        visible={!!restockProduct}
        onClose={() =>
          setRestockProduct(null)
        }
        product={restockProduct}
        onConfirmRestock={
          onRestockProduct
        }
      />

      {/* PRODUCT MODAL */}
      <ProductModal
        visible={
          isProductModalOpen
        }
        onClose={() =>
          setIsProductModalOpen(
            false
          )
        }
        onSave={(product) => {
          onSaveProduct({
            ...product,
            storeId:
              activeStore.id,
          });

          setIsProductModalOpen(
            false
          );
        }}
        initialProduct={
          selectedProduct
        }
      />

      {/* RECEIPT */}
      <ReceiptModal
        visible={
          !!activeReceipt
        }
        onClose={() =>
          setActiveReceipt(
            null
          )
        }
        receiptData={
          activeReceipt
        }
        storeName={
          activeStore.name
        }
        receiptFooter={
          receiptSettings?.footer
        }
        receiptContact={
          receiptSettings?.contact
        }
      />

      {/* SALES HISTORY */}
      <SalesHistoryModal
        visible={
          isHistoryOpen
        }
        onClose={() =>
          setIsHistoryOpen(
            false
          )
        }
        sales={storeSales}
        storeName={
          activeStore.name
        }
        onViewReceipt={(
          receipt
        ) => {
          setIsHistoryOpen(
            false
          );
          setActiveReceipt(
            receipt
          );
        }}
      />

      {/* DEBT */}
      <DebtModal
        visible={
          isDebtOpen
        }
        onClose={() =>
          setIsDebtOpen(false)
        }
        debts={storeDebts}
        onPayDebt={
          onPayDebt
        }
      />

      {/* ANALYTICS */}
      <AnalyticsModal
        visible={
          isAnalyticsOpen
        }
        onClose={() =>
          setIsAnalyticsOpen(
            false
          )
        }
        sales={storeSales}
        storeName={
          activeStore.name
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  btnBack: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexShrink: 0,
  },

  btnBackText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },

  headerScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
  },

  btnModeToggle: {
    backgroundColor:
      'rgba(56, 189, 248, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    flexShrink: 0,
  },

  btnModeCashierActive: {
    backgroundColor:
      'rgba(251, 191, 36, 0.15)',
    borderColor: '#FBBF24',
  },

  btnModeToggleText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },

  btnModeCashierActiveText: {
    color: '#FBBF24',
  },

  btnPinSettings: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexShrink: 0,
  },

  btnPinSettingsText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },

  btnAnalytics: {
    backgroundColor:
      'rgba(56, 189, 248, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    flexShrink: 0,
  },

  btnAnalyticsText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },

  btnDebtHeader: {
    backgroundColor:
      'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor:
      'rgba(239, 68, 68, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexShrink: 0,
  },

  btnDebtHeaderText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },

  btnHistory: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexShrink: 0,
  },

  btnHistoryText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },

  btnAddProd: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexShrink: 0,
  },

  btnAddProdText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  bannerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },

  storeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  ownerText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  statBox: {
    alignItems: 'flex-end',
  },

  statDividerVertical: {
    width: 1,
    height: 26,
    backgroundColor: '#1E293B',
  },

  dailyStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },

  dailyStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#34D399',
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
    height: 44,
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

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 10,
  },

  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },

  emptyText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },

  emptySubText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  pill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  pillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },

  pillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  pillTextActive: {
    color: '#FFFFFF',
  },

  productCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  prodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  prodCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
  },

  prodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },

  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  priceRow: {
    flexDirection: 'row',
    backgroundColor: '#070B14',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'space-between',
  },

  priceBlock: {
    alignItems: 'center',
  },

  priceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },

  priceValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  btnRestock: {
    backgroundColor:
      'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
  },

  btnRestockText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },

  btnActionSmall: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
  },

  btnActionSmallText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },

  buyButtonRow: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },

  btnBuyTingi: {
    backgroundColor:
      'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  btnBuyTingiText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },

  btnBuyPack: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  btnBuyPackText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  cartFloatingBar: {
    position: 'absolute',
    bottom:
      Platform.OS === 'android'
        ? 36
        : 24,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0284C7',
    elevation: 12,
  },

  cartCount: {
    fontSize: 11,
    color: '#94A3B8',
  },

  cartPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  btnClearCart: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  btnClearCartText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },

  btnCheckout: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  btnCheckoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  checkoutOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  checkoutCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  checkoutTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 14,
  },

  pinSubText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },

  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor:
      'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor:
      'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  lockoutBannerEmoji: {
    fontSize: 22,
  },

  lockoutBannerTitle: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },

  lockoutBannerText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
  },

  lockoutCountdown: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 13,
  },

  inputLocked: {
    opacity: 0.5,
    borderColor: '#EF4444',
  },

  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  btnPayType: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  btnPayTypeMini: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  btnPayTypeMiniText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },

  btnPayTypeActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },

  btnPayTypeActiveRed: {
    backgroundColor:
      'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },

  btnPayTypeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },

  btnPayTypeTextActive: {
    color: '#FFFFFF',
  },

  btnPayTypeTextActiveRed: {
    color: '#F87171',
  },

  checkoutAmountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },

  checkoutAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 14,
  },

  checkoutInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },

  checkoutInput: {
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },

  changeBadge: {
    backgroundColor:
      'rgba(52, 211, 153, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  changeLabel: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },

  changeValue: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '800',
  },

  checkoutButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  btnCancelCheckout: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  btnCancelCheckoutText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },

  btnConfirmSale: {
    flex: 2,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  btnConfirmSaleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  movementItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070B14',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  movementItemReason: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },

  movementItemDate: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },

  movementItemAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
});