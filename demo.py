"""
demo.py  –  Runs a complete walkthrough of SAS without user input.
Useful for testing all features at once.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Remove old DB for a clean run
db_path = os.path.join(os.path.dirname(__file__), "sas.db")
if os.path.exists(db_path):
    os.remove(db_path)

from database import init_db 
from models import (
    get_all_items, get_item_by_code,
    update_price, restock_item,
    create_transaction, sales_statistics,
)
from reports import print_bill, print_inventory, print_sales_stats
from datetime import date

SEP = "\n" + "─" * 56

# 1. Initialise DB
print(SEP)
print("STEP 1 — Initialise Database")
init_db()

# 2. View inventory
print(SEP)
print("STEP 2 — Full Inventory")
print_inventory(get_all_items())

# 3. Manager changes a price
print(SEP)
print("STEP 3 — Manager changes price of Sugar (ITM003)")
ok, old = update_price(3, 90.00, "manager_alice")
print(f"  Sugar: KES {old:.2f} → KES 90.00")

# 4. Sale 1
print(SEP)
print("STEP 4 — Sale 1  (bread + milk + eggs)")
cart1 = [
    {"item_id": 5, "quantity": 2},   # 2 loaves of bread
    {"item_id": 4, "quantity": 3},   # 3 packs of milk
    {"item_id": 8, "quantity": 1},   # 1 tray of eggs
]
txn_id, lines, total = create_transaction(cart1, cashier="john")
print_bill(txn_id, lines, total, cashier="john")

# 5. Sale 2
print(SEP)
print("STEP 5 — Sale 2  (flour + cooking oil + rice)")
cart2 = [
    {"item_id": 1, "quantity": 4},   # 4 packs maize flour
    {"item_id": 2, "quantity": 2},   # 2 bottles cooking oil
    {"item_id": 6, "quantity": 3},   # 3 kg rice
]
txn_id2, lines2, total2 = create_transaction(cart2, cashier="mary")
print_bill(txn_id2, lines2, total2, cashier="mary")

# 6. Restock flour
print(SEP)
print("STEP 6 — Restock Maize Flour (ITM001) by 100 packs")
new_stock = restock_item(1, 100, employee="bob")
print(f"  Maize Flour new stock: {new_stock} packs")

# 7. Sales statistics for today
print(SEP)
print("STEP 7 — Sales Statistics for today")
today = date.today().isoformat()
stats = sales_statistics(today, today)
print_sales_stats(stats, today, today)

# 8. Inventory after sales
print(SEP)
print("STEP 8 — Inventory after sales + restock")
print_inventory(get_all_items())

print("─" * 56)
print("Demo complete. Database saved at:", db_path)
