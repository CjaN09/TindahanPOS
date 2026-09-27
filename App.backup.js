import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  StatusBar,
  Alert,
  View,
  ActivityIndicator,
  LogBox,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import StoreModal from './src/components/StoreModal';
import AuthModal from './src/components/AuthModal';
import SettingsModal from './src/components/SettingsModal';
import { supabase } from './src/services/supabase';
import SplashScreen from './src/components/SplashScreen';

LogBox.ignoreAllLogs(true);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [debts, setDebts] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [startingCashMap, setStartingCashMap] = useState({});
  const [activeStore, setActiveStore] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isLoadingSplash, setIsLoadingSplash] = useState(true);

  // Modals
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeNameInput, setStoreNameInput] = useState('');
  const [ownerNameInput, setOwnerNameInput] = useState('');

  // App Settings State
  const [appSettings, setAppSettings] = useState({
    soundEnabled: true,
    receiptFooter: 'Thank you, come again! ❤️',
    receiptContact: '',
    language: 'english',
  });

  const STORE_STORAGE_KEY = '@my_stores_data';
  const PRODUCT_STORAGE_KEY = '@my_products_data';
  const SALES_STORAGE_KEY = '@my_sales_data';
  const DEBT_STORAGE_KEY = '@my_debts_data';
  const CASH_MOVEMENTS_KEY = '@my_cash_movements_data';
  const STARTING_CASH_KEY = '@my_starting_cash_map';
  const LAST_SYNC_KEY = '@my_last_sync_time';
  const SETTINGS_STORAGE_KEY = '@my_app_settings';

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const storedStores = await AsyncStorage.getItem(STORE_STORAGE_KEY);
      const storedProducts = await AsyncStorage.getItem(PRODUCT_STORAGE_KEY);
      const storedSales = await AsyncStorage.getItem(SALES_STORAGE_KEY);
      const storedDebts = await AsyncStorage.getItem(DEBT_STORAGE_KEY);
      const storedMovements = await AsyncStorage.getItem(CASH_MOVEMENTS_KEY);
      const storedStartingCash = await AsyncStorage.getItem(STARTING_CASH_KEY);
      const storedLastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

      if (storedStores) setStores(JSON.parse(storedStores));
      if (storedProducts) setProducts(JSON.parse(storedProducts));
      if (storedSales) setSales(JSON.parse(storedSales));
      if (storedDebts) setDebts(JSON.parse(storedDebts));
      if (storedMovements) setCashMovements(JSON.parse(storedMovements));
      if (storedStartingCash) setStartingCashMap(JSON.parse(storedStartingCash));
      if (storedLastSync) setLastSyncTime(storedLastSync);
      if (storedSettings) setAppSettings(JSON.parse(storedSettings));

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        const u = sessionData.session.user;
        setCurrentUser({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.email.split('@')[0],
          isEmailVerified: !!u.email_confirmed_at,
          createdAt: u.created_at,
        });
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    setAppSettings(newSettings);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    Alert.alert('Settings Saved', 'Your settings have been successfully updated.');
  };

  // --- SUPABASE AUTH HANDLERS ---
  const handleRegister = async (userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: { full_name: userData.name },
        },
      });

      if (error) throw error;

      const userObj = {
        id: data.user.id,
        name: userData.name,
        email: data.user.email,
        isEmailVerified: !!data.user.email_confirmed_at,
        createdAt: data.user.created_at,
      };
      setCurrentUser(userObj);
      setIsAuthModalOpen(false);
      Alert.alert('Account Created!', `Welcome, ${userData.name}! Your account is ready.`);
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    }
  };

  const handleLogin = async (userData) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });

      if (error) throw error;

      const userObj = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
        email: data.user.email,
        isEmailVerified: !!data.user.email_confirmed_at,
        createdAt: data.user.created_at,
      };
      setCurrentUser(userObj);
      setIsAuthModalOpen(false);

      await handlePullCloudData(data.user.id);
      Alert.alert('Logged In!', 'Synced and restored data from Supabase Cloud.');
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAuthModalOpen(false);
    Alert.alert('Signed Out', 'Switched back to local offline mode.');
  };

  const handleChangePassword = async (oldPassword, newPassword) => {
    if (!currentUser) return false;
    try {
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: oldPassword,
      });
      if (reAuthError) {
        Alert.alert('Incorrect Password', 'Your current password is incorrect.');
        return false;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      Alert.alert('Password Changed! 🔑', 'Your password has been successfully updated.');
      return true;
    } catch (err) {
      Alert.alert('Update Failed', err.message);
      return false;
    }
  };

  const handleSendVerificationEmail = async (userEmail) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });
      if (error) throw error;
      Alert.alert(
        'Code Sent! 📩',
        `A 6-digit confirmation code has been sent to ${userEmail}. Check your inbox or spam folder.`
      );
      return true;
    } catch (err) {
      Alert.alert('Verification Error', err.message);
      return false;
    }
  };

  const handleVerifyEmailOtp = async (userEmail, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: token,
        type: 'signup',
      });
      if (error) throw error;

      setCurrentUser((prev) => (prev ? { ...prev, isEmailVerified: true } : prev));
      Alert.alert('Email Verified! 🎉', 'Your email address is now confirmed. Account recovery is active.');
      return true;
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid or expired code.');
      return false;
    }
  };

  const handleDeleteAccount = async (inputPassword) => {
    if (!currentUser) return false;

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: inputPassword,
      });

      if (authError) {
        Alert.alert('Incorrect Password', 'Password does not match. Account was not deleted.');
        return false;
      }

      const { error: dbError } = await supabase
        .from('user_backups')
        .delete()
        .eq('user_id', currentUser.id);

      if (dbError) throw dbError;

      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsAuthModalOpen(false);

      Alert.alert('Account Cleared', 'Your cloud backups and cloud session have been permanently deleted.');
      return true;
    } catch (err) {
      Alert.alert('Delete Error', err.message);
      return false;
    }
  };

  const handleForgotPassword = async (userEmail) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
      if (error) throw error;

      Alert.alert(
        'Code Sent! 📩',
        `A 6-digit recovery code was sent to ${userEmail}. Please check your inbox or spam folder.`
      );
      return true;
    } catch (err) {
      Alert.alert('Error', err.message);
      return false;
    }
  };

  const handleVerifyAndResetPassword = async (userEmail, token, newPassword) => {
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: token,
        type: 'recovery',
      });

      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert('Success! 🎉', 'Password reset successfully! You may now sign in with your new password.');
      return true;
    } catch (err) {
      Alert.alert('Reset Failed', err.message || 'Invalid verification code.');
      return false;
    }
  };

  // --- CLOUD SYNC ---
  const handlePullCloudData = async (userId) => {
    try {
      const { data } = await supabase
        .from('user_backups')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        if (data.stores) {
          setStores(data.stores);
          await AsyncStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data.stores));
        }
        if (data.products) {
          setProducts(data.products);
          await AsyncStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(data.products));
        }
        if (data.sales) {
          setSales(data.sales);
          await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(data.sales));
        }
        if (data.debts) {
          setDebts(data.debts);
          await AsyncStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(data.debts));
        }
        if (data.cash_movements) {
          setCashMovements(data.cash_movements);
          await AsyncStorage.setItem(CASH_MOVEMENTS_KEY, JSON.stringify(data.cash_movements));
        }
        if (data.starting_cash) {
          setStartingCashMap(data.starting_cash);
          await AsyncStorage.setItem(STARTING_CASH_KEY, JSON.stringify(data.starting_cash));
        }

        const syncTime = data.updated_at || new Date().toISOString();
        setLastSyncTime(syncTime);
        await AsyncStorage.setItem(LAST_SYNC_KEY, syncTime);
      }
    } catch (e) {
      console.log('No cloud backup found yet.');
    }
  };

  const handleSyncData = async () => {
    if (!currentUser) return;

    try {
      const now = new Date().toISOString();
      const payload = {
        user_id: currentUser.id,
        stores,
        products,
        sales,
        debts,
        cash_movements: cashMovements,
        starting_cash: startingCashMap,
        updated_at: now,
      };

      const { error } = await supabase.from('user_backups').upsert(payload);
      if (error) throw error;

      setLastSyncTime(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, now);

      Alert.alert('Cloud Sync Complete ☁️', 'All data successfully saved to cloud storage!');
    } catch (err) {
      Alert.alert('Sync Error', err.message);
    }
  };

  // --- STORE CRUD ---
  const handleSaveStore = async () => {
    if (!storeNameInput.trim()) {
      Alert.alert('Required Field', 'Please provide a store name.');
      return;
    }
    let updated;
    if (editingStoreId) {
      updated = stores.map((s) =>
        s.id === editingStoreId
          ? { ...s, name: storeNameInput.trim(), owner: ownerNameInput.trim() }
          : s
      );
    } else {
      const newStore = {
        id: Date.now().toString(),
        name: storeNameInput.trim(),
        owner: ownerNameInput.trim(),
        createdAt: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      updated = [newStore, ...stores];
    }
    await AsyncStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(updated));
    setStores(updated);
    setIsStoreModalOpen(false);
  };

  const handleDeleteStore = (storeId, storeName) => {
    Alert.alert('Delete Store?', `Are you sure you want to delete "${storeName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedStores = stores.filter((s) => s.id !== storeId);
          const updatedProds = products.filter((p) => p.storeId !== storeId);
          const updatedSales = sales.filter((s) => s.storeId !== storeId);
          const updatedDebts = debts.filter((d) => d.storeId !== storeId);
          const updatedMovements = cashMovements.filter((m) => m.storeId !== storeId);

          const updatedCashMap = { ...startingCashMap };
          delete updatedCashMap[storeId];

          await AsyncStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(updatedStores));
          await AsyncStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(updatedProds));
          await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updatedSales));
          await AsyncStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(updatedDebts));
          await AsyncStorage.setItem(CASH_MOVEMENTS_KEY, JSON.stringify(updatedMovements));
          await AsyncStorage.setItem(STARTING_CASH_KEY, JSON.stringify(updatedCashMap));

          setStores(updatedStores);
          setProducts(updatedProds);
          setSales(updatedSales);
          setDebts(updatedDebts);
          setCashMovements(updatedMovements);
          setStartingCashMap(updatedCashMap);
        },
      },
    ]);
  };

  const handleSaveProduct = async (productPayload) => {
    let updated;
    const exists = products.some((p) => p.id === productPayload.id);
    if (exists) {
      updated = products.map((p) => (p.id === productPayload.id ? productPayload : p));
    } else {
      updated = [productPayload, ...products];
    }
    await AsyncStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(updated));
    setProducts(updated);
  };

  const handleDeleteProduct = (prodId, prodName) => {
    Alert.alert('Delete Item?', `Are you sure you want to delete "${prodName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = products.filter((p) => p.id !== prodId);
          await AsyncStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(updated));
          setProducts(updated);
        },
      },
    ]);
  };

  const handleRestockProduct = async (productId, addedPieces) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          totalPiecesStock: p.totalPiecesStock + addedPieces,
        };
      }
      return p;
    });

    await AsyncStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(updated));
    setProducts(updated);
    Alert.alert('Stock Updated', `Added +${addedPieces} items to inventory.`);
  };

  const handleSaveStartingCash = async (storeId, amount) => {
    const updatedMap = { ...startingCashMap, [storeId]: amount };
    await AsyncStorage.setItem(STARTING_CASH_KEY, JSON.stringify(updatedMap));
    setStartingCashMap(updatedMap);
  };

  const handleAddCashMovement = async (movement) => {
    const updated = [movement, ...cashMovements];
    await AsyncStorage.setItem(CASH_MOVEMENTS_KEY, JSON.stringify(updated));
    setCashMovements(updated);
  };

  const handleCompleteSale = async (receipt, cartItems, newDebt = null) => {
    const updatedProducts = products.map((prod) => {
      const purchased = cartItems.filter((i) => i.productId === prod.id);
      if (purchased.length > 0) {
        const totalPiecesDeducted = purchased.reduce(
          (sum, i) => sum + i.quantity * i.piecesPerUnit,
          0
        );
        return {
          ...prod,
          totalPiecesStock: Math.max(0, prod.totalPiecesStock - totalPiecesDeducted),
        };
      }
      return prod;
    });

    const updatedSales = [receipt, ...sales];
    const updatedDebts = newDebt ? [newDebt, ...debts] : debts;

    await AsyncStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(updatedProducts));
    await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updatedSales));
    if (newDebt) {
      await AsyncStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(updatedDebts));
    }

    setProducts(updatedProducts);
    setSales(updatedSales);
    setDebts(updatedDebts);
  };

  const handlePayDebt = async (debtId, payAmount) => {
    let paidCustomerName = 'Customer';
    let targetStoreId = activeStore ? activeStore.id : null;

    const updatedDebts = debts.map((d) => {
      if (d.id === debtId) {
        paidCustomerName = d.customerName || 'Customer';
        targetStoreId = d.storeId;
        const newBalance = Math.max(0, d.balance - payAmount);
        return {
          ...d,
          balance: newBalance,
          status: newBalance === 0 ? 'paid' : 'unpaid',
        };
      }
      return d;
    });

    const debtPaymentReceipt = {
      id: Date.now().toString(),
      storeId: targetStoreId,
      items: [{ name: `Credit Payment (${paidCustomerName})`, quantity: 1, price: payAmount }],
      totalAmount: payAmount,
      totalProfit: 0,
      paymentType: 'cash',
      cashTendered: payAmount,
      change: 0,
      createdAt: new Date().toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedSales = [debtPaymentReceipt, ...sales];

    await AsyncStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(updatedDebts));
    await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updatedSales));

    setDebts(updatedDebts);
    setSales(updatedSales);

    Alert.alert('Payment Recorded', `Received ₱${payAmount.toFixed(2)} and added to cash drawer.`);
  };

  if (isLoadingSplash) {
    return <SplashScreen onFinish={() => setIsLoadingSplash(false)} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="light-content" backgroundColor="#070B14" translucent={false} />

          {currentScreen === 'home' && (
            <HomeScreen
              stores={stores}
              currentUser={currentUser}
              language={appSettings.language}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
              onOpenCreateModal={() => {
                setEditingStoreId(null);
                setStoreNameInput('');
                setOwnerNameInput('');
                setIsStoreModalOpen(true);
              }}
              onOpenEditModal={(s) => {
                setEditingStoreId(s.id);
                setStoreNameInput(s.name);
                setOwnerNameInput(s.owner || '');
                setIsStoreModalOpen(true);
              }}
              onDeleteStore={handleDeleteStore}
              onSelectStore={(s) => {
                setActiveStore(s);
                setCurrentScreen('dashboard');
              }}
            />
          )}

          {currentScreen === 'dashboard' && activeStore && (
            <DashboardScreen
              activeStore={activeStore}
              products={products}
              sales={sales}
              debts={debts}
              cashMovements={cashMovements.filter((m) => m.storeId === activeStore.id)}
              startingCashValue={startingCashMap[activeStore.id] || 0}
              onSaveStartingCash={(amount) => handleSaveStartingCash(activeStore.id, amount)}
              onAddCashMovement={(movement) => handleAddCashMovement({ ...movement, storeId: activeStore.id })}
              language={appSettings.language}
              soundEnabled={appSettings.soundEnabled}
              receiptSettings={{
                footer: appSettings.receiptFooter,
                contact: appSettings.receiptContact,
              }}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onCompleteSale={handleCompleteSale}
              onPayDebt={handlePayDebt}
              onRestockProduct={handleRestockProduct}
              onBack={() => setCurrentScreen('home')}
            />
          )}

          <StoreModal
            visible={isStoreModalOpen}
            onClose={() => setIsStoreModalOpen(false)}
            onSave={handleSaveStore}
            storeName={storeNameInput}
            setStoreName={setStoreNameInput}
            ownerName={ownerNameInput}
            setOwnerName={setOwnerNameInput}
            isEditing={!!editingStoreId}
          />

          <AuthModal
            visible={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            currentUser={currentUser}
            storesCount={stores.length}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onLogout={handleLogout}
            onSyncData={handleSyncData}
            lastSyncTime={lastSyncTime}
            onChangePassword={handleChangePassword}
            onForgotPassword={handleForgotPassword}
            onVerifyAndResetPassword={handleVerifyAndResetPassword}
            onDeleteAccount={handleDeleteAccount}
            onSendVerificationEmail={handleSendVerificationEmail}
            onVerifyEmailOtp={handleVerifyEmailOtp}
          />

          <SettingsModal
            visible={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={appSettings}
            onSaveSettings={handleSaveSettings}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#070B14',
    justifyContent: 'center',
    alignItems: 'center',
  },
});