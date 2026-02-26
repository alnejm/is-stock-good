import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  PieChart as PieChartIcon, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter,
  Trash2,
  Edit3,
  FileSpreadsheet,
  Settings2,
  Image as ImageIcon,
  Zap,
  ShieldAlert,
  Calendar,
  Wallet,
  Activity,
  Target
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Trade, UserStats } from './types';
import { getStockInfo, editChartImage } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className, title, subtitle }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string }) => (
  <div className={cn("glass-card p-6", className)}>
    {(title || subtitle) && (
      <div className="mb-6">
        {title && <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{title}</h3>}
        {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const StatBox = ({ label, value, trend, icon: Icon, color }: { label: string, value: string | number, trend?: string, icon: any, color: string }) => (
  <Card className="relative overflow-hidden group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-tight mb-1">{label}</p>
        <p className="text-2xl font-bold num-en text-zinc-900">{value}</p>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full w-fit",
            trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          )}>
            {trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", color)}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </Card>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'analytics' | 'settings'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'win' | 'loss' | 'open'>('all');

  // Form State
  const [formData, setFormData] = useState({
    stockName: '',
    tradeType: 'buy',
    entryDate: format(new Date(), 'yyyy-MM-dd'),
    exitDate: '',
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    commission: '0',
    strategy: 'تحليل فني',
    notes: '',
    aiInsight: '' as string | null,
    chartImage: '' as string | null
  });

  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/stats');
      const data = await res.json();
      setStats(data);
      setTrades(data.trades);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.exitDate && formData.exitDate < formData.entryDate) {
      setError('تاريخ الخروج لا يمكن أن يكون قبل تاريخ الدخول');
      return;
    }

    const method = editingTrade ? 'PUT' : 'POST';
    const url = editingTrade ? `/api/trades/${editingTrade.id}` : '/api/trades';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          entryPrice: parseFloat(formData.entryPrice),
          exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
          quantity: parseInt(formData.quantity),
          commission: parseFloat(formData.commission),
          aiInsight: formData.aiInsight
        })
      });
      setIsModalOpen(false);
      setEditingTrade(null);
      fetchData();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setError(null);
    setFormData({
      stockName: '',
      tradeType: 'buy',
      entryDate: format(new Date(), 'yyyy-MM-dd'),
      exitDate: '',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      commission: '0',
      strategy: 'تحليل فني',
      notes: '',
      aiInsight: null,
      chartImage: null
    });
    setAiInfo(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصفقة؟')) return;
    await fetch(`/api/trades/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData({
      stockName: trade.stock_name,
      tradeType: trade.trade_type,
      entryDate: trade.entry_date,
      exitDate: trade.exit_date || '',
      entryPrice: trade.entry_price.toString(),
      exitPrice: trade.exit_price?.toString() || '',
      quantity: trade.quantity.toString(),
      commission: trade.commission.toString(),
      strategy: trade.strategy,
      notes: trade.notes,
      aiInsight: trade.ai_insight,
      chartImage: trade.chart_image
    });
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(trades);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trades");
    XLSX.writeFile(wb, "EGX_Trading_Journal.xlsx");
  };

  const handleAiSearch = async () => {
    if (!formData.stockName) return;
    setIsAiLoading(true);
    const info = await getStockInfo(formData.stockName);
    setAiInfo(info || null);
    setIsAiLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, chartImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiImageEdit = async () => {
    if (!formData.chartImage) return;
    const userPrompt = prompt("كيف تريد تعديل الصورة؟ (مثلاً: أضف فلتر ريترو، أو حدد نقاط الدعم)");
    if (!userPrompt) return;
    
    setIsAiLoading(true);
    const newImage = await editChartImage(formData.chartImage, userPrompt);
    if (newImage) {
      setFormData(prev => ({ ...prev, chartImage: newImage }));
    }
    setIsAiLoading(false);
  };

  // --- Calculations ---
  const filteredTrades = trades.filter(t => {
    const matchesSearch = t.stock_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = 
      filterType === 'all' ? true :
      filterType === 'win' ? t.net_profit > 0 :
      filterType === 'loss' ? t.net_profit < 0 :
      filterType === 'open' ? !t.exit_price : true;
    return matchesSearch && matchesFilter;
  });

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.net_profit > 0).length;
  const successRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;
  const totalProfit = trades.reduce((acc, t) => acc + t.net_profit, 0);
  
  const stockPerformance = trades.reduce((acc, t) => {
    acc[t.stock_name] = (acc[t.stock_name] || 0) + t.net_profit;
    return acc;
  }, {} as Record<string, number>);

  const bestStock = Object.entries(stockPerformance).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const worstStock = Object.entries(stockPerformance).sort((a, b) => a[1] - b[1])[0]?.[0] || '-';

  // Chart Data
  const equityCurve = trades.slice().reverse().reduce((acc, t, i) => {
    const prevBalance = i === 0 ? (stats?.user.initial_capital || 0) : acc[i-1].balance;
    acc.push({
      name: format(new Date(t.entry_date), 'MM/dd'),
      balance: prevBalance + t.net_profit
    });
    return acc;
  }, [] as any[]);

  const pieData = [
    { name: 'رابحة', value: winningTrades, color: '#10b981' },
    { name: 'خاسرة', value: totalTrades - winningTrades, color: '#ef4444' }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">التاريخ: {label}</p>
          <p className="text-sm font-bold text-white num-en">
            {payload[0].value.toLocaleString()} <span className="text-[10px] text-zinc-400 font-medium mr-1">EGP</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pr-64">
      {/* Sidebar / Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-3 flex justify-around items-center z-50 md:top-0 md:right-0 md:left-auto md:w-72 md:h-full md:flex-col md:justify-start md:p-8 md:border-t-0 md:border-l">
        <div className="hidden md:block mb-12 text-right w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <ArrowUpRight className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tighter">EGX JOURNAL</h1>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mr-1">Professional Trading Log</p>
        </div>
        
        <div className="flex md:flex-col gap-1.5 w-full">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
            { id: 'trades', icon: History, label: 'سجل الصفقات' },
            { id: 'analytics', icon: Activity, label: 'التحليلات الذكية' },
            { id: 'settings', icon: Settings2, label: 'الإعدادات' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex flex-col md:flex-row items-center gap-3 p-3.5 rounded-xl transition-all w-full group",
                activeTab === item.id 
                  ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/10" 
                  : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
              )}
            >
              <item.icon size={18} className={cn("transition-transform group-hover:scale-110", activeTab === item.id ? "text-accent" : "")} />
              <span className="text-[10px] md:text-[13px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="md:mt-10 bg-primary text-white p-4 rounded-2xl md:w-full flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all"
        >
          <PlusCircle size={20} />
          <span className="hidden md:inline font-bold text-sm">صفقة جديدة</span>
        </button>

        <div className="hidden md:block mt-auto w-full pt-6 border-t border-border">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50">
            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold">G</div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-zinc-900 truncate">المتداول المحترف</p>
              <p className="text-[10px] text-zinc-400 truncate">demo@egx.com</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="p-6 md:p-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {activeTab === 'dashboard' && 'لوحة التحكم'}
            {activeTab === 'trades' && 'سجل الصفقات'}
            {activeTab === 'analytics' && 'تحليل الأداء'}
            {activeTab === 'settings' && 'الإعدادات'}
          </h2>
          <p className="text-sm text-gray-400">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-all shadow-sm">
            <FileSpreadsheet size={20} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 md:px-10 pb-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="إجمالي الصفقات" value={totalTrades} icon={History} color="bg-blue-600" />
                <StatBox label="نسبة النجاح" value={`${successRate}%`} icon={Target} color="bg-emerald-500" />
                <StatBox 
                  label="إجمالي الربح / الخسارة" 
                  value={totalProfit.toLocaleString()} 
                  trend={totalProfit >= 0 ? `+${totalProfit}` : `${totalProfit}`}
                  icon={totalProfit >= 0 ? ArrowUpRight : ArrowDownRight} 
                  color={totalProfit >= 0 ? "bg-emerald-600" : "bg-red-500"} 
                />
                <StatBox label="أفضل سهم" value={bestStock} icon={Zap} color="bg-amber-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="نمو رأس المال" subtitle="تتبع تراكم الأرباح بمرور الوقت" className="lg:col-span-2 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurve}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="توزيع الصفقات" className="h-[350px] flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-4">
                    {pieData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-500">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'trades' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="بحث باسم السهم..."
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'win', 'loss', 'open'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type as any)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        filterType === type ? "bg-primary text-white" : "bg-white text-gray-500 border border-gray-100"
                      )}
                    >
                      {type === 'all' && 'الكل'}
                      {type === 'win' && 'رابحة'}
                      {type === 'loss' && 'خاسرة'}
                      {type === 'open' && 'مفتوحة'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filteredTrades.map((trade) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={trade.id}
                  >
                    <Card className="p-0 overflow-hidden group border-zinc-100">
                      <div className="flex items-center p-4">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:scale-105",
                          trade.net_profit > 0 ? "bg-emerald-500 shadow-emerald-500/20" : trade.exit_price ? "bg-red-500 shadow-red-500/20" : "bg-zinc-900 shadow-zinc-900/20"
                        )}>
                          {trade.stock_name.substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="mr-5 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-zinc-900 text-base">{trade.stock_name}</h4>
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                              trade.trade_type === 'buy' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {trade.trade_type === 'buy' ? 'شراء' : 'بيع'}
                            </span>
                            {trade.ai_insight && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-zinc-900 text-accent flex items-center gap-1">
                                <Zap size={8} />
                                AI
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 font-bold mt-1 uppercase tracking-tight">
                            {format(new Date(trade.entry_date), 'dd MMM yyyy')} • {trade.quantity.toLocaleString()} سهم
                          </p>
                        </div>
                        
                        <div className="text-left ml-4">
                          <p className={cn(
                            "text-lg font-black num-en tracking-tighter",
                            trade.net_profit > 0 ? "text-emerald-600" : trade.exit_price ? "text-red-600" : "text-zinc-400"
                          )}>
                            {trade.exit_price ? (trade.net_profit > 0 ? '+' : '') + trade.net_profit.toLocaleString() : 'مفتوحة'}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest text-left">{trade.strategy}</p>
                        </div>

                        <div className="flex gap-1 mr-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => handleEdit(trade)} className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-colors">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(trade.id)} className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
                {filteredTrades.length === 0 && (
                  <div className="text-center py-20 text-gray-400">
                    <p>لا توجد صفقات مطابقة للبحث</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="أكبر صفقة رابحة" className="text-center">
                  <p className="text-3xl font-bold text-emerald-600 num-en">
                    {Math.max(...trades.map(t => t.net_profit), 0).toLocaleString()}
                  </p>
                </Card>
                <Card title="أكبر صفقة خاسرة" className="text-center">
                  <p className="text-3xl font-bold text-red-500 num-en">
                    {Math.min(...trades.map(t => t.net_profit), 0).toLocaleString()}
                  </p>
                </Card>
                <Card title="متوسط الربح" className="text-center">
                  <p className="text-3xl font-bold text-primary num-en">
                    {(trades.reduce((acc, t) => acc + t.net_profit, 0) / (trades.length || 1)).toFixed(0)}
                  </p>
                </Card>
              </div>

              <Card title="أداء الصفقات بمرور الوقت" className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#10b981" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto space-y-6"
            >
              <Card title="إعدادات الحساب">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">رأس المال الابتدائي (EGP)</label>
                    <input 
                      type="number" 
                      className="w-full p-3 rounded-xl border border-gray-100 num-en"
                      value={stats?.user.initial_capital || 0}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value);
                        await fetch('/api/user/capital', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ capital: val })
                        });
                        fetchData();
                      }}
                    />
                  </div>
                  <div className="pt-4 border-t border-gray-50">
                    <button className="w-full p-3 bg-red-50 text-red-500 rounded-xl font-medium">تسجيل الخروج</button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add/Edit Trade Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-2xl max-h-[85vh] overflow-y-auto relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-zinc-100"
            >
              <div className="p-8 border-b border-zinc-50 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-xl z-10">
                <div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">{editingTrade ? 'تعديل تفاصيل الصفقة' : 'تسجيل صفقة جديدة'}</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-medium">أدخل بيانات التداول بدقة للتحليل</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-colors">×</button>
              </div>

              <form onSubmit={handleSaveTrade} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {error && (
                    <div className="md:col-span-2 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                        <ShieldAlert size={14} />
                      </div>
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">اسم السهم</label>
                    <div className="flex gap-2">
                      <input 
                        required
                        type="text" 
                        placeholder="مثلاً: COMI"
                        className="input-field"
                        value={formData.stockName}
                        onChange={(e) => setFormData({...formData, stockName: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={handleAiSearch}
                        className="w-12 h-12 flex items-center justify-center bg-zinc-900 text-accent rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10"
                        title="تحليل ذكي"
                      >
                        {isAiLoading ? <div className="animate-spin text-xs">⌛</div> : <Zap size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">نوع العملية</label>
                    <div className="flex p-1.5 bg-zinc-100 rounded-2xl h-12">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, tradeType: 'buy'})}
                        className={cn("flex-1 rounded-xl text-xs font-black transition-all", formData.tradeType === 'buy' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-400")}
                      >شراء</button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, tradeType: 'sell'})}
                        className={cn("flex-1 rounded-xl text-xs font-black transition-all", formData.tradeType === 'sell' ? "bg-white text-red-500 shadow-sm" : "text-zinc-400")}
                      >بيع</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">سعر الدخول</label>
                    <input 
                      required
                      type="number" step="0.01"
                      className="input-field num-en"
                      value={formData.entryPrice}
                      onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">الكمية</label>
                    <input 
                      required
                      type="number"
                      className="input-field num-en"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">سعر الخروج</label>
                    <input 
                      type="number" step="0.01"
                      placeholder="اتركه فارغاً إذا كانت مفتوحة"
                      className="input-field num-en"
                      value={formData.exitPrice}
                      onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">العمولة</label>
                    <input 
                      type="number" step="0.01"
                      className="input-field num-en"
                      value={formData.commission}
                      onChange={(e) => setFormData({...formData, commission: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">تاريخ الدخول</label>
                    <input 
                      type="date"
                      className="input-field"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({...formData, entryDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">تاريخ الخروج</label>
                    <input 
                      type="date"
                      className="input-field"
                      value={formData.exitDate}
                      onChange={(e) => setFormData({...formData, exitDate: e.target.value})}
                    />
                  </div>
                </div>

                {aiInfo && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900 p-5 rounded-[24px] flex gap-4 items-start border border-zinc-800 shadow-2xl relative group/ai"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <Zap className="text-accent" size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest">ملخص الذكاء الاصطناعي</p>
                        <button 
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ 
                              ...prev, 
                              aiInsight: aiInfo 
                            }));
                            // We don't clear aiInfo immediately so user can see it's linked
                          }}
                          className={cn(
                            "text-[9px] font-black px-2 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-1",
                            formData.aiInsight === aiInfo 
                              ? "bg-emerald-500 text-white border-emerald-500" 
                              : "text-accent border border-accent/30 hover:bg-accent hover:text-zinc-900"
                          )}
                        >
                          {formData.aiInsight === aiInfo ? (
                            <>
                              <Target size={10} />
                              تم الربط بالصفقة
                            </>
                          ) : (
                            <>
                              <PlusCircle size={10} />
                              ربط بالصفقة
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-300 ai-summary-text font-medium">{aiInfo}</p>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">الاستراتيجية المستخدمة</label>
                  <select 
                    className="input-field appearance-none"
                    value={formData.strategy}
                    onChange={(e) => setFormData({...formData, strategy: e.target.value})}
                  >
                    <option>تحليل فني</option>
                    <option>كسر مقاومة</option>
                    <option>ارتداد من دعم</option>
                    <option>خبر جوهري</option>
                    <option>تحليل مالي</option>
                    <option>أخرى</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">الرسم البياني (الشارت)</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex-1 border-2 border-dashed border-zinc-200 rounded-[24px] p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <ImageIcon className="text-zinc-400" size={24} />
                      </div>
                      <span className="text-xs font-bold text-zinc-500">ارفق صورة الشارت</span>
                      <span className="text-[10px] text-zinc-400 mt-1">PNG, JPG بحد أقصى 5MB</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    {formData.chartImage && (
                      <div className="relative w-40 h-40 rounded-[24px] overflow-hidden group shadow-xl border border-zinc-100">
                        <img src={formData.chartImage} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={handleAiImageEdit}
                          className="absolute inset-0 bg-zinc-900/80 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                        >
                          <Zap size={24} className="text-accent mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest">تعديل ذكي</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">ملاحظات إضافية</label>
                  <textarea 
                    placeholder="اكتب ملاحظاتك النفسية أو الفنية هنا..."
                    className="input-field h-32 resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-zinc-900 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-zinc-900/20 hover:bg-zinc-800 active:scale-[0.98] transition-all"
                  >
                    {editingTrade ? 'تحديث البيانات' : 'تأكيد وحفظ الصفقة'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
