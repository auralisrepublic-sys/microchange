import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, orderBy, limit, getDocs, runTransaction, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider, CURRENCIES, CurrencyKey, UserProfile, TransactionRecord, OperationType, handleFirestoreError, Reserve, Product } from './firebase';
import { Wallet, ArrowLeftRight, Send, User as UserIcon, LogOut, QrCode, TrendingUp, History, ShieldCheck, Globe, Coins, Camera, X, CheckCircle2, Download, RefreshCw, FileText, Info, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';
import { cn } from './lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Components ---

const ReceiptModal = ({ tx, onClose, showNotification, title = "Transfer Successful!" }: { tx: any; onClose: () => void; showNotification: (m: string, t?: any) => void; title?: string }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReceipt = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(79, 70, 229); // indigo-600
      pdf.text("MicroChange", 20, 25);
      
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175); // slate-400
      pdf.text("OFFICIAL TRANSACTION RECEIPT", 20, 35);
      
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.line(20, 40, 190, 40);
      
      // Data
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42); // slate-900
      
      const dateStr = tx.timestamp instanceof Date 
        ? tx.timestamp.toLocaleString() 
        : (tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString() : new Date().toLocaleString());
      
      let y = 55;
      pdf.text(`Date:`, 20, y);
      pdf.text(dateStr, 80, y);
      
      y += 10;
      pdf.text(`From:`, 20, y);
      pdf.text(tx.fromAlias || "Unknown", 80, y);
      
      y += 10;
      pdf.text(`To:`, 20, y);
      pdf.text(tx.toAlias || "Unknown", 80, y);
      
      y += 10;
      pdf.text(`Type:`, 20, y);
      pdf.text(tx.type || "Transfer", 80, y);
      
      y += 15;
      pdf.line(20, y - 5, 190, y - 5);
      pdf.setFontSize(16);
      pdf.setTextColor(79, 70, 229); // indigo-600
      pdf.text(`Amount:`, 20, y + 5);
      pdf.text(`${tx.amount.toFixed(2)} ${tx.currency}`, 80, y + 5);
      
      y += 30;
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175); // slate-400
      pdf.text("MicroChange Exchange Network", 20, y);
      pdf.text("This is an official record of your transaction.", 20, y + 5);
      
      const fileName = `receipt-${tx.id || Date.now()}.pdf`;
      pdf.save(fileName);
      
    } catch (err) {
      console.error("PDF generation failed", err);
      showNotification("Could not generate PDF. Please take a screenshot.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border border-white/10"
      >
        <div className="p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900">{title}</h3>
          <p className="text-slate-500 text-sm">Official transaction record.</p>
        </div>

        {/* Receipt Area */}
        <div className="px-8 pb-8">
          <div id="receipt-content" ref={receiptRef} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 font-mono text-sm">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Globe className="text-white w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900">MicroChange</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Official Receipt</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-slate-900 font-bold">
                  {tx.timestamp instanceof Date ? tx.timestamp.toLocaleString() : tx.timestamp?.toDate().toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">From:</span>
                <span className="text-slate-900 font-bold">{tx.fromAlias}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">To:</span>
                <span className="text-slate-900 font-bold">{tx.toAlias}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-slate-200">
                <span className="text-slate-400">Amount:</span>
                <span className="text-indigo-600 font-black text-lg">{tx.amount.toFixed(2)} {tx.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Confirmed</span>
              </div>
            </div>

            <div className="pt-6 text-center">
              <p className="text-[9px] text-slate-400 uppercase tracking-tighter">MicroChange Exchange Network</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button 
              onClick={downloadReceipt}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {isDownloading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {isDownloading ? 'Generating...' : 'Download'}
            </button>
            <button 
              onClick={() => {
                const dateStr = tx.timestamp instanceof Date ? tx.timestamp.toLocaleString() : tx.timestamp?.toDate().toLocaleString();
                const text = `MicroChange Receipt\nDate: ${dateStr}\nFrom: ${tx.fromAlias}\nTo: ${tx.toAlias}\nAmount: ${tx.amount.toFixed(2)} ${tx.currency}\nType: ${tx.type}`;
                navigator.clipboard.writeText(text);
                showNotification("Receipt info copied to clipboard!", "success");
              }}
              className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
            >
              <FileText size={18} />
              Copy
            </button>
            <button 
              onClick={onClose}
              className="col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Navbar = ({ 
  user, 
  onSignOut, 
  mode, 
  onToggleMode 
}: { 
  user: UserProfile | null; 
  onSignOut: () => void; 
  mode: 'change' | 'shop';
  onToggleMode: () => void;
}) => (
  <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-6">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500",
          mode === 'change' ? "bg-indigo-600 shadow-indigo-200" : "bg-amber-500 shadow-amber-200"
        )}>
          {mode === 'change' ? <Globe className="text-white w-6 h-6" /> : <ShieldCheck className="text-white w-6 h-6" />}
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-900">
          Micro<span className={cn("transition-colors duration-500", mode === 'change' ? "text-indigo-600" : "text-amber-500")}>
            {mode === 'change' ? 'Change' : 'Shop'}
          </span>
        </span>
      </div>
      <button 
        onClick={onToggleMode}
        className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900"
        title={mode === 'change' ? "Switch to MicroShop" : "Switch to MicroChange"}
      >
        <ArrowLeftRight size={20} className={cn("transition-transform duration-500", mode === 'shop' && "rotate-180")} />
      </button>
    </div>
    <div className="flex items-center gap-4">
      {user && (
        <>
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-semibold text-slate-900">{user.displayName}</span>
            <span className="text-xs text-slate-500 font-mono">{user.alias}</span>
          </div>
          <button 
            onClick={onSignOut}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </>
      )}
    </div>
  </nav>
);

const CurrencyCard = ({ name, amount, nation, active, onClick }: { name: string; amount: number; nation: string; active?: boolean; onClick?: () => void; key?: any }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    onClick={onClick}
    className={cn(
      "p-5 rounded-2xl border transition-all cursor-pointer",
      active 
        ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200" 
        : "bg-white border-slate-200 hover:border-indigo-200 text-slate-900 shadow-sm"
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2 rounded-lg", active ? "bg-white/20" : "bg-indigo-50")}>
        <Coins className={cn("w-5 h-5", active ? "text-white" : "text-indigo-600")} />
      </div>
      <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full", active ? "bg-white/20" : "bg-slate-100")}>
        {name}
      </span>
    </div>
    <div className="space-y-1">
      <h3 className={cn("text-2xl font-bold font-mono")}>{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
      <p className={cn("text-xs opacity-70 font-medium")}>{nation}</p>
    </div>
  </motion.div>
);

const TransactionItem = ({ tx, currentUid, onDownload }: { tx: TransactionRecord; currentUid: string; onDownload?: (tx: TransactionRecord) => void; key?: any }) => {
  const isOutgoing = tx.fromUid === currentUid;
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-full", isOutgoing ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>
          {isOutgoing ? <Send size={18} /> : <History size={18} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {isOutgoing ? `To: ${tx.toAlias}` : `From: ${tx.fromAlias}`}
          </p>
          <p className="text-xs text-slate-500">
            {tx.timestamp?.toDate().toLocaleString()} • {tx.type}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={cn("font-bold font-mono", isOutgoing ? "text-red-600" : "text-emerald-600")}>
            {isOutgoing ? '-' : '+'}{tx.amount.toFixed(2)} {tx.currency}
          </p>
        </div>
        {onDownload && (
          <button 
            onClick={() => onDownload(tx)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Download Receipt"
          >
            <Download size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const AdminPanel = ({ currentRate, onUpdate }: { currentRate: number, onUpdate: (newRate: number) => Promise<void> }) => {
  const [newRate, setNewRate] = useState(currentRate.toString());
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (isNaN(parseFloat(newRate))) return;
    setLoading(true);
    try {
      await onUpdate(parseFloat(newRate));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
      <div className="flex items-center gap-3 text-indigo-600">
        <ShieldCheck size={32} />
        <h3 className="font-black text-2xl">Admin Panel</h3>
      </div>
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <p className="text-amber-800 text-sm font-medium">Authorized for: <span className="font-bold">mainosalvi@gmail.com</span></p>
        <p className="text-amber-700 text-xs mt-1">You have permission to modify the UnitedLand King exchange rate.</p>
      </div>
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">UnitedLand King Rate (Current: {currentRate})</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="number" 
              step="0.01"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            {loading ? "Updating..." : "Update Rate"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReserveCardProps {
  reserve: Reserve;
  onDeposit: (id: string) => void;
  onWithdraw: (id: string) => void;
  onDelete: (id: string) => void;
}

const ReserveCard: React.FC<ReserveCardProps> = ({ reserve, onDeposit, onWithdraw, onDelete }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-6 relative group"
    >
      <button 
        onClick={() => onDelete(reserve.id)}
        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all md:opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={18} />
      </button>
      <div className="flex justify-between items-start">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <ShieldCheck size={24} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 rounded-full text-slate-500">
          {reserve.currency}
        </span>
      </div>
      <div>
        <h3 className="font-bold text-slate-900 text-lg">{reserve.name}</h3>
        <p className="text-3xl font-black font-mono text-indigo-600 mt-1">
          {reserve.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onDeposit(reserve.id)}
          className="flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
        >
          <Send size={14} />
          Deposit
        </button>
        <button 
          onClick={() => onWithdraw(reserve.id)}
          className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all"
        >
          <Download size={14} />
          Withdraw
        </button>
      </div>
    </motion.div>
  );
};

const ReserveActionModal = ({ 
  isOpen, 
  onClose, 
  reserve, 
  type, 
  onConfirm,
  currencies
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  reserve: Reserve | null; 
  type: 'deposit' | 'withdraw' | 'create'; 
  onConfirm: (amountOrName: string, currency?: CurrencyKey) => Promise<void>;
  currencies: any;
}) => {
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState<CurrencyKey>('CAURA');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(value, currency);
      onClose();
      setValue('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {type === 'create' ? 'Create Reserve' : type === 'deposit' ? 'Deposit' : 'Withdraw'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          {type === 'create' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reserve Name</label>
                <input 
                  type="text" 
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. My Savings"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Currency</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyKey)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                >
                  {(Object.keys(currencies) as CurrencyKey[]).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount ({reserve?.currency})</label>
              <input 
                type="number" 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          )}
          <button 
            onClick={handleConfirm}
            disabled={loading || !value}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  reserve, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  reserve: Reserve | null; 
  onConfirm: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !reserve) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 space-y-6"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl mx-auto flex items-center justify-center">
            <Trash2 size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Delete Reserve?</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-slate-900">"{reserve.name}"</span>? 
            {reserve.balance > 0 && (
              <> Any remaining funds (<span className="font-bold text-indigo-600">{reserve.balance} {reserve.currency}</span>) will be returned to your wallet.</>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-lg hover:bg-red-600 transition-all shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Trash2 size={20} />}
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
          <button 
            onClick={onClose}
            disabled={loading}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProductCard: React.FC<{ 
  product: Product; 
  onBuy: (p: Product) => void; 
  isOwner: boolean;
}> = ({ 
  product, 
  onBuy, 
  isOwner 
}) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col"
  >
    <div className="flex justify-between items-start">
      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
        <Globe size={24} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 rounded-full text-slate-500">
        {product.currency}
      </span>
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-slate-900 text-lg leading-tight">{product.name}</h3>
      <p className="text-slate-500 text-sm mt-1 line-clamp-2">{product.description}</p>
      <div className="mt-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Price</p>
        <p className="text-2xl font-black font-mono text-amber-500">
          {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Seller</span>
        <span className="text-xs font-bold text-slate-700">{product.sellerAlias}</span>
      </div>
      {!isOwner && (
        <button 
          onClick={() => onBuy(product)}
          className="px-6 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
        >
          Buy Now
        </button>
      )}
      {isOwner && (
        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest">
          Your Item
        </span>
      )}
    </div>
  </motion.div>
);

const ProductModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  currencies
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (name: string, desc: string, price: number, curr: CurrencyKey) => Promise<void>;
  currencies: any;
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [curr, setCurr] = useState<CurrencyKey>('CAURA');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!name || !price) return;
    setLoading(true);
    try {
      await onConfirm(name, desc, parseFloat(price), curr);
      onClose();
      setName('');
      setDesc('');
      setPrice('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-amber-50/30">
          <div className="flex items-center gap-3 text-amber-600">
            <Globe size={24} />
            <h2 className="text-xl font-black tracking-tight uppercase">List New Product</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">The Golden Rule</p>
            <p className="text-xs text-amber-900 italic font-medium">
              "Everything sold in MicroShop ceases to exist outside the micronational ecosystem."
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What are you selling?"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
            <textarea 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe your product..."
              rows={3}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Price</label>
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Currency</label>
              <select 
                value={curr}
                onChange={(e) => setCurr(e.target.value as CurrencyKey)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold appearance-none"
              >
                {Object.keys(currencies).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <button 
            onClick={handleConfirm}
            disabled={loading || !name || !price}
            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold text-lg hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            {loading ? 'Listing...' : 'List Product'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PurchaseModal = ({ 
  isOpen, 
  onClose, 
  product, 
  onConfirm,
  balances,
  currencies
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  product: Product | null; 
  onConfirm: (curr: CurrencyKey) => Promise<void>;
  balances: Record<string, number>;
  currencies: any;
}) => {
  const [selectedCurr, setSelectedCurr] = useState<CurrencyKey>('CAURA');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !product) return null;

  const productRate = currencies[product.currency].rate;
  const paymentRate = currencies[selectedCurr].rate;
  const finalPrice = (product.price * productRate) / paymentRate;
  const hasBalance = (balances[selectedCurr] || 0) >= finalPrice;

  const handleConfirm = async () => {
    if (!hasBalance) return;
    setLoading(true);
    try {
      await onConfirm(selectedCurr);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-amber-50/30">
          <div className="flex items-center gap-3 text-amber-600">
            <Coins size={24} />
            <h2 className="text-xl font-black tracking-tight uppercase">Confirm Purchase</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2">
            <h3 className="font-bold text-slate-900">{product.name}</h3>
            <p className="text-sm text-slate-500">{product.description}</p>
            <div className="pt-4 flex justify-between items-end">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Original Price</p>
                <p className="text-lg font-bold text-slate-900">{product.price} {product.currency}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Seller</p>
                <p className="text-sm font-bold text-slate-600">{product.sellerAlias}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Pay With</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(currencies).map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCurr(c as CurrencyKey)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold transition-all",
                      selectedCurr === c 
                        ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100" 
                        : "bg-white border-slate-100 text-slate-600 hover:border-amber-200"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Total to Pay</p>
                <p className="text-2xl font-black font-mono text-amber-700">
                  {finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedCurr}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Your Balance</p>
                <p className={cn("text-sm font-bold", hasBalance ? "text-emerald-600" : "text-red-500")}>
                  {(balances[selectedCurr] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedCurr}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleConfirm}
            disabled={loading || !hasBalance}
            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold text-lg hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            {loading ? 'Processing...' : 'Confirm & Pay'}
          </button>
          {!hasBalance && (
            <p className="text-center text-xs text-red-500 font-bold">Insufficient balance in {selectedCurr}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const TermsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-indigo-600">
            <FileText size={24} />
            <h2 className="text-xl font-black tracking-tight uppercase">Terms & Conditions - MicroShop</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto space-y-6 text-slate-600 leading-relaxed">
          <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl space-y-3">
            <h3 className="font-black text-amber-900 uppercase text-xs tracking-widest flex items-center gap-2">
              <ShieldCheck size={16} />
              The Golden Rule
            </h3>
            <p className="text-amber-900 font-medium italic">
              "As long as you can say this phrase with total honesty, you're fine: 'Everything sold in MicroShop ceases to exist outside the micronational ecosystem.'"
            </p>
          </div>

          <div className="space-y-4">
            <p className="font-bold text-slate-900">Last update: 04/05/2026</p>
            <p>MicroShop is the virtual store of the MicroChange ecosystem, intended exclusively for the exchange of micronational virtual goods and services using virtual credits with no real monetary value.</p>
            <p>By posting a product or service on MicroShop, the user accepts the following terms:</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest">1. Nature of MicroShop</h3>
            <p>MicroShop operates within the MicroChange ecosystem as an exchange environment for fictional, symbolic, and digital elements, similar to internal stores in video games like Fortnite.</p>
            <p>The credits used: Do not constitute money, Have no real monetary value, Are not transferable to real currencies, Do not represent financial assets.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest">2. What can be posted</h3>
            <p>Only goods and services that exist solely within the micronational ecosystem, are fictional, symbolic, or digital, have no physical existence, and cannot be used outside of MicroChange/MicroShop are allowed.</p>
            <p>Examples: Fictional micronational lands, Symbolic titles and ranks, Internal services, Digital benefits, Internal advertising.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest">3. What is strictly prohibited</h3>
            <p>It is forbidden to offer: Physical products (t-shirts, mugs, shipping, etc.), Real-world services (design, programming, hosting, etc.), Real external domains or services, Gift cards or vouchers, Any physical good or promise of real monetary value.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest">4. Prohibition of real equivalence</h3>
            <p>References in dollars or other currencies are for illustrative purposes only to understand the internal scale of virtual credits and do not represent real monetary value.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest">5. External exchanges</h3>
            <p>MicroShop does not promote or allow the exchange of virtual credits for real-world goods or services. Any external agreement is private and outside the platform.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest">6. Publisher responsibility</h3>
            <p>The publisher declares that their post is 100% virtual and symbolic, and accepts immediate removal if it violates these rules.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-widest">7. Moderation</h3>
            <p>MicroShop reserves the right to remove posts and suspend users who attempt to use the platform as a real means of payment.</p>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            I Understand
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallet' | 'transfer' | 'exchange' | 'history' | 'admin' | 'reserves'>('wallet');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyKey>('CAURA');
  const [dynamicCurrencies, setDynamicCurrencies] = useState<Record<CurrencyKey, { name: string; rate: number; nation: string }>>(CURRENCIES);

  // Transfer State
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCurrency, setTransferCurrency] = useState<CurrencyKey>('CAURA');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');

  // Exchange State
  const [exchangeFrom, setExchangeFrom] = useState<CurrencyKey>('CAURA');
  const [exchangeTo, setExchangeTo] = useState<CurrencyKey>('FARISTEL');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [reserveModal, setReserveModal] = useState<{ isOpen: boolean; type: 'create' | 'deposit' | 'withdraw'; reserve: Reserve | null }>({
    isOpen: false,
    type: 'create',
    reserve: null
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; reserve: Reserve | null }>({
    isOpen: false,
    reserve: null
  });
  const [lastTransfer, setLastTransfer] = useState<any>(null);
  const [mode, setMode] = useState<'change' | 'shop'>('change');
  const [products, setProducts] = useState<Product[]>([]);
  const [productModal, setProductModal] = useState<{ isOpen: boolean; product: Product | null }>({
    isOpen: false,
    product: null
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'currencies'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setDynamicCurrencies(prev => ({
          ...prev,
          UNITED_LAND_KING: {
            ...prev.UNITED_LAND_KING,
            rate: data.UNITED_LAND_KING_rate ?? prev.UNITED_LAND_KING.rate
          }
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/currencies');
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Enforce one account per browser
        const storedUid = localStorage.getItem('mcro_assigned_uid');
        if (storedUid && storedUid !== u.uid) {
          await signOut(auth);
          showNotification("This device is linked to another account.", "error");
          setLoading(false);
          return;
        }

        setUser(u);
        try {
          const profileDoc = await getDoc(doc(db, 'users', u.uid));
          if (profileDoc.exists()) {
            // If profile exists, ensure this browser is linked to this UID
            if (!storedUid) {
              localStorage.setItem('mcro_assigned_uid', u.uid);
            }
            setProfile(profileDoc.data() as UserProfile);
            setShowSetup(false);
          } else {
            setShowSetup(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'transactions'),
      where('fromUid', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const q2 = query(
      collection(db, 'transactions'),
      where('toUid', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub1 = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRecord));
      setTransactions(prev => {
        const combined = [...txs, ...prev.filter(p => p.fromUid !== profile.uid)];
        return combined.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()).slice(0, 20);
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRecord));
      setTransactions(prev => {
        const combined = [...txs, ...prev.filter(p => p.toUid !== profile.uid)];
        return combined.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()).slice(0, 20);
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    const unsubProfile = onSnapshot(doc(db, 'users', profile.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setProfile(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${profile.uid}`);
    });

    return () => { unsub1(); unsub2(); unsubProfile(); };
  }, [profile?.uid]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'reserves'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const res = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reserve));
      setReserves(res);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/reserves`);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prod = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prod);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    return () => unsubscribe();
  }, [user]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in error", error);
    }
  };

  const handleSignOut = () => signOut(auth);

  const generateAlias = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'MCRO';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const setupProfile = async () => {
    if (!user) return;
    const alias = generateAlias();
    
    // Initialize all currencies to 0, then set the preferred one
    const initialBalances: Record<string, number> = {};
    (Object.keys(dynamicCurrencies) as CurrencyKey[]).forEach(key => {
      initialBalances[key] = 0;
    });

    // Give $25 USD worth of the preferred currency
    const initialAmount = 25 / dynamicCurrencies[preferredCurrency].rate;
    initialBalances[preferredCurrency] = initialAmount;

    const initialProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'User',
      alias,
      balances: initialBalances as Record<CurrencyKey, number>,
      preferredCurrency,
      createdAt: Timestamp.now()
    };

    try {
      await runTransaction(db, async (transaction) => {
        const aliasRef = doc(db, 'aliases', alias);
        const userRef = doc(db, 'users', user.uid);
        transaction.set(aliasRef, { uid: user.uid });
        transaction.set(userRef, initialProfile);
      });
      
      // Link this browser to the new account
      localStorage.setItem('mcro_assigned_uid', user.uid);
      
      setProfile(initialProfile);
      setShowSetup(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !transferAmount || !transferTarget) return;
    setTransferLoading(true);
    setTransferError('');

    try {
      const amount = parseFloat(transferAmount);
      if (amount <= 0 || profile.balances[transferCurrency] < amount) {
        throw new Error("Insufficient balance or invalid amount");
      }

      // Find recipient by alias
      const aliasRef = doc(db, 'aliases', transferTarget.toUpperCase());
      const aliasSnap = await getDoc(aliasRef);
      
      if (!aliasSnap.exists()) {
        throw new Error("Recipient alias not found");
      }

      const recipientUid = aliasSnap.data().uid;
      if (recipientUid === profile.uid) throw new Error("Cannot transfer to yourself");

      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, 'users', profile.uid);
        const recipientRef = doc(db, 'users', recipientUid);
        const txRef = doc(collection(db, 'transactions'));

        const senderDoc = await transaction.get(senderRef);
        const recipientDoc = await transaction.get(recipientRef);

        if (!senderDoc.exists() || !recipientDoc.exists()) throw new Error("User data missing");

        const senderData = senderDoc.data() as UserProfile;
        const recipientData = recipientDoc.data() as UserProfile;

        if (senderData.balances[transferCurrency] < amount) throw new Error("Insufficient balance");

        transaction.update(senderRef, {
          [`balances.${transferCurrency}`]: senderData.balances[transferCurrency] - amount
        });

        transaction.update(recipientRef, {
          [`balances.${transferCurrency}`]: recipientData.balances[transferCurrency] + amount
        });

        transaction.set(txRef, {
          fromUid: profile.uid,
          toUid: recipientUid,
          fromAlias: profile.alias,
          toAlias: transferTarget.toUpperCase(),
          amount,
          currency: transferCurrency,
          timestamp: serverTimestamp(),
          type: 'transfer'
        });
      });

      setLastTransfer({
        fromAlias: profile.alias,
        toAlias: transferTarget.toUpperCase(),
        amount,
        currency: transferCurrency,
        timestamp: new Date(),
        type: 'transfer'
      });

      setTransferAmount('');
      setTransferTarget('');
    } catch (error: any) {
      setTransferError(error.message);
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !exchangeAmount) return;
    setExchangeLoading(true);

    try {
      const amount = parseFloat(exchangeAmount);
      const currentFromBalance = profile.balances[exchangeFrom] || 0;
      if (amount <= 0 || currentFromBalance < amount) {
        throw new Error("Insufficient balance");
      }

      const fromRate = dynamicCurrencies[exchangeFrom].rate;
      const toRate = dynamicCurrencies[exchangeTo].rate;
      const resultAmount = (amount * fromRate) / toRate;

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', profile.uid);
        const txRef = doc(collection(db, 'transactions'));
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data() as UserProfile;

        const fromBalance = userData.balances[exchangeFrom] || 0;
        const toBalance = userData.balances[exchangeTo] || 0;

        transaction.update(userRef, {
          [`balances.${exchangeFrom}`]: fromBalance - amount,
          [`balances.${exchangeTo}`]: toBalance + resultAmount
        });

        transaction.set(txRef, {
          fromUid: profile.uid,
          toUid: profile.uid,
          fromAlias: profile.alias,
          toAlias: profile.alias,
          amount: resultAmount,
          currency: exchangeTo,
          timestamp: serverTimestamp(),
          type: 'exchange'
        });
      });

      setExchangeAmount('');
      setLastTransfer({
        fromAlias: profile.alias,
        toAlias: profile.alias,
        amount: resultAmount,
        currency: exchangeTo,
        timestamp: new Date(),
        type: 'exchange'
      });
      setActiveTab('wallet');
    } catch (error: any) {
      showNotification(error.message, "error");
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    } finally {
      setExchangeLoading(false);
    }
  };

  const createReserve = async (name: string, currency: CurrencyKey) => {
    if (!user) return;
    try {
      const reserveRef = doc(collection(db, 'users', user.uid, 'reserves'));
      await setDoc(reserveRef, {
        id: reserveRef.id,
        name,
        currency,
        balance: 0,
        createdAt: serverTimestamp()
      });
      showNotification("Reserve created successfully!", "success");
    } catch (error: any) {
      showNotification("Failed to create reserve: " + error.message, "error");
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/reserves`);
    }
  };

  const depositToReserve = async (reserveId: string, amount: number) => {
    if (!user || !profile) return;
    const reserve = reserves.find(r => r.id === reserveId);
    if (!reserve) return;
    if ((profile.balances[reserve.currency] || 0) < amount) {
      showNotification("Insufficient balance", "error");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const reserveRef = doc(db, 'users', user.uid, 'reserves', reserveId);
        const txRef = doc(collection(db, 'transactions'));

        const userDoc = await transaction.get(userRef);
        const reserveDoc = await transaction.get(reserveRef);

        if (!userDoc.exists() || !reserveDoc.exists()) throw new Error("Document not found");

        const userData = userDoc.data() as UserProfile;
        const reserveData = reserveDoc.data() as Reserve;

        if ((userData.balances[reserve.currency] || 0) < amount) throw new Error("Insufficient balance");

        transaction.update(userRef, {
          [`balances.${reserve.currency}`]: userData.balances[reserve.currency] - amount
        });

        transaction.update(reserveRef, {
          balance: reserveData.balance + amount
        });

        transaction.set(txRef, {
          fromUid: user.uid,
          toUid: user.uid,
          fromAlias: profile.alias,
          toAlias: profile.alias,
          amount,
          currency: reserve.currency,
          timestamp: serverTimestamp(),
          type: 'reserve_deposit',
          reserveId,
          reserveName: reserve.name
        });
      });
      showNotification(`Deposited ${amount} ${reserve.currency} to ${reserve.name}`, "success");
    } catch (error: any) {
      showNotification("Deposit failed: " + error.message, "error");
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/reserves/${reserveId}`);
    }
  };

  const withdrawFromReserve = async (reserveId: string, amount: number) => {
    if (!user || !profile) return;
    const reserve = reserves.find(r => r.id === reserveId);
    if (!reserve) return;
    if (reserve.balance < amount) {
      showNotification("Insufficient reserve balance", "error");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const reserveRef = doc(db, 'users', user.uid, 'reserves', reserveId);
        const txRef = doc(collection(db, 'transactions'));

        const userDoc = await transaction.get(userRef);
        const reserveDoc = await transaction.get(reserveRef);

        if (!userDoc.exists() || !reserveDoc.exists()) throw new Error("Document not found");

        const userData = userDoc.data() as UserProfile;
        const reserveData = reserveDoc.data() as Reserve;

        if (reserveData.balance < amount) throw new Error("Insufficient reserve balance");

        transaction.update(userRef, {
          [`balances.${reserve.currency}`]: (userData.balances[reserve.currency] || 0) + amount
        });

        transaction.update(reserveRef, {
          balance: reserveData.balance - amount
        });

        transaction.set(txRef, {
          fromUid: user.uid,
          toUid: user.uid,
          fromAlias: profile.alias,
          toAlias: profile.alias,
          amount,
          currency: reserve.currency,
          timestamp: serverTimestamp(),
          type: 'reserve_withdraw',
          reserveId,
          reserveName: reserve.name
        });
      });
      showNotification(`Withdrew ${amount} ${reserve.currency} from ${reserve.name}`, "success");
    } catch (error: any) {
      showNotification("Withdrawal failed: " + error.message, "error");
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/reserves/${reserveId}`);
    }
  };

  const deleteReserve = async (reserveId: string) => {
    if (!user || !profile) {
      console.error("Delete failed: No user or profile");
      return;
    }
    const reserve = reserves.find(r => r.id === reserveId);
    if (!reserve) {
      console.error("Delete failed: Reserve not found in state", reserveId);
      return;
    }

    console.log("Starting reserve deletion for:", reserveId);

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const reserveRef = doc(db, 'users', user.uid, 'reserves', reserveId);
        
        const userDoc = await transaction.get(userRef);
        const reserveDoc = await transaction.get(reserveRef);

        if (!userDoc.exists()) throw new Error("User profile not found");
        if (!reserveDoc.exists()) throw new Error("Reserve document not found");

        const userData = userDoc.data() as UserProfile;
        const reserveData = reserveDoc.data() as Reserve;

        console.log("Reserve data found:", reserveData);

        // If there's a balance, return it to the user
        if (reserveData.balance > 0) {
          console.log(`Returning balance: ${reserveData.balance} ${reserveData.currency}`);
          const currentBalance = userData.balances[reserveData.currency] || 0;
          transaction.update(userRef, {
            [`balances.${reserveData.currency}`]: currentBalance + reserveData.balance
          });

          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            fromUid: user.uid,
            toUid: user.uid,
            fromAlias: profile.alias,
            toAlias: profile.alias,
            amount: reserveData.balance,
            currency: reserveData.currency,
            timestamp: serverTimestamp(),
            type: 'reserve_withdraw',
            reserveId,
            reserveName: reserveData.name + " (Closed)"
          });
        }

        transaction.delete(reserveRef);
      });
      showNotification(`Reserve "${reserve.name}" deleted successfully.`, "success");
      console.log("Reserve deleted successfully");
    } catch (error: any) {
      console.error("Delete transaction failed:", error);
      showNotification("Failed to delete reserve: " + error.message, "error");
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/reserves/${reserveId}`);
    }
  };

  const createProduct = async (name: string, description: string, price: number, currency: CurrencyKey) => {
    if (!user || !profile) return;
    try {
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, {
        id: productRef.id,
        name,
        description,
        price,
        currency,
        sellerUid: user.uid,
        sellerAlias: profile.alias,
        createdAt: serverTimestamp()
      });
      showNotification("Product listed successfully!", "success");
    } catch (error: any) {
      showNotification("Failed to list product: " + error.message, "error");
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const buyProduct = async (product: Product, paymentCurrency: CurrencyKey) => {
    if (!user || !profile) return;
    
    try {
      const productRate = dynamicCurrencies[product.currency].rate;
      const paymentRate = dynamicCurrencies[paymentCurrency].rate;
      const finalPrice = (product.price * productRate) / paymentRate;

      if ((profile.balances[paymentCurrency] || 0) < finalPrice) {
        showNotification("Insufficient balance in selected currency", "error");
        return;
      }

      await runTransaction(db, async (transaction) => {
        const buyerRef = doc(db, 'users', user.uid);
        const sellerRef = doc(db, 'users', product.sellerUid);
        const txRef = doc(collection(db, 'transactions'));

        const buyerDoc = await transaction.get(buyerRef);
        const sellerDoc = await transaction.get(sellerRef);

        if (!buyerDoc.exists() || !sellerDoc.exists()) throw new Error("User not found");

        const buyerData = buyerDoc.data() as UserProfile;
        const sellerData = sellerDoc.data() as UserProfile;

        if ((buyerData.balances[paymentCurrency] || 0) < finalPrice) throw new Error("Insufficient balance");

        // Update buyer balance
        transaction.update(buyerRef, {
          [`balances.${paymentCurrency}`]: (buyerData.balances[paymentCurrency] || 0) - finalPrice
        });

        // Update seller balance (seller receives in product's original currency)
        transaction.update(sellerRef, {
          [`balances.${product.currency}`]: (sellerData.balances[product.currency] || 0) + product.price
        });

        transaction.set(txRef, {
          fromUid: user.uid,
          toUid: product.sellerUid,
          fromAlias: profile.alias,
          toAlias: product.sellerAlias,
          amount: finalPrice,
          currency: paymentCurrency,
          timestamp: serverTimestamp(),
          type: 'purchase',
          productId: product.id,
          productName: product.name
        });
      });

      showNotification(`Successfully purchased ${product.name}!`, "success");
    } catch (error: any) {
      showNotification("Purchase failed: " + error.message, "error");
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  const updateUnitedLandRate = async (newRate: number) => {
    try {
      await setDoc(doc(db, 'settings', 'currencies'), {
        UNITED_LAND_KING_rate: newRate
      }, { merge: true });
      showNotification("UnitedLand rate updated successfully!", "success");
    } catch (error: any) {
      showNotification("Failed to update rate: " + error.message, "error");
      handleFirestoreError(error, OperationType.WRITE, 'settings/currencies');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Initializing Auralis Network...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
        <Navbar 
          user={null} 
          onSignOut={() => {}} 
          mode={mode} 
          onToggleMode={() => setMode(prev => prev === 'change' ? 'shop' : 'change')} 
        />
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold tracking-wide uppercase"
            >
              <ShieldCheck size={16} />
              Secure Token Exchange
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-tight"
            >
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">MicroChange</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 max-w-2xl leading-relaxed"
            >
              Exchange {(() => {
                const names = (Object.keys(dynamicCurrencies) as CurrencyKey[]).map(k => dynamicCurrencies[k].name);
                if (names.length <= 1) return names[0];
                const last = names.pop();
                return names.join(', ') + ' and ' + last;
              })()} tokens instantly.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button 
                onClick={handleSignIn}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-200"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Get Started with Google
                <div className="absolute inset-0 rounded-2xl border-2 border-slate-900 group-hover:scale-110 opacity-0 group-hover:opacity-10 transition-all" />
              </button>
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-1 relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 blur-3xl rounded-full" />
            <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Rates</span>
              </div>
              <div className="space-y-4">
                {(Object.keys(dynamicCurrencies) as CurrencyKey[]).map((key) => {
                  const c = dynamicCurrencies[key];
                  return (
                    <div key={c.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <TrendingUp size={20} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.name} = Value reference: {c.rate.toFixed(2)} USD</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
        <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 space-y-8">
          <div className="text-slate-400 text-xs leading-relaxed text-center max-w-4xl mx-auto italic space-y-4">
            <p>
              The dollar equivalencies shown on this platform are for illustrative reference only to understand the internal scale of virtual credits. They do not represent real monetary value, nor do they constitute money, financial assets, or a means of payment. MicroShop exclusively offers virtual goods and services within the micronational ecosystem. No available product has physical existence or value in the real world.
            </p>
            <p className="text-slate-500 font-bold">
              The Golden Rule: "Everything sold in MicroShop ceases to exist outside the micronational ecosystem."
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400 text-sm">
            <p>© 2026 MicroChange Exchange Network. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button onClick={() => setShowTerms(true)} className="hover:text-indigo-600 transition-colors font-medium">Terms & Conditions</button>
              <button onClick={() => setShowTerms(true)} className="hover:text-indigo-600 transition-colors font-medium">Privacy Policy</button>
            </div>
          </div>
        </footer>
        <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      </div>
    );
  }

  if (showSetup) {
    const [accepted, setAccepted] = useState(false);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900">Welcome to MicroChange</h2>
            <p className="text-slate-500">Select your initial currency to begin your journey.</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(dynamicCurrencies) as CurrencyKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setPreferredCurrency(key)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                  preferredCurrency === key 
                    ? "border-indigo-600 bg-indigo-50" 
                    : "border-slate-100 hover:border-indigo-200"
                )}
              >
                <div>
                  <p className="font-bold text-slate-900">{dynamicCurrencies[key].name}</p>
                  <p className="text-xs text-slate-500">{dynamicCurrencies[key].nation}</p>
                </div>
                {preferredCurrency === key && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input 
                type="checkbox" 
                id="terms" 
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed">
                I accept the <button onClick={() => setShowTerms(true)} className="text-indigo-600 font-bold hover:underline">Terms & Conditions</button> and understand that all assets are virtual and have no real-world value.
              </label>
            </div>

            <button 
              onClick={setupProfile}
              disabled={!accepted}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create My Account
            </button>
          </div>
        </motion.div>
        <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen pb-24 md:pb-0 md:pt-20 transition-colors duration-500",
      mode === 'change' ? "bg-slate-50" : "bg-amber-50/30"
    )}>
      <Navbar 
        user={profile} 
        onSignOut={handleSignOut} 
        mode={mode} 
        onToggleMode={() => setMode(prev => prev === 'change' ? 'shop' : 'change')} 
      />
      
      {/* Notification Overlay */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
          >
            <div className={cn(
              "p-4 rounded-2xl shadow-2xl border flex items-center gap-3",
              notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
              notification.type === 'error' ? "bg-red-50 border-red-100 text-red-800" :
              "bg-indigo-50 border-indigo-100 text-indigo-800"
            )}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : notification.type === 'error' ? <X size={20} /> : <Globe size={20} />}
              <p className="text-sm font-bold">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <AnimatePresence mode="wait">
          {mode === 'change' ? (
            <motion.div 
              key="microchange"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              
              {/* Sidebar / Navigation */}
          <div className="lg:col-span-3 space-y-4">
            <div className="hidden lg:block space-y-2">
              {[
                { id: 'wallet', label: 'Wallet', icon: Wallet },
                { id: 'transfer', label: 'Transfer', icon: Send },
                { id: 'exchange', label: 'Exchange', icon: ArrowLeftRight },
                { id: 'reserves', label: 'Reserves', icon: ShieldCheck },
                { id: 'history', label: 'History', icon: History },
                ...(user?.email === 'mainosalvi@gmail.com' ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }] : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all",
                    activeTab === item.id 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "text-slate-600 hover:bg-white hover:text-indigo-600"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowTerms(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-indigo-600 transition-all text-xs font-bold uppercase tracking-widest"
                >
                  <FileText size={18} />
                  Terms & Privacy
                </button>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center">
                  <UserIcon className="text-slate-400 w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900">{profile?.displayName}</h3>
                <p className="text-xs font-mono text-indigo-600 font-bold bg-indigo-50 py-1 px-2 rounded-full inline-block">
                  {profile?.alias}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-center">
                  <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <QRCode value={profile?.alias || ''} size={120} />
                  </div>
                </div>
                <p className="text-[10px] text-center mt-4 text-slate-400 font-bold uppercase tracking-widest">Your Payment QR</p>
                
                {user?.email === 'mainosalvi@gmail.com' && (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={cn(
                      "w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-lg",
                      activeTab === 'admin' 
                        ? "bg-indigo-600 text-white shadow-indigo-100" 
                        : "bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600"
                    )}
                  >
                    <ShieldCheck size={18} />
                    Admin Panel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {activeTab === 'wallet' && (
                <motion.div 
                  key="wallet"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {user?.email === 'mainosalvi@gmail.com' && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="text-amber-600" size={24} />
                        <div>
                          <p className="text-amber-900 font-bold text-sm">Admin Access</p>
                          <p className="text-amber-700 text-xs">Manage currency rates</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('admin')}
                        className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-100"
                      >
                        Open Panel
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold text-slate-900">Your Assets</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setActiveTab('transfer')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors">
                        <Send size={20} />
                      </button>
                      <button onClick={() => setActiveTab('exchange')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors">
                        <ArrowLeftRight size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.keys(dynamicCurrencies) as CurrencyKey[]).map((key) => (
                      <CurrencyCard 
                        key={key}
                        name={dynamicCurrencies[key].name}
                        nation={dynamicCurrencies[key].nation}
                        amount={profile?.balances[key] || 0}
                        active={profile?.preferredCurrency === key}
                      />
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                    <div className="space-y-3">
                      {transactions.length > 0 ? (
                        transactions.map(tx => (
                          <TransactionItem 
                            key={tx.id} 
                            tx={tx} 
                            currentUid={profile?.uid || ''} 
                            onDownload={(t) => setLastTransfer(t)}
                          />
                        ))
                      ) : (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                          <p className="text-slate-400 font-medium">No transactions yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'transfer' && (
                <motion.div 
                  key="transfer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-xl mx-auto space-y-8"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-extrabold text-slate-900">Send Tokens</h2>
                    <p className="text-slate-500">Transfer assets instantly using a recipient's alias.</p>
                  </div>

                  <form onSubmit={handleTransfer} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recipient Alias</label>
                      </div>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                          type="text"
                          placeholder="MCROXXXXXXXXX"
                          value={transferTarget}
                          onChange={(e) => setTransferTarget(e.target.value.toUpperCase())}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-mono font-bold text-slate-900 placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Currency</label>
                        <select 
                          value={transferCurrency}
                          onChange={(e) => setTransferCurrency(e.target.value as CurrencyKey)}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900"
                        >
                          {(Object.keys(dynamicCurrencies) as CurrencyKey[]).map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Amount</label>
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-mono font-bold text-slate-900 placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>

                    {transferError && (
                      <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{transferError}</p>
                    )}

                    <button 
                      type="submit"
                      disabled={transferLoading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      {transferLoading ? 'Processing...' : 'Send Tokens'}
                    </button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'exchange' && (
                <motion.div 
                  key="exchange"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-xl mx-auto space-y-8"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-extrabold text-slate-900">Token Swap</h2>
                    <p className="text-slate-500">Exchange between different national tokens instantly.</p>
                  </div>

                  <form onSubmit={handleExchange} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">From</label>
                        <div className="flex items-center justify-between">
                          <select 
                            value={exchangeFrom}
                            onChange={(e) => setExchangeFrom(e.target.value as CurrencyKey)}
                            className="bg-transparent font-bold text-xl outline-none text-slate-900"
                          >
                            {(Object.keys(dynamicCurrencies) as CurrencyKey[]).map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                          <input 
                            type="number"
                            placeholder="0.00"
                            value={exchangeAmount}
                            onChange={(e) => setExchangeAmount(e.target.value)}
                            className="bg-transparent text-right font-mono font-bold text-xl outline-none w-1/2 text-slate-900 placeholder:text-slate-400"
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Balance: {profile?.balances[exchangeFrom].toFixed(2)}</p>
                      </div>

                      <div className="flex justify-center -my-6 relative z-10">
                        <button 
                          type="button"
                          onClick={() => {
                            const temp = exchangeFrom;
                            setExchangeFrom(exchangeTo);
                            setExchangeTo(temp);
                          }}
                          className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:rotate-180 transition-transform duration-500"
                        >
                          <ArrowLeftRight size={20} />
                        </button>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">To (Estimated)</label>
                        <div className="flex items-center justify-between">
                          <select 
                            value={exchangeTo}
                            onChange={(e) => setExchangeTo(e.target.value as CurrencyKey)}
                            className="bg-transparent font-bold text-xl outline-none text-slate-900"
                          >
                            {(Object.keys(dynamicCurrencies) as CurrencyKey[]).map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                          <p className="font-mono font-bold text-xl text-indigo-600">
                            {exchangeAmount ? ((parseFloat(exchangeAmount) * dynamicCurrencies[exchangeFrom].rate) / dynamicCurrencies[exchangeTo].rate).toFixed(2) : '0.00'}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Rate: 1 {exchangeFrom} = {(dynamicCurrencies[exchangeFrom].rate / dynamicCurrencies[exchangeTo].rate).toFixed(4)} {exchangeTo}</p>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={exchangeLoading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      {exchangeLoading ? 'Exchanging...' : 'Confirm Exchange'}
                    </button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-extrabold text-slate-900">Transaction History</h2>
                  <div className="space-y-3">
                    {transactions.map(tx => (
                      <TransactionItem 
                        key={tx.id} 
                        tx={tx} 
                        currentUid={profile?.uid || ''} 
                        onDownload={(t) => setLastTransfer(t)}
                      />
                    ))}
                    {transactions.length === 0 && (
                      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400">No transactions found</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'reserves' && (
                <motion.div 
                  key="reserves"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold text-slate-900">Money Reserves</h2>
                    <button 
                      onClick={() => setReserveModal({ isOpen: true, type: 'create', reserve: null })}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      <ShieldCheck size={18} />
                      New Reserve
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reserves.map(reserve => (
                      <ReserveCard 
                        key={reserve.id}
                        reserve={reserve}
                        onDeposit={(id) => setReserveModal({ isOpen: true, type: 'deposit', reserve })}
                        onWithdraw={(id) => setReserveModal({ isOpen: true, type: 'withdraw', reserve })}
                        onDelete={(id) => setDeleteConfirm({ isOpen: true, reserve })}
                      />
                    ))}
                    {reserves.length === 0 && (
                      <div className="col-span-full text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center mb-4">
                          <ShieldCheck className="text-slate-300" size={32} />
                        </div>
                        <h3 className="font-bold text-slate-900">No reserves yet</h3>
                        <p className="text-slate-400 text-sm mt-1">Create a reserve to start saving money securely.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'admin' && user?.email === 'mainosalvi@gmail.com' && (
                <motion.div 
                  key="admin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <AdminPanel 
                    currentRate={dynamicCurrencies.UNITED_LAND_KING.rate} 
                    onUpdate={updateUnitedLandRate} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="microshop"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">MicroShop</h2>
              <p className="text-slate-500 font-medium">Marketplace for the Auralis Network</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={() => setProductModal({ isOpen: true, product: null })}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-xl shadow-amber-100"
              >
                <Coins size={20} />
                Sell Product
              </button>
              <div className="max-w-[250px] text-right space-y-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Legal Notice</p>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    MicroShop exclusively allows the publication of virtual, fictional, and symbolic goods and services within the micronational ecosystem.
                  </p>
                </div>
                <p className="text-[9px] text-amber-600 font-bold italic leading-tight">
                  "Everything sold in MicroShop ceases to exist outside the micronational ecosystem."
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <ProductCard 
                key={product.id}
                product={product}
                isOwner={product.sellerUid === user?.uid}
                onBuy={(p) => setProductModal({ isOpen: true, product: p })}
              />
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-amber-50 rounded-3xl mx-auto flex items-center justify-center mb-6">
                  <Globe className="text-amber-300" size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">The shop is empty</h3>
                <p className="text-slate-400 mt-2 max-w-xs mx-auto">Be the first to list a product and start earning in any currency!</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </main>

  <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 space-y-8">
    <div className="text-slate-400 text-[10px] leading-relaxed text-center max-w-4xl mx-auto italic space-y-4">
      <p>
        The dollar equivalencies shown on this platform are for illustrative reference only to understand the internal scale of virtual credits. They do not represent real monetary value, nor do they constitute money, financial assets, or a means of payment. MicroShop exclusively offers virtual goods and services within the micronational ecosystem. No available product has physical existence or value in the real world.
      </p>
      <p className="text-slate-500 font-bold">
        The Golden Rule: "Everything sold in MicroShop ceases to exist outside the micronational ecosystem."
      </p>
    </div>
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
          <Globe size={16} />
        </div>
        <span className="font-bold tracking-tight">MicroChange & MicroShop</span>
      </div>
      <div className="flex items-center gap-6">
        <button onClick={() => setShowTerms(true)} className="hover:text-indigo-600 transition-colors">Terms & Conditions</button>
        <span>© 2026 Auralis Network</span>
      </div>
    </div>
  </footer>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-50">
        {[
          { id: 'wallet', icon: Wallet },
          { id: 'transfer', icon: Send },
          { id: 'exchange', icon: ArrowLeftRight },
          { id: 'reserves', icon: ShieldCheck },
          { id: 'history', icon: History },
          ...(user?.email === 'mainosalvi@gmail.com' ? [{ id: 'admin', icon: ShieldCheck }] : []),
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "p-3 rounded-xl transition-all",
              activeTab === item.id 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                : "text-slate-400"
            )}
          >
            <item.icon size={24} />
          </button>
        ))}
      </div>

      {lastTransfer && (
        <ReceiptModal 
          tx={lastTransfer}
          onClose={() => {
            setLastTransfer(null);
          }}
          showNotification={showNotification}
          title={lastTransfer.type === 'transfer' ? "Transfer Receipt" : "Exchange Receipt"}
        />
      )}

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />

      <ReserveActionModal 
        isOpen={reserveModal.isOpen}
        type={reserveModal.type}
        reserve={reserveModal.reserve}
        currencies={dynamicCurrencies}
        onClose={() => setReserveModal({ ...reserveModal, isOpen: false })}
        onConfirm={async (val, curr) => {
          if (reserveModal.type === 'create') {
            await createReserve(val, curr!);
          } else if (reserveModal.type === 'deposit') {
            await depositToReserve(reserveModal.reserve!.id, parseFloat(val));
          } else if (reserveModal.type === 'withdraw') {
            await withdrawFromReserve(reserveModal.reserve!.id, parseFloat(val));
          }
        }}
      />

      <DeleteConfirmModal 
        isOpen={deleteConfirm.isOpen}
        reserve={deleteConfirm.reserve}
        onClose={() => setDeleteConfirm({ isOpen: false, reserve: null })}
        onConfirm={async () => {
          if (deleteConfirm.reserve) {
            await deleteReserve(deleteConfirm.reserve.id);
          }
        }}
      />

      <ProductModal 
        isOpen={productModal.isOpen && !productModal.product}
        currencies={dynamicCurrencies}
        onClose={() => setProductModal({ isOpen: false, product: null })}
        onConfirm={createProduct}
      />

      <PurchaseModal 
        isOpen={productModal.isOpen && !!productModal.product}
        product={productModal.product}
        balances={profile?.balances || {}}
        currencies={dynamicCurrencies}
        onClose={() => setProductModal({ isOpen: false, product: null })}
        onConfirm={async (paymentCurr) => {
          if (productModal.product) {
            await buyProduct(productModal.product, paymentCurr);
          }
        }}
      />
    </div>
  );
}
