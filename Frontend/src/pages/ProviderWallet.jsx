import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import { loadRazorpayScript } from '../lib/razorpay';
import { useLanguageStore } from '../store/useLanguageStore';
import { useNavigate } from 'react-router-dom';

export default function ProviderWallet() {
  const { currentUser } = useAuthStore();
  const { t: tr } = useLanguageStore();
  const navigate = useNavigate();
  
  const [wallet, setWallet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await api.get('/wallet');
      if (res.success) {
        setWallet(res.data);
      }
    } catch (err) {
      toast.error('Failed to load wallet details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount < 10) {
      toast.error('Minimum top-up amount is ₹10.');
      return;
    }
    if (amount > 50000) {
      toast.error('Maximum top-up amount is ₹50,000.');
      return;
    }

    setIsProcessing(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Razorpay SDK failed to load.');
        setIsProcessing(false);
        return;
      }

      // 1. Create order
      const orderRes = await api.post('/wallet/topup/create-order', { amount });
      if (!orderRes.success) throw new Error('Failed to create order');

      const { orderId, keyId } = orderRes.data;

      // 2. Open Razorpay modal
      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'Seva Sarthi Wallet',
        description: `Wallet Top-up of ₹${amount}`,
        order_id: orderId,
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          contact: currentUser?.phone || '',
        },
        theme: {
          color: '#0F172A',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.error('Payment cancelled');
          },
        },
        handler: async function (response) {
          try {
            // 3. Verify payment
            const verifyRes = await api.post('/wallet/topup/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: Math.round(amount * 100)
            });

            if (verifyRes.success) {
              toast.success(verifyRes.message);
              setShowTopUpModal(false);
              setTopUpAmount('');
              fetchWallet(); // Refresh wallet data
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || 'Payment verification failed');
          } finally {
            setIsProcessing(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(response.error?.description || 'Payment failed');
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (category) => {
    switch(category) {
      case 'topup': return 'account_balance_wallet';
      case 'online_earning': return 'payments';
      case 'rental_earning': return 'handyman';
      case 'cod_fee': return 'receipt_long';
      case 'payout': return 'account_balance';
      default: return 'swap_horiz';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted pt-24 pb-12 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-surface-muted pb-24 relative">
      <div className="absolute top-0 left-0 w-full h-[320px] bg-brand" style={{ zIndex: 0 }} />
      
      <main className="section-container pt-10 relative z-10 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/provider/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white font-bold text-sm mb-6 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </button>
          <h2 className="text-3xl font-extrabold font-headline text-white tracking-tight">My Wallet</h2>
          <p className="text-slate-300 font-medium mt-1">Manage your balances and transaction history</p>
        </div>

        {/* Balance Card */}
        <div className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-brand/10 text-brand flex items-center justify-center border border-brand/20">
              <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Available Balance</p>
              <h3 className="text-5xl font-extrabold font-headline text-brand tracking-tight">
                ₹{wallet?.balance?.toLocaleString('en-IN') || '0'}
              </h3>
            </div>
          </div>
          <button 
            onClick={() => setShowTopUpModal(true)}
            className="w-full md:w-auto btn-accent !px-8 !py-4 shadow-premium flex items-center justify-center gap-2 text-lg"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Top Up Wallet
          </button>
        </div>

        {/* Top Up Modal */}
        {showTopUpModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface w-full max-w-md rounded-3xl p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => !isProcessing && setShowTopUpModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                disabled={isProcessing}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              
              <h3 className="text-2xl font-extrabold font-headline text-brand mb-2">Top Up Wallet</h3>
              <p className="text-slate-500 text-sm mb-6">Add funds to accept COD bookings seamlessly.</p>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-extrabold text-brand focus:border-brand focus:ring-0 outline-none transition-all"
                    placeholder="Enter amount"
                    min="10"
                    disabled={isProcessing}
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  {[100, 500, 1000].map(amt => (
                    <button 
                      key={amt}
                      onClick={() => setTopUpAmount(amt.toString())}
                      className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm"
                      disabled={isProcessing}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
                <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  Platform fees for Cash on Delivery (COD) bookings will be automatically deducted from this wallet balance.
                </p>
              </div>

              <button 
                onClick={handleTopUp}
                disabled={isProcessing || !topUpAmount || Number(topUpAmount) < 10}
                className="w-full btn-accent !py-4 shadow-premium flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>Proceed to Pay ₹{topUpAmount || '0'}</>
                )}
              </button>
            </motion.div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-slate-200/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <span className="material-symbols-outlined text-[24px]">trending_up</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Online Earnings</p>
              <h4 className="text-2xl font-extrabold text-brand font-headline">₹{wallet?.totalEarned?.toLocaleString('en-IN') || '0'}</h4>
            </div>
          </div>
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-slate-200/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total COD Fees Paid</p>
              <h4 className="text-2xl font-extrabold text-brand font-headline">₹{wallet?.totalPlatformFees?.toLocaleString('en-IN') || '0'}</h4>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60">
          <h3 className="text-xl font-extrabold font-headline text-brand mb-6">Transaction History</h3>
          
          {!wallet?.transactions || wallet.transactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">history</span>
              <p className="text-slate-500 font-bold">No transactions yet.</p>
              <p className="text-sm text-slate-400 mt-1">Your wallet activity will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wallet.transactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                      tx.type === 'credit' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                        : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">{getTransactionIcon(tx.category)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-brand text-sm">{tx.description}</p>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                        {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="uppercase font-bold tracking-wider text-[10px]">{tx.category.replace('_', ' ')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold text-lg ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Bal: ₹{tx.balanceAfter}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
