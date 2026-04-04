import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where, orderBy, limit, getDocs, runTransaction, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider, CURRENCIES, CurrencyKey, UserProfile, TransactionRecord, OperationType, handleFirestoreError } from './firebase';
import { Wallet, ArrowLeftRight, Send, User as UserIcon, LogOut, QrCode, TrendingUp, History, ShieldCheck, Globe, Coins, Camera, X, CheckCircle2, Download, RefreshCw, FileText } from 'lucide-react';
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
      pdf.text("Cultural Republic of Auralis Exchange Network", 20, y);
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
              <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Cultural Republic of Auralis Exchange Network</p>
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

const Navbar = ({ user, onSignOut }: { user: UserProfile | null; onSignOut: () => void }) => (
  <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-6">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
        <Globe className="text-white w-6 h-6" />
      </div>
      <span className="font-bold text-xl tracking-tight text-slate-900">Micro<span className="text-indigo-600">Change</span></span>
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

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallet' | 'transfer' | 'exchange' | 'history' | 'admin'>('wallet');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [showSetup, setShowSetup] = useState(false);
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
  const [lastTransfer, setLastTransfer] = useState<any>(null);
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
        <Navbar user={null} onSignOut={() => {}} />
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
              Exchange CAURA, FARISTEL, SOLARIS, and UNITED LAND KING tokens instantly. 
              The official exchange network for the Cultural Republic of Auralis.
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
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{c.nation}</p>
                        </div>
                      </div>
                      <p className="font-mono font-bold text-indigo-600">${c.rate.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (showSetup) {
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

          <button 
            onClick={setupProfile}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Create My Account
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 md:pt-20 transition-colors duration-300">
      <Navbar user={profile} onSignOut={handleSignOut} />
      
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Navigation */}
          <div className="lg:col-span-3 space-y-4">
            <div className="hidden lg:block space-y-2">
              {[
                { id: 'wallet', label: 'Wallet', icon: Wallet },
                { id: 'transfer', label: 'Transfer', icon: Send },
                { id: 'exchange', label: 'Exchange', icon: ArrowLeftRight },
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
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-50">
        {[
          { id: 'wallet', icon: Wallet },
          { id: 'transfer', icon: Send },
          { id: 'exchange', icon: ArrowLeftRight },
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
    </div>
  );
}
