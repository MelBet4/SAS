"""
SAS - Reports & Receipts
All formatted text output lives here.
"""

from datetime import date, datetime


WIDTH = 56   # receipt width in characters


def _line(char="-"):
    return char * WIDTH


def _center(text):
    return text.center(WIDTH)


#print customer's receipt
def print_bill(txn_id: int, bill_lines: list, total: float,
               cashier: str = "clerk", txn_date: str = None, txn_time: str = None):
    """Print a formatted sales receipt."""
    txn_date = txn_date or date.today().isoformat()
    txn_time = txn_time or datetime.now().strftime("%H:%M:%S")

    print("\n" + _line("="))
    print(_center("SMART SUPERMARKET"))
    print(_center("Nairobi, Kenya  |  Tel: +254-702-456-089"))
    print(_line("="))
    print(f"  Receipt No : {txn_id:06d}")
    print(f"  Date       : {txn_date}    Time: {txn_time}")
    print(f"  Cashier    : {cashier}")
    print(_line("-"))
    # Column headers
    print(f"  {'#':<3} {'Item':<22} {'Code':<8} {'Qty':>5} {'Price':>8} {'Total':>8}")
    print(_line("-"))

    for i, ln in enumerate(bill_lines, 1):
        print(
            f"  {i:<3} {ln['name'][:22]:<22} {ln['code']:<8} "
            f"{ln['quantity']:>5.2f} {ln['unit_price']:>8.2f} {ln['item_total']:>8.2f}"
        )

    print(_line("-"))
    print(f"  {'TOTAL AMOUNT PAYABLE (KES)':>46} {total:>8.2f}")
    print(_line("="))
    print(_center("Thank you for shopping with us!"))
    print(_line("=") + "\n")


#print inventory report
def print_inventory(items):
    """Display full inventory table."""
    print("\n" + _line("="))
    print(_center("INVENTORY REPORT"))
    print(_center(f"As of {date.today().isoformat()}"))
    print(_line("="))
    print(f"  {'ID':<4} {'Code':<8} {'Name':<25} {'Unit':<7} {'Price':>8} {'Cost':>8} {'Stock':>8}")
    print(_line("-"))
    for it in items:
        status = "  ⚠ LOW" if it["stock_qty"] < 10 else ""
        print(
            f"  {it['item_id']:<4} {it['code']:<8} {it['name'][:25]:<25} "
            f"{it['unit']:<7} {it['unit_price']:>8.2f} {it['cost_price']:>8.2f} "
            f"{it['stock_qty']:>8.2f}{status}"
        )
    print(_line("=") + "\n")

#print sales statistics for manager review
def print_sales_stats(rows, date_from: str, date_to: str):
    """Display sales statistics report."""
    print("\n" + _line("="))
    print(_center("SALES STATISTICS REPORT"))
    print(_center(f"Period: {date_from}  to  {date_to}"))
    print(_line("="))
    print(
        f"  {'Code':<8} {'Item':<22} {'Qty':>7} {'Revenue':>10} {'Cost':>10} {'Profit':>10}"
    )
    print(_line("-"))

    grand_revenue = grand_profit = 0.0
    for r in rows:
        profit = round(r["revenue"] - r["cost"], 2)
        grand_revenue += r["revenue"]
        grand_profit  += profit
        print(
            f"  {r['code']:<8} {r['name'][:22]:<22} {r['qty_sold']:>7.2f} "
            f"{r['revenue']:>10.2f} {r['cost']:>10.2f} {profit:>10.2f}"
        )

    print(_line("-"))
    print(f"  {'TOTALS':<31} {grand_revenue:>10.2f} {'':>10} {grand_profit:>10.2f}")
    print(_line("=") + "\n")
