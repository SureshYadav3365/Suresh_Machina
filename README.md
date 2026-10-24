# Paper Dona / Pattal Machine Monitoring System

A complete full-stack Machine Monitoring System built for your paper dona/pattal manufacturing machine.

---

## Features

1. **Dashboard Production Overview**:
   - **Today's Production**: Total pieces manufactured today (or the selected date) formatted in `pcs` (e.g. `10,000 pcs`).
   - **Monthly Production**: Total pieces manufactured in the current calendar month (e.g. `23,000 pcs`).
   - **All-Time Production**: Cumulative total pieces across all saved dates since tracking began (e.g. `23,000 pcs`).
   - **Shift Progress & Average Output**: Visual progress bar for the 8-hour shift and average pieces/hour.
   - **Today's Total Expenses**: Formatted in Indian Rupees (₹), strictly separated from production pieces.
   - **Estimated Net Profit**: `Actual Sales Revenue − Recorded Expenses` (displays `Not Recorded` if sales revenue has not been entered).

2. **Daily Production History**:
   - Date-wise production logs sorted from newest to oldest.
   - View the date and total pieces manufactured for each day.
   - Click to expand any date and view its complete 8-hour shift breakdown (Hour 1 to 8, time window, piece counts, and notes).
   - Filter records by **Month** (e.g. October 2026) or a **Custom Date Range** (Start Date to End Date).
   - Instant calculation of **Period Total Production** across the filtered range.
   - Direct button to open any historical date on the Live Dashboard, edit individual hourly slots, or delete records.

3. **Hourly Production Tracking (8-Hour Shift)**:
   - Enter pieces produced for each of the 8 shift hours (08:00 - 16:00).
   - Immediate automatic calculation and updating of daily, monthly, and all-time totals upon every add, edit, or delete action.
   - Distinct badges for `✓ Logged` and `Pending` status.

4. **Expenses Management**:
   - 7 Predefined manufacturing categories: Electricity Bill, Worker/Labour Wages, Packaging Materials, Raw Materials, Machine Repair and Maintenance, Transportation, Other Expenses.
   - Categorized cost summaries, filterable table, and date/category filters.

5. **MongoDB Persistence & Safety**:
   - All records are saved in MongoDB through Express REST API endpoints with unique compound indexes (`{ date: 1, hourNumber: 1 }`).
   - No hardcoded numbers; all cards calculate strictly from saved records.

---

## Technology Stack

- **Frontend**: React + Vite (JavaScript)
- **Styling**: Modern, Clean Industrial CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose
- **Icons**: Lucide React

---

## How to Run Locally

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** running locally on port `27017`

### 2. Configure Environment Variables
In the `backend/` directory, ensure `.env` contains:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/dona_machine_monitoring
NODE_ENV=development
```

### 3. Start Backend Server
```bash
cd backend
npm install
npm start
```
The backend server runs on `http://localhost:5000`.

### 4. Start Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: **`http://localhost:3000`**

---

## How to Test the New Production History & Totals

1. **Dashboard Cards**:
   - Open [http://localhost:3000](http://localhost:3000).
   - Notice the three production cards at the top: **Today's Production**, **Monthly Production**, and **All-Time Production**.
2. **Log Production for Today**:
   - Select Hour 1 and enter `4000` pcs. Click **Save Hourly Production**.
   - Select Hour 2 and enter `6000` pcs. Click **Save Hourly Production**.
   - Notice that **Today's Production** becomes `10,000 pcs`, **Monthly Production** becomes `10,000 pcs`, and **All-Time Production** becomes `10,000 pcs`.
3. **Log Production for Another Date**:
   - Change the Date selector to another date (e.g. tomorrow or yesterday).
   - Log Hour 1 with `5000` pcs and Hour 2 with `8000` pcs (Total: `13,000 pcs`).
   - Today's Production card will show `13,000 pcs` for that date.
   - Monthly Production will automatically sum both dates (`10,000 + 13,000 = 23,000 pcs`).
   - All-Time Production will show `23,000 pcs`.
4. **Inspect Production History**:
   - In the sidebar, click **Production History**.
   - You will see each date listed with its total pieces, completed hours count, and average speed.
   - Click any date card to expand and review all 8 hourly slots.
   - Filter by Month or Date Range to see the **Period Total Production** recalculate.
   - Edit any hourly slot or delete a record, and watch all totals update automatically.
