import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Asset, AssetType, TransactionType } from '../types';
import { User } from 'firebase/auth';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, Edit2, Wallet, Landmark, PieChart, Coins, ArrowRightLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from './ui/DeleteConfirmationModal';

interface AssetListProps {
  user: User;
}

export default function AssetList({ user }: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: AssetType.CASH,
    balance: '' as any,
  });

  const [transferData, setTransferData] = useState({
    fromId: '',
    toId: '',
    amount: '' as any,
  });

  useEffect(() => {
    const q = query(collection(db, 'assets'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'assets'));
    return unsubscribe;
  }, [user.uid]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name || newAsset.balance === '') return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'assets', editingId), {
          name: newAsset.name,
          type: newAsset.type,
          balance: Number(newAsset.balance),
          updatedAt: new Date().toISOString(),
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'assets'), {
          name: newAsset.name,
          type: newAsset.type,
          balance: Number(newAsset.balance),
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        });
      }
      setNewAsset({ name: '', type: AssetType.CASH, balance: '' as any });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, `assets/${editingId || ''}`);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { fromId, toId, amount } = transferData;
    const transferAmount = Number(amount);

    if (!fromId || !toId || fromId === toId || !transferAmount || transferAmount <= 0) {
      alert('Pilih aset asal dan tujuan yang berbeda, serta masukkan jumlah yang valid.');
      return;
    }

    const sourceAsset = assets.find(a => a.id === fromId);
    if (!sourceAsset || sourceAsset.balance < transferAmount) {
      alert('Saldo aset asal tidak mencukupi.');
      return;
    }

    const destAsset = assets.find(a => a.id === toId);
    if (!destAsset) return;

    try {
      const batch = writeBatch(db);
      
      // Update Source
      batch.update(doc(db, 'assets', fromId), {
        balance: sourceAsset.balance - transferAmount,
        updatedAt: new Date().toISOString(),
      });

      // Update Destination
      batch.update(doc(db, 'assets', toId), {
        balance: destAsset.balance + transferAmount,
        updatedAt: new Date().toISOString(),
      });

      // Log transaction
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: user.uid,
        amount: transferAmount,
        type: TransactionType.TRANSFER,
        category: 'Pindah Dana',
        date: new Date().toISOString(),
        notes: `Pindah dari ${sourceAsset.name} ke ${destAsset.name}`,
        assetId: fromId, // Primary asset for this record is source
      });

      await batch.commit();
      setIsTransferring(false);
      setTransferData({ fromId: '', toId: '', amount: '' as any });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'assets');
    }
  };

  const startEdit = (asset: Asset) => {
    setNewAsset({
      name: asset.name,
      type: asset.type,
      balance: asset.balance,
    });
    setEditingId(asset.id);
    setIsAdding(true);
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'assets', assetToDelete.id));
      setAssetToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assets/${assetToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getIcon = (type: AssetType) => {
    switch (type) {
      case AssetType.CASH: return <Coins className="w-5 h-5" />;
      case AssetType.BANK: return <Landmark className="w-5 h-5" />;
      case AssetType.INVESTMENT: return <PieChart className="w-5 h-5" />;
      default: return <Wallet className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Kelola Aset & Tabungan</h1>
          <p className="text-gray-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Kelola kekayaan dan simpanan Anda.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={() => setIsTransferring(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-[#141414] text-white border border-[#262626] rounded-2xl hover:bg-white hover:text-black transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Pindah Dana</span>
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setNewAsset({ name: '', type: AssetType.CASH, balance: '' as any });
              setIsAdding(true);
            }}
            className="flex-1 md:flex-none btn-primary"
          >
            <Plus className="w-5 h-5" />
            <span>Baru</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#141414] p-6 md:p-8 rounded-3xl border border-[#262626] shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
                {editingId ? 'Edit Aset' : 'Tambah Aset Baru'}
              </h2>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Aset</label>
                <input
                  required
                  type="text"
                  value={newAsset.name}
                  onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder="BCA, Dompet, dsb."
                  className="input-dark"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipe</label>
                <select
                  value={newAsset.type}
                  onChange={e => setNewAsset({ ...newAsset, type: e.target.value as AssetType })}
                  className="input-dark appearance-none"
                >
                  <option value={AssetType.CASH}>Tunai</option>
                  <option value={AssetType.BANK}>Rekening Bank</option>
                  <option value={AssetType.INVESTMENT}>Investasi</option>
                  <option value={AssetType.OTHER}>Lainnya</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Saldo Pengisian</label>
                <input
                  required
                  type="number"
                  value={newAsset.balance}
                  onChange={e => setNewAsset({ ...newAsset, balance: e.target.value })}
                  placeholder="0"
                  className="input-dark font-mono"
                />
              </div>
              <div className="flex items-end gap-3 justify-end md:justify-start">
                <button type="submit" className="flex-1 md:flex-none btn-primary px-8">Simpan</button>
              </div>
            </form>
          </motion.div>
        )}

        {isTransferring && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#141414] p-6 md:p-8 rounded-3xl border border-[#262626] shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">
                Pindah Dana (Transfer)
              </h2>
              <button onClick={() => setIsTransferring(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dari Aset</label>
                <select
                  required
                  value={transferData.fromId}
                  onChange={e => setTransferData({ ...transferData, fromId: e.target.value })}
                  className="input-dark appearance-none"
                >
                  <option value="">Pilih Asal</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ke Aset</label>
                <select
                  required
                  value={transferData.toId}
                  onChange={e => setTransferData({ ...transferData, toId: e.target.value })}
                  className="input-dark appearance-none"
                >
                  <option value="">Pilih Tujuan</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Jumlah Pindah</label>
                <input
                  required
                  type="number"
                  value={transferData.amount}
                  onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                  placeholder="0"
                  className="input-dark font-mono"
                />
              </div>
              <div className="flex items-end gap-3 justify-end md:justify-start">
                <button type="submit" className="flex-1 md:flex-none btn-primary px-8">Proses</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {assets.map((asset) => (
          <motion.div
            layout
            key={asset.id}
            className="bg-[#141414] p-6 md:p-8 rounded-3xl border border-[#262626] shadow-xl relative group hover:border-[#404040] transition-all"
          >
            <div className="flex items-center gap-4 md:gap-5 mb-6 md:mb-8">
              <div className="p-3 md:p-4 bg-white/5 text-white rounded-2xl border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
                {getIcon(asset.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-white text-base md:text-lg tracking-tight truncate uppercase">{asset.name}</h3>
                <p className="text-[9px] md:text-[10px] text-gray-600 uppercase font-black tracking-widest">{asset.type}</p>
              </div>
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(asset)}
                  className="p-1 md:p-2 text-gray-500 hover:text-white transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={() => setAssetToDelete(asset)}
                  className="p-1 md:p-2 text-gray-700 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">Saldo Sekarang</p>
              <p className="text-2xl md:text-3xl font-black text-white font-mono tracking-tighter leading-none">{formatCurrency(asset.balance)}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <DeleteConfirmationModal
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={handleDeleteAsset}
        title="Hapus Aset"
        itemName={assetToDelete?.name || ''}
        loading={isDeleting}
      />
    </div>
  );
}
