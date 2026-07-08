"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Bus,
  Check,
  Coffee,
  Download,
  FileSpreadsheet,
  Coins,
  GraduationCap,
  HandCoins,
  Home,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  TrendingUp,
  Utensils,
  WalletCards,
  Workflow
} from "lucide-react";

const STORAGE_KEY = "student-spend-state-v2";

const expenseTypes = [
  { name: "Food", icon: Utensils, color: "#0f9f6e" },
  { name: "Transport", icon: Bus, color: "#2563eb" },
  { name: "Study", icon: GraduationCap, color: "#7c3aed" },
  { name: "Rent", icon: Home, color: "#ea580c" },
  { name: "Snacks", icon: Coffee, color: "#c026d3" },
  { name: "Other", icon: ReceiptText, color: "#475569" }
];

const incomeTypes = [
  { name: "Salary", icon: BriefcaseBusiness, color: "#0f8f63" },
  { name: "Family", icon: HandCoins, color: "#245bd4" },
  { name: "Tuition", icon: GraduationCap, color: "#6d35c4" },
  { name: "Investment", icon: TrendingUp, color: "#b45309" },
  { name: "Scholarship", icon: Landmark, color: "#0f766e" },
  { name: "Other", icon: Banknote, color: "#475569" }
];

const defaultState = {
  currency: "Tk ",
  savingGoal: 1500,
  dailyLimit: 100,
  expenses: [
    {
      id: "starter-expense-1",
      amount: 120,
      type: "Food",
      note: "Lunch",
      date: localDateKey(new Date())
    },
    {
      id: "starter-expense-2",
      amount: 40,
      type: "Transport",
      note: "Bus",
      date: localDateKey(new Date())
    }
  ],
  incomes: [
    {
      id: "starter-income-1",
      amount: 9000,
      type: "Salary",
      note: "Monthly money",
      date: localDateKey(new Date())
    }
  ]
};

function money(value, currency) {
  return `${currency}${Math.max(0, Math.round(value)).toLocaleString("en-US")}`;
}

function signedMoney(value, currency) {
  const sign = value < 0 ? "-" : "";
  return `${sign}${money(Math.abs(value), currency)}`;
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return localDateKey(new Date());
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function startOfMonthKey() {
  const now = new Date();
  return localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

function endOfMonthKey() {
  const now = new Date();
  return localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function startOfWeekKey() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return localDateKey(monday);
}

function daysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function remainingMonthDays() {
  const now = new Date();
  return Math.max(1, daysInCurrentMonth() - now.getDate() + 1);
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return localDateKey(date);
  });
}

function formatDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function periodRange(period) {
  if (period === "week") {
    return { start: startOfWeekKey(), end: todayKey(), label: "week" };
  }
  return { start: startOfMonthKey(), end: endOfMonthKey(), label: "month" };
}

function getPeriodRecords(state, period) {
  const range = periodRange(period);
  const expenses = state.expenses.map((item) => ({ ...item, direction: "expense" }));
  const incomes = state.incomes.map((item) => ({ ...item, direction: "income" }));
  return [...expenses, ...incomes]
    .filter((item) => item.date >= range.start && item.date <= range.end)
    .sort((a, b) => `${a.date}${a.id}`.localeCompare(`${b.date}${b.id}`));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadText(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeSvg(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildCsv(state, period) {
  const rows = getPeriodRecords(state, period);
  const header = ["Date", "Category", "Spending", "Money In", "Investment", "Note", "Direction"];
  const body = rows.map((item) => [
    item.date,
    item.type,
    item.direction === "expense" ? item.amount : "",
    item.direction === "income" && item.type !== "Investment" ? item.amount : "",
    item.direction === "income" && item.type === "Investment" ? item.amount : "",
    item.note,
    item.direction === "income" ? "Money In" : "Spending"
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
}

function normalizeState(saved) {
  const expenses = Array.isArray(saved?.expenses)
    ? saved.expenses.map((item) => ({
        id: item.id || createId("expense"),
        amount: Number(item.amount) || 0,
        type: item.type || item.category || "Other",
        note: item.note || item.type || item.category || "Expense",
        date: item.date || todayKey()
      }))
    : defaultState.expenses;

  const incomes = Array.isArray(saved?.incomes)
    ? saved.incomes.map((item) => ({
        id: item.id || createId("income"),
        amount: Number(item.amount) || 0,
        type: item.type || "Other",
        note: item.note || item.type || "Money in",
        date: item.date || todayKey()
      }))
    : defaultState.incomes;

  return {
    currency: ["Tk ", "$", "Rs ", "EUR "].includes(saved?.currency) ? saved.currency : "Tk ",
    savingGoal: Number(saved?.savingGoal ?? defaultState.savingGoal),
    dailyLimit: Number(saved?.dailyLimit ?? defaultState.dailyLimit),
    expenses,
    incomes
  };
}

export default function HomePage() {
  const [state, setState] = useState(defaultState);
  const [entryMode, setEntryMode] = useState("expense");
  const [form, setForm] = useState({
    amount: "",
    type: "Food",
    note: "",
    date: todayKey()
  });
  const [filter, setFilter] = useState("All");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v2 = window.localStorage.getItem(STORAGE_KEY);
    const v1 = window.localStorage.getItem("student-spend-state-v1");
    const saved = v2 || v1;
    if (saved) {
      try {
        setState(normalizeState(JSON.parse(saved)));
      } catch {
        setState(defaultState);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, loaded]);

  const types = entryMode === "expense" ? expenseTypes : incomeTypes;

  const stats = useMemo(() => {
    const monthStart = startOfMonthKey();
    const monthExpenses = state.expenses.filter((item) => item.date >= monthStart);
    const monthIncomes = state.incomes.filter((item) => item.date >= monthStart);
    const spentMonth = monthExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const incomeMonth = monthIncomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const spentToday = state.expenses
      .filter((item) => item.date === todayKey())
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = incomeMonth - spentMonth - Number(state.savingGoal);
    const safeToday = Math.max(0, remaining) / remainingMonthDays();
    const budgetBase = Math.max(1, incomeMonth - Number(state.savingGoal));
    const monthProgress = Math.min(100, (spentMonth / budgetBase) * 100);
    const dailyDanger = spentToday > Number(state.dailyLimit);
    const mood = dailyDanger ? "Danger today" : monthProgress < 75 ? "On track" : "Watch spending";

    return {
      spentMonth,
      incomeMonth,
      spentToday,
      remaining,
      safeToday,
      monthProgress,
      dailyDanger,
      mood
    };
  }, [state]);

  const typeTotals = useMemo(() => {
    const monthStart = startOfMonthKey();
    return expenseTypes.map((type) => {
      const total = state.expenses
        .filter((item) => item.date >= monthStart && item.type === type.name)
        .reduce((sum, item) => sum + Number(item.amount), 0);
      return { ...type, total };
    });
  }, [state.expenses]);

  const chartDays = useMemo(() => {
    const days = lastSevenDays();
    const values = days.map((day) => ({
      day,
      label: new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
      total: state.expenses
        .filter((item) => item.date === day)
        .reduce((sum, item) => sum + Number(item.amount), 0)
    }));
    const max = Math.max(Number(state.dailyLimit), 1, ...values.map((item) => item.total));
    return values.map((item) => ({
      ...item,
      overLimit: item.total > Number(state.dailyLimit),
      height: Math.max(10, (item.total / max) * 100)
    }));
  }, [state.expenses, state.dailyLimit]);

  const visibleTransactions = useMemo(() => {
    const expenses = state.expenses.map((item) => ({ ...item, direction: "expense" }));
    const incomes = state.incomes.map((item) => ({ ...item, direction: "income" }));
    return [...expenses, ...incomes]
      .filter((item) => filter === "All" || item.type === filter || item.direction === filter)
      .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));
  }, [state.expenses, state.incomes, filter]);

  function updateSetting(key, value) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function changeMode(mode) {
    setEntryMode(mode);
    setForm((current) => ({
      ...current,
      type: mode === "expense" ? "Food" : "Salary"
    }));
  }

  function addEntry(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;

    const entry = {
      id: createId(entryMode),
      amount,
      type: form.type,
      note: form.note.trim() || form.type,
      date: form.date || todayKey()
    };

    setState((current) => ({
      ...current,
      expenses: entryMode === "expense" ? [entry, ...current.expenses] : current.expenses,
      incomes: entryMode === "income" ? [entry, ...current.incomes] : current.incomes
    }));
    setForm({ amount: "", type: form.type, note: "", date: todayKey() });
  }

  function deleteTransaction(id, direction) {
    setState((current) => ({
      ...current,
      expenses:
        direction === "expense"
          ? current.expenses.filter((item) => item.id !== id)
          : current.expenses,
      incomes:
        direction === "income" ? current.incomes.filter((item) => item.id !== id) : current.incomes
    }));
  }

  function resetTracker() {
    setState({ ...defaultState, expenses: [], incomes: [] });
    setEntryMode("expense");
    setForm({ amount: "", type: "Food", note: "", date: todayKey() });
    setFilter("All");
  }

  function exportCsv(period) {
    const csv = buildCsv(state, period);
    downloadText(
      `student-spend-${period}-${todayKey()}.csv`,
      "text/csv;charset=utf-8",
      csv
    );
  }

  function exportDiagram(period) {
    const range = periodRange(period);
    const records = getPeriodRecords(state, period);
    const totalSpending = records
      .filter((item) => item.direction === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalInvestment = records
      .filter((item) => item.direction === "income" && item.type === "Investment")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalMoneyIn = records
      .filter((item) => item.direction === "income" && item.type !== "Investment")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalIn = totalMoneyIn + totalInvestment;
    const balance = totalIn - totalSpending;
    const maxFlow = Math.max(1, totalMoneyIn, totalInvestment, totalSpending, Math.abs(balance));
    const expenseBreakdown = expenseTypes.map((type) => ({
      ...type,
      total: records
        .filter((item) => item.direction === "expense" && item.type === type.name)
        .reduce((sum, item) => sum + Number(item.amount), 0)
    }));
    const chartValues = lastSevenDays().map((day) => ({
      day,
      label: new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
      total: state.expenses
        .filter((item) => item.date === day)
        .reduce((sum, item) => sum + Number(item.amount), 0)
    }));
    const maxDay = Math.max(1, ...chartValues.map((item) => item.total));
    const cardData = [
      { label: "Money In", value: totalMoneyIn, color: "#0f8f63", x: 48 },
      { label: "Investment", value: totalInvestment, color: "#b45309", x: 276 },
      { label: "Spending", value: totalSpending, color: "#dd5468", x: 504 },
      { label: "Balance", value: balance, color: balance < 0 ? "#dd5468" : "#245bd4", x: 732 }
    ];
    const cards = cardData
      .map(
        (item) => `
          <rect x="${item.x}" y="96" width="180" height="96" rx="14" fill="#ffffff" stroke="#dfe6dc"/>
          <text x="${item.x + 18}" y="130" fill="#647067" font-size="15" font-weight="700">${item.label}</text>
          <text x="${item.x + 18}" y="166" fill="${item.color}" font-size="26" font-weight="900">${escapeSvg(
          signedMoney(item.value, state.currency)
        )}</text>`
      )
      .join("");
    const flowBars = cardData
      .slice(0, 3)
      .map((item, index) => {
        const width = Math.max(24, (Math.abs(item.value) / maxFlow) * 240);
        return `
          <text x="58" y="${262 + index * 58}" fill="#17201a" font-size="16" font-weight="800">${item.label}</text>
          <rect x="190" y="${244 + index * 58}" width="250" height="24" rx="12" fill="#edf1eb"/>
          <rect x="190" y="${244 + index * 58}" width="${width}" height="24" rx="12" fill="${item.color}"/>
          <text x="462" y="${262 + index * 58}" fill="#647067" font-size="15" font-weight="800">${escapeSvg(
          money(item.value, state.currency)
        )}</text>`;
      })
      .join("");
    const bars = chartValues
      .map((item, index) => {
        const height = Math.max(8, (item.total / maxDay) * 120);
        const x = 584 + index * 46;
        return `
          <rect x="${x}" y="${374 - height}" width="28" height="${height}" rx="8" fill="${
          item.total > Number(state.dailyLimit) ? "#dd5468" : "#245bd4"
        }"/>
          <text x="${x + 14}" y="402" text-anchor="middle" fill="#647067" font-size="13" font-weight="800">${item.label}</text>`;
      })
      .join("");
    const breakdown = expenseBreakdown
      .map((item, index) => {
        const width = totalSpending ? Math.max(6, (item.total / totalSpending) * 240) : 0;
        return `
          <text x="58" y="${466 + index * 31}" fill="#17201a" font-size="14" font-weight="800">${item.name}</text>
          <rect x="168" y="${453 + index * 31}" width="240" height="14" rx="7" fill="#edf1eb"/>
          <rect x="168" y="${453 + index * 31}" width="${width}" height="14" rx="7" fill="${item.color}"/>
          <text x="424" y="${466 + index * 31}" fill="#647067" font-size="13" font-weight="800">${escapeSvg(
          money(item.total, state.currency)
        )}</text>`;
      })
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="660" viewBox="0 0 960 660">
      <rect width="960" height="660" fill="#f7f8f4"/>
      <rect x="24" y="24" width="912" height="612" rx="24" fill="#ffffff" stroke="#dfe6dc"/>
      <text x="48" y="66" fill="#17201a" font-size="28" font-weight="900">Student Spend ${range.label} usage diagram</text>
      <text x="48" y="88" fill="#647067" font-size="14" font-weight="700">${range.start} to ${range.end}</text>
      ${cards}
      <text x="48" y="226" fill="#17201a" font-size="20" font-weight="900">Money flow</text>
      ${flowBars}
      <path d="M500 278 C560 278 548 330 612 330" fill="none" stroke="#dfe6dc" stroke-width="5" stroke-linecap="round"/>
      <path d="M500 336 C560 336 548 330 612 330" fill="none" stroke="#dfe6dc" stroke-width="5" stroke-linecap="round"/>
      <path d="M500 394 C560 394 548 330 612 330" fill="none" stroke="#dfe6dc" stroke-width="5" stroke-linecap="round"/>
      <circle cx="628" cy="330" r="44" fill="#edf1eb" stroke="#dfe6dc"/>
      <text x="628" y="324" text-anchor="middle" fill="#17201a" font-size="14" font-weight="900">Balance</text>
      <text x="628" y="346" text-anchor="middle" fill="${balance < 0 ? "#dd5468" : "#245bd4"}" font-size="16" font-weight="900">${escapeSvg(
      signedMoney(balance, state.currency)
    )}</text>
      <text x="576" y="226" fill="#17201a" font-size="20" font-weight="900">Last 7 days</text>
      <line x1="568" y1="374" x2="900" y2="374" stroke="#dfe6dc" stroke-width="2"/>
      ${bars}
      <text x="48" y="430" fill="#17201a" font-size="20" font-weight="900">Spending by category</text>
      ${breakdown}
      <text x="48" y="616" fill="#647067" font-size="13" font-weight="700">Exported from Student Spend on ${todayKey()}</text>
    </svg>`;

    downloadText(
      `student-spend-${period}-diagram-${todayKey()}.svg`,
      "image/svg+xml;charset=utf-8",
      svg
    );
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Student Spend overview">
        <div>
          <p className="eyebrow">Student Spend</p>
          <h1>Money in, spending out, clear every day.</h1>
        </div>
        <div className="topbar-actions">
          <label className="currency-control">
            <span>Currency</span>
            <select
              value={state.currency}
              onChange={(event) => updateSetting("currency", event.target.value)}
              aria-label="Currency"
            >
              <option value="Tk ">BDT</option>
              <option value="$">USD</option>
              <option value="Rs ">INR</option>
              <option value="EUR ">EUR</option>
            </select>
          </label>
          <button
            className="icon-button"
            onClick={resetTracker}
            type="button"
            aria-label="Reset tracker"
            title="Reset tracker"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </section>

      <section className="summary-grid" aria-label="Budget summary">
        <article className={stats.dailyDanger ? "hero-panel danger-panel" : "hero-panel"}>
          <div className="hero-copy">
            <div className="hero-icon">
              {stats.dailyDanger ? <AlertTriangle size={24} /> : <WalletCards size={24} />}
            </div>
            <p className="panel-label">
              {stats.dailyDanger ? "Daily limit alert" : "Safe to spend today"}
            </p>
            <strong>
              {stats.dailyDanger
                ? money(stats.spentToday, state.currency)
                : money(stats.safeToday, state.currency)}
            </strong>
            <span>
              {stats.dailyDanger
                ? `Over ${money(state.dailyLimit, state.currency)} today`
                : stats.mood}
            </span>
          </div>
          <div
            className="budget-ring"
            style={{ "--progress": `${stats.monthProgress * 3.6}deg` }}
            aria-label={`${Math.round(stats.monthProgress)} percent of monthly income after savings spent`}
          >
            <div>
              <span>{Math.round(stats.monthProgress)}%</span>
              <small>used</small>
            </div>
          </div>
        </article>

        <article className={stats.dailyDanger ? "metric-panel alert-card" : "metric-panel"}>
          <Coins size={20} />
          <p>Spent today</p>
          <strong>{money(stats.spentToday, state.currency)}</strong>
        </article>
        <article className="metric-panel">
          <BadgeDollarSign size={20} />
          <p>Money in this month</p>
          <strong>{money(stats.incomeMonth, state.currency)}</strong>
        </article>
        <article className={stats.remaining < 0 ? "metric-panel alert-card" : "metric-panel"}>
          <PiggyBank size={20} />
          <p>Remaining</p>
          <strong>{signedMoney(stats.remaining, state.currency)}</strong>
        </article>
      </section>

      <section className="workspace-grid">
        <form className="tool-panel add-panel" onSubmit={addEntry}>
          <div className="panel-heading">
            <div>
              <p className="panel-label">Quick add</p>
              <h2>{entryMode === "expense" ? "Add spending" : "Add money"}</h2>
            </div>
            <button className="primary-button" type="submit">
              <Plus size={18} />
              Add
            </button>
          </div>

          <div className="segmented-control" aria-label="Entry type">
            <button
              className={entryMode === "expense" ? "active" : ""}
              onClick={() => changeMode("expense")}
              type="button"
            >
              Spending
            </button>
            <button
              className={entryMode === "income" ? "active" : ""}
              onClick={() => changeMode("income")}
              type="button"
            >
              Money In
            </button>
          </div>

          <label>
            <span>Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </label>

          <label>
            <span>Money</span>
            <input
              inputMode="decimal"
              min="0"
              placeholder="0"
              type="number"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            />
          </label>

          <label>
            <span>Type</span>
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            >
              {types.map((type) => (
                <option key={type.name}>{type.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Note</span>
            <input
              placeholder={entryMode === "expense" ? "Tea, copy, bus fare" : "Salary, family, invest"}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
          </label>
        </form>

        <section className="tool-panel settings-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Rules</p>
              <h2>Limits</h2>
            </div>
            <AlertTriangle size={19} />
          </div>

          <label>
            <span>Daily danger limit</span>
            <input
              min="0"
              type="number"
              value={state.dailyLimit}
              onChange={(event) => updateSetting("dailyLimit", Number(event.target.value))}
            />
          </label>

          <label>
            <span>Save first</span>
            <input
              min="0"
              type="number"
              value={state.savingGoal}
              onChange={(event) => updateSetting("savingGoal", Number(event.target.value))}
            />
          </label>

          <div className="split-row">
            <span>This month spent</span>
            <strong>{money(stats.spentMonth, state.currency)}</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${stats.monthProgress}%` }} />
          </div>
        </section>

        <section className="tool-panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Weekly spending chart</p>
              <h2>Last 7 days</h2>
            </div>
            <Check size={19} />
          </div>

          <div className="bar-chart">
            {chartDays.map((item) => (
              <div className="bar-column" key={item.day}>
                <span className={item.overLimit ? "bar-value danger-text" : "bar-value"}>
                  {item.total ? money(item.total, state.currency) : ""}
                </span>
                <div className="bar-rail">
                  <span
                    className={item.overLimit ? "limit-bar" : ""}
                    style={{ height: `${item.height}%` }}
                  />
                </div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="bottom-grid">
        <section className="tool-panel category-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Spending types</p>
              <h2>Where money goes</h2>
            </div>
          </div>

          <div className="category-list">
            {typeTotals.map((type) => {
              const Icon = type.icon;
              const width = stats.spentMonth ? Math.max(3, (type.total / stats.spentMonth) * 100) : 0;
              return (
                <button
                  className={filter === type.name ? "category-row active" : "category-row"}
                  key={type.name}
                  onClick={() => setFilter(filter === type.name ? "All" : type.name)}
                  type="button"
                >
                  <span className="category-mark" style={{ "--category": type.color }}>
                    <Icon size={17} />
                  </span>
                  <span className="category-main">
                    <span>{type.name}</span>
                    <span className="mini-track">
                      <span style={{ width: `${width}%`, background: type.color }} />
                    </span>
                  </span>
                  <strong>{money(type.total, state.currency)}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="tool-panel transaction-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">{filter === "All" ? "All records" : filter}</p>
              <h2>Date and money box</h2>
            </div>
            <div className="filter-pills" aria-label="Record filter">
              <button
                className={filter === "All" ? "active" : ""}
                onClick={() => setFilter("All")}
                type="button"
              >
                All
              </button>
              <button
                className={filter === "income" ? "active" : ""}
                onClick={() => setFilter("income")}
                type="button"
              >
                In
              </button>
              <button
                className={filter === "expense" ? "active" : ""}
                onClick={() => setFilter("expense")}
                type="button"
              >
                Out
              </button>
            </div>
          </div>

          <div className="export-actions" aria-label="Export records">
            <button onClick={() => exportCsv("week")} type="button">
              <FileSpreadsheet size={16} />
              Week CSV
            </button>
            <button onClick={() => exportCsv("month")} type="button">
              <FileSpreadsheet size={16} />
              Month CSV
            </button>
            <button onClick={() => exportDiagram("week")} type="button">
              <Workflow size={16} />
              Week chart
            </button>
            <button onClick={() => exportDiagram("month")} type="button">
              <Download size={16} />
              Month chart
            </button>
          </div>

          <div className="transaction-list">
            {visibleTransactions.length ? (
              visibleTransactions.map((transaction) => {
                const source = transaction.direction === "income" ? incomeTypes : expenseTypes;
                const type = source.find((item) => item.name === transaction.type) || source[source.length - 1];
                const Icon = type.icon;
                return (
                  <article className="transaction-item" key={`${transaction.direction}-${transaction.id}`}>
                    <span className="category-mark" style={{ "--category": type.color }}>
                      <Icon size={17} />
                    </span>
                    <div>
                      <strong>{transaction.note}</strong>
                      <span>
                        {formatDate(transaction.date)} | {transaction.type}
                      </span>
                    </div>
                    <strong className={transaction.direction === "income" ? "income-text" : ""}>
                      {transaction.direction === "income" ? "+" : "-"}
                      {money(transaction.amount, state.currency)}
                    </strong>
                    <button
                      className="icon-button danger"
                      onClick={() => deleteTransaction(transaction.id, transaction.direction)}
                      type="button"
                      aria-label={`Delete ${transaction.note}`}
                      title="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <ReceiptText size={28} />
                <strong>No records here</strong>
                <span>Add spending or money with today or any previous date.</span>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
