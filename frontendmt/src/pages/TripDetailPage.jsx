import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Tesseract from 'tesseract.js';
import BudgetPoolCard from '../components/BudgetPoolCard';

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [trip, setTrip] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [concludingTrip, setConcludingTrip] = useState(false);

  // Shared Media Drive link states
  const [isEditingDriveUrl, setIsEditingDriveUrl] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [updatingDriveUrl, setUpdatingDriveUrl] = useState(false);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    paidBy: '',
    category: 'Food',
  });

  const [selectedSplitMembers, setSelectedSplitMembers] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Expense Confirmation Pop-up state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [loggedExpenseSummary, setLoggedExpenseSummary] = useState(null);

  const loadTripDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const tripRes = await fetch(`http://localhost:8080/api/trips/${id}`);
      if (!tripRes.ok) throw new Error(`HTTP ${tripRes.status}`);
      const tripData = await tripRes.json();
      setTrip(tripData);
      setDriveUrlInput(tripData.mediaDriveUrl || '');

      const allNames = (tripData.members || []).map(
        (m) => `${m.firstName} ${m.lastName || ''}`.trim()
      );
      setSelectedSplitMembers(allNames);

      const settleRes = await fetch(`http://localhost:8080/api/trips/${id}/settlements`);
      if (settleRes.ok) {
        setSettlements(await settleRes.json());
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Error loading trip details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTripDetails();
  }, [loadTripDetails]);

  // Save/Update Google Drive link
  const handleSaveDriveUrl = async () => {
    try {
      setUpdatingDriveUrl(true);
      const res = await fetch(`http://localhost:8080/api/trips/${id}/media-link`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaDriveUrl: driveUrlInput }),
      });

      if (!res.ok) throw new Error('Failed to update Google Drive link');
      const updated = await res.json();
      setTrip(updated);
      setIsEditingDriveUrl(false);
    } catch (err) {
      alert(err.message || 'Error updating link');
    } finally {
      setUpdatingDriveUrl(false);
    }
  };

  // Conclude Trip Early
  const handleConcludeTrip = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to end this trip early? This will finalize the current date as the end date, lock new expense logs, and compute final pool refunds.'
    );
    if (!confirmed) return;

    try {
      setConcludingTrip(true);
      const res = await fetch(`http://localhost:8080/api/trips/${id}/conclude`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to conclude trip');
      await loadTripDetails();
    } catch (err) {
      alert(err.message || 'Error ending trip');
    } finally {
      setConcludingTrip(false);
    }
  };

  // Delete Trip
  const handleDeleteTrip = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${trip.title}"? All logged expenses and member records for this trip will be removed.`
    );
    if (!confirmed) return;

    try {
      setDeletingTrip(true);
      const res = await fetch(`http://localhost:8080/api/trips/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`Failed to delete trip (HTTP ${res.status})`);
      }

      navigate('/');
    } catch (err) {
      alert(err.message || 'Failed to delete trip');
      setDeletingTrip(false);
    }
  };

  // Comprehensive OCR Parser
  const handleReceiptChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setReceiptFile(file);
    setOcrLoading(true);

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

      let detectedAmount = null;
      let detectedProduct = '';

      const fuelAmountRegex = /(?:amount\s*(?:\(\s*(?:rs|inr|\₹)\s*\))?|net\s*amt|sale\s*amt)\s*[:=]?\s*0*([0-9]+\.[0-9]{2})\b/i;
      const productRegex = /product\s*[:=]\s*([a-zA-Z\s]+)/i;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^(?:atot|vtot|totizer|tot|cum)/i.test(line)) {
          continue;
        }

        const prodMatch = line.match(productRegex);
        if (prodMatch && prodMatch[1]) {
          detectedProduct = prodMatch[1].trim();
        }

        const fuelMatch = line.match(fuelAmountRegex);
        if (fuelMatch && fuelMatch[1]) {
          const val = parseFloat(fuelMatch[1]);
          if (!isNaN(val) && val > 0 && val < 100000) {
            detectedAmount = val;
            break;
          }
        }
      }

      if (!detectedAmount) {
        const generalKeywords = new RegExp(
          [
            'bill\\s*(?:with\\s*)?amount',
            'billed\\s*amount',
            'total\\s*bill',
            'bill\\s*total',
            'net\\s*payable(?:\\s*amount)?',
            'total\\s*payable',
            'amount\\s*payable',
            'pay\\s*amount',
            'amount\\s*due',
            'total\\s*due',
            'invoice\\s*total',
            'grand\\s*total',
            'net\\s*total',
            'total\\s*amount',
            'final\\s*amount',
            'gross\\s*total',
            'total\\s*(?:inr|rs\\.?|₹)',
            'balance\\s*due',
            'total'
          ].join('|'),
          'i'
        );

        const numberRegex = /(?:₹|rs\.?|inr)?\s*0*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;

        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i];

          if (/^(?:atot|vtot|totizer|tel|phone|fcc|vat|cst|lst)/i.test(line)) {
            continue;
          }

          if (generalKeywords.test(line)) {
            const matched = line.split(generalKeywords)[1]?.match(numberRegex);
            if (matched && matched[1]) {
              const val = parseFloat(matched[1].replace(/,/g, ''));
              if (!isNaN(val) && val > 0 && val < 500000) {
                detectedAmount = val;
                break;
              }
            }

            if (!detectedAmount && i + 1 < lines.length) {
              const nextLineMatch = lines[i + 1].match(numberRegex);
              if (nextLineMatch && nextLineMatch[1]) {
                const val = parseFloat(nextLineMatch[1].replace(/,/g, ''));
                if (!isNaN(val) && val > 0 && val < 500000) {
                  detectedAmount = val;
                  break;
                }
              }
            }
          }
        }
      }

      let generatedDescription = detectedProduct ? `${detectedProduct} (Fuel)` : '';

      if (!generatedDescription) {
        const detectedItems = [];
        const ignoreLinePatterns = /(?:subtotal|sub\s*total|cgst|sgst|gst|tax|vat|service\s*charge|discount|round\s*off|cash|card|upi|visa|mastercard|change|balance|table|order|invoice|bill\s*no|date|time|phone|tel|fssai|gstin|welcome|thank\s*you|atot|vtot|fcc|nozzle|fip|preset|volume|rate)/i;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/total|amount/i.test(line) || ignoreLinePatterns.test(line)) continue;

          let cleanItem = line
            .replace(/^[0-9]+[\.\)\s-]+/, '')
            .replace(/(?:₹|rs\.?|inr)\s*[0-9]+(?:[\.,][0-9]{2})?/gi, '')
            .replace(/[0-9]+(?:[\.,][0-9]{2})?\s*$/, '')
            .replace(/\b\d+\s*(?:qty|nos|pcs|x)\b/gi, '')
            .replace(/[^\w\s-]/g, '')
            .trim();

          if (cleanItem.length >= 3 && /[a-zA-Z]{3,}/.test(cleanItem)) {
            if (!detectedItems.includes(cleanItem)) detectedItems.push(cleanItem);
          }
        }
        generatedDescription = detectedItems.slice(0, 5).join(', ');
      }

      setExpenseForm((prev) => ({
        ...prev,
        amount: detectedAmount !== null ? detectedAmount.toString() : prev.amount,
        title: generatedDescription ? generatedDescription : prev.title,
        category: detectedProduct ? 'Transport' : prev.category,
      }));
    } catch (ocrErr) {
      console.warn('OCR extraction failed:', ocrErr);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleMemberToggle = (memberName) => {
    if (selectedSplitMembers.includes(memberName)) {
      if (selectedSplitMembers.length === 1) {
        alert('At least one member must remain selected to split the bill.');
        return;
      }
      setSelectedSplitMembers(selectedSplitMembers.filter((m) => m !== memberName));
    } else {
      setSelectedSplitMembers([...selectedSplitMembers, memberName]);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.paidBy) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmittingExpense(true);
      const formData = new FormData();
      formData.append('title', expenseForm.title);
      formData.append('amount', parseFloat(expenseForm.amount));
      formData.append('paidBy', expenseForm.paidBy);
      formData.append('category', expenseForm.category);
      selectedSplitMembers.forEach((m) => formData.append('splitAmong', m));

      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const res = await fetch(`http://localhost:8080/api/trips/${id}/expenses`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to record expense');

      setLoggedExpenseSummary({
        title: expenseForm.title,
        amount: expenseForm.amount,
        paidBy: expenseForm.paidBy,
        category: expenseForm.category,
        splitCount: selectedSplitMembers.length,
      });
      setShowExpenseModal(true);

      setExpenseForm({ title: '', amount: '', paidBy: '', category: 'Food' });
      setReceiptFile(null);
      await loadTripDetails();
    } catch (err) {
      alert(err.message || 'Error recording expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-csk-blueDark text-slate-400 flex items-center justify-center font-medium">
        Loading trip details...
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-csk-blueDark text-slate-800 dark:text-slate-100 p-8">
        <div className="max-w-2xl mx-auto p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <p className="text-red-600 dark:text-red-300 font-bold mb-4">{error || 'Trip record not found.'}</p>
          <Link to="/" className="text-csk-blue dark:text-csk-yellow font-bold underline">
            {t('backToAll', '← Back to All Trips')}
          </Link>
        </div>
      </div>
    );
  }

  const memberList = (trip.members || []).map((m) => `${m.firstName} ${m.lastName || ''}`.trim());
  const isConcluded = trip.status === 'CONCLUDED';

  const totalInitialPool = (trip.members || []).reduce((sum, m) => sum + (parseFloat(m.contribution) || 0), 0);
  const totalSpent = (trip.expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const unspentPool = Math.max(0, totalInitialPool - totalSpent);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-csk-blueDark text-slate-800 dark:text-slate-100 py-8 px-4 transition-colors relative">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-csk-yellow transition flex items-center gap-1"
          >
            {t('backToAll', '← Back to All Trips')}
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Trip ID: #{trip.id}
            </span>

            {!isConcluded ? (
              <button
                onClick={handleConcludeTrip}
                disabled={concludingTrip}
                className="text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/30 transition disabled:opacity-50"
              >
                {concludingTrip ? 'Finalizing...' : '⏹ End Trip & Settle'}
              </button>
            ) : (
              <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                ✓ Concluded
              </span>
            )}

            <button
              onClick={handleDeleteTrip}
              disabled={deletingTrip}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 transition disabled:opacity-50"
            >
              {deletingTrip ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="bg-white dark:bg-csk-slate p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-csk-blue dark:text-csk-yellow">{trip.title}</h1>
              {isConcluded && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Ended Early / Concluded
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>📍 {trip.destination}</span>
              <span>•</span>
              <span>📅 {trip.startDate || 'TBD'} to {trip.endDate || 'TBD'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-csk-yellow/20 text-csk-yellow">
              👥 {memberList.length} Members
            </span>
          </div>
        </div>

        {/* Shared Media & Google Drive Integration Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-csk-slate border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📁</span>
              <h3 className="text-sm font-black uppercase tracking-wider text-csk-blue dark:text-csk-yellow">
                Shared Trip Media & Google Drive
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Access the collaborative Google Drive album to upload and view photos, videos, and memories.
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isEditingDriveUrl ? (
              <div className="flex items-center gap-2 w-full sm:w-80">
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={driveUrlInput}
                  onChange={(e) => setDriveUrlInput(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-csk-blueDark text-xs outline-none focus:ring-2 focus:ring-csk-yellow"
                />
                <button
                  onClick={handleSaveDriveUrl}
                  disabled={updatingDriveUrl}
                  className="px-3 py-2 rounded-xl bg-csk-yellow text-csk-blue text-xs font-bold uppercase transition"
                >
                  {updatingDriveUrl ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingDriveUrl(false)}
                  className="p-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {trip.mediaDriveUrl ? (
                  <a
                    href={trip.mediaDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-csk-yellow hover:bg-csk-yellowDark text-csk-blue font-black text-xs uppercase tracking-wider shadow transition flex items-center gap-2 active:scale-95"
                  >
                    <span>Open Drive Album</span>
                    <span>↗</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">No Drive folder attached yet</span>
                )}
                <button
                  onClick={() => setIsEditingDriveUrl(true)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-white text-xs font-bold uppercase transition"
                >
                  {trip.mediaDriveUrl ? 'Edit Link' : '+ Add Link'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Unspent Pool Proportional Refunds Banner (If Concluded) */}
        {isConcluded && unspentPool > 0 && totalInitialPool > 0 && (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                💰 Unspent Common Pool Refund Summary
              </h3>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                ₹{unspentPool.toLocaleString()} Total Unspent
              </span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              The trip concluded with unspent funds. Return the following amounts to each member proportional to their initial contribution:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {trip.members.map((m, idx) => {
                const name = `${m.firstName} ${m.lastName || ''}`.trim();
                const shareRatio = (parseFloat(m.contribution) || 0) / totalInitialPool;
                const refundAmount = Math.round(unspentPool * shareRatio * 100) / 100;
                return (
                  <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{name}</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      ₹{refundAmount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shared Pool Card */}
        <BudgetPoolCard members={trip.members || []} expenses={trip.expenses || []} />

        {/* Expense Entry & Settlements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form: Log Expense */}
          <div className="lg:col-span-1 bg-white dark:bg-csk-slate p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-csk-blue dark:text-csk-yellow mb-4 uppercase tracking-wide">
              {t('logSharedExpense', 'LOG SHARED EXPENSE')}
            </h2>

            {isConcluded ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-csk-blueDark/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <span className="text-2xl">🔒</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Trip Concluded
                </p>
                <p className="text-[11px] text-slate-400">
                  This tour has been finalized. New expense entries are locked.
                </p>
              </div>
            ) : (
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                
                {/* Receipt Upload */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('receiptOptional', 'Receipt Image (Optional)')}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-csk-yellow/20 file:text-csk-yellow hover:file:bg-csk-yellow/30 cursor-pointer"
                  />
                  {ocrLoading && (
                    <p className="text-[11px] text-csk-yellow mt-1.5 font-bold animate-pulse">
                      ⚡ Reading bill keywords, items & payable total...
                    </p>
                  )}
                </div>

                {/* Expense Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('expenseDescription', 'EXPENSE DESCRIPTION *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Dinner, Fuel, Entry tickets"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-csk-yellow outline-none"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('amount', 'AMOUNT (₹) *')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g., 1500"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-csk-yellow outline-none font-bold"
                  />
                </div>

                {/* Paid By Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('paidBy', 'PAID BY *')}
                  </label>
                  <select
                    required
                    value={expenseForm.paidBy}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-csk-yellow outline-none"
                  >
                    <option value="">Select Member</option>
                    {memberList.map((name, idx) => (
                      <option key={idx} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {t('category', 'CATEGORY')}
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-csk-yellow outline-none"
                  >
                    <option value="Food">Food & Dining</option>
                    <option value="Transport">Transport / Fuel</option>
                    <option value="Stay">Accommodation</option>
                    <option value="Activities">Activities / Entry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Member Checklist */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Split Across Members:
                    </label>
                    <span className="text-[11px] text-csk-yellow font-bold">
                      {selectedSplitMembers.length} of {memberList.length} Participating
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-csk-blueDark/40 border border-slate-200 dark:border-slate-800 space-y-2 max-h-40 overflow-y-auto">
                    {memberList.map((name, idx) => {
                      const isChecked = selectedSplitMembers.includes(name);
                      return (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMemberToggle(name)}
                            className="rounded border-slate-700 text-csk-yellow focus:ring-0 accent-csk-yellow"
                          />
                          <span className={isChecked ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400 line-through'}>
                            {name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingExpense || ocrLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-csk-yellow hover:bg-csk-yellowDark text-csk-blue font-bold shadow transition active:scale-95 disabled:opacity-50 text-sm uppercase"
                >
                  {submittingExpense ? 'Logging...' : t('logDeduct', 'Log & Deduct from Pool')}
                </button>
              </form>
            )}
          </div>

          {/* Settlements & Expense History */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Optimal Settlements */}
            <div className="bg-white dark:bg-csk-slate p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-csk-blue dark:text-csk-yellow mb-3 uppercase tracking-wide">
                {t('optimalSettlements', 'OPTIMAL DEBT SETTLEMENTS')}
              </h2>
              {settlements.length === 0 ? (
                <p className="text-sm text-slate-400">{t('noDues', 'All member balances are settled. No dues pending.')}</p>
              ) : (
                <div className="space-y-2">
                  {settlements.map((s, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-csk-blueDark/50 border border-slate-100 dark:border-slate-800 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s.debtor}</span>
                        <span className="text-xs text-slate-400 font-semibold uppercase">{t('owes', 'OWES')}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s.creditor}</span>
                      </div>
                      <span className="font-black text-csk-blue dark:text-csk-yellow text-base">
                        ₹{(parseFloat(s.amount) || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logged Expense History */}
            <div className="bg-white dark:bg-csk-slate p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-csk-blue dark:text-csk-yellow mb-4 uppercase tracking-wide">
                {t('loggedHistory', 'LOGGED EXPENSE HISTORY')}
              </h2>
              {(!trip.expenses || trip.expenses.length === 0) ? (
                <p className="text-sm text-slate-400">{t('noExpenses', 'No expenses recorded yet.')}</p>
              ) : (
                <div className="space-y-3">
                  {trip.expenses.map((expense, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-csk-blueDark/40"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{expense.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Paid By: <span className="font-medium text-slate-600 dark:text-slate-300">{expense.paidBy}</span> • Category: {expense.category || 'General'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {expense.receiptUrl && (
                          <a
                            href={`http://localhost:8080${expense.receiptUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-csk-yellow hover:underline font-semibold"
                          >
                            📎 Receipt
                          </a>
                        )}
                        <span className="font-black text-slate-900 dark:text-white text-base">
                          ₹{(parseFloat(expense.amount) || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Confirmation Modal for Logged Expense */}
      {showExpenseModal && loggedExpenseSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-csk-slate rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-scaleUp">
            
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              ✓
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500">
                Expense Logged
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {loggedExpenseSummary.title}
              </h3>
              <p className="text-2xl font-black text-csk-blue dark:text-csk-yellow mt-1">
                ₹{parseFloat(loggedExpenseSummary.amount).toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-csk-blueDark/50 border border-slate-100 dark:border-slate-800 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Paid By:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{loggedExpenseSummary.paidBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{loggedExpenseSummary.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Split Between:</span>
                <span className="font-semibold text-csk-yellow">{loggedExpenseSummary.splitCount} Members</span>
              </div>
            </div>

            <button
              onClick={() => setShowExpenseModal(false)}
              className="w-full py-3.5 rounded-xl bg-csk-yellow hover:bg-csk-yellowDark text-csk-blue font-black uppercase text-xs tracking-wider shadow-lg transition active:scale-95"
            >
              Done & Update Pool
            </button>

          </div>
        </div>
      )}

    </div>
  );
}