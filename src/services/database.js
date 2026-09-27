import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'fresh_app.db';

let dbPromise = null;

const getDatabase = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(
      DATABASE_NAME
    );
  }

  return dbPromise;
};

export const initDatabase = async () => {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      owner TEXT DEFAULT '',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT,
      created_at TEXT,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT,
      status TEXT,
      created_at TEXT,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT,
      type TEXT,
      created_at TEXT,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS starting_cash (
      store_id TEXT PRIMARY KEY NOT NULL,
      amount REAL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_products_store
      ON products(store_id);

    CREATE INDEX IF NOT EXISTS idx_sales_store
      ON sales(store_id);

    CREATE INDEX IF NOT EXISTS idx_sales_created_at
      ON sales(created_at);

    CREATE INDEX IF NOT EXISTS idx_debts_store
      ON debts(store_id);

    CREATE INDEX IF NOT EXISTS idx_debts_status
      ON debts(status);

    CREATE INDEX IF NOT EXISTS idx_cash_movements_store
      ON cash_movements(store_id);

    CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at
      ON cash_movements(created_at);
  `);

  return db;
};

const safeJsonParse = (
  value,
  fallback = null
) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/* =========================
   STORES
========================= */

export const getStores = async () => {
  const db = await initDatabase();

  const rows = await db.getAllAsync(`
    SELECT *
    FROM stores
    ORDER BY rowid DESC
  `);

  return rows;
};

export const saveStore = async (
  store
) => {
  const db = await initDatabase();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO stores
      (id, name, owner, created_at)
      VALUES (?, ?, ?, ?)
    `,
    store.id,
    store.name,
    store.owner || '',
    store.createdAt ||
      new Date().toISOString()
  );
};

export const deleteStore = async (
  storeId
) => {
  const db = await initDatabase();

  await db.withTransactionAsync(
    async () => {
      await db.runAsync(
        `DELETE FROM stores WHERE id = ?`,
        storeId
      );

      await db.runAsync(
        `DELETE FROM products WHERE store_id = ?`,
        storeId
      );

      await db.runAsync(
        `DELETE FROM sales WHERE store_id = ?`,
        storeId
      );

      await db.runAsync(
        `DELETE FROM debts WHERE store_id = ?`,
        storeId
      );

      await db.runAsync(
        `DELETE FROM cash_movements WHERE store_id = ?`,
        storeId
      );

      await db.runAsync(
        `DELETE FROM starting_cash WHERE store_id = ?`,
        storeId
      );
    }
  );
};

/* =========================
   PRODUCTS
========================= */

export const getProducts = async (
  storeId = null
) => {
  const db = await initDatabase();

  let rows;

  if (storeId) {
    rows = await db.getAllAsync(
      `
        SELECT data
        FROM products
        WHERE store_id = ?
      `,
      storeId
    );
  } else {
    rows = await db.getAllAsync(`
      SELECT data
      FROM products
    `);
  }

  return rows
    .map((row) =>
      safeJsonParse(row.data)
    )
    .filter(Boolean);
};

export const saveProduct = async (
  product
) => {
  const db = await initDatabase();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO products
      (id, store_id, data)
      VALUES (?, ?, ?)
    `,
    product.id,
    product.storeId,
    JSON.stringify(product)
  );
};

export const deleteProduct = async (
  productId
) => {
  const db = await initDatabase();

  await db.runAsync(
    `DELETE FROM products WHERE id = ?`,
    productId
  );
};

/* =========================
   SALES
========================= */

export const getSales = async (
  storeId = null
) => {
  const db = await initDatabase();

  let rows;

  if (storeId) {
    rows = await db.getAllAsync(
      `
        SELECT data
        FROM sales
        WHERE store_id = ?
        ORDER BY created_at DESC
      `,
      storeId
    );
  } else {
    rows = await db.getAllAsync(`
      SELECT data
      FROM sales
      ORDER BY created_at DESC
    `);
  }

  return rows
    .map((row) =>
      safeJsonParse(row.data)
    )
    .filter(Boolean);
};

export const saveSale = async (
  sale
) => {
  const db = await initDatabase();

  const createdAt =
    sale.createdAtISO ||
    sale.createdAt ||
    new Date().toISOString();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO sales
      (id, store_id, created_at, data)
      VALUES (?, ?, ?, ?)
    `,
    sale.id,
    sale.storeId || null,
    createdAt,
    JSON.stringify({
      ...sale,
      createdAtISO:
        sale.createdAtISO ||
        createdAt,
    })
  );
};

/* =========================
   DEBTS
========================= */

export const getDebts = async (
  storeId = null
) => {
  const db = await initDatabase();

  let rows;

  if (storeId) {
    rows = await db.getAllAsync(
      `
        SELECT data
        FROM debts
        WHERE store_id = ?
        ORDER BY created_at DESC
      `,
      storeId
    );
  } else {
    rows = await db.getAllAsync(`
      SELECT data
      FROM debts
      ORDER BY created_at DESC
    `);
  }

  return rows
    .map((row) =>
      safeJsonParse(row.data)
    )
    .filter(Boolean);
};

export const saveDebt = async (
  debt
) => {
  const db = await initDatabase();

  const createdAt =
    debt.createdAtISO ||
    debt.createdAt ||
    new Date().toISOString();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO debts
      (id, store_id, status, created_at, data)
      VALUES (?, ?, ?, ?, ?)
    `,
    debt.id,
    debt.storeId || null,
    debt.status || 'unpaid',
    createdAt,
    JSON.stringify({
      ...debt,
      createdAtISO:
        debt.createdAtISO ||
        createdAt,
    })
  );
};

/* =========================
   CASH MOVEMENTS
========================= */

export const getCashMovements = async (
  storeId = null
) => {
  const db = await initDatabase();

  let rows;

  if (storeId) {
    rows = await db.getAllAsync(
      `
        SELECT data
        FROM cash_movements
        WHERE store_id = ?
        ORDER BY created_at DESC
      `,
      storeId
    );
  } else {
    rows = await db.getAllAsync(`
      SELECT data
      FROM cash_movements
      ORDER BY created_at DESC
    `);
  }

  return rows
    .map((row) =>
      safeJsonParse(row.data)
    )
    .filter(Boolean);
};

export const saveCashMovement = async (
  movement
) => {
  const db = await initDatabase();

  const createdAt =
    movement.createdAtISO ||
    movement.createdAt ||
    new Date().toISOString();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO cash_movements
      (id, store_id, type, created_at, data)
      VALUES (?, ?, ?, ?, ?)
    `,
    movement.id,
    movement.storeId || null,
    movement.type || null,
    createdAt,
    JSON.stringify({
      ...movement,
      createdAtISO:
        movement.createdAtISO ||
        createdAt,
    })
  );
};

/* =========================
   ATOMIC CHECKOUT
========================= */

/*
 * Completes a sale as ONE SQLite transaction.
 *
 * Operations:
 *
 * 1. Validate products
 * 2. Validate stock
 * 3. Deduct inventory
 * 4. Save sale
 * 5. Save debt when applicable
 *
 * If ANY operation fails,
 * SQLite rolls back everything.
 */

export const completeSale = async (
  receipt,
  cartItems = [],
  newDebt = null
) => {
  const db = await initDatabase();

  if (!receipt?.id) {
    throw new Error(
      'Sale receipt is missing an ID.'
    );
  }

  if (!Array.isArray(cartItems)) {
    throw new Error(
      'Invalid cart data.'
    );
  }

  const purchasedPieces = {};

  for (const item of cartItems) {
    if (!item?.productId) {
      throw new Error(
        'A cart item is missing its product ID.'
      );
    }

    const quantity =
      Number(item.quantity) || 0;

    const piecesPerUnit =
      Number(
        item.piecesPerUnit || 1
      );

    if (
      quantity <= 0 ||
      piecesPerUnit <= 0
    ) {
      throw new Error(
        'Invalid quantity in cart.'
      );
    }

    const pieces =
      quantity * piecesPerUnit;

    purchasedPieces[
      item.productId
    ] =
      (purchasedPieces[
        item.productId
      ] || 0) + pieces;
  }

  const receiptCreatedAt =
    receipt.createdAtISO ||
    receipt.createdAt ||
    new Date().toISOString();

  const normalizedReceipt = {
    ...receipt,
    createdAtISO:
      receipt.createdAtISO ||
      receiptCreatedAt,
  };

  let normalizedDebt = null;
  let updatedProducts = [];

  await db.withTransactionAsync(
    async () => {
      /*
       * =====================================
       * 1. VALIDATE AND UPDATE PRODUCTS
       * =====================================
       */

      for (const [
        productId,
        deductedPieces,
      ] of Object.entries(
        purchasedPieces
      )) {
        const row =
          await db.getFirstAsync(
            `
              SELECT
                id,
                store_id,
                data
              FROM products
              WHERE id = ?
            `,
            productId
          );

        if (!row) {
          throw new Error(
            `Product ${productId} was not found in the database.`
          );
        }

        const product =
          safeJsonParse(row.data);

        if (!product) {
          throw new Error(
            `Product ${productId} contains invalid data.`
          );
        }

        const currentStock =
          Number(
            product.totalPiecesStock
          ) || 0;

        if (
          deductedPieces >
          currentStock
        ) {
          throw new Error(
            `Insufficient stock for "${product.name || 'product'}". Available: ${currentStock}, required: ${deductedPieces}.`
          );
        }

        const updatedProduct = {
          ...product,
          totalPiecesStock:
            currentStock -
            deductedPieces,
        };

        await db.runAsync(
          `
            UPDATE products
            SET data = ?
            WHERE id = ?
          `,
          JSON.stringify(
            updatedProduct
          ),
          productId
        );

        updatedProducts.push(
          updatedProduct
        );
      }

      /*
       * =====================================
       * 2. SAVE SALE
       * =====================================
       */

      await db.runAsync(
        `
          INSERT OR REPLACE INTO sales
          (id, store_id, created_at, data)
          VALUES (?, ?, ?, ?)
        `,
        normalizedReceipt.id,
        normalizedReceipt.storeId ||
          null,
        receiptCreatedAt,
        JSON.stringify(
          normalizedReceipt
        )
      );

      /*
       * =====================================
       * 3. SAVE DEBT IF APPLICABLE
       * =====================================
       */

      if (newDebt) {
        if (!newDebt.id) {
          throw new Error(
            'Debt is missing an ID.'
          );
        }

        const debtCreatedAt =
          newDebt.createdAtISO ||
          newDebt.createdAt ||
          new Date().toISOString();

        normalizedDebt = {
          ...newDebt,
          createdAtISO:
            newDebt.createdAtISO ||
            debtCreatedAt,
        };

        await db.runAsync(
          `
            INSERT OR REPLACE INTO debts
            (id, store_id, status, created_at, data)
            VALUES (?, ?, ?, ?, ?)
          `,
          normalizedDebt.id,
          normalizedDebt.storeId ||
            null,
          normalizedDebt.status ||
            'unpaid',
          debtCreatedAt,
          JSON.stringify(
            normalizedDebt
          )
        );
      }
    }
  );

  return {
    normalizedReceipt,
    normalizedDebt,
    updatedProducts,
  };
};

/* =========================
   ATOMIC DEBT PAYMENT
========================= */

export const completeDebtPayment = async (
  debtId,
  payAmount
) => {
  const db = await initDatabase();

  if (!debtId) {
    throw new Error(
      'Debt ID is required.'
    );
  }

  const amount =
    Number(payAmount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      'Invalid payment amount.'
    );
  }

  let updatedDebt = null;
  let paymentReceipt = null;

  await db.withTransactionAsync(
    async () => {
      /*
       * =====================================
       * 1. FIND THE DEBT
       * =====================================
       */

      const debtRow =
        await db.getFirstAsync(
          `
            SELECT
              id,
              store_id,
              status,
              data
            FROM debts
            WHERE id = ?
          `,
          debtId
        );

      if (!debtRow) {
        throw new Error(
          'The selected debt could not be found.'
        );
      }

      const debt =
        safeJsonParse(
          debtRow.data
        );

      if (!debt) {
        throw new Error(
          'The selected debt contains invalid data.'
        );
      }

      /*
       * =====================================
       * 2. VALIDATE BALANCE
       * =====================================
       */

      const currentBalance =
        Number(
          debt.balance
        ) || 0;

      if (currentBalance <= 0) {
        throw new Error(
          'This debt has already been fully paid.'
        );
      }

      if (
        amount >
        currentBalance
      ) {
        throw new Error(
          `Payment cannot exceed the remaining balance of ₱${currentBalance.toFixed(
            2
          )}.`
        );
      }

      /*
       * =====================================
       * 3. UPDATE DEBT
       * =====================================
       */

      const newBalance =
        Math.max(
          0,
          currentBalance -
            amount
        );

      const now =
        new Date().toISOString();

      updatedDebt = {
        ...debt,
        balance:
          newBalance,
        status:
          newBalance === 0
            ? 'paid'
            : 'unpaid',
        updatedAtISO:
          now,
      };

      await db.runAsync(
        `
          UPDATE debts
          SET
            status = ?,
            data = ?
          WHERE id = ?
        `,
        updatedDebt.status,
        JSON.stringify(
          updatedDebt
        ),
        debtId
      );

      /*
       * =====================================
       * 4. CREATE PAYMENT HISTORY
       * =====================================
       */

      const customerName =
        debt.customerName ||
        'Customer';

      paymentReceipt = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        storeId:
          debt.storeId ||
          debtRow.store_id ||
          null,

        items: [
          {
            name: `Credit Payment (${customerName})`,
            quantity: 1,
            price: amount,
          },
        ],

        totalAmount:
          amount,

        totalProfit: 0,

        paymentType:
          'cash',

        cashTendered:
          amount,

        change: 0,

        createdAt:
          new Date().toLocaleString(
            'en-PH',
            {
              month: 'short',
              day: 'numeric',
              minute: '2-digit',
              hour: '2-digit',
            }
          ),

        createdAtISO:
          now,
      };

      /*
       * =====================================
       * 5. SAVE PAYMENT HISTORY
       * =====================================
       */

      await db.runAsync(
        `
          INSERT OR REPLACE INTO sales
          (id, store_id, created_at, data)
          VALUES (?, ?, ?, ?)
        `,
        paymentReceipt.id,
        paymentReceipt.storeId,
        paymentReceipt.createdAtISO,
        JSON.stringify(
          paymentReceipt
        )
      );
    }
  );

  return {
    updatedDebt,
    paymentReceipt,
  };
};

/* =========================
   STARTING CASH
========================= */

export const getStartingCash = async (
  storeId
) => {
  const db = await initDatabase();

  const row =
    await db.getFirstAsync(
      `
        SELECT amount
        FROM starting_cash
        WHERE store_id = ?
      `,
      storeId
    );

  return row
    ? Number(row.amount)
    : 0;
};

export const getAllStartingCash =
  async () => {
    const db = await initDatabase();

    const rows =
      await db.getAllAsync(`
        SELECT store_id, amount
        FROM starting_cash
      `);

    const result = {};

    for (const row of rows) {
      result[row.store_id] =
        Number(row.amount);
    }

    return result;
  };

export const saveStartingCash = async (
  storeId,
  amount
) => {
  const db = await initDatabase();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO starting_cash
      (store_id, amount)
      VALUES (?, ?)
    `,
    storeId,
    Number(amount) || 0
  );
};

export const deleteStartingCash = async (
  storeId
) => {
  const db = await initDatabase();

  await db.runAsync(
    `DELETE FROM starting_cash WHERE store_id = ?`,
    storeId
  );
};

/* =========================
   FULL DATABASE READ
   Used for cloud backup
========================= */

export const getAllDatabaseData =
  async () => {
    const [
      stores,
      products,
      sales,
      debts,
      cashMovements,
      startingCash,
    ] = await Promise.all([
      getStores(),
      getProducts(),
      getSales(),
      getDebts(),
      getCashMovements(),
      getAllStartingCash(),
    ]);

    return {
      stores,
      products,
      sales,
      debts,
      cashMovements,
      startingCash,
    };
  };

/* =========================
   ATOMIC DATABASE RESTORE
   Used for cloud backup restore
========================= */

/*
 * Restores the complete local database
 * from a Supabase cloud backup.
 *
 * EVERYTHING is restored inside ONE
 * SQLite transaction.
 *
 * If anything fails:
 *
 *     DELETE old data
 *          ↓
 *     INSERT cloud data
 *          ↓
 *        ERROR
 *          ↓
 *       ROLLBACK
 *
 * The previous local database remains
 * intact.
 */

export const restoreDatabaseData = async (
  backupData
) => {
  const db = await initDatabase();

  /*
   * =====================================
   * 1. VALIDATE BACKUP OBJECT
   * =====================================
   */

  if (
    !backupData ||
    typeof backupData !== 'object'
  ) {
    throw new Error(
      'Invalid cloud backup data.'
    );
  }

  /*
   * =====================================
   * 2. NORMALIZE BACKUP DATA
   * =====================================
   */

  const stores = Array.isArray(
    backupData.stores
  )
    ? backupData.stores
    : [];

  const products = Array.isArray(
    backupData.products
  )
    ? backupData.products
    : [];

  const sales = Array.isArray(
    backupData.sales
  )
    ? backupData.sales
    : [];

  const debts = Array.isArray(
    backupData.debts
  )
    ? backupData.debts
    : [];

  const cashMovements = Array.isArray(
    backupData.cashMovements
  )
    ? backupData.cashMovements
    : [];

  const startingCash =
    backupData.startingCash &&
    typeof backupData.startingCash ===
      'object' &&
    !Array.isArray(
      backupData.startingCash
    )
      ? backupData.startingCash
      : {};

  /*
   * =====================================
   * 3. VALIDATE STORES
   * =====================================
   */

  for (const store of stores) {
    if (!store?.id) {
      throw new Error(
        'Cloud backup contains a store without an ID.'
      );
    }

    if (
      store.name === undefined ||
      store.name === null
    ) {
      throw new Error(
        `Store ${store.id} is missing its name.`
      );
    }
  }

  /*
   * =====================================
   * 4. VALIDATE PRODUCTS
   * =====================================
   */

  for (const product of products) {
    if (!product?.id) {
      throw new Error(
        'Cloud backup contains a product without an ID.'
      );
    }

    if (!product?.storeId) {
      throw new Error(
        `Product ${product.id} is missing its store ID.`
      );
    }
  }

  /*
   * =====================================
   * 5. VALIDATE SALES
   * =====================================
   */

  for (const sale of sales) {
    if (!sale?.id) {
      throw new Error(
        'Cloud backup contains a sale without an ID.'
      );
    }
  }

  /*
   * =====================================
   * 6. VALIDATE DEBTS
   * =====================================
   */

  for (const debt of debts) {
    if (!debt?.id) {
      throw new Error(
        'Cloud backup contains a debt without an ID.'
      );
    }
  }

  /*
   * =====================================
   * 7. VALIDATE CASH MOVEMENTS
   * =====================================
   */

  for (const movement of cashMovements) {
    if (!movement?.id) {
      throw new Error(
        'Cloud backup contains a cash movement without an ID.'
      );
    }
  }

  /*
   * =====================================
   * 8. VALIDATE STARTING CASH
   * =====================================
   */

  for (const [
    storeId,
    amount,
  ] of Object.entries(
    startingCash
  )) {
    if (!storeId) {
      throw new Error(
        'Cloud backup contains starting cash without a store ID.'
      );
    }

    if (
      !Number.isFinite(
        Number(amount)
      )
    ) {
      throw new Error(
        `Invalid starting cash amount for store ${storeId}.`
      );
    }
  }

  /*
   * =====================================
   * 9. VALIDATE STORE REFERENCES
   * =====================================
   */

  const storeIds =
    new Set(
      stores.map(
        (store) => String(store.id)
      )
    );

  for (const product of products) {
    if (
      product.storeId &&
      !storeIds.has(
        String(product.storeId)
      )
    ) {
      throw new Error(
        `Product "${product.name || product.id}" references a store that does not exist in the cloud backup.`
      );
    }
  }

  for (const sale of sales) {
    if (
      sale.storeId &&
      !storeIds.has(
        String(sale.storeId)
      )
    ) {
      throw new Error(
        `Sale ${sale.id} references a store that does not exist in the cloud backup.`
      );
    }
  }

  for (const debt of debts) {
    if (
      debt.storeId &&
      !storeIds.has(
        String(debt.storeId)
      )
    ) {
      throw new Error(
        `Debt ${debt.id} references a store that does not exist in the cloud backup.`
      );
    }
  }

  for (const movement of cashMovements) {
    if (
      movement.storeId &&
      !storeIds.has(
        String(movement.storeId)
      )
    ) {
      throw new Error(
        `Cash movement ${movement.id} references a store that does not exist in the cloud backup.`
      );
    }
  }

  for (const storeId of Object.keys(
    startingCash
  )) {
    if (
      !storeIds.has(
        String(storeId)
      )
    ) {
      throw new Error(
        `Starting cash references a store that does not exist in the cloud backup: ${storeId}.`
      );
    }
  }

  /*
   * =====================================
   * 10. ATOMIC RESTORE
   * =====================================
   */

  await db.withTransactionAsync(
    async () => {
      /*
       * =================================
       * CLEAR CURRENT DATA
       * =================================
       */

      await db.runAsync(
        `DELETE FROM sales`
      );

      await db.runAsync(
        `DELETE FROM debts`
      );

      await db.runAsync(
        `DELETE FROM cash_movements`
      );

      await db.runAsync(
        `DELETE FROM starting_cash`
      );

      await db.runAsync(
        `DELETE FROM products`
      );

      await db.runAsync(
        `DELETE FROM stores`
      );

      /*
       * =================================
       * RESTORE STORES
       * =================================
       */

      for (const store of stores) {
        await db.runAsync(
          `
            INSERT INTO stores
            (
              id,
              name,
              owner,
              created_at
            )
            VALUES (?, ?, ?, ?)
          `,
          store.id,
          store.name,
          store.owner || '',
          store.createdAt ||
            store.created_at ||
            new Date().toISOString()
        );
      }

      /*
       * =================================
       * RESTORE PRODUCTS
       * =================================
       */

      for (const product of products) {
        await db.runAsync(
          `
            INSERT INTO products
            (
              id,
              store_id,
              data
            )
            VALUES (?, ?, ?)
          `,
          product.id,
          product.storeId,
          JSON.stringify(product)
        );
      }

      /*
       * =================================
       * RESTORE SALES
       * =================================
       */

      for (const sale of sales) {
        const createdAt =
          sale.createdAtISO ||
          sale.createdAt ||
          new Date().toISOString();

        await db.runAsync(
          `
            INSERT INTO sales
            (
              id,
              store_id,
              created_at,
              data
            )
            VALUES (?, ?, ?, ?)
          `,
          sale.id,
          sale.storeId || null,
          createdAt,
          JSON.stringify({
            ...sale,
            createdAtISO:
              sale.createdAtISO ||
              createdAt,
          })
        );
      }

      /*
       * =================================
       * RESTORE DEBTS
       * =================================
       */

      for (const debt of debts) {
        const createdAt =
          debt.createdAtISO ||
          debt.createdAt ||
          new Date().toISOString();

        await db.runAsync(
          `
            INSERT INTO debts
            (
              id,
              store_id,
              status,
              created_at,
              data
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          debt.id,
          debt.storeId || null,
          debt.status ||
            'unpaid',
          createdAt,
          JSON.stringify({
            ...debt,
            createdAtISO:
              debt.createdAtISO ||
              createdAt,
          })
        );
      }

      /*
       * =================================
       * RESTORE CASH MOVEMENTS
       * =================================
       */

      for (const movement of cashMovements) {
        const createdAt =
          movement.createdAtISO ||
          movement.createdAt ||
          new Date().toISOString();

        await db.runAsync(
          `
            INSERT INTO cash_movements
            (
              id,
              store_id,
              type,
              created_at,
              data
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          movement.id,
          movement.storeId ||
            null,
          movement.type ||
            null,
          createdAt,
          JSON.stringify({
            ...movement,
            createdAtISO:
              movement.createdAtISO ||
              createdAt,
          })
        );
      }

      /*
       * =================================
       * RESTORE STARTING CASH
       * =================================
       *
       * Your actual table is:
       *
       * starting_cash
       * ├── store_id
       * └── amount
       *
       * So we restore those fields directly.
       */

      for (const [
        storeId,
        amount,
      ] of Object.entries(
        startingCash
      )) {
        await db.runAsync(
          `
            INSERT INTO starting_cash
            (
              store_id,
              amount
            )
            VALUES (?, ?)
          `,
          storeId,
          Number(amount) || 0
        );
      }
    }
  );

  /*
   * =====================================
   * RESTORE SUCCESSFUL
   * =====================================
   *
   * If we reach this point, the SQLite
   * transaction committed successfully.
   */

  return {
    stores,
    products,
    sales,
    debts,
    cashMovements,
    startingCash,
  };
};

/* =========================
   CLEAR DATABASE
   Used for account deletion
========================= */

export const clearDatabase = async () => {
  const db = await initDatabase();

  await db.withTransactionAsync(
    async () => {
      await db.runAsync(
        `DELETE FROM stores`
      );

      await db.runAsync(
        `DELETE FROM products`
      );

      await db.runAsync(
        `DELETE FROM sales`
      );

      await db.runAsync(
        `DELETE FROM debts`
      );

      await db.runAsync(
        `DELETE FROM cash_movements`
      );

      await db.runAsync(
        `DELETE FROM starting_cash`
      );
    }
  );
};