export interface Trade {
  id: number;
  user_id: number;
  stock_name: string;
  trade_type: 'buy' | 'sell';
  entry_date: string;
  exit_date: string | null;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  commission: number;
  total_buy: number;
  total_sell: number;
  net_profit: number;
  profit_percent: number;
  strategy: string;
  notes: string;
  ai_insight: string | null;
  chart_image: string | null;
  created_at: string;
}

export interface UserStats {
  user: {
    initial_capital: number;
  };
  trades: Trade[];
}
