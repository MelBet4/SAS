"""
SAS - Database Layer
Handles SQLite setup, schema creation, and seed data.
"""

import sqlite3
import os
from datetime import date

DB_PATH = os.path.join(os.path.dirname(__file__), "sas.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create all tables and seed sample data if fresh."""
    conn = get_connection()
    c = conn.cursor()

    # ------------------------------------------------------------------ #
    #  DDL
    # ------------------------------------------------------------------ #
    c.executescript("""
        -- Items master table
        CREATE TABLE IF NOT EXISTS items (
            item_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            code          TEXT    NOT NULL UNIQUE,   -- barcode / SKU
            name          TEXT    NOT NULL,
            unit          TEXT    NOT NULL DEFAULT 'unit',  -- kg, litre, unit …
            unit_price    REAL    NOT NULL CHECK(unit_price >= 0),
            cost_price    REAL    NOT NULL CHECK(cost_price >= 0),
            stock_qty     REAL    NOT NULL DEFAULT 0 CHECK(stock_qty >= 0),
            created_at    TEXT    NOT NULL DEFAULT (date('now'))
        );

        -- Price change log
        CREATE TABLE IF NOT EXISTS price_history (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id       INTEGER NOT NULL REFERENCES items(item_id),
            old_price     REAL    NOT NULL,
            new_price     REAL    NOT NULL,
            changed_by    TEXT    NOT NULL DEFAULT 'manager',
            changed_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- Inventory restocking log
        CREATE TABLE IF NOT EXISTS inventory_log (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id       INTEGER NOT NULL REFERENCES items(item_id),
            qty_added     REAL    NOT NULL,
            employee      TEXT    NOT NULL DEFAULT 'employee',
            logged_at     TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- Sales transactions (header)
        CREATE TABLE IF NOT EXISTS transactions (
            txn_id        INTEGER PRIMARY KEY AUTOINCREMENT,
            txn_date      TEXT    NOT NULL DEFAULT (date('now')),
            txn_time      TEXT    NOT NULL DEFAULT (time('now')),
            cashier       TEXT    NOT NULL DEFAULT 'clerk',
            total_amount  REAL    NOT NULL DEFAULT 0
        );

        -- Sales transaction lines (detail)
        CREATE TABLE IF NOT EXISTS transaction_items (
            line_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            txn_id        INTEGER NOT NULL REFERENCES transactions(txn_id),
            item_id       INTEGER NOT NULL REFERENCES items(item_id),
            quantity      REAL    NOT NULL CHECK(quantity > 0),
            unit_price    REAL    NOT NULL,   -- price at time of sale (snapshot)
            item_total    REAL    NOT NULL    -- quantity * unit_price
        );
    """)

    # ------------------------------------------------------------------ #
    #  Seed sample items if table is empty
    # ------------------------------------------------------------------ #
    c.execute("SELECT COUNT(*) FROM items")
    if c.fetchone()[0] == 0:
        sample_items = [
            ("ITM001", "Unga Maize Flour 2kg",  "pack",   145.00,  110.00, 200),
            ("ITM002", "Cooking Oil 1L",         "bottle", 320.00,  250.00, 150),
            ("ITM003", "Sugar 1kg",              "kg",      85.00,   65.00, 300),
            ("ITM004", "Milk Fresh 500ml",       "pack",    60.00,   45.00, 250),
            ("ITM005", "Bread White Loaf",       "loaf",    65.00,   48.00, 120),
            ("ITM006", "Rice Basmati 1kg",       "kg",     180.00,  140.00, 180),
            ("ITM007", "Tomato Sauce 500g",      "jar",    110.00,   80.00,  90),
            ("ITM008", "Eggs (tray of 30)",      "tray",   450.00,  380.00,  60),
            ("ITM009", "Beef (per kg)",          "kg",     800.00,  650.00,  50),
            ("ITM010", "Soft Drink 500ml",       "bottle",  70.00,   50.00, 200),
        ]
        c.executemany(
            "INSERT INTO items (code, name, unit, unit_price, cost_price, stock_qty) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            sample_items,
        )

    conn.commit()
    conn.close()
    print("Database initialised at:", DB_PATH)
