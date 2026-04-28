import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  loading = false,
}: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div id="delete-modal-overlay" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-card border border-rose-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-rose-500/10"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-main transition-colors"
                id="close-delete-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-text-main tracking-tight">
                {title}
              </h3>
              <p className="text-text-muted leading-relaxed">
                Apakah Anda yakin ingin menghapus <span className="text-text-main font-semibold underline decoration-rose-500/30 underline-offset-4">"{itemName}"</span>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-bg-main hover:bg-bg-main/80 text-text-main rounded-xl transition-all font-medium border border-border-subtle"
                id="cancel-delete-modal"
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
                id="confirm-delete-modal"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Hapus Permanen
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
