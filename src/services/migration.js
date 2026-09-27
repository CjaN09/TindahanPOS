import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  initDatabase,
  saveStore,
  saveProduct,
  saveSale,
  saveDebt,
  saveCashMovement,
  saveStartingCash,
} from './database';

const STORE_STORAGE_KEY = '@my_stores_data';
const PRODUCT_STORAGE_KEY = '@my_products_data';
const SALES_STORAGE_KEY = '@my_sales_data';
const DEBT_STORAGE_KEY = '@my_debts_data';
const CASH_MOVEMENTS_KEY = '@my_cash_movements_data';
const STARTING_CASH_KEY = '@my_starting_cash_map';

const MIGRATION_KEY = '@sqlite_migration_completed_v1';

const parseArray = (value) => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseObject = (value) => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
};

const normalizeTimestamp = (item) => {
  if (!item) {
    return new Date().toISOString();
  }

  if (item.createdAtISO) {
    const parsed = new Date(item.createdAtISO);

    if (!Number.isNaN(parsed.getTime())) {
      return item.createdAtISO;
    }
  }

  if (item.createdAt) {
    const parsed = new Date(item.createdAt);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

export const migrateAsyncStorageToSQLite = async () => {
  try {
    await initDatabase();

    const migrationCompleted =
      await AsyncStorage.getItem(MIGRATION_KEY);

    if (migrationCompleted === 'true') {
      return {
        migrated: false,
        alreadyCompleted: true,
      };
    }

    const [
      storedStores,
      storedProducts,
      storedSales,
      storedDebts,
      storedMovements,
      storedStartingCash,
    ] = await AsyncStorage.multiGet([
      STORE_STORAGE_KEY,
      PRODUCT_STORAGE_KEY,
      SALES_STORAGE_KEY,
      DEBT_STORAGE_KEY,
      CASH_MOVEMENTS_KEY,
      STARTING_CASH_KEY,
    ]);

    const stores = parseArray(storedStores?.[1]);
    const products = parseArray(storedProducts?.[1]);
    const sales = parseArray(storedSales?.[1]);
    const debts = parseArray(storedDebts?.[1]);
    const cashMovements = parseArray(storedMovements?.[1]);
    const startingCashMap = parseObject(storedStartingCash?.[1]);

    let migratedCounts = {
      stores: 0,
      products: 0,
      sales: 0,
      debts: 0,
      cashMovements: 0,
      startingCash: 0,
    };

    /*
     * STORES
     */

    for (const store of stores) {
      if (!store?.id) continue;

      await saveStore(store);

      migratedCounts.stores += 1;
    }

    /*
     * PRODUCTS
     */

    for (const product of products) {
      if (!product?.id || !product?.storeId) continue;

      await saveProduct(product);

      migratedCounts.products += 1;
    }

    /*
     * SALES
     */

    for (const sale of sales) {
      if (!sale?.id) continue;

      const normalizedSale = {
        ...sale,
        createdAtISO: normalizeTimestamp(sale),
      };

      await saveSale(normalizedSale);

      migratedCounts.sales += 1;
    }

    /*
     * DEBTS
     */

    for (const debt of debts) {
      if (!debt?.id) continue;

      const normalizedDebt = {
        ...debt,
        createdAtISO: normalizeTimestamp(debt),
      };

      await saveDebt(normalizedDebt);

      migratedCounts.debts += 1;
    }

    /*
     * CASH MOVEMENTS
     */

    for (const movement of cashMovements) {
      if (!movement?.id) continue;

      const normalizedMovement = {
        ...movement,
        createdAtISO: normalizeTimestamp(movement),
      };

      await saveCashMovement(normalizedMovement);

      migratedCounts.cashMovements += 1;
    }

    /*
     * STARTING CASH
     */

    for (const [storeId, amount] of Object.entries(
      startingCashMap
    )) {
      if (!storeId) continue;

      await saveStartingCash(storeId, amount);

      migratedCounts.startingCash += 1;
    }

    /*
     * Mark migration complete only after
     * everything was successfully copied.
     */

    await AsyncStorage.setItem(
      MIGRATION_KEY,
      'true'
    );

    return {
      migrated: true,
      alreadyCompleted: false,
      counts: migratedCounts,
    };
  } catch (error) {
    console.error(
      'SQLite migration failed:',
      error
    );

    /*
     * Very important:
     * We intentionally DO NOT mark the migration
     * as completed when an error happens.
     *
     * This allows the migration to be retried
     * the next time the app starts.
     */

    throw error;
  }
};

export const resetMigrationFlag = async () => {
  await AsyncStorage.removeItem(
    MIGRATION_KEY
  );
};