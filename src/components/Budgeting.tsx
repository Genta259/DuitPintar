import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Budget, Category, Transaction, TransactionType } from '../types';
import { User } from 'firebase/auth';
import { formatCurrency } from '../lib/utils';
import { Target, AlertTriangle, CheckCircle2, TrendingUp, Wallet, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import DeleteConfirmationModal from './ui/DeleteConfirmationModal';

interface BudgetingProps {
  user: User;
}

export default function Budgeting({ user }: BudgetingProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingBudget, setEditingBudget] = useState<{ id?: string, categoryId: string, amount: string }>({ categoryId: '', amount: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  useEffect(() => {
    const qBudgets = query(collection(db, 'budgets'), where('userId', '==', user.uid));
    const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    const qCats = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribeCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const qTx = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid),
      where('type', '==', TransactionType.EXPENSE)
    );
    const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
      const thisMonthTx = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .filter(tx => new Date(tx.date) >= startOfMonth);
      setTransactions(thisMonthTx);
    });

    return () => {
      unsubscribeBudgets();
      unsubscribeCats();
      unsubscribeTx();
    };
  }, [user.uid]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget.categoryId || !editingBudget.amount) return;

    const category = categories.find(c => c.id === editingBudget.categoryId);
    if (!category) return;

    try {
      const budgetRef = doc(db, 'budgets', editingBudget.categoryId);
      await setDoc(budgetRef, {
        userId: user.uid,
        categoryId: category.id,
        categoryName: category.name,
        amount: Number(editingBudget.amount),
        period: 'monthly',
        updatedAt: new Date().toISOString(),
      });
      setEditingBudget({ categoryId: '', amount: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    }
  };

  const startEdit = (budget: Budget) => {
    setEditingBudget({
      id: budget.id,
      categoryId: budget.categoryId,
      amount: budget.amount.toString()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'budgets', budgetToDelete.id));
      setBudgetToDelete(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `budgets/${budgetToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getSpentForCategory = (categoryName: string) => {
    return transactions
      .filter(tx => tx.category === categoryName)
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight uppercase">Manajemen Anggaran</h1>
          <p className="text-text-muted font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Kendalikan pengeluaran bulanan Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-1">
          <div className="glass-card p-6 md:p-8 lg:sticky lg:top-24">
            <h2 className="text-xs font-black text-text-main uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand" />
              {editingBudget.id ? 'Edit Anggaran' : 'Atur Anggaran Baru'}
            </h2>
            <form onSubmit={handleSaveBudget} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Kategori Pengeluaran</label>
                <select
                  required
                  disabled={!!editingBudget.id}
                  value={editingBudget.categoryId}
                  onChange={e => setEditingBudget({ ...editingBudget, categoryId: e.target.value })}
                  className="input-dark appearance-none disabled:opacity-50"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Limit Anggaran (Rp)</label>
                <input
                  required
                  type="number"
                  value={editingBudget.amount}
                  onChange={e => setEditingBudget({ ...editingBudget, amount: e.target.value })}
                  className="input-dark font-mono"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  className="w-full btn-primary py-4 text-xs tracking-[0.2em]"
                >
                  {editingBudget.id ? 'SIMPAN PERUBAHAN' : 'TETAPKAN ANGGARAN'}
                </button>
                {editingBudget.id && (
                  <button 
                    type="button"
                    onClick={() => setEditingBudget({ categoryId: '', amount: '' })}
                    className="w-full bg-bg-main text-text-muted py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-text-main transition-colors border border-border-subtle"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {budgets.length === 0 ? (
            <div className="py-20 text-center bg-bg-card rounded-3xl border-2 border-dashed border-border-subtle">
              <Target className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Belum ada anggaran yang diatur</p>
            </div>
          ) : (
            budgets.map(budget => {
              const spent = getSpentForCategory(budget.categoryName);
              const percent = Math.min((spent / budget.amount) * 100, 100);
              const isOver = spent > budget.amount;

              return (
                <div key={budget.id} className="glass-card p-6 flex flex-col gap-4 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-black text-text-main uppercase tracking-tighter">{budget.categoryName}</h3>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Batas: {formatCurrency(budget.amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black font-mono ${isOver ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {formatCurrency(spent)}
                      </p>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Terpakai Bulan Ini</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="w-full h-2 bg-text-main/5 rounded-full overflow-hidden border border-border-subtle">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className={`h-full rounded-full transition-colors duration-500 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-brand'}`}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        {isOver ? (
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        )}
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isOver ? 'text-rose-500' : 'text-text-muted'}`}>
                          {isOver ? 'Melebihi Anggaran!' : percent > 80 ? 'Hampir Habis' : 'Dalam Batas Aman'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(budget)}
                          className="text-[9px] font-black text-text-muted hover:text-text-main uppercase tracking-widest transition-colors"
                        >
                          Edit
                        </button>
                        
                        <button 
                          onClick={() => setBudgetToDelete(budget)}
                          className="text-[9px] font-black text-text-muted hover:text-rose-500 uppercase tracking-widest transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={!!budgetToDelete}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={handleDeleteBudget}
        title="Hapus Anggaran"
        itemName={`Anggaran ${budgetToDelete?.categoryName || ''}`}
        loading={isDeleting}
      />
    </div>
  );
}
