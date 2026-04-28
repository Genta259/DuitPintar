import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Goal, GoalCategory } from '../types';
import { User } from 'firebase/auth';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, Home, Heart, GraduationCap, Sparkles, Target, TrendingUp, BarChart as BarChartIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DeleteConfirmationModal from './ui/DeleteConfirmationModal';

interface FinancialPlanningProps {
  user: User;
}

export default function FinancialPlanning({ user }: FinancialPlanningProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '' as any,
    currentAmount: '' as any,
    category: GoalCategory.OTHER,
    targetDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0],
  });

  useEffect(() => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'goals'));
    return unsubscribe;
  }, [user.uid]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title || newGoal.targetAmount === '') return;
    try {
      await addDoc(collection(db, 'goals'), {
        ...newGoal,
        targetAmount: Number(newGoal.targetAmount),
        currentAmount: Number(newGoal.currentAmount || 0),
        userId: user.uid,
      });
      setIsAdding(false);
      setNewGoal({
        title: '',
        targetAmount: '' as any,
        currentAmount: '' as any,
        category: GoalCategory.OTHER,
        targetDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'goals');
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'goals', goalToDelete.id));
      setGoalToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${goalToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProgress = async (id: string, current: number, increment: number) => {
    if (isNaN(increment) || increment <= 0) return;
    try {
      await updateDoc(doc(db, 'goals', id), {
        currentAmount: current + increment
      });
      setCustomAmounts(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${id}`);
    }
  };

  const getIcon = (category: GoalCategory) => {
    switch (category) {
      case GoalCategory.HOUSE: return <Home className="w-5 h-5" />;
      case GoalCategory.MARRIAGE: return <Heart className="w-5 h-5" />;
      case GoalCategory.EDUCATION: return <GraduationCap className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Rencana Masa Depan</h1>
          <p className="text-gray-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Wujudkan impian Anda secara terukur.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Rencana</span>
        </button>
      </div>

      {goals.length > 0 && (
        <div className="glass-card p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <BarChartIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
            <h2 className="text-[10px] md:text-sm font-black text-white uppercase tracking-widest">Visualisasi Pencapaian</h2>
          </div>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goals} layout="vertical" margin={{ left: 0, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="title" 
                  type="category" 
                  stroke="#525252" 
                  fontSize={8} 
                  fontWeight="bold"
                  width={60}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as Goal;
                      return (
                        <div className="bg-black border border-[#262626] p-4 rounded-2xl shadow-2xl">
                          <p className="text-[10px] font-black text-gray-500 uppercase mb-2">{data.title}</p>
                          <p className="text-xs font-black text-white">{formatCurrency(data.currentAmount)} / {formatCurrency(data.targetAmount)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="currentAmount" 
                  radius={[0, 10, 10, 0]} 
                  background={{ fill: '#141414', radius: [0, 10, 10, 0] }}
                >
                  {goals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ffffff' : '#525252'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8"
          >
            <form onSubmit={handleAddGoal} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Judul Rencana</label>
                  <input
                    required
                    type="text"
                    value={newGoal.title}
                    onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="Misal: Rumah Impian"
                    className="input-dark"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kategori</label>
                  <select
                    value={newGoal.category}
                    onChange={e => setNewGoal({ ...newGoal, category: e.target.value as GoalCategory })}
                    className="input-dark appearance-none"
                  >
                    <option value={GoalCategory.HOUSE}>Rumah</option>
                    <option value={GoalCategory.MARRIAGE}>Pernikahan</option>
                    <option value={GoalCategory.EDUCATION}>Pendidikan</option>
                    <option value={GoalCategory.OTHER}>Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Dana (Rp)</label>
                  <input
                    required
                    type="number"
                    value={newGoal.targetAmount}
                    onChange={e => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="input-dark font-mono"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dana Terkumpul Saat Ini</label>
                  <input
                    required
                    type="number"
                    value={newGoal.currentAmount}
                    onChange={e => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                    className="input-dark font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Tanggal</label>
                  <input
                    required
                    type="date"
                    value={newGoal.targetDate}
                    onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                    className="input-dark"
                  />
                </div>
                <div className="flex items-end gap-3">
                  <button type="submit" className="flex-1 btn-primary">Simpan</button>
                  <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-3 text-gray-500 hover:text-white font-bold transition-all">Batal</button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {goals.map((goal) => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          return (
            <motion.div
              layout
              key={goal.id}
              className="glass-card p-6 md:p-10 relative group"
            >
              <div className="flex items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-10">
                <div className="p-3 md:p-4 bg-white/5 text-white rounded-2xl border border-white/10">
                  {getIcon(goal.category)}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-white text-xl md:text-2xl tracking-tighter uppercase">{goal.title}</h3>
                  <p className="text-[9px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest">
                    Target: {new Date(goal.targetDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button 
                  onClick={() => setGoalToDelete(goal)}
                  className="p-2 text-gray-700 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-8 md:mb-10">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">Progress: {progress.toFixed(1)}%</span>
                  <div className="text-right">
                    <p className="text-xl md:text-2xl font-black text-white font-mono leading-none">{formatCurrency(goal.currentAmount)}</p>
                    <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase">dari {formatCurrency(goal.targetAmount)}</p>
                  </div>
                </div>
                <div className="w-full h-2 md:h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tambah Tabungan</p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => handleUpdateProgress(goal.id, goal.currentAmount, 500000)}
                    className="btn-secondary flex-1 text-sm whitespace-nowrap"
                  >
                    +500rb
                  </button>
                  <button
                    onClick={() => handleUpdateProgress(goal.id, goal.currentAmount, 1000000)}
                    className="btn-secondary flex-1 text-sm whitespace-nowrap"
                  >
                    +1jt
                  </button>
                  <div className="flex-1 flex gap-2 min-w-[200px]">
                    <input
                      type="number"
                      value={customAmounts[goal.id] || ''}
                      onChange={e => setCustomAmounts({ ...customAmounts, [goal.id]: e.target.value })}
                      placeholder="Nominal Bebas"
                      className="input-dark flex-1 text-sm"
                    />
                    <button
                      onClick={() => handleUpdateProgress(goal.id, goal.currentAmount, Number(customAmounts[goal.id]))}
                      disabled={!customAmounts[goal.id]}
                      className="btn-primary px-4 disabled:opacity-20"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {goals.length === 0 && !isAdding && (
          <div className="col-span-full py-24 text-center bg-[#0d0d0d] rounded-3xl border-2 border-dashed border-[#1a1a1a]">
            <div className="bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/10">
              <Sparkles className="text-white w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Mulai Merencana</h3>
            <p className="text-gray-500 max-w-sm mx-auto font-medium">Visualisasikan target finansial Anda dan pantau perjalanannya di sini.</p>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleDeleteGoal}
        title="Hapus Rencana"
        itemName={goalToDelete?.title || ''}
        loading={isDeleting}
      />
    </div>
  );
}
