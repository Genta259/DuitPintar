import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Category, TransactionType } from '../types';
import { User } from 'firebase/auth';
import { Plus, Trash2, Tag, ArrowUpCircle, ArrowDownCircle, ShoppingBag, Utensils, Car, Lightbulb, Heart, Zap, Globe, Briefcase, Building, ShoppingCart, PawPrint, Users, HandHeart, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from './ui/DeleteConfirmationModal';

interface CategoryListProps {
  user: User;
}

const AVAILABLE_ICONS = [
  { name: 'tag', icon: Tag },
  { name: 'bag', icon: ShoppingBag },
  { name: 'food', icon: Utensils },
  { name: 'car', icon: Car },
  { name: 'light', icon: Lightbulb },
  { name: 'heart', icon: Heart },
  { name: 'bolt', icon: Zap },
  { name: 'globe', icon: Globe },
  { name: 'work', icon: Briefcase },
  { name: 'kos', icon: Building },
  { name: 'groceries', icon: ShoppingCart },
  { name: 'pet', icon: PawPrint },
  { name: 'family', icon: Users },
  { name: 'charity', icon: HandHeart },
  { name: 'other', icon: MoreHorizontal },
];

export default function CategoryList({ user }: CategoryListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [newCat, setNewCat] = useState({
    name: '',
    type: TransactionType.EXPENSE,
    color: '#ffffff',
    icon: 'tag',
  });

  useEffect(() => {
    const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));
    return unsubscribe;
  }, [user.uid]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name.trim()) return;

    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === newCat.name.trim().toLowerCase() && c.type === newCat.type
    );

    if (isDuplicate) {
      alert('Kategori dengan nama tersebut sudah ada untuk tipe aliran ini.');
      return;
    }

    try {
      await addDoc(collection(db, 'categories'), {
        ...newCat,
        name: newCat.name.trim(),
        userId: user.uid,
      });
      setNewCat({ name: '', type: TransactionType.EXPENSE, color: '#ffffff', icon: 'tag' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const handleDeleteCategory = async () => {
    if (!catToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'categories', catToDelete.id));
      setCatToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${catToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Manajemen Kategori</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>Baru</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8"
          >
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Label</label>
                <input
                  required
                  type="text"
                  value={newCat.name}
                  onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                  placeholder="Misal: Hiburan, Bonus"
                  className="input-dark"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipe Aliran</label>
                <select
                  value={newCat.type}
                  onChange={e => setNewCat({ ...newCat, type: e.target.value as TransactionType })}
                  className="input-dark appearance-none"
                >
                  <option value={TransactionType.EXPENSE}>Pengeluaran</option>
                  <option value={TransactionType.INCOME}>Pemasukan</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pilih Simbol & Warna</label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {AVAILABLE_ICONS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setNewCat({ ...newCat, icon: item.name })}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center ${newCat.icon === item.name ? 'bg-white text-black border-white' : 'border-[#262626] text-gray-500 hover:bg-white/5'}`}
                    >
                      <item.icon className="w-5 h-5" />
                    </button>
                  ))}
                  <div className="relative">
                    <input
                      type="color"
                      value={newCat.color}
                      onChange={e => setNewCat({ ...newCat, color: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-full border border-[#262626] rounded-xl" style={{ backgroundColor: newCat.color }} />
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-3 md:col-span-4 justify-end">
                <button type="submit" className="btn-primary w-full md:w-auto">Simpan Kategori</button>
                <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-3 text-gray-500 hover:text-white font-bold transition-all">Batal</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h2 className="text-xl font-black flex items-center gap-3 text-white">
            <ArrowDownCircle className="w-5 h-5 text-gray-500" />
            Pengeluaran
          </h2>
          <div className="grid gap-4">
            {categories.filter(c => c.type === TransactionType.EXPENSE).map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-5 glass-card group hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/5" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                    {(() => {
                      const item = AVAILABLE_ICONS.find(i => i.name === cat.icon);
                      const Icon = item ? item.icon : Tag;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <span className="font-bold text-white uppercase tracking-tight">{cat.name}</span>
                </div>
                <button
                  onClick={() => setCatToDelete(cat)}
                  className="p-2 text-gray-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black flex items-center gap-3 text-white">
            <ArrowUpCircle className="w-5 h-5 text-white" />
            Pemasukan
          </h2>
          <div className="grid gap-4">
            {categories.filter(c => c.type === TransactionType.INCOME).map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-5 glass-card group hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/5" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                    {(() => {
                      const item = AVAILABLE_ICONS.find(i => i.name === cat.icon);
                      const Icon = item ? item.icon : Tag;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <span className="font-bold text-white uppercase tracking-tight">{cat.name}</span>
                </div>
                <button
                  onClick={() => setCatToDelete(cat)}
                  className="p-2 text-gray-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <DeleteConfirmationModal
        isOpen={!!catToDelete}
        onClose={() => setCatToDelete(null)}
        onConfirm={handleDeleteCategory}
        title="Hapus Kategori"
        itemName={catToDelete?.name || ''}
        loading={isDeleting}
      />
    </div>
  );
}
