import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Asset, Transaction, TransactionType } from '../types';
import { User } from 'firebase/auth';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DeleteConfirmationModal from './ui/DeleteConfirmationModal';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalCashBank: 0,
    totalInvestment: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const assetsQuery = query(collection(db, 'assets'), where('userId', '==', user.uid));
    const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
      const assetData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetData);
      
      const cashBank = assetData
        .filter(a => a.type === 'cash' || a.type === 'bank')
        .reduce((acc, curr) => acc + curr.balance, 0);
      const investment = assetData
        .filter(a => a.type === 'investment')
        .reduce((acc, curr) => acc + curr.balance, 0);
        
      setStats(prev => ({ ...prev, totalCashBank: cashBank, totalInvestment: investment }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'assets'));

    const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString();
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString();
    
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(5)
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setRecentTransactions(transData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    // Monthly stats with filter
    const monthlyQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth)
    );

    const unsubscribeMonthly = onSnapshot(monthlyQuery, (snapshot) => {
      let income = 0;
      let expenses = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Transaction;
        if (data.type === TransactionType.INCOME) income += data.amount;
        else if (data.type === TransactionType.EXPENSE) expenses += data.amount;
      });
      setStats(prev => ({ ...prev, monthlyIncome: income, monthlyExpenses: expenses }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    return () => {
      unsubscribeAssets();
      unsubscribeTransactions();
      unsubscribeMonthly();
    };
  }, [user.uid, selectedMonth, selectedYear]);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const chartData = [
    { name: 'Pemasukan', value: stats.monthlyIncome },
    { name: 'Pengeluaran', value: stats.monthlyExpenses },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-text-main tracking-tight mb-2 underline decoration-text-main/20 underline-offset-8">
            Halo, {(user.displayName || 'Tamu').split(' ')[0]}!
          </h1>
          <p className="text-text-muted text-sm md:text-base font-medium">Berikut data keuangan Anda.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-bg-card border border-border-subtle text-text-main text-[10px] font-black uppercase tracking-widest p-3 rounded-xl outline-none"
          >
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-bg-card border border-border-subtle text-text-main text-[10px] font-black uppercase tracking-widest p-3 rounded-xl outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-bg-card p-6 rounded-3xl border border-border-subtle shadow-xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2.5 bg-brand/5 rounded-2xl border border-brand/10">
              <Wallet className="text-text-main w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tunai & Bank</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-text-main font-mono leading-none">{formatCurrency(stats.totalCashBank)}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-bg-card p-6 rounded-3xl border border-border-subtle shadow-xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2.5 bg-brand/5 rounded-2xl border border-brand/10">
              <ArrowUpRight className="text-text-main w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Investasi</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-text-main font-mono leading-none">{formatCurrency(stats.totalInvestment)}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-bg-card p-6 rounded-3xl border border-emerald-500/10 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <TrendingUp className="text-emerald-500 w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Pemasukan {months[selectedMonth]}</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-text-main font-mono leading-none">+{formatCurrency(stats.monthlyIncome)}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-bg-card p-6 rounded-3xl border border-rose-500/10 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2.5 bg-rose-500/5 rounded-2xl border border-rose-500/10">
              <TrendingDown className="text-rose-500 w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest">Pengeluaran {months[selectedMonth]}</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-text-main font-mono leading-none">-{formatCurrency(stats.monthlyExpenses)}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-bg-card p-6 md:p-8 rounded-3xl border border-border-subtle shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
            <TrendingUp className="w-48 md:w-64 h-48 md:h-64 text-text-main" />
          </div>
          <h2 className="text-lg md:text-xl font-black text-text-main mb-6 md:mb-8 tracking-tight flex items-center gap-3">
            <span className="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
            Arus Kas Terkini
          </h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="12 12" vertical={false} stroke="currentColor" className="text-border-subtle opacity-20" />
                <XAxis 
                  dataKey="name" 
                  stroke="currentColor"
                  className="text-text-muted"
                  fontSize={9} 
                  fontWeight="900" 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-bg-card border border-border-subtle p-3 md:p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                          <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                          <p className="text-base md:text-lg font-black text-text-main font-mono">{formatCurrency(Number(payload[0].value))}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Pemasukan' ? '#10b981' : '#ef4444'} 
                      fillOpacity={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card p-6 md:p-8 rounded-3xl border border-border-subtle shadow-xl">
          <h2 className="text-lg md:text-xl font-black text-text-main mb-6 md:mb-8 tracking-tight">Riwayat Aktivitas</h2>
          <div className="space-y-4 md:space-y-6">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`p-2 md:p-2.5 rounded-xl border transition-all ${
                    tx.type === TransactionType.INCOME 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                      : tx.type === TransactionType.EXPENSE 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                  }`}>
                    {tx.type === TransactionType.INCOME ? <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" /> : 
                     tx.type === TransactionType.EXPENSE ? <ArrowDownRight className="w-4 h-4 md:w-5 md:h-5" /> :
                     <ArrowLeftRight className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-text-main leading-none mb-1 text-sm md:text-base">{tx.category}</p>
                    <p className="text-[9px] md:text-[10px] text-text-muted uppercase font-bold tracking-widest">
                      {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <p className={`font-black font-mono text-xs md:text-sm ${
                  tx.type === TransactionType.INCOME ? 'text-emerald-500' : 
                  tx.type === TransactionType.EXPENSE ? 'text-rose-500' : 
                  'text-blue-500'
                }`}>
                  {tx.type === TransactionType.INCOME ? '+' : tx.type === TransactionType.EXPENSE ? '-' : ''}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="bg-brand/5 p-4 rounded-full mb-4">
                  <ArrowLeftRight className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-muted font-bold">Belum ada data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
