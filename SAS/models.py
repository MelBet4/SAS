"""
SAS - Models / Business Logic
All database operations are isolated here.
"""

from database import get_connection
from datetime import date


# ============================================================
#  INVENTORY
# ============================================================

def get_all_items():
    conn = get_connection()
    rows = conn.execute(
        "SELECT item_id, code, name, unit, unit_price, cost_price, stock_qty "
        "FROM items ORDER BY name"
    ).fetchall()
    conn.close()
    return rows


def get_item_by_code(code: str):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM items WHERE code = ?", (code.upper(),)
    ).fetchone()
    conn.close()
    return row


def get_item_by_id(item_id: int):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM items WHERE item_id = ?", (item_id,)
    ).fetchone()
    conn.close()
    return row


def update_price(item_id: int, new_price: float, changed_by: str = "manager"):
    """Change selling price and log the change."""
    conn = get_connection()
    c = conn.cursor()
    row = c.execute("SELECT unit_price FROM items WHERE item_id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        return False, "Item not found"
    old_price = row["unit_price"]
    c.execute("UPDATE items SET unit_price = ? WHERE item_id = ?", (new_price, item_id))
    c.execute(
        "INSERT INTO price_history (item_id, old_price, new_price, changed_by) VALUES (?,?,?,?)",
        (item_id, old_price, new_price, changed_by),
    )
    conn.commit()
    conn.close()
    return True, old_price


def restock_item(item_id: int, qty: float, employee: str = "employee"):
    """Add stock and log the restock event."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE items SET stock_qty = stock_qty + ? WHERE item_id = ?", (qty, item_id))
    c.execute(
        "INSERT INTO inventory_log (item_id, qty_added, employee) VALUES (?,?,?)",
        (item_id, qty, employee),
    )
    conn.commit()
    new_qty = c.execute("SELECT stock_qty FROM items WHERE item_id = ?", (item_id,)).fetchone()["stock_qty"]
    conn.close()
    return new_qty


# ============================================================
#  SALES TRANSACTIONS
# ============================================================

def create_transaction(cart: list, cashier: str = "clerk"):
    """
    cart: list of dicts  { 'item_id': int, 'quantity': float }
    Returns (txn_id, bill_lines, total)  or raises ValueError.
    """
    conn = get_connection()
    c = conn.cursor()

    bill_lines = []
    total = 0.0

    # Validate stock before committing anything
    for entry in cart:
        item = c.execute("SELECT * FROM items WHERE item_id = ?", (entry["item_id"],)).fetchone()
        if not item:
            conn.close()
            raise ValueError(f"Item ID {entry['item_id']} not found.")
        if item["stock_qty"] < entry["quantity"]:
            conn.close()
            raise ValueError(
                f"Insufficient stock for '{item['name']}'. "
                f"Available: {item['stock_qty']} {item['unit']}"
            )

    # Insert transaction header
    c.execute(
        "INSERT INTO transactions (cashier) VALUES (?)", (cashier,)
    )
    txn_id = c.lastrowid

    for entry in cart:
        item = c.execute("SELECT * FROM items WHERE item_id = ?", (entry["item_id"],)).fetchone()
        qty = entry["quantity"]
        price = item["unit_price"]
        line_total = round(qty * price, 2)
        total += line_total

        c.execute(
            "INSERT INTO transaction_items (txn_id, item_id, quantity, unit_price, item_total) "
            "VALUES (?,?,?,?,?)",
            (txn_id, item["item_id"], qty, price, line_total),
        )
        # Deduct stock
        c.execute(
            "UPDATE items SET stock_qty = stock_qty - ? WHERE item_id = ?",
            (qty, item["item_id"]),
        )
        bill_lines.append({
            "name":       item["name"],
            "code":       item["code"],
            "unit":       item["unit"],
            "quantity":   qty,
            "unit_price": price,
            "item_total": line_total,
        })

    total = round(total, 2)
    c.execute("UPDATE transactions SET total_amount = ? WHERE txn_id = ?", (total, txn_id))
    conn.commit()
    conn.close()
    return txn_id, bill_lines, total


def get_transaction(txn_id: int):
    """Fetch full transaction with lines for reprint."""
    conn = get_connection()
    txn = conn.execute(
        "SELECT * FROM transactions WHERE txn_id = ?", (txn_id,)
    ).fetchone()
    if not txn:
        conn.close()
        return None, []
    lines = conn.execute(
        """SELECT ti.quantity, ti.unit_price, ti.item_total,
                  i.name, i.code, i.unit
           FROM transaction_items ti
           JOIN items i ON ti.item_id = i.item_id
           WHERE ti.txn_id = ?""",
        (txn_id,),
    ).fetchall()
    conn.close()
    return txn, lines


# ============================================================
#  SALES STATISTICS
# ============================================================

def sales_statistics(date_from: str, date_to: str):
    """
    Returns per-item sales stats between two dates (inclusive).
    date_from / date_to format: 'YYYY-MM-DD'
    """
    conn = get_connection()
    rows = conn.execute(
        """SELECT i.item_id, i.code, i.name, i.unit, i.cost_price,
                  SUM(ti.quantity)   AS qty_sold,
                  SUM(ti.item_total) AS revenue,
                  SUM(ti.quantity * i.cost_price) AS cost
           FROM transaction_items ti
           JOIN transactions t ON ti.txn_id = t.txn_id
           JOIN items        i ON ti.item_id = i.item_id
           WHERE t.txn_date BETWEEN ? AND ?
           GROUP BY i.item_id
           ORDER BY revenue DESC""",
        (date_from, date_to),
    ).fetchall()
    conn.close()
    return rows
