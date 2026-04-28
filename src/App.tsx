/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, loginAnonymously, clearUserData, signInWithGoogle } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { LayoutDashboard, Wallet, ArrowLeftRight, Tag, PieChart, Target, LogOut, Menu, X, HelpCircle, RefreshCcw, Sparkles, ShieldAlert, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import AssetList from './components/AssetList';
import TransactionList from './components/TransactionList';
import CategoryList from './components/CategoryList';
import Reports from './components/Reports';
import FinancialPlanning from './components/FinancialPlanning';
import Budgeting from './components/Budgeting';
import Guide from './components/Guide';

type Tab = 'dashboard' | 'assets' | 'transactions' | 'categories' | 'reports' | 'planning' | 'budgeting';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        const hasSeenGuide = localStorage.getItem(`hasSeenGuide_${user.uid}`);
        if (!hasSeenGuide) {
          setShowGuide(true);
          localStorage.setItem(`hasSeenGuide_${user.uid}`, 'true');
        }
      }
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const handleLogin = async (method: 'google' | 'anonymous') => {
    try {
      if (method === 'google') {
        await signInWithGoogle();
      } else {
        await loginAnonymously();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/admin-restricted-operation') {
        alert('Fitur "Anonymous Sign-in" belum diaktifkan di Firebase Console.\n\nSilakan gunakan Masuk dengan Google atau aktifkan provider "Anonymous" di tab Authentication > Sign-in method.');
      } else {
        alert('Gagal masuk: ' + (err.message || 'Terjadi kesalahan sistem.'));
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] p-10 rounded-[40px] border border-[#262626] shadow-2xl max-w-md w-full text-center"
        >
          <div className="bg-white p-6 rounded-3xl inline-block mb-10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <Wallet className="w-16 h-16 text-black" />
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase">KEUANGAN PRIBADI</h1>
          <p className="text-gray-500 mb-10 text-sm font-black uppercase tracking-widest">Atur Anggaran, Kendalikan Masa Depan</p>
          
          <div className="space-y-4">
            <button
              onClick={() => handleLogin('google')}
              className="w-full bg-white text-black font-black py-4 px-6 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-4 text-xs uppercase tracking-widest shadow-lg active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-5 h-5" />
              Masuk dengan Google
            </button>
            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Atau</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>
            <button
              onClick={() => handleLogin('anonymous')}
              className="w-full bg-white/5 text-gray-400 font-bold py-4 px-6 rounded-2xl hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest active:scale-95"
            >
              Coba Tanpa Akun
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const userName = user.displayName || 'Tamu';
  const displayUserName = userName.split(' ')[0].toUpperCase();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets', label: 'Kelola Aset', icon: Wallet },
    { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'budgeting', label: 'Anggaran', icon: ShieldAlert },
    { id: 'categories', label: 'Kategori', icon: Tag },
    { id: 'reports', label: 'Laporan PDF', icon: PieChart },
    { id: 'planning', label: 'Rencana Masa Depan', icon: Sparkles },
  ];

  const handleResetData = async () => {
    if (!user) return;
    if (confirm('APAKAH ANDA YAKIN? Semua data transaksi, aset, anggaran, dan rencana akan DIHAPUS PERMANEN. Tindakan ini tidak dapat dibatalkan.')) {
      try {
        await clearUserData(user.uid);
        alert('Data berhasil direset. Silakan mulai kembali dari awal.');
        setActiveTab('dashboard');
      } catch (err) {
        alert('Gagal mereset data. Silakan coba lagi.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex font-sans">
      <AnimatePresence>
        {showGuide && <Guide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#0d0d0d] border-r border-[#1a1a1a]">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-white p-2.5 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Wallet className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter truncate">KEUANGAN {displayUserName}</span>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-white/10 text-white shadow-inner border border-white/5' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : ''}`} />
                <span className="font-black text-[10px] uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-[#1a1a1a] bg-[#0d0d0d]">
          <button 
            onClick={() => setShowGuide(true)}
            className="w-full flex items-center gap-4 px-5 py-4 mb-2 rounded-2xl text-amber-400 bg-amber-400/5 border border-amber-400/10 hover:bg-amber-400/10 transition-colors uppercase font-black text-[10px] tracking-widest"
          >
            <HelpCircle className="w-4 h-4" />
            Panduan Penggunaan
          </button>
          <button 
            onClick={handleResetData}
            className="w-full flex items-center gap-4 px-5 py-4 mb-4 rounded-2xl text-rose-500 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors uppercase font-black text-[10px] tracking-widest"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset Semua Data
          </button>
          <div className="flex items-center gap-4 mb-6">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate uppercase tracking-tight">{userName}</p>
              <p className="text-[10px] text-gray-600 truncate font-mono uppercase font-bold">{user.email || 'Mode Tamu'}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-5 py-3 text-gray-500 hover:text-rose-500 transition-colors group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-3 font-sans">
          <Wallet className="text-white w-6 h-6" />
          <span className="text-lg font-black tracking-tighter uppercase">KEUANGAN {displayUserName}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0d0d0d] z-50 lg:hidden p-8 border-r border-[#1a1a1a] flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg">
                    <Wallet className="text-black w-5 h-5" />
                  </div>
                  <span className="text-xl font-black uppercase tracking-tighter">KEUANGAN {user.displayName?.split(' ')[0].toUpperCase()}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)}><X className="w-6 h-6 text-white" /></button>
              </div>
              <nav className="space-y-2 flex-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as Tab);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                      activeTab === item.id 
                        ? 'bg-white/10 text-white shadow-inner border border-white/5' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-black text-[10px] uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="pt-8 border-t border-[#1a1a1a] space-y-4">
                <button 
                  onClick={() => {
                    setShowGuide(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-amber-400 bg-amber-400/5 border border-amber-400/10 uppercase font-black text-[10px] tracking-widest"
                >
                  <HelpCircle className="w-4 h-4" />
                  Panduan
                </button>
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-gray-500 hover:text-rose-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-black text-[10px] uppercase tracking-widest">Keluar</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:p-12 pt-24 p-6 overflow-y-auto bg-[#0a0a0a]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && <Dashboard user={user} />}
            {activeTab === 'assets' && <AssetList user={user} />}
            {activeTab === 'transactions' && <TransactionList user={user} />}
            {activeTab === 'categories' && <CategoryList user={user} />}
            {activeTab === 'reports' && <Reports user={user} />}
            {activeTab === 'planning' && <FinancialPlanning user={user} />}
            {activeTab === 'budgeting' && <Budgeting user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
