import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("trading_journal.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    initial_capital REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    stock_name TEXT,
    trade_type TEXT,
    entry_date TEXT,
    exit_date TEXT,
    entry_price REAL,
    exit_price REAL,
    quantity INTEGER,
    commission REAL,
    total_buy REAL,
    total_sell REAL,
    net_profit REAL,
    profit_percent REAL,
    strategy TEXT,
    notes TEXT,
    ai_insight TEXT,
    chart_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Add ai_insight if it doesn't exist
try {
  db.prepare("ALTER TABLE trades ADD COLUMN ai_insight TEXT").run();
} catch (e) {
  // Column already exists
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Simple Auth Middleware (Mock for demo, but structured for real use)
  // In a real app, use sessions/JWT
  const getUserId = (req: express.Request) => 1; // Default to user 1 for demo

  // Ensure user 1 exists
  const userExists = db.prepare("SELECT id FROM users WHERE id = 1").get();
  if (!userExists) {
    db.prepare("INSERT INTO users (id, email, initial_capital) VALUES (1, 'demo@example.com', 100000)").run();
  }

  // API Routes
  app.get("/api/trades", (req, res) => {
    const userId = getUserId(req);
    const trades = db.prepare("SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    res.json(trades);
  });

  app.post("/api/trades", (req, res) => {
    const userId = getUserId(req);
    const {
      stockName, tradeType, entryDate, exitDate, entryPrice, exitPrice,
      quantity, commission, strategy, notes, aiInsight, chartImage
    } = req.body;

    const totalBuy = (entryPrice * quantity) + commission;
    const totalSell = exitPrice ? (exitPrice * quantity) - commission : 0;
    const netProfit = exitPrice ? totalSell - totalBuy : 0;
    const profitPercent = exitPrice ? (netProfit / totalBuy) * 100 : 0;

    const info = db.prepare(`
      INSERT INTO trades (
        user_id, stock_name, trade_type, entry_date, exit_date,
        entry_price, exit_price, quantity, commission,
        total_buy, total_sell, net_profit, profit_percent,
        strategy, notes, ai_insight, chart_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, stockName, tradeType, entryDate, exitDate,
      entryPrice, exitPrice, quantity, commission,
      totalBuy, totalSell, netProfit, profitPercent,
      strategy, notes, aiInsight, chartImage
    );

    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/trades/:id", (req, res) => {
    const userId = getUserId(req);
    const { id } = req.params;
    const {
      stockName, tradeType, entryDate, exitDate, entryPrice, exitPrice,
      quantity, commission, strategy, notes, aiInsight, chartImage
    } = req.body;

    const totalBuy = (entryPrice * quantity) + commission;
    const totalSell = exitPrice ? (exitPrice * quantity) - commission : 0;
    const netProfit = exitPrice ? totalSell - totalBuy : 0;
    const profitPercent = exitPrice ? (netProfit / totalBuy) * 100 : 0;

    db.prepare(`
      UPDATE trades SET
        stock_name = ?, trade_type = ?, entry_date = ?, exit_date = ?,
        entry_price = ?, exit_price = ?, quantity = ?, commission = ?,
        total_buy = ?, total_sell = ?, net_profit = ?, profit_percent = ?,
        strategy = ?, notes = ?, ai_insight = ?, chart_image = ?
      WHERE id = ? AND user_id = ?
    `).run(
      stockName, tradeType, entryDate, exitDate,
      entryPrice, exitPrice, quantity, commission,
      totalBuy, totalSell, netProfit, profitPercent,
      strategy, notes, aiInsight, chartImage,
      id, userId
    );

    res.json({ success: true });
  });

  app.delete("/api/trades/:id", (req, res) => {
    const userId = getUserId(req);
    const { id } = req.params;
    db.prepare("DELETE FROM trades WHERE id = ? AND user_id = ?").run(id, userId);
    res.json({ success: true });
  });

  app.get("/api/user/stats", (req, res) => {
    const userId = getUserId(req);
    const user = db.prepare("SELECT initial_capital FROM users WHERE id = ?").get(userId);
    const trades = db.prepare("SELECT * FROM trades WHERE user_id = ?").all(userId);
    res.json({ user, trades });
  });

  app.post("/api/user/capital", (req, res) => {
    const userId = getUserId(req);
    const { capital } = req.body;
    db.prepare("UPDATE users SET initial_capital = ? WHERE id = ?").run(capital, userId);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
