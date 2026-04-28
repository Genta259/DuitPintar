import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction, TransactionType } from '../types';
import { User } from 'firebase/auth';
import { formatCurrency } from '../lib/utils';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  user: User;
}

export default function Reports({ user }: ReportsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));
    return unsubscribe;
  }, [user.uid]);

  const filteredTransactions = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const categoryData = filteredTransactions
    .filter(tx => tx.type === TransactionType.EXPENSE)
    .reduce((acc: any[], curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
    }, []);

  const totalIncome = filteredTransactions
    .filter(tx => tx.type === TransactionType.INCOME)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = filteredTransactions
    .filter(tx => tx.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const COLORS = [
    '#ffffff', // White
    '#34d399', // Emerald
    '#fbbf24', // Amber
    '#60a5fa', // Blue
    '#f87171', // Red
    '#a78bfa', // Violet
    '#fb7185', // Rose
    '#22d3ee', // Cyan
  ];

  const downloadReport = () => {
    try {
      const doc = new jsPDF() as any;
      const monthName = new Date(2000, selectedMonth).toLocaleDateString('id-ID', { month: 'long' });
      
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      doc.text(`LAPORAN KEUANGAN ${user.displayName?.toUpperCase() || 'PRIBADI'}`, 14, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 32);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Periode: ${monthName} ${selectedYear}`, 14, 45);

      // Income Section Header
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(14, 52, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('RINGKASAN ARUS KAS', 18, 58.5);

      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Total Pemasukan Bulan Ini:`, 14, 72);
      doc.setFont(undefined, 'bold');
      doc.text(`${formatCurrency(totalIncome)}`, 140, 72, { align: 'right' });
      
      doc.setFont(undefined, 'normal');
      doc.text(`Total Pengeluaran Bulan Ini:`, 14, 80);
      doc.setFont(undefined, 'bold');
      doc.text(`-${formatCurrency(totalExpense)}`, 140, 80, { align: 'right' });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 84, 182, 84);

      doc.setFont(undefined, 'bold');
      doc.text(`Saldo Bersih:`, 14, 92);
      doc.text(`${formatCurrency(totalIncome - totalExpense)}`, 140, 92, { align: 'right' });
      doc.setFont(undefined, 'normal');

      // Visual progress bar representation
      if (totalIncome > 0) {
        const ratio = Math.min(totalExpense / totalIncome, 1);
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 96, 126, 2, 'F');
        if (ratio > 0.8) {
          doc.setFillColor(244, 63, 94); // Red
        } else {
          doc.setFillColor(16, 185, 129); // Green
        }
        doc.rect(14, 96, 126 * ratio, 2, 'F');
      }

      // Table Header Style
      doc.setFillColor(0, 0, 0);
      doc.rect(14, 100, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('RIWAYAT TRANSAKSI LENGKAP', 18, 105.5);

      const tableData = filteredTransactions.map(tx => [
        new Date(tx.date).toLocaleDateString('id-ID'),
        tx.notes || tx.category || '-',
        tx.category,
        tx.type === TransactionType.INCOME ? 'MASUK' : 'KELUAR',
        formatCurrency(tx.amount)
      ]);

      autoTable(doc, {
        startY: 110,
        head: [['Tanggal', 'Keterangan', 'Kategori', 'Tipe', 'Jumlah']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
        columnStyles: {
          4: { fontStyle: 'bold', halign: 'right' }
        }
      });

      doc.save(`Laporan-TAMPAN-${monthName}-${selectedYear}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Gagal membuat PDF. Pastikan browser Anda mengizinkan unduhan.');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Analisis Keuangan</h1>
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input-dark bg-[#141414] font-bold text-xs"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(2000, i).toLocaleDateString('id-ID', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input-dark bg-[#141414] font-bold text-xs"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors rounded-xl"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        <div className="glass-card p-6 md:p-10 relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
            <PieChartIcon className="w-64 md:w-96 h-64 md:h-96 text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-black mb-10 flex items-center gap-3 text-white">
            <PieChartIcon className="w-5 h-5 text-gray-500" />
            Alokasi Pengeluaran
          </h2>
          <div className="h-64 md:h-80">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      borderRadius: '16px', 
                      border: '1px solid #333',
                      color: '#fff',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                    formatter={(value: number) => formatCurrency(value)} 
                  />
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-700 font-black uppercase tracking-widest text-[10px]">
                Tidak ada data.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6 md:p-10 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -left-20 -bottom-20 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
            <BarChart3 className="w-64 md:w-96 h-64 md:h-96 text-white" />
          </div>
          <div className="space-y-8 md:space-y-12 relative z-10">
            <div className="group/item">
              <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 md:mb-3">Arus Kas Masuk</p>
              <div className="flex items-center justify-between border-b border-[#262626] pb-4 md:pb-5 group-hover/item:border-white transition-colors">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-1.5 md:p-2 bg-emerald-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                  </div>
                  <span className="font-bold text-white uppercase text-[10px] md:text-xs tracking-widest">Pendapatan</span>
                </div>
                <span className="text-xl md:text-3xl font-black text-emerald-400 font-mono tracking-tighter">{formatCurrency(totalIncome)}</span>
              </div>
            </div>
            
            <div className="group/item">
              <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 md:mb-3">Arus Kas Keluar</p>
              <div className="flex items-center justify-between border-b border-[#262626] pb-4 md:pb-5 group-hover/item:border-rose-500 transition-colors">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-1.5 md:p-2 bg-rose-500/10 rounded-lg">
                    <TrendingDown className="w-5 h-5 md:w-6 md:h-6 text-rose-400" />
                  </div>
                  <span className="font-bold text-gray-400 uppercase text-[10px] md:text-xs tracking-widest">Pengeluaran</span>
                </div>
                <span className="text-xl md:text-3xl font-black text-rose-400 font-mono tracking-tighter">-{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            <div className="p-6 md:p-10 bg-white shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-3xl text-center transition-transform hover:scale-[1.02]">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 md:mb-4">Efisiensi Tabungan Bersih</p>
              <p className={`text-3xl md:text-5xl font-black font-mono tracking-tighter ${totalIncome - totalExpense >= 0 ? 'text-black' : 'text-rose-600'}`}>
                {totalIncome - totalExpense > 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpense)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
