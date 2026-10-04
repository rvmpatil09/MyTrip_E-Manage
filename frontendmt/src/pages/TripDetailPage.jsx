import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Tesseract from 'tesseract.js';
import BudgetPoolCard from '../components/BudgetPoolCard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// --- CENTRAL API HELPER (INLINE) ---
const API_BASE_URL = 'http://localhost:8080/api';

async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('trip_token') || localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('trip_token');
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    if (!window.location.pathname.includes('/login')) {
      alert('Your session has expired. Please sign in again.');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  return response;
}

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
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);
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


      const token = localStorage.getItem('trip_token') || localStorage.getItem('token');
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Replaces manual fetch for trip data

      /* const tripRes = await fetch(`http://localhost:8080/api/trips/${id}`, {
        headers: authHeaders
      });

      if (!tripRes.ok) throw new Error(`HTTP ${tripRes.status}`);
      const tripData = await tripRes.json();
      setTrip(tripData);
      setDriveUrlInput(tripData.mediaDriveUrl || '');

      const allNames = (tripData.members || []).map(
        (m) => `${m.firstName} ${m.lastName || ''}`.trim()
      );
      setSelectedSplitMembers(allNames);

      const settleRes = await fetch(`http://localhost:8080/api/trips/${id}/settlements`, {
        headers: authHeaders
      });
      if (settleRes.ok) {
        setSettlements(await settleRes.json());
      } */
      const tripRes = await apiClient(`/trips/${id}`);
      if (!tripRes.ok) throw new Error(`HTTP ${tripRes.status}`);
      const tripData = await tripRes.json();
      setTrip(tripData);
      setDriveUrlInput(tripData.mediaDriveUrl || '');

      const allNames = (tripData.members || []).map(
        (m) => `${m.firstName} ${m.lastName || ''}`.trim()
      );
      setSelectedSplitMembers(allNames);

      // Replaces manual fetch for settlements
      const settleRes = await apiClient(`/trips/${id}/settlements`);
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

  // --- PASTE handleMarkSettled HERE ---
  const handleMarkSettled = async (from, to, amount) => {
    if (!window.confirm(`Confirm payment of ₹${amount} from ${from} to ${to}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('trip_token') || localStorage.getItem('token');
      /*  const res = await fetch(`http://localhost:8080/api/trips/${id}/settle`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ from, to, amount })
       }); */
      const res = await apiClient(`/trips/${id}/settle`, {
        method: 'POST',
        body: JSON.stringify({ from, to, amount })
      });

      if (!res.ok) throw new Error('Failed to record settlement payment');

      // Refresh trip details and updated settlements list
      await loadTripDetails();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error recording settlement');
    }
  };

  // --- EXPORT TRIP SUMMARY TO PDF ---
  const handleExportPDF = () => {
    if (!trip) return;

    const doc = new jsPDF();

    // 1. Header & Title Banner
    doc.setFillColor(11, 25, 44); // Dark navy theme color
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(245, 166, 35); // Accent gold
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MyTrip E-Manage Summary', 14, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tour: ${trip.title} (ID: #${trip.id})`, 14, 26);
    doc.text(
      `Dates: ${trip.startDate || ''} to ${trip.endDate || ''} | Destination: ${trip.destination || 'N/A'}`,
      14,
      31
    );

    let currentY = 43;

    // 2. Member Contributions Table
    const memberRows = (trip.members || []).map((m) => [
      `${m.firstName} ${m.lastName || ''}`.trim(),
      `INR ${Number(m.initialContribution || 0).toLocaleString('en-IN')}`,
    ]);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Member Contributions & Budget Pool', 14, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Member Name', 'Initial Contribution']],
      body: memberRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    currentY = doc.lastAutoTable.finalY + 12;

    // 3. Logged Expenses Table
    doc.text('Logged Expenses', 14, currentY);

    const expenseRows = (trip.expenses || []).map((exp) => [
      exp.title || 'Expense',
      exp.category || 'General',
      exp.paidBy || 'N/A',
      `INR ${Number(exp.amount || 0).toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Description', 'Category', 'Paid By', 'Amount']],
      body: expenseRows.length > 0 ? expenseRows : [['No expenses recorded', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    currentY = doc.lastAutoTable.finalY + 12;

    // 4. Optimal Debt Settlements Table
    doc.text('Optimal Debt Settlements (Pending Dues)', 14, currentY);

    const settlementRows = (settlements || []).map((s) => [
      s.from || s.fromUser || s.debtor,
      s.to || s.toUser || s.creditor,
      `INR ${Number(s.amount || 0).toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Debtor (Owes)', 'Creditor (Receives)', 'Amount to Settle']],
      body:
        settlementRows.length > 0
          ? settlementRows
          : [['All balances are settled', '-', 'INR 0']],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });


    // 5. Save/Download File
    doc.save(`${trip.title.replace(/\s+/g, '_')}_Trip_Summary.pdf`);
  };
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
    if (!window.confirm("Are you sure you want to end and conclude this trip? No further expenses should be added.")) {
      return;
    }

    try {
      const res = await apiClient(`/trips/${id}/conclude`, {
        method: 'PUT'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to end trip: ${errorText}`);
      }

      alert("Trip has been successfully concluded and settled!");

      // Reload details to reflect CONCLUDED status
      await loadTripDetails();
    } catch (err) {
      console.error("Error concluding trip:", err);
      alert(err.message || "Failed to conclude trip");
    }
  };

  // Delete Trip
  const currentEmail = localStorage.getItem('email');
  const userRole = localStorage.getItem('role');
  const isAdmin = userRole === 'ROLE_ADMIN';
  const isCreator = trip?.createdBy?.email === currentEmail;

  const handleDeleteTrip = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this trip and its expense logs?')) {
      return;
    }

    try {
      setDeletingTrip(true);
      const token = localStorage.getItem('trip_token') || localStorage.getItem('token');

      const res = await fetch(`http://localhost:8080/api/trips/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete trip');

      // Return to homepage
      navigate('/');
    } catch (err) {
      alert(err.message || 'Error deleting trip');
    } finally {
      setDeletingTrip(false);
    }
  };



  // Comprehensive OCR Parser
  // --- OCR HANDLER FOR RECEIPT IMAGES ---
  const handleReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setOcrLoading(true);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => console.log('OCR:', m.status, Math.round((m.progress || 0) * 100) + '%'),
      });

      const rawText = result?.data?.text || '';
      console.log('--- OCR RAW SCANNED TEXT ---\n', rawText);

      // Split text into individual rows/lines
      const lines = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // Target keywords to search for
      const keywords = [
        'grand total',
        'total amount',
        'net amount',
        'bill amount',
        'sub total',
        'subtotal',
        'total',
        'amount paid',
        'amount due',
        'amount'
      ];

      let extractedAmount = null;

      // Scan rows from bottom to top (totals always sit near the bottom)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Check if this line contains any of our target keywords
        const foundKeyword = keywords.find((k) => lowerLine.includes(k));

        if (foundKeyword) {
          // Extract any numeric price pattern in that exact same row
          // Supports formats like: 120, 120.00, 1,200.50, ₹1500
          const matches = line.match(/\d+(?:[.,]\d{1,2})?/g);

          if (matches && matches.length > 0) {
            // Get the last number appearing on that line (which is usually the amount next to the keyword)
            const matchedValue = parseFloat(matches[matches.length - 1].replace(',', ''));
            if (!isNaN(matchedValue) && matchedValue > 0) {
              extractedAmount = matchedValue;
              console.log(`Matched amount "${matchedValue}" on line: "${line}" (Keyword: "${foundKeyword}")`);
              break;
            }
          }
        }
      }

      // Fallback: If keyword was on its own line and the number is on the very next row
      if (extractedAmount === null) {
        for (let i = 0; i < lines.length - 1; i++) {
          const lowerLine = lines[i].toLowerCase();
          const foundKeyword = keywords.find((k) => lowerLine === k || lowerLine === `${k}:`);
          if (foundKeyword) {
            const nextLine = lines[i + 1];
            const nextMatches = nextLine.match(/\d+(?:[.,]\d{1,2})?/g);
            if (nextMatches && nextMatches.length > 0) {
              extractedAmount = parseFloat(nextMatches[0].replace(',', ''));
              break;
            }
          }
        }
      }

      // Extract Description: First clean line that isn't a receipt header noise
      const cleanHeaderLines = lines.filter(
        (l) => l.length >= 3 && !/^[0-9\W]+$/.test(l) && !/welcome|tax invoice|receipt|cash memo|bill/i.test(l)
      );
      const extractedTitle = cleanHeaderLines.length > 0 ? cleanHeaderLines[0] : '';

      // Populate Form Fields
      setExpenseForm((prev) => ({
        ...prev,
        title: extractedTitle || prev.title,
        amount: extractedAmount !== null ? String(extractedAmount) : prev.amount,
      }));
    } catch (err) {
      console.error('OCR processing error:', err);
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
    if (e && e.preventDefault) e.preventDefault();
    console.log("Submitting expense form...", expenseForm);

    if (!expenseForm.title || !expenseForm.amount || !expenseForm.paidBy) {
      alert("Please fill in Description, Amount, and Paid By.");
      return;
    }

    setSubmittingExpense(true);

    try {
      const token = localStorage.getItem('trip_token') || localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');

      const formData = new FormData();
      formData.append('title', expenseForm.title);
      formData.append('amount', parseFloat(expenseForm.amount));
      formData.append('paidBy', expenseForm.paidBy);
      if (expenseForm.category) {
        formData.append('category', expenseForm.category);
      }

      (selectedSplitMembers || []).forEach((member) => {
        formData.append('splitAmong', member);
      });

      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const res = await fetch(`http://localhost:8080/api/trips/${id}/expenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server returned HTTP ${res.status}: ${errorText}`);
      }

      // Safe parse: handles JSON or empty 200 response
      let savedData = null;
      try {
        savedData = await res.json();
      } catch (_) {
        savedData = {};
      }

      // 1. Prepare pop-up summary data
      const splitCount = selectedSplitMembers?.length || 1;
      const totalAmt = parseFloat(expenseForm.amount);
      setLoggedExpenseSummary({
        title: expenseForm.title,
        amount: totalAmt,
        paidBy: expenseForm.paidBy,
        splitCount: splitCount,
        perPerson: (totalAmt / splitCount).toFixed(2),
      });

      // 2. Open pop-up modal
      console.log("Opening confirmation modal...");
      setShowExpenseModal(true);

      // 3. Reset form inputs
      setExpenseForm({ title: '', amount: '', paidBy: '', category: 'Food & Dining' });
      setReceiptFile(null);

      // 4. Refresh background calculations
      await loadTripDetails();
    } catch (err) {
      console.error('Error recording expense:', err);
      alert(err.message || 'Failed to record expense');
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
            {/* --- PASTE EXPORT PDF BUTTON HERE --- */}
            <button
              onClick={handleExportPDF}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer flex items-center gap-1.5"
            >
              📄 EXPORT PDF
            </button>
            {/* ------------------------------------- */}

            <button
              onClick={handleConcludeTrip}
              disabled={trip?.status === 'CONCLUDED'}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${trip?.status === 'CONCLUDED'
                  ? 'border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'border-amber-500/30 bg-amber-500/10 text-[#f5a623] hover:bg-[#f5a623] hover:text-slate-950'
                }`}
            >
              {trip?.status === 'CONCLUDED' ? 'TRIP CONCLUDED' : 'END TRIP & SETTLE'}
            </button>

            {(isAdmin || isCreator) && (
              <button
                onClick={handleDeleteTrip}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition cursor-pointer"
              >
                DELETE
              </button>
            )}
          </div>
          {/*  <div className="flex items-center gap-2">
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
          </div> */}
        </div>

        {/* Hero Header */}
        <div className="bg-white dark:bg-csk-slate p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {trip?.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {trip?.destination} • {trip?.startDate} to {trip?.endDate}
              </p>
            </div>

            {/* Top Actions: Conclude, Drive Link, Delete */}
            <div className="flex items-center gap-3">
              {/* --- PASTE SNIPPET 2 HERE --- */}
              {/*   {(isAdmin || isCreator) && (
      <button
        onClick={handleDeleteTrip}
        disabled={deletingTrip}
        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition cursor-pointer"
      >
        {deletingTrip ? 'Deleting...' : 'Delete Trip'}
      </button>
    )} */}
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    RECEIPT IMAGE (OPTIONAL)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#f5a623] border border-slate-700 transition">
                      {ocrLoading ? 'Scanning receipt...' : 'Choose File'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReceiptChange}
                      />
                    </label>
                    <span className="text-xs text-slate-400 truncate max-w-[200px]">
                      {receiptFile ? receiptFile.name : 'No file chosen'}
                    </span>
                  </div>
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
                  disabled={submittingExpense}
                  className="w-full py-3 rounded-xl bg-[#f5a623] hover:bg-[#e0961e] text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  {submittingExpense ? 'LOGGING...' : 'LOG EXPENSE'}
                </button>
              </form>
            )}
          </div>

          {/* Settlements & Expense History */}
          <div className="lg:col-span-2 space-y-6">

            {/* Optimal Settlements */}
            {/* OPTIMAL DEBT SETTLEMENTS CARD */}
            <div className="p-6 rounded-2xl bg-[#0b192c] border border-slate-800 shadow-sm">
              <h3 className="font-bold text-sm tracking-wider uppercase text-[#f5a623] mb-4">
                OPTIMAL DEBT SETTLEMENTS
              </h3>

              {settlements && settlements.length > 0 ? (
                <div className="space-y-2.5">
                  {settlements.map((s, idx) => {
                    const debtor = s.from || s.fromUser || s.debtor;
                    const creditor = s.to || s.toUser || s.creditor;
                    const amountVal = Number(s.amount);

                    return (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-3.5 rounded-xl bg-slate-900/80 border border-slate-800"
                      >
                        <span className="text-xs sm:text-sm font-medium text-slate-300">
                          <span className="text-red-400 font-bold">{debtor}</span>
                          <span className="text-slate-400 mx-1.5 font-normal">owes</span>
                          <span className="text-emerald-400 font-bold">{creditor}</span>
                        </span>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold text-[#f5a623] font-mono">
                            ₹{amountVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => handleMarkSettled(debtor, creditor, amountVal)}
                            className="text-[11px] font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition cursor-pointer"
                          >
                            MARK PAID
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">All member balances are settled. No dues pending.</p>
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
                          /*  <a
                             href={`http://localhost:8080${expense.receiptUrl}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-xs text-csk-yellow hover:underline font-semibold"
                           >
                             📎 Receipt
                           </a> */
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptUrl(exp.receiptUrl)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#f5a623] hover:underline cursor-pointer"
                          >
                            📎 Receipt
                          </button>
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
      {/* EXPENSE CONFIRMATION POP-UP MODAL */}

      {showExpenseModal && loggedExpenseSummary && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-[#0b192c] border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">

            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">
              ✓
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Expense Logged Successfully!
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Balances and optimal debt settlements have been updated.
            </p>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Description:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">
                  {loggedExpenseSummary.title}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-[#f5a623] font-mono">
                  ₹{Number(loggedExpenseSummary.amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Paid By:</span>
                <span className="font-semibold text-white">
                  {loggedExpenseSummary.paidBy}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Split Across:</span>
                <span className="font-semibold text-slate-300">
                  {loggedExpenseSummary.splitCount} Members (₹{loggedExpenseSummary.perPerson}/each)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowExpenseModal(false);
                setLoggedExpenseSummary(null);
              }}
              className="w-full py-2.5 rounded-xl bg-[#f5a623] hover:bg-[#e0961e] text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Done / Continue
            </button>
          </div>
        </div>
      )}
      {/* RECEIPT PREVIEW MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-2xl w-full bg-[#0b192c] border border-slate-800 rounded-2xl p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-white">Receipt Attachment</h4>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-xl flex justify-center bg-slate-950 p-2">
              <img
                src={previewReceiptUrl}
                alt="Receipt Preview"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}