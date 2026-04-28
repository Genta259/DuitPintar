import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc, orderBy, runTransaction, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction, TransactionType, Asset, Category } from '../types';
import { User } from 'firebase/auth';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Calendar, Tag, Wallet, Edit2, ShoppingBag, Utensils, Car, Lightbulb, Heart, Zap, Globe, Briefcase, Building, ShoppingCart, PawPrint, Users, HandHeart, MoreHorizontal, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from './ui/DeleteConfirmationModal';

const CATEGORY_ICONS: Record<string, any> = {
  tag: Tag,
  bag: ShoppingBag,
  food: Utensils,
  car: Car,
  light: Lightbulb,
  heart: Heart,
  bolt: Zap,
  globe: Globe,
  work: Briefcase,
  kos: Building,
  groceries: ShoppingCart,
  pet: PawPrint,
  family: Users,
  charity: HandHeart,
  other: MoreHorizontal,
};

interface TransactionListProps {
  user: User;
}

export default function TransactionList({ user }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [newTx, setNewTx] = useState({
    amount: '' as any,
    type: TransactionType.EXPENSE,
    category: '',
    assetId: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    let qTx = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    
    // If filtering by month/year, we need to adjust the query or filter locally.
    // Given onSnapshot and potential large data, let's stick to the base query and filter locally for now to keep it responsive, 
    // or we could add another where clause if we wanted to be more efficient on reads.
    // For now, local filtering is simpler to implement with the existing onSnapshot setup.
    
    const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const qAssets = query(collection(db, 'assets'), where('userId', '==', user.uid));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'assets'));

    const qCats = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribeCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => {
      unsubscribeTx();
      unsubscribeAssets();
      unsubscribeCats();
    };
  }, [user.uid]);

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return <Tag className="w-4 h-4 text-text-muted" />;
    const Icon = CATEGORY_ICONS[category.icon] || Tag;
    return <Icon className="w-4 h-4" style={{ color: category.color }} />;
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.assetId || newTx.amount === '') return;

    try {
      await runTransaction(db, async (tx) => {
        const amount = Number(newTx.amount);
        
        if (editingTxId) {
          const oldTxRef = doc(db, 'transactions', editingTxId);
          const newAssetRef = doc(db, 'assets', newTx.assetId);
          
          // READ ALL FIRST
          const [oldTxDoc, newAssetDoc] = await Promise.all([
            tx.get(oldTxRef),
            tx.get(newAssetRef)
          ]);

          if (!oldTxDoc.exists()) throw new Error("Transaction does not exist");
          if (!newAssetDoc.exists()) throw new Error("Target asset does not exist");
          
          const oldTxData = oldTxDoc.data() as Transaction;
          const oldAssetRef = doc(db, 'assets', oldTxData.assetId);
          
          // If different asset, we need to read the old asset too
          let oldAssetDoc = null;
          if (oldTxData.assetId !== newTx.assetId) {
            oldAssetDoc = await tx.get(oldAssetRef);
          } else {
            oldAssetDoc = newAssetDoc;
          }

          // WRITES
          if (oldAssetDoc.exists()) {
            const currentOldBalance = oldAssetDoc.data().balance;
            const correction = oldTxData.type === TransactionType.INCOME ? -oldTxData.amount : oldTxData.amount;
            
            // If it's the same asset, the new balance calculation will handle it
            if (oldTxData.assetId !== newTx.assetId) {
              tx.update(oldAssetRef, { balance: currentOldBalance + correction });
            }
          }

          const currentNewBalance = newAssetDoc.data().balance;
          let finalNewBalance = currentNewBalance;

          if (oldTxData.assetId === newTx.assetId) {
            // Revert then apply
            const correction = oldTxData.type === TransactionType.INCOME ? -oldTxData.amount : oldTxData.amount;
            const adjustment = newTx.type === TransactionType.INCOME ? amount : -amount;
            finalNewBalance = currentNewBalance + correction + adjustment;
          } else {
            const adjustment = newTx.type === TransactionType.INCOME ? amount : -amount;
            finalNewBalance = currentNewBalance + adjustment;
          }

          tx.update(newAssetRef, { balance: finalNewBalance, updatedAt: new Date().toISOString() });

          tx.update(oldTxRef, {
            ...newTx,
            amount,
            userId: user.uid,
            date: new Date(newTx.date).toISOString(),
          });
        } else {
          const assetRef = doc(db, 'assets', newTx.assetId);
          const assetDoc = await tx.get(assetRef);
          if (!assetDoc.exists()) throw new Error("Asset does not exist");
          
          const currentBalance = assetDoc.data().balance;
          const adjustment = newTx.type === TransactionType.INCOME ? amount : -amount;
          
          tx.update(assetRef, { balance: currentBalance + adjustment, updatedAt: new Date().toISOString() });
          
          const txRef = doc(collection(db, 'transactions'));
          tx.set(txRef, {
            ...newTx,
            amount,
            userId: user.uid,
            date: new Date(newTx.date).toISOString(),
          });
        }
      });

      setNewTx({ amount: '' as any, type: TransactionType.EXPENSE, category: '', assetId: '', notes: '', date: new Date().toISOString().split('T')[0] });
      setIsAdding(false);
      setEditingTxId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  const handleDeleteTransaction = async () => {
    if (!txToDelete || !user) return;
    setIsDeleting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const assetRef = doc(db, 'assets', txToDelete.assetId);
        const assetSnapshot = await transaction.get(assetRef);
        
        if (assetSnapshot.exists()) {
          const data = assetSnapshot.data();
          const currentBalance = data ? data.balance : 0;
          const correction = txToDelete.type === TransactionType.INCOME ? -txToDelete.amount : txToDelete.amount;
          transaction.update(assetRef, { 
            balance: currentBalance + correction, 
            updatedAt: new Date().toISOString() 
          });
        }
        
        const txRef = doc(db, 'transactions', txToDelete.id);
        transaction.delete(txRef);
      });
      setTxToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      handleFirestoreError(error, OperationType.DELETE, `transactions/${txToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const startEdit = (tx: Transaction) => {
    setNewTx({
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      assetId: tx.assetId,
      notes: tx.notes || '',
      date: tx.date.split('T')[0],
    });
    setEditingTxId(tx.id);
    setIsAdding(true);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = (tx.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    const txDate = new Date(tx.date);
    const matchesMonth = selectedMonth === 'all' || txDate.getMonth() === selectedMonth;
    const matchesYear = txDate.getFullYear() === selectedYear;

    return matchesSearch && matchesCategory && matchesType && matchesMonth && matchesYear;
  });

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-text-main tracking-tight uppercase">Catatan Transaksi</h1>
        <button
          onClick={() => {
            setEditingTxId(null);
            setNewTx({ amount: '' as any, type: TransactionType.EXPENSE, category: '', assetId: '', notes: '', date: new Date().toISOString().split('T')[0] });
            setIsAdding(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>Baru</span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch md:items-center bg-bg-card p-6 rounded-[30px] border border-border-subtle shadow-xl">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-main/40 border border-border-subtle rounded-2xl py-3 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:border-brand/20 outline-none transition-all text-text-main"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full bg-bg-main/40 border border-border-subtle rounded-2xl py-3 pl-10 pr-8 text-[9px] font-black uppercase tracking-widest outline-none appearance-none text-text-main"
            >
              <option value="all">Semua Tipe</option>
              <option value={TransactionType.INCOME}>Pemasukan</option>
              <option value={TransactionType.EXPENSE}>Pengeluaran</option>
              <option value={TransactionType.TRANSFER}>Pindah Dana</option>
            </select>
          </div>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-bg-main/40 border border-border-subtle rounded-2xl py-3 pl-10 pr-8 text-[9px] font-black uppercase tracking-widest outline-none appearance-none text-text-main"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative col-span-1">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-bg-card border border-border-subtle rounded-2xl py-3 pl-10 pr-8 text-[9px] font-black uppercase tracking-widest outline-none appearance-none text-text-main"
            >
              <option value="all">Semua Bulan</option>
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="relative col-span-1">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-bg-card border border-border-subtle rounded-2xl py-3 pl-10 pr-8 text-[9px] font-black uppercase tracking-widest outline-none appearance-none text-text-main"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-bg-card p-8 rounded-3xl border border-border-subtle shadow-2xl"
          >
            <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="col-span-full border-b border-border-subtle pb-4 mb-4 flex justify-between items-center">
                <h2 className="text-xl font-black text-text-main uppercase tracking-tighter">
                  {editingTxId ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
                </h2>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Jenis Arus</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewTx({ ...newTx, type: TransactionType.EXPENSE })}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${newTx.type === TransactionType.EXPENSE ? 'bg-brand text-bg-main border-brand' : 'border-border-subtle text-text-muted hover:text-text-main'}`}
                    >
                      Keluar
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTx({ ...newTx, type: TransactionType.INCOME })}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${newTx.type === TransactionType.INCOME ? 'bg-brand text-bg-main border-brand' : 'border-border-subtle text-text-muted hover:text-text-main'}`}
                    >
                      Masuk
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Jumlah Nominal</label>
                  <input
                    required
                    type="number"
                    value={newTx.amount}
                    onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                    className="input-dark font-mono text-lg"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sumber Dana (Aset)</label>
                  <select
                    required
                    value={newTx.assetId}
                    onChange={e => setNewTx({ ...newTx, assetId: e.target.value })}
                    className="input-dark appearance-none"
                  >
                    <option value="">Pilih Aset Mana</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Pilih Kategori</label>
                  <select
                    required
                    value={newTx.category}
                    onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                    className="input-dark appearance-none"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.filter(c => c.type === newTx.type).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {!categories.some(c => c.type === newTx.type) && (
                      <>
                        <option value="Makan">Makan</option>
                        <option value="Belanja">Belanja</option>
                        <option value="Transport">Transport</option>
                        <option value="Gaji">Gaji (Pendapatan)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tanggal Kejadian</label>
                  <input
                    required
                    type="date"
                    value={newTx.date}
                    onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                    className="input-dark"
                  />
                </div>
                <div className="flex items-end gap-3">
                  <button type="submit" className="flex-1 btn-primary">{editingTxId ? 'Simpan Perubahan' : 'Catat'}</button>
                  <button type="button" onClick={() => {
                    setIsAdding(false);
                    setEditingTxId(null);
                  }} className="px-5 py-3 text-text-muted hover:text-text-main font-bold">Batal</button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-bg-card rounded-3xl border border-border-subtle shadow-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-bg-main border-b border-border-subtle">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Kategori</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Aset</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Nominal</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-text-muted font-black uppercase text-[10px] tracking-widest">
                    Tidak ada transaksi ditemukan
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-brand/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-text-main">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        {tx.notes && <span className="text-[10px] text-text-muted font-black uppercase truncate max-w-[150px]">{tx.notes}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-brand/5 rounded-lg border border-brand/5">
                          {getCategoryIcon(tx.category)}
                        </div>
                        <span className="text-sm font-black text-text-main">{tx.category}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-muted font-bold">{assets.find(a => a.id === tx.assetId)?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => startEdit(tx)}
                        className={`text-sm font-black font-mono hover:underline ${
                          tx.type === TransactionType.INCOME 
                            ? 'text-emerald-500' 
                            : tx.type === TransactionType.EXPENSE 
                              ? 'text-rose-500' 
                              : 'text-blue-500'
                        }`}
                      >
                        {tx.type === TransactionType.INCOME ? '+' : tx.type === TransactionType.EXPENSE ? '-' : ''}{formatCurrency(tx.amount)}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(tx)}
                          className="p-2 text-text-muted hover:text-text-main transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="p-2 text-text-muted hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-border-subtle">
          {filteredTransactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-text-muted font-black uppercase text-[10px] tracking-widest">
              Tidak ada transaksi ditemukan
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-5 active:bg-brand/5 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand/5 rounded-xl border border-brand/5">
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-main">{tx.category}</p>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-tight">
                        {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black font-mono ${
                      tx.type === TransactionType.INCOME ? 'text-emerald-500' : 
                      tx.type === TransactionType.EXPENSE ? 'text-rose-500' : 
                      'text-blue-500'
                    }`}>
                      {tx.type === TransactionType.INCOME ? '+' : tx.type === TransactionType.EXPENSE ? '-' : ''}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-text-muted font-bold uppercase truncate max-w-[120px]">
                      {assets.find(a => a.id === tx.assetId)?.name || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-bg-main/20 p-2 rounded-xl mt-2">
                  <div className="flex-1 text-[10px] text-text-muted uppercase font-black truncate pr-4">
                    {tx.notes || ''}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(tx)}
                      className="p-2 text-text-muted active:text-text-main transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTxToDelete(tx)}
                      className="p-2 text-text-muted active:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleDeleteTransaction}
        title="Hapus Transaksi"
        itemName={txToDelete ? `${txToDelete.category} (${formatCurrency(txToDelete.amount)})` : ''}
        loading={isDeleting}
      />
    </div>
  );
}
