# Securities Transaction Loss Calculator (Python)

## Overview

This project provides a **Python-based transaction calculator** for securities such as **Twitter** and **Kraft Heinz**. It reads investor transaction data from Excel, applies **FIFO (First-In, First-Out)** accounting, and calculates **realized profit/loss**, which serves as the foundation for **securities class action settlement loss calculations**.

![Uploading Screenshot 2026-01-13 at 3.25.57 AM.png…]()


This tool is designed to support:

* Claims administrators
* Legal/finance teams
* Settlement loss modeling workflows

---

## Features

* Reads Excel transaction files
* Supports **Beginning Holdings, Purchases, and Sales**
* FIFO-based inventory tracking
* Calculates realized gain/loss per sale
* Works for multiple funds and ISIN/CUSIP values
* Easily extensible for **Plan of Allocation** logic

---

## Supported Transaction Types

| Transaction Type   | Description                             |
| ------------------ | --------------------------------------- |
| Beginning Holdings | Initial shares held before class period |
| Purchase           | Shares bought during the period         |
| Sale               | Shares sold (FIFO applied)              |

---

## Input Data Format (Excel)

Your Excel file must contain the following columns:

| Column Name      | Description                          |
| ---------------- | ------------------------------------ |
| ISIN/Cusip       | Security identifier                  |
| Fund Name        | Fund name                            |
| Fund Number      | Fund identifier                      |
| Transaction Type | Beginning Holdings / Purchase / Sale |
| Purchases        | Number of shares purchased           |
| Sales            | Number of shares sold                |
| Holdings         | Shares held (for beginning holdings) |
| Price per share  | Transaction price                    |
| Trade Date       | Trade date (Excel date format)       |
| Currency         | Currency (optional)                  |
| Entity           | Client/Entity name                   |

**Notes:**

* Empty cells for Purchases/Sales are allowed
* Trade Date must be a valid Excel date

---

## Installation

### Prerequisites

```bash
Python 3.12.2+
MySQL 8.0+
pip (Python package manager)
Virtual environment tool (venv)
```

### Environment Setup

#### 1. Clone the repository
```bash
git clone https://github.com/MLOps-MaitriAI/VEREATY_Backend.git
cd settlement_loss_calculator/backend
```

#### 2. Create virtual environment
```bash
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

#### 3. Install dependencies
```bash
pip install -r requirements.txt
```


### Running the Application

#### 7. Start the development server
```bash

uvicorn main:app --reload --host 0.0.0.0 --port 8000

---

## How It Works (Logic)

1. Transactions are sorted by **Trade Date**
2. Shares are stored in FIFO order per ISIN/CUSIP
3. Sales consume earlier purchases first
4. Realized P/L is calculated per matched lot

---

## Usage Example

```python
import pandas as pd
from transaction_calculator import TransactionCalculator

# Load Excel file
df = pd.read_excel("transactions.xlsx")

calculator = TransactionCalculator()
results = calculator.run(df)

print(results)
```

---

## Output Format

The calculator produces a table with realized profit/loss details:

| Column       | Description               |
| ------------ | ------------------------- |
| ISIN         | Security identifier       |
| Buy Date     | Purchase date             |
| Sell Date    | Sale date                 |
| Shares Sold  | Shares matched under FIFO |
| Buy Price    | Purchase price            |
| Sell Price   | Sale price                |
| Realized PnL | Gain or loss              |

---

## Example Use Cases

* Twitter Securities Litigation
* Kraft Heinz Securities Litigation
* Any FIFO-based securities transaction analysis

---

## Extending the Calculator

This project is designed to be extended for:

* Inflation tables
* Corrective disclosure dates
* Recognized loss caps
* Settlement-specific Plans of Allocation

---

## Disclaimer

This tool is intended for **financial analysis and settlement modeling support only**. It does not constitute legal or investment advice. Always validate results against the official settlement notice.


