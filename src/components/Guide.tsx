import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Smartphone, Target, PieChart, Wallet, CreditCard, ShieldAlert, RefreshCw } from 'lucide-react';

interface GuideProps {
  onClose: () => void;
}

const slides = [
  {
    title: 'Selamat Datang Calon Financial Freedom',
    description: 'Aplikasi manajemen keuangan pribadi yang dirancang untuk membantu Anda memantau arus kas dengan gaya.',
    icon: <Smartphone className="w-16 h-16 text-text-main" />,
    color: 'bg-bg-main'
  },
  {
    title: 'Pantau Aset Anda',
    description: 'Tambahkan berbagai sumber dana mulai dari Tunai, Bank, hingga Investasi di menu Kelola Aset.',
    icon: <Wallet className="w-16 h-16 text-emerald-500" />,
    color: 'bg-emerald-500/10'
  },
  {
    title: 'Catat Transaksi',
    description: 'Catat setiap pemasukan dan pengeluaran Anda. Pilih kategori yang sesuai untuk analisis yang akurat.',
    icon: <CreditCard className="w-16 h-16 text-rose-500" />,
    color: 'bg-rose-500/10'
  },
  {
    title: 'Rencanakan Masa Depan',
    description: 'Gunakan fitur Perencanaan Keuangan untuk menabung demi impian Anda: Menikah, Rumah, atau Pendidikan.',
    icon: <Target className="w-16 h-16 text-amber-500" />,
    color: 'bg-amber-500/10'
  },
  {
    title: 'Analisis & Laporan PDF',
    description: 'Lihat alokasi pengeluaran Anda melalui diagram lingkaran dan unduh laporannya dalam PDF lengkap dengan grafik.',
    icon: <PieChart className="w-16 h-16 text-blue-500" />,
    color: 'bg-blue-500/10'
  },
  {
    title: 'Monitor Anggaran Bulanan',
    description: 'Tetapkan batas pengeluaran per kategori. Kami akan memberi peringatan jika Anda hampir melampaui budget.',
    icon: <ShieldAlert className="w-16 h-16 text-emerald-500" />,
    color: 'bg-emerald-500/10'
  }
];

export default function Guide({ onClose }: GuideProps) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else onClose();
  };

  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/90 backdrop-blur-xl p-4 md:p-10"
    >
      <div className="relative w-full max-w-2xl bg-bg-card border border-border-subtle rounded-[40px] shadow-2xl overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 z-10 p-2 text-text-muted hover:text-text-main transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col h-full min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className={`flex-1 flex flex-col items-center justify-center p-12 text-center ${slides[current].color}`}
            >
              <div className="mb-8 p-8 rounded-full bg-bg-main/20 border border-border-subtle shadow-xl">
                {slides[current].icon}
              </div>
              <h2 className="text-3xl font-black text-text-main mb-4 tracking-tight uppercase">
                {slides[current].title}
              </h2>
              <p className="text-text-muted font-bold leading-relaxed max-w-md">
                {slides[current].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="p-10 flex items-center justify-between border-t border-border-subtle">
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? 'w-8 bg-brand' : 'w-2 bg-text-main/10'}`}
                />
              ))}
            </div>
            
            <div className="flex gap-4">
              {current > 0 && (
                <button 
                  onClick={prev}
                  className="p-4 rounded-2xl bg-bg-main/5 text-text-main hover:bg-bg-main/10 transition-colors border border-border-subtle"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={next}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-brand text-bg-main font-black text-xs uppercase tracking-widest hover:bg-brand/90 transition-transform active:scale-95 shadow-lg shadow-brand/20"
              >
                {current === slides.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
