"""
SAS - Main CLI Application
Entry point: python main.py
"""

import sys
import os

# Ensure the sas package directory is on the path
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db
from models import (
    get_all_items, get_item_by_code, get_item_by_id, #inventory operations
    update_price, restock_item, #update inventory
    create_transaction, get_transaction, #cashier and automate stock changes
    sales_statistics, #generate manager's report
)
from reports import print_bill, print_inventory, print_sales_stats
from datetime import date
from models import authenticate_user

# ─────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────

def clear():
    os.system("cls" if os.name == "nt" else "clear")


def pause():
    input("\n  Press Enter to continue...")


def prompt(msg, cast=str, allow_blank=False):
    while True:
        raw = input(f"  {msg}: ").strip()
        if not raw and allow_blank:
            return None
        try:
            return cast(raw)
        except (ValueError, TypeError):
            print(f"  ✗  Invalid input. Expected {cast.__name__}.")


def choose(options: list):
    """Print a numbered menu and return the chosen key."""
    for idx, (key, label) in enumerate(options, 1):
        print(f"  [{idx}] {label}")
    while True:
        try:
            choice = int(input("\n  Enter choice: "))
            if 1 <= choice <= len(options):
                return options[choice - 1][0]
        except ValueError:
            pass
        print("  Invalid choice. Try again.")

def login():
    while True:
        clear()
        print("=" * 56)
        print(" EMPLOYEE LOGIN")
        print("=" * 56)

        empID = input("Employee ID: ").strip().upper()

        if empID == "EXIT":
            print("\nGoodbye!\n")
            sys.exit(0)   #clean exit

        password = input("Password: ").strip()

        user = authenticate_user(empID, password)

        if not user:
            print("Invalid credentials")
            pause()
            continue

        print(f"Welcome {user['firstName']} ({user['role']})")
        pause()
        return user

# ─────────────────────────────────────────────────────────
#  CASHIER FLOW  –  New Sale
# ─────────────────────────────────────────────────────────

def new_sale(user):
    if user["role"] != "cashier":
        print("  ✗  Access denied. Cashier role required.")
        pause()
        return
    clear() #clears terminal and leads to cashier's section/page
    print("=" * 56)
    print("  NEW SALES TRANSACTION")
    print("=" * 56)
    cashier = user["firstName"]
    cart = []

    while True:
        print(f"\n  Items in cart: {len(cart)}")
        print("  ─── Scan item ───────────────────────────────────")
        code = prompt("Barcode / Item Code (or 'done' to finish)").upper()

        if code == "DONE":
            break

        item = get_item_by_code(code)
        if not item:
            print(f"  ✗  Item with code '{code}' not found.")
            continue

        print(f"  ✔  {item['name']} — KES {item['unit_price']:.2f}/{item['unit']}"
              f"  (Stock: {item['stock_qty']})")

        #confirm if stock is available
        qty = prompt(f"Quantity ({item['unit']})", cast=float)
        if qty <= 0:
            print("  ✗  Quantity must be positive.")
            continue
        if qty > item["stock_qty"]:
            print(f"  ✗  Only {item['stock_qty']} in stock.")
            continue

        # Check if already in cart; if so, add qty - prevent duplicate entries
        for entry in cart:
            if entry["item_id"] == item["item_id"]:
                entry["quantity"] += qty
                break
        else:
            cart.append({"item_id": item["item_id"], "quantity": qty})
        print(f"  ✔  Added {qty} × {item['name']} to cart.")

    if not cart:
        print("\n  Cart is empty. Transaction cancelled.")
        pause()
        return

    # Confirm
    print("\n  Processing transaction…")
    try:
        txn_id, bill_lines, total = create_transaction(cart, cashier)
        print_bill(txn_id, bill_lines, total, cashier)
    except ValueError as e:
        print(f"\n  ✗  Transaction failed: {e}")
    pause()


# ─────────────────────────────────────────────────────────
#  INVENTORY MENU
# ─────────────────────────────────────────────────────────

def inventory_menu(user):
    if user["role"] != "inventory":
        print("  ✗  Access denied. Inventory role required.")
        pause()
        return
    while True:
        clear()
        print("=" * 56)
        print("  INVENTORY MANAGEMENT")
        print("=" * 56)
        action = choose([
            ("view",    "View Full Inventory"),
            ("restock", "Restock an Item"),
            ("back",    "Back to Main Menu"),
        ])
        if action == "back":
            break
        elif action == "view":
            items = get_all_items()
            print_inventory(items)
            pause()
        elif action == "restock":
            restock_flow(user)


def restock_flow(user):
    if user["role"] != "inventory":
        print("  ✗  Access denied. Inventory role required.")
        pause()
        return
    clear()
    print("  RESTOCK ITEM\n")
    items = get_all_items()
    for it in items:
        print(f"  [{it['item_id']:>3}] {it['code']:<8} {it['name']:<30} Stock: {it['stock_qty']}")
    item_id = prompt("\n  Enter Item ID to restock", cast=int)
    item = get_item_by_id(item_id)
    if not item:
        print("  ✗  Item not found.")
        pause()
        return
    qty = prompt(f"Quantity to add ({item['unit']})", cast=float)
    employee = user["empID"]
    new_stock = restock_item(item_id, qty, employee)
    print(f"\n  ✔  {item['name']} restocked. New stock: {new_stock} {item['unit']}")
    pause()


# ─────────────────────────────────────────────────────────
#  MANAGER MENU  –  Price Changes
# ─────────────────────────────────────────────────────────

#manager's menu
def manager_menu(user):
    if user["role"] != "manager":
        print("  ✗  Access denied. Manager role required.")
        pause()
        return
    while True:
        clear()
        print("=" * 56)
        print("  MANAGER PANEL")
        print("=" * 56)
        action = choose([
            ("price",  "Change Item Price"),
            ("stats",  "Sales Statistics Report"),
            ("reprint","Reprint a Bill"),
            ("back",   "Back to Main Menu"),
        ])
        if action == "back":
            break
        elif action == "price":
            change_price_flow()
        elif action == "stats":
            stats_flow()
        elif action == "reprint":
            reprint_flow()


#manager changes price of item
def change_price_flow():
    clear()
    print("  CHANGE ITEM PRICE\n")
    items = get_all_items()
    for it in items:
        print(f"  [{it['item_id']:>3}] {it['code']:<8} {it['name']:<30} Price: KES {it['unit_price']:.2f}")
    item_id = prompt("\n  Enter Item ID to update", cast=int)
    item = get_item_by_id(item_id)
    if not item:
        print("  ✗  Item not found.")
        pause()
        return
    new_price = prompt(f"New selling price for '{item['name']}' (current: {item['unit_price']:.2f})", cast=float)
    ok, old = update_price(item_id, new_price, "manager")
    if ok:
        print(f"\n  ✔  Price updated: KES {old:.2f} → KES {new_price:.2f}")
    pause()

#manager to generate statistic report
def stats_flow():
    clear()
    print("  SALES STATISTICS\n")
    today = date.today().isoformat()
    print("  Leave dates blank to default to today.")
    date_from = prompt(f"From date [YYYY-MM-DD] (default {today})", allow_blank=True) or today
    date_to   = prompt(f"To date   [YYYY-MM-DD] (default {today})", allow_blank=True) or today
    rows = sales_statistics(date_from, date_to)
    if not rows:
        print(f"\n  No sales recorded between {date_from} and {date_to}.")
    else:
        print_sales_stats(rows, date_from, date_to)
    pause()

#manager reprint's receipt
def reprint_flow():
    clear()
    print("  REPRINT BILL\n")
    txn_id = prompt("Enter Transaction (Receipt) Number", cast=int)
    txn, lines = get_transaction(txn_id) #get receipt by the transaction id
    if not txn:
        print("  ✗  Transaction not found.")
        pause()
        return
    bill_lines = [
        {
            "name":       ln["name"],
            "code":       ln["code"],
            "unit":       ln["unit"],
            "quantity":   ln["quantity"],
            "unit_price": ln["unit_price"],
            "item_total": ln["item_total"],
        }
        for ln in lines
    ]
    print_bill(txn["txn_id"], bill_lines, txn["total_amount"],
               txn["cashier"], txn["txn_date"], txn["txn_time"])
    pause()


# ─────────────────────────────────────────────────────────
#  MAIN MENU
# ─────────────────────────────────────────────────────────

def main():
    init_db()

    user = None
    while not user:
        user = login()

    while True:
        clear()
        print("=" * 56)
        print("  SUPERMARKET AUTOMATION SOFTWARE  (SAS)")
        print("=" * 56)
        role = user["role"]
        if role == "cashier":
            options = [
                ("sale", "New Sale  (Cashier)"),
                ("quit", "Exit"),
            ]
        elif role == "inventory":
            options = [
                ("inventory", "Inventory Management"),
                ("quit", "Exit"),
            ]
        elif role == "manager":
            options = [
                ("manager", "Manager Panel"),
                ("quit", "Exit"),
            ]
        else:
            print("\n  ✗  Unknown role. Access denied.\n")
            sys.exit(1)

        action = choose(options)
        if action == "quit":
            print("\n  Goodbye!\n")
            sys.exit(0)
        elif action == "sale":
            new_sale(user)
        elif action == "inventory":
            inventory_menu(user)
        elif action == "manager":
            manager_menu(user)


if __name__ == "__main__":
    main()
