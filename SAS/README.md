# Supermarket Automation Software (SAS)

A clean Python + SQLite codebase implementing all SAS requirements.

## Project Structure

```
sas/
├── database.py   – DB connection, DDL schema, seed data
├── models.py     – All SQL queries & business logic
├── reports.py    – Formatted receipt & report printing
├── main.py       – Interactive CLI application
└── demo.py       – Automated walkthrough (no input needed)
```

## Database Schema

| Table               | Purpose                                      |
|---------------------|----------------------------------------------|
| `items`             | Master product catalogue with current prices |
| `price_history`     | Audit log of every price change              |
| `inventory_log`     | Record of every restock event                |
| `transactions`      | Sales transaction headers                    |
| `transaction_items` | Line items for each transaction              |

## Running

### Prerequisites
```
Python 3.8+   (no third-party packages needed — stdlib + sqlite3 only)
```

### Interactive CLI
```bash
cd sas
python main.py
```

### Automated Demo
```bash
cd sas
python demo.py
```

## Feature Checklist

| Requirement                                      | Where implemented              |
|--------------------------------------------------|--------------------------------|
| Print bill with serial no., item details, total  | `models.create_transaction()` + `reports.print_bill()` |
| Maintain & display inventory                     | `models.get_all_items()` + `reports.print_inventory()` |
| Decrease stock on sale                           | `models.create_transaction()` (UPDATE items)           |
| Restock on new supply                            | `models.restock_item()`                                |
| Sales statistics (any date range)                | `models.sales_statistics()` + `reports.print_sales_stats()` |
| Profit per item in statistics                    | revenue − cost in `sales_statistics()`                 |
| Manager changes selling price                    | `models.update_price()` (+ price_history audit log)    |
| Reprint a receipt                                | `models.get_transaction()` + `reports.print_bill()`    |
