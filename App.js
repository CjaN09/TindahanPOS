
import React, {
  useState,
  useEffect,
} from 'react';

import {
  StyleSheet,
  StatusBar,
  Alert,
  View,
  ActivityIndicator,
  LogBox,
} from 'react-native';

import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import StoreModal from './src/components/StoreModal';
import AuthModal from './src/components/AuthModal';
import SettingsModal from './src/components/SettingsModal';
import SplashScreen from './src/components/SplashScreen';

import { supabase } from './src/services/supabase';

import {
  initDatabase,
  getStores,
  getProducts,
  getSales,
  getDebts,
  getCashMovements,
  getAllStartingCash,
  saveStore,
  deleteStore,
  saveProduct,
  deleteProduct,
  saveCashMovement,
  saveStartingCash,
  getAllDatabaseData,
  clearDatabase,
  restoreDatabaseData,
  completeSale,
  completeDebtPayment,
} from './src/services/database';

import {
  migrateAsyncStorageToSQLite,
} from './src/services/migration';

LogBox.ignoreAllLogs(true);

const LAST_SYNC_KEY = '@my_last_sync_time';
const SETTINGS_STORAGE_KEY = '@my_app_settings';

const normalizeStore = (store) => ({
  id: store.id,
  name: store.name || '',
  owner: store.owner || '',
  createdAt:
    store.createdAt ||
    store.created_at ||
    '',
});

const normalizeTimestamp = (item) => {
  if (item?.createdAtISO) {
    const parsed = new Date(item.createdAtISO);

    if (!Number.isNaN(parsed.getTime())) {
      return item.createdAtISO;
    }
  }

  if (item?.createdAt) {
    const parsed = new Date(item.createdAt);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

export default function App() {
  const [currentScreen, setCurrentScreen] =
    useState('home');

  const [stores, setStores] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [sales, setSales] =
    useState([]);

  const [debts, setDebts] =
    useState([]);

  const [
    cashMovements,
    setCashMovements,
  ] = useState([]);

  const [
    startingCashMap,
    setStartingCashMap,
  ] = useState({});

  const [
    activeStore,
    setActiveStore,
  ] = useState(null);

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    lastSyncTime,
    setLastSyncTime,
  ] = useState(null);

  const [
    isLoadingSplash,
    setIsLoadingSplash,
  ] = useState(true);

  const [
    isStoreModalOpen,
    setIsStoreModalOpen,
  ] = useState(false);

  const [
    isAuthModalOpen,
    setIsAuthModalOpen,
  ] = useState(false);

  const [
    isSettingsModalOpen,
    setIsSettingsModalOpen,
  ] = useState(false);

  const [
    editingStoreId,
    setEditingStoreId,
  ] = useState(null);

  const [
    storeNameInput,
    setStoreNameInput,
  ] = useState('');

  const [
    ownerNameInput,
    setOwnerNameInput,
  ] = useState('');

  const [
    appSettings,
    setAppSettings,
  ] = useState({
    soundEnabled: true,
    receiptFooter:
      'Thank you, come again! ❤️',
    receiptContact: '',
    language: 'english',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  /*
   * ==========================================
   * INITIALIZATION
   * ==========================================
   */

  const loadInitialData = async () => {
    try {
      await initDatabase();

      const migrationResult =
        await migrateAsyncStorageToSQLite();

      if (migrationResult?.migrated) {
        console.log(
          'SQLite migration completed:',
          migrationResult.counts
        );
      }

      const [
        storedStores,
        storedProducts,
        storedSales,
        storedDebts,
        storedMovements,
        storedStartingCash,
      ] = await Promise.all([
        getStores(),
        getProducts(),
        getSales(),
        getDebts(),
        getCashMovements(),
        getAllStartingCash(),
      ]);

      setStores(
        storedStores.map(normalizeStore)
      );

      setProducts(storedProducts);
      setSales(storedSales);
      setDebts(storedDebts);
      setCashMovements(storedMovements);
      setStartingCashMap(storedStartingCash);

      const storedLastSync =
        await AsyncStorage.getItem(
          LAST_SYNC_KEY
        );

      const storedSettings =
        await AsyncStorage.getItem(
          SETTINGS_STORAGE_KEY
        );

      if (storedLastSync) {
        setLastSyncTime(storedLastSync);
      }

      if (storedSettings) {
        try {
          const parsedSettings =
            JSON.parse(storedSettings);

          setAppSettings((previous) => ({
            ...previous,
            ...parsedSettings,
          }));
        } catch (error) {
          console.log(
            'Could not parse saved app settings:',
            error
          );
        }
      }

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          'Session restore error:',
          sessionError
        );
      }

      if (sessionData?.session?.user) {
        const user =
          sessionData.session.user;

        setCurrentUser({
          id: user.id,
          email: user.email,
          name:
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'User',
          isEmailVerified:
            !!user.email_confirmed_at,
          createdAt:
            user.created_at,
        });
      }
    } catch (error) {
      console.error(
        'Error loading initial data:',
        error
      );

      Alert.alert(
        'Startup Error',
        'The app could not load some local data. Please restart the app and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==========================================
   * SETTINGS
   * ==========================================
   */

  const handleSaveSettings =
    async (newSettings) => {
      try {
        setAppSettings(newSettings);

        await AsyncStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify(newSettings)
        );

        Alert.alert(
          'Settings Saved',
          'Your settings have been successfully updated.'
        );
      } catch (error) {
        console.error(
          'Settings save error:',
          error
        );

        Alert.alert(
          'Save Error',
          'Could not save your settings.'
        );
      }
    };

  /*
   * ==========================================
   * AUTHENTICATION
   * ==========================================
   */

  const handleRegister = async (
    userData
  ) => {
    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              full_name:
                userData.name,
            },
          },
        });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error(
          'Account creation did not return a user.'
        );
      }

      /*
       * Email confirmation is enabled.
       *
       * Supabase can create the user without
       * creating an active session.
       *
       * In that case, do NOT treat the user
       * as logged in yet.
       */

      if (!data.session) {
        Alert.alert(
          'Account Created! 📩',
          `Welcome, ${userData.name}!\n\nPlease check ${userData.email} and verify your email before signing in.`
        );

        return;
      }

      const userObj = {
        id: data.user.id,
        name:
          data.user.user_metadata
            ?.full_name ||
          userData.name ||
          data.user.email?.split('@')[0] ||
          'User',
        email: data.user.email,
        isEmailVerified:
          !!data.user.email_confirmed_at,
        createdAt:
          data.user.created_at,
      };

      setCurrentUser(userObj);

      setIsAuthModalOpen(false);

      Alert.alert(
        'Account Created!',
        `Welcome, ${userObj.name}! Your account is ready.`
      );
    } catch (err) {
      console.error(
        'Registration error:',
        err
      );

      Alert.alert(
        'Registration Failed',
        err?.message ||
          'Could not create your account.'
      );
    }
  };

  const handleLogin = async (
    userData
  ) => {
    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: userData.email,
          password: userData.password,
        });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error(
          'Login did not return a user.'
        );
      }

      const userObj = {
        id: data.user.id,
        name:
          data.user.user_metadata
            ?.full_name ||
          data.user.email?.split('@')[0] ||
          'User',
        email: data.user.email,
        isEmailVerified:
          !!data.user.email_confirmed_at,
        createdAt:
          data.user.created_at,
      };

      /*
       * Authentication itself succeeded.
       */
      setCurrentUser(userObj);
      setIsAuthModalOpen(false);

      /*
       * Cloud restore is a separate operation.
       *
       * A restore failure must NOT make the
       * successful login look like a failed login.
       */
      try {
        const restored =
          await handlePullCloudData(
            data.user.id
          );

        if (restored) {
          Alert.alert(
            'Logged In! ☁️',
            'You are signed in successfully. Your cloud backup has been restored.'
          );
        } else {
          Alert.alert(
            'Logged In! 👋',
            'You are signed in successfully. No cloud backup was found, so your existing local data was kept.'
          );
        }
      } catch (restoreError) {
        console.error(
          'Cloud restore after login failed:',
          restoreError
        );

        /*
         * handlePullCloudData already shows
         * the restore error. Keep the session
         * active because authentication worked.
         */
      }
    } catch (err) {
      console.error(
        'Login error:',
        err
      );

      Alert.alert(
        'Login Failed',
        err?.message ||
          'Could not sign in.'
      );
    }
  };

  const handleLogout = async () => {
    try {
      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setCurrentUser(null);
      setIsAuthModalOpen(false);

      /*
       * Local SQLite data intentionally remains.
       *
       * This allows the application to continue
       * working offline after signing out.
       */

      Alert.alert(
        'Signed Out',
        'Switched back to local offline mode.'
      );
    } catch (error) {
      console.error(
        'Sign out error:',
        error
      );

      Alert.alert(
        'Sign Out Error',
        error?.message ||
          'Could not sign out.'
      );
    }
  };

  /*
   * ==========================================
   * CHANGE PASSWORD
   * ==========================================
   */

  const handleChangePassword =
    async (
      oldPassword,
      newPassword
    ) => {
      if (!currentUser) {
        return false;
      }

      try {
        /*
         * Re-authenticate before changing
         * the password.
         */
        const {
          error: reAuthError,
        } =
          await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: oldPassword,
          });

        if (reAuthError) {
          Alert.alert(
            'Incorrect Password',
            'Your current password is incorrect.'
          );

          return false;
        }

        const {
          error: updateError,
        } =
          await supabase.auth.updateUser({
            password: newPassword,
          });

        if (updateError) {
          throw updateError;
        }

        Alert.alert(
          'Password Changed! 🔑',
          'Your password has been successfully updated.'
        );

        return true;
      } catch (err) {
        console.error(
          'Password update error:',
          err
        );

        Alert.alert(
          'Update Failed',
          err?.message ||
            'Could not change your password.'
        );

        return false;
      }
    };

  /*
   * ==========================================
   * EMAIL VERIFICATION
   * ==========================================
   */

  const handleSendVerificationEmail =
    async (userEmail) => {
      try {
        const {
          error,
        } =
          await supabase.auth.resend({
            type: 'signup',
            email: userEmail,
          });

        if (error) {
          throw error;
        }

        Alert.alert(
          'Code Sent! 📩',
          `A 6-digit confirmation code has been sent to ${userEmail}. Check your inbox or spam folder.`
        );

        return true;
      } catch (err) {
        console.error(
          'Verification email error:',
          err
        );

        Alert.alert(
          'Verification Error',
          err?.message ||
            'Could not send the verification code.'
        );

        return false;
      }
    };

  const handleVerifyEmailOtp =
    async (
      userEmail,
      token
    ) => {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.verifyOtp({
            email: userEmail,
            token,
            type: 'signup',
          });

        if (error) {
          throw error;
        }

        /*
         * Prefer the verified Supabase user
         * returned by the verification call.
         */
        const verifiedUser =
          data?.user;

        if (verifiedUser) {
          setCurrentUser(
            (previous) => ({
              ...(previous || {}),
              id:
                verifiedUser.id ||
                previous?.id,
              email:
                verifiedUser.email ||
                previous?.email ||
                userEmail,
              name:
                verifiedUser.user_metadata
                  ?.full_name ||
                previous?.name ||
                verifiedUser.email
                  ?.split('@')[0] ||
                'User',
              isEmailVerified: true,
              createdAt:
                verifiedUser.created_at ||
                previous?.createdAt,
            })
          );
        } else {
          setCurrentUser(
            (previous) =>
              previous
                ? {
                    ...previous,
                    isEmailVerified:
                      true,
                  }
                : previous
          );
        }

        Alert.alert(
          'Email Verified! 🎉',
          'Your email address is now confirmed. Account recovery is active.'
        );

        return true;
      } catch (err) {
        console.error(
          'Email verification error:',
          err
        );

        Alert.alert(
          'Verification Failed',
          err?.message ||
            'Invalid or expired code.'
        );

        return false;
      }
    };

  /*
   * ==========================================
   * CLEAR CLOUD + LOCAL DATA
   * ==========================================
   *
   * IMPORTANT:
   * This does NOT delete the Supabase Auth
   * account itself.
   *
   * It deletes:
   * - cloud backup
   * - local SQLite data
   * - current session
   *
   * The login account remains in Supabase Auth.
   */

  const handleDeleteAccount =
    async (inputPassword) => {
      if (!currentUser) {
        return false;
      }

      try {
        /*
         * Re-authenticate first.
         */
        const {
          error: authError,
        } =
          await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: inputPassword,
          });

        if (authError) {
          Alert.alert(
            'Incorrect Password',
            'Password does not match. Cloud data was not deleted.'
          );

          return false;
        }

        /*
         * Delete cloud backup.
         */
        const {
          error: dbError,
        } =
          await supabase
            .from('user_backups')
            .delete()
            .eq(
              'user_id',
              currentUser.id
            );

        if (dbError) {
          throw dbError;
        }

        /*
         * Clear local SQLite data.
         */
        await clearDatabase();

        /*
         * Sign out.
         *
         * The Supabase Auth account itself
         * still exists.
         */
        const {
          error: signOutError,
        } =
          await supabase.auth.signOut();

        if (signOutError) {
          throw signOutError;
        }

        /*
         * Reset application state.
         */
        setCurrentUser(null);
        setIsAuthModalOpen(false);

        setStores([]);
        setProducts([]);
        setSales([]);
        setDebts([]);
        setCashMovements([]);
        setStartingCashMap({});
        setActiveStore(null);
        setCurrentScreen('home');
        setLastSyncTime(null);

        await AsyncStorage.removeItem(
          LAST_SYNC_KEY
        );

        Alert.alert(
          'Cloud Data Cleared',
          'Your local data, cloud backup, and cloud session have been cleared. Your Supabase login account itself still exists.'
        );

        return true;
      } catch (err) {
        console.error(
          'Delete data error:',
          err
        );

        Alert.alert(
          'Delete Error',
          err?.message ||
            'Could not clear the account data.'
        );

        return false;
      }
    };

  /*
   * ==========================================
   * FORGOT PASSWORD
   * ==========================================
   */

  const handleForgotPassword =
    async (userEmail) => {
      try {
        const {
          error,
        } =
          await supabase.auth.resetPasswordForEmail(
            userEmail
          );

        if (error) {
          throw error;
        }

        Alert.alert(
          'Code Sent! 📩',
          `A 6-digit recovery code was sent to ${userEmail}. Please check your inbox or spam folder.`
        );

        return true;
      } catch (err) {
        console.error(
          'Forgot password error:',
          err
        );

        Alert.alert(
          'Error',
          err?.message ||
            'Could not send the recovery code.'
        );

        return false;
      }
    };

  const handleVerifyAndResetPassword =
    async (
      userEmail,
      token,
      newPassword
    ) => {
      try {
        const {
          error: verifyError,
        } =
          await supabase.auth.verifyOtp({
            email: userEmail,
            token,
            type: 'recovery',
          });

        if (verifyError) {
          throw verifyError;
        }

        const {
          error: updateError,
        } =
          await supabase.auth.updateUser({
            password: newPassword,
          });

        if (updateError) {
          throw updateError;
        }

        Alert.alert(
          'Success! 🎉',
          'Password reset successfully! You may now sign in with your new password.'
        );

        return true;
      } catch (err) {
        console.error(
          'Password reset error:',
          err
        );

        Alert.alert(
          'Reset Failed',
          err?.message ||
            'Invalid verification code.'
        );

        return false;
      }
    };

  /*
   * ==========================================
   * CLOUD RESTORE
   * ==========================================
   */

  const handlePullCloudData =
    async (userId) => {
      try {
        const {
          data,
          error,
        } =
          await supabase
            .from('user_backups')
            .select('*')
            .eq(
              'user_id',
              userId
            )
            .maybeSingle();

        if (error) {
          throw error;
        }

        /*
         * No cloud backup exists.
         *
         * IMPORTANT:
         * Do NOT clear local SQLite data.
         */
        if (!data) {
          console.log(
            'No cloud backup found. Keeping local data.'
          );

          return false;
        }

        /*
         * =====================================
         * VALIDATE CLOUD DATA
         * =====================================
         */

        const cloudStores =
          Array.isArray(data.stores)
            ? data.stores
            : [];

        const cloudProducts =
          Array.isArray(data.products)
            ? data.products
            : [];

        const cloudSales =
          Array.isArray(data.sales)
            ? data.sales
            : [];

        const cloudDebts =
          Array.isArray(data.debts)
            ? data.debts
            : [];

        const cloudCashMovements =
          Array.isArray(
            data.cash_movements
          )
            ? data.cash_movements
            : [];

        const cloudStartingCash =
          data.starting_cash &&
          typeof data.starting_cash ===
            'object'
            ? data.starting_cash
            : {};

        /*
         * =====================================
         * ATOMIC DATABASE RESTORE
         * =====================================
         *
         * Supabase column names:
         *
         * cash_movements
         * starting_cash
         *
         * restoreDatabaseData() expects:
         *
         * cashMovements
         * startingCash
         *
         * The mapping below is IMPORTANT.
         */

        await restoreDatabaseData({
          stores:
            cloudStores,

          products:
            cloudProducts,

          sales:
            cloudSales,

          debts:
            cloudDebts,

          cashMovements:
            cloudCashMovements,

          startingCash:
            cloudStartingCash,
        });

        /*
         * =====================================
         * READ RESTORED SQLITE DATABASE
         * =====================================
         */

        const [
          restoredStores,
          restoredProducts,
          restoredSales,
          restoredDebts,
          restoredMovements,
          restoredStartingCash,
        ] = await Promise.all([
          getStores(),
          getProducts(),
          getSales(),
          getDebts(),
          getCashMovements(),
          getAllStartingCash(),
        ]);

        /*
         * =====================================
         * UPDATE REACT STATE
         * =====================================
         */

        setStores(
          restoredStores.map(
            normalizeStore
          )
        );

        setProducts(
          restoredProducts
        );

        setSales(
          restoredSales
        );

        setDebts(
          restoredDebts
        );

        setCashMovements(
          restoredMovements
        );

        setStartingCashMap(
          restoredStartingCash
        );

        /*
         * =====================================
         * ACTIVE STORE
         * =====================================
         */

        setActiveStore(
          (previousActiveStore) => {
            if (!previousActiveStore) {
              return null;
            }

            const restoredActiveStore =
              restoredStores.find(
                (store) =>
                  store.id ===
                  previousActiveStore.id
              );

            if (!restoredActiveStore) {
              setCurrentScreen(
                'home'
              );

              return null;
            }

            return normalizeStore(
              restoredActiveStore
            );
          }
        );

        /*
         * =====================================
         * SAVE LAST SYNC TIME
         * =====================================
         */

        const syncTime =
          data.updated_at ||
          new Date().toISOString();

        setLastSyncTime(
          syncTime
        );

        await AsyncStorage.setItem(
          LAST_SYNC_KEY,
          syncTime
        );

        console.log(
          'Cloud restore completed successfully.'
        );

        return true;
      } catch (error) {
        /*
         * restoreDatabaseData() is expected
         * to use a SQLite transaction.
         *
         * Therefore a failed restore should
         * roll back rather than leaving a
         * partially restored database.
         */

        console.error(
          'Cloud restore error:',
          error
        );

        Alert.alert(
          'Cloud Restore Failed',
          error?.message ||
            'The cloud backup could not be restored. Your existing local data was preserved.'
        );

        throw error;
      }
    };

  /*
   * ==========================================
   * CLOUD BACKUP
   * ==========================================
   */

  const handleSyncData =
    async () => {
      if (!currentUser) {
        Alert.alert(
          'Login Required',
          'Please log in before syncing your data.'
        );

        return false;
      }

      try {
        const databaseData =
          await getAllDatabaseData();

        const now =
          new Date().toISOString();

        /*
         * Supabase uses snake_case column
         * names for these two fields.
         */

        const payload = {
          user_id:
            currentUser.id,

          stores:
            databaseData.stores,

          products:
            databaseData.products,

          sales:
            databaseData.sales,

          debts:
            databaseData.debts,

          cash_movements:
            databaseData.cashMovements,

          starting_cash:
            databaseData.startingCash,

          updated_at:
            now,
        };

        const {
          error,
        } =
          await supabase
            .from('user_backups')
            .upsert(
              payload
            );

        if (error) {
          throw error;
        }

        setLastSyncTime(
          now
        );

        await AsyncStorage.setItem(
          LAST_SYNC_KEY,
          now
        );

        Alert.alert(
          'Cloud Sync Complete ☁️',
          'All data successfully saved to cloud storage!'
        );

        return true;
      } catch (err) {
        console.error(
          'Cloud sync error:',
          err
        );

        Alert.alert(
          'Sync Error',
          err?.message ||
            'Could not synchronize your data.'
        );

        return false;
      }
    };

  /*
   * ==========================================
   * STORE CRUD
   * ==========================================
   */

  const handleSaveStore =
    async () => {
      if (!storeNameInput.trim()) {
        Alert.alert(
          'Required Field',
          'Please provide a store name.'
        );

        return;
      }

      try {
        if (editingStoreId) {
          const existingStore =
            stores.find(
              (store) =>
                store.id ===
                editingStoreId
            );

          if (!existingStore) {
            return;
          }

          const updatedStore = {
            ...existingStore,
            name:
              storeNameInput.trim(),
            owner:
              ownerNameInput.trim(),
          };

          await saveStore(
            updatedStore
          );

          setStores(
            (previous) =>
              previous.map(
                (store) =>
                  store.id ===
                  editingStoreId
                    ? updatedStore
                    : store
              )
          );

          setActiveStore(
            (previous) =>
              previous?.id ===
              editingStoreId
                ? updatedStore
                : previous
          );
        } else {
          const newStore = {
            id:
              `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

            name:
              storeNameInput.trim(),

            owner:
              ownerNameInput.trim(),

            createdAt:
              new Date().toLocaleDateString(
                'en-PH',
                {
                  month:
                    'short',
                  day:
                    'numeric',
                  year:
                    'numeric',
                }
              ),
          };

          await saveStore(
            newStore
          );

          setStores(
            (previous) => [
              newStore,
              ...previous,
            ]
          );
        }

        setIsStoreModalOpen(
          false
        );

        setEditingStoreId(
          null
        );

        setStoreNameInput(
          ''
        );

        setOwnerNameInput(
          ''
        );
      } catch (error) {
        console.error(
          'Save store error:',
          error
        );

        Alert.alert(
          'Save Error',
          'Could not save the store.'
        );
      }
    };

  const handleDeleteStore = (
    storeId,
    storeName
  ) => {
    Alert.alert(
      'Delete Store?',
      `Are you sure you want to delete "${storeName}"? This will also delete its products, sales, debts, cash movements, and starting cash.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress:
            async () => {
              try {
                await deleteStore(
                  storeId
                );

                setStores(
                  (previous) =>
                    previous.filter(
                      (store) =>
                        store.id !==
                        storeId
                    )
                );

                setProducts(
                  (previous) =>
                    previous.filter(
                      (product) =>
                        product.storeId !==
                        storeId
                    )
                );

                setSales(
                  (previous) =>
                    previous.filter(
                      (sale) =>
                        sale.storeId !==
                        storeId
                    )
                );

                setDebts(
                  (previous) =>
                    previous.filter(
                      (debt) =>
                        debt.storeId !==
                        storeId
                    )
                );

                setCashMovements(
                  (previous) =>
                    previous.filter(
                      (movement) =>
                        movement.storeId !==
                        storeId
                    )
                );

                setStartingCashMap(
                  (previous) => {
                    const updated = {
                      ...previous,
                    };

                    delete updated[
                      storeId
                    ];

                    return updated;
                  }
                );

                if (
                  activeStore?.id ===
                  storeId
                ) {
                  setActiveStore(
                    null
                  );

                  setCurrentScreen(
                    'home'
                  );
                }
              } catch (error) {
                console.error(
                  'Delete store error:',
                  error
                );

                Alert.alert(
                  'Delete Error',
                  'Could not delete the store.'
                );
              }
            },
        },
      ]
    );
  };

  /*
   * ==========================================
   * PRODUCT CRUD
   * ==========================================
   */

  const handleSaveProduct =
    async (
      productPayload
    ) => {
      try {
        await saveProduct(
          productPayload
        );

        setProducts(
          (previous) => {
            const exists =
              previous.some(
                (product) =>
                  product.id ===
                  productPayload.id
              );

            if (exists) {
              return previous.map(
                (product) =>
                  product.id ===
                  productPayload.id
                    ? productPayload
                    : product
              );
            }

            return [
              productPayload,
              ...previous,
            ];
          }
        );
      } catch (error) {
        console.error(
          'Save product error:',
          error
        );

        Alert.alert(
          'Save Error',
          'Could not save the product.'
        );
      }
    };

  const handleDeleteProduct = (
    productId,
    productName
  ) => {
    Alert.alert(
      'Delete Item?',
      `Are you sure you want to delete "${productName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress:
            async () => {
              try {
                await deleteProduct(
                  productId
                );

                setProducts(
                  (previous) =>
                    previous.filter(
                      (product) =>
                        product.id !==
                        productId
                    )
                );
              } catch (error) {
                console.error(
                  'Delete product error:',
                  error
                );

                Alert.alert(
                  'Delete Error',
                  'Could not delete the product.'
                );
              }
            },
        },
      ]
    );
  };

  const handleRestockProduct =
    async (
      productId,
      addedPieces
    ) => {
      try {
        const existingProduct =
          products.find(
            (product) =>
              product.id ===
              productId
          );

        if (!existingProduct) {
          return;
        }

        const updatedProduct = {
          ...existingProduct,

          totalPiecesStock:
            Number(
              existingProduct.totalPiecesStock
            ) +
            Number(
              addedPieces
            ),
        };

        await saveProduct(
          updatedProduct
        );

        setProducts(
          (previous) =>
            previous.map(
              (product) =>
                product.id ===
                productId
                  ? updatedProduct
                  : product
            )
        );

        Alert.alert(
          'Stock Updated',
          `Added +${addedPieces} items to inventory.`
        );
      } catch (error) {
        console.error(
          'Restock error:',
          error
        );

        Alert.alert(
          'Stock Error',
          'Could not update the product stock.'
        );
      }
    };

  /*
   * ==========================================
   * STARTING CASH
   * ==========================================
   */

  const handleSaveStartingCash =
    async (
      storeId,
      amount
    ) => {
      try {
        await saveStartingCash(
          storeId,
          amount
        );

        setStartingCashMap(
          (previous) => ({
            ...previous,

            [storeId]:
              Number(amount) ||
              0,
          })
        );
      } catch (error) {
        console.error(
          'Starting cash error:',
          error
        );

        Alert.alert(
          'Save Error',
          'Could not save the starting cash amount.'
        );
      }
    };

  /*
   * ==========================================
   * CASH MOVEMENTS
   * ==========================================
   */

  const handleAddCashMovement =
    async (movement) => {
      try {
        const normalizedMovement = {
          ...movement,

          id:
            movement.id ||
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          createdAtISO:
            movement.createdAtISO ||
            normalizeTimestamp(
              movement
            ),
        };

        await saveCashMovement(
          normalizedMovement
        );

        setCashMovements(
          (previous) => [
            normalizedMovement,
            ...previous,
          ]
        );
      } catch (error) {
        console.error(
          'Cash movement error:',
          error
        );

        Alert.alert(
          'Save Error',
          'Could not save the cash movement.'
        );
      }
    };

  /*
   * ==========================================
   * COMPLETE SALE
   * ==========================================
   */

  const handleCompleteSale =
    async (
      receipt,
      cartItems,
      newDebt = null
    ) => {
      try {
        const result =
          await completeSale(
            receipt,
            cartItems,
            newDebt
          );

        const {
          normalizedReceipt,
          normalizedDebt,
          updatedProducts,
        } = result;

        setProducts(
          (previous) => {
            const updatedMap =
              new Map();

            for (
              const product of
                updatedProducts
            ) {
              updatedMap.set(
                product.id,
                product
              );
            }

            return previous.map(
              (product) =>
                updatedMap.has(
                  product.id
                )
                  ? updatedMap.get(
                      product.id
                    )
                  : product
            );
          }
        );

        setSales(
          (previous) => [
            normalizedReceipt,
            ...previous,
          ]
        );

        if (normalizedDebt) {
          setDebts(
            (previous) => [
              normalizedDebt,
              ...previous,
            ]
          );
        }
      } catch (error) {
        console.error(
          'Complete sale error:',
          error
        );

        Alert.alert(
          'Checkout Error',
          error?.message ||
            'The sale could not be saved completely. No inventory or sale data was changed.'
        );

        throw error;
      }
    };

  /*
   * ==========================================
   * PAY DEBT
   * ==========================================
   */

  const handlePayDebt =
    async (
      debtId,
      payAmount
    ) => {
      try {
        const result =
          await completeDebtPayment(
            debtId,
            payAmount
          );

        const {
          updatedDebt,
          paymentReceipt,
        } = result;

        setDebts(
          (previous) =>
            previous.map(
              (debt) =>
                debt.id ===
                updatedDebt.id
                  ? updatedDebt
                  : debt
            )
        );

        setSales(
          (previous) => [
            paymentReceipt,
            ...previous,
          ]
        );

        Alert.alert(
          'Payment Recorded',
          `Received ₱${Number(
            paymentReceipt.totalAmount
          ).toFixed(2)} and added to cash drawer.`
        );

        return true;
      } catch (error) {
        console.error(
          'Debt payment error:',
          error
        );

        Alert.alert(
          'Payment Error',
          error?.message ||
            'The debt payment could not be recorded.'
        );

        return false;
      }
    };

  /*
   * ==========================================
   * LOADING UI
   * ==========================================
   */

  if (isLoadingSplash) {
    return (
      <SplashScreen
        onFinish={() =>
          setIsLoadingSplash(false)
        }
      />
    );
  }

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#38BDF8"
        />
      </View>
    );
  }

  /*
   * ==========================================
   * APP UI
   * ==========================================
   */

  return (
    <GestureHandlerRootView
      style={styles.rootContainer}
    >
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.safeArea}
          edges={[
            'top',
            'left',
            'right',
          ]}
        >
          <StatusBar
            barStyle="light-content"
            backgroundColor="#070B14"
            translucent={false}
          />

          {currentScreen ===
            'home' && (
            <HomeScreen
              stores={stores}
              currentUser={
                currentUser
              }
              language={
                appSettings.language
              }
              onOpenAuthModal={() =>
                setIsAuthModalOpen(
                  true
                )
              }
              onOpenSettingsModal={() =>
                setIsSettingsModalOpen(
                  true
                )
              }
              onOpenCreateModal={() => {
                setEditingStoreId(
                  null
                );

                setStoreNameInput(
                  ''
                );

                setOwnerNameInput(
                  ''
                );

                setIsStoreModalOpen(
                  true
                );
              }}
              onOpenEditModal={(
                store
              ) => {
                setEditingStoreId(
                  store.id
                );

                setStoreNameInput(
                  store.name
                );

                setOwnerNameInput(
                  store.owner ||
                    ''
                );

                setIsStoreModalOpen(
                  true
                );
              }}
              onDeleteStore={
                handleDeleteStore
              }
              onSelectStore={(
                store
              ) => {
                setActiveStore(
                  store
                );

                setCurrentScreen(
                  'dashboard'
                );
              }}
            />
          )}

          {currentScreen ===
            'dashboard' &&
            activeStore && (
              <DashboardScreen
                activeStore={
                  activeStore
                }

                products={
                  products
                }

                sales={
                  sales
                }

                debts={
                  debts
                }

                cashMovements={cashMovements.filter(
                  (movement) =>
                    movement.storeId ===
                    activeStore.id
                )}

                startingCashValue={
                  startingCashMap[
                    activeStore.id
                  ] || 0
                }

                onSaveStartingCash={(
                  amount
                ) =>
                  handleSaveStartingCash(
                    activeStore.id,
                    amount
                  )
                }

                onAddCashMovement={(
                  movement
                ) =>
                  handleAddCashMovement(
                    {
                      ...movement,
                      storeId:
                        activeStore.id,
                    }
                  )
                }

                language={
                  appSettings.language
                }

                soundEnabled={
                  appSettings.soundEnabled
                }

                receiptSettings={{
                  footer:
                    appSettings.receiptFooter,

                  contact:
                    appSettings.receiptContact,
                }}

                onSaveProduct={
                  handleSaveProduct
                }

                onDeleteProduct={
                  handleDeleteProduct
                }

                onCompleteSale={
                  handleCompleteSale
                }

                onPayDebt={
                  handlePayDebt
                }

                onRestockProduct={
                  handleRestockProduct
                }

                onBack={() =>
                  setCurrentScreen(
                    'home'
                  )
                }
              />
            )}

          <StoreModal
            visible={
              isStoreModalOpen
            }
            onClose={() =>
              setIsStoreModalOpen(
                false
              )
            }
            onSave={
              handleSaveStore
            }
            storeName={
              storeNameInput
            }
            setStoreName={
              setStoreNameInput
            }
            ownerName={
              ownerNameInput
            }
            setOwnerName={
              setOwnerNameInput
            }
            isEditing={
              !!editingStoreId
            }
          />

          <AuthModal
            visible={
              isAuthModalOpen
            }
            onClose={() =>
              setIsAuthModalOpen(
                false
              )
            }
            currentUser={
              currentUser
            }
            storesCount={
              stores.length
            }
            onLogin={
              handleLogin
            }
            onRegister={
              handleRegister
            }
            onLogout={
              handleLogout
            }
            onSyncData={
              handleSyncData
            }
            lastSyncTime={
              lastSyncTime
            }
            onChangePassword={
              handleChangePassword
            }
            onForgotPassword={
              handleForgotPassword
            }
            onVerifyAndResetPassword={
              handleVerifyAndResetPassword
            }
            onDeleteAccount={
              handleDeleteAccount
            }
            onSendVerificationEmail={
              handleSendVerificationEmail
            }
            onVerifyEmailOtp={
              handleVerifyEmailOtp
            }
          />

          <SettingsModal
            visible={
              isSettingsModalOpen
            }
            onClose={() =>
              setIsSettingsModalOpen(
                false
              )
            }
            settings={
              appSettings
            }
            onSaveSettings={
              handleSaveSettings
            }
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
    backgroundColor:
      '#070B14',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor:
      '#070B14',
    justifyContent:
      'center',
    alignItems:
      'center',
  },
});

