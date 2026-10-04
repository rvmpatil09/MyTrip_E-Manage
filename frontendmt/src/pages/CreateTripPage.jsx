import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const POPULAR_DESTINATIONS = [
  'Agra, Uttar Pradesh',
  'Ahmedabad, Gujarat',
  'Amritsar, Punjab',
  'Bengaluru, Karnataka',
  'Chandigarh',
  'Chennai, Tamil Nadu',
  'Coorg, Karnataka',
  'Darjeeling, West Bengal',
  'Delhi / New Delhi',
  'Goa (North / South)',
  'Gokarna, Karnataka',
  'Hyderabad, Telangana',
  'Jaipur, Rajasthan',
  'Jaisalmer, Rajasthan',
  'Kochi, Kerala',
  'Kolkata, West Bengal',
  'Ladakh / Leh, Jammu & Kashmir',
  'Lonavala, Maharashtra',
  'Mahabaleshwar, Maharashtra',
  'Manali, Himachal Pradesh',
  'Mumbai, Maharashtra',
  'Munnar, Kerala',
  'Mysuru, Karnataka',
  'Nainital, Uttarakhand',
  'Ooty, Tamil Nadu',
  'Pondicherry',
  'Pune, Maharashtra',
  'Rishikesh, Uttarakhand',
  'Shimla, Himachal Pradesh',
  'Srinagar, Jammu & Kashmir',
  'Udaipur, Rajasthan',
  'Varanasi, Uttar Pradesh',
  'Wayanad, Kerala'
];

export default function CreateTripPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const todayString = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stayDetails, setStayDetails] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [mediaDriveUrl, setMediaDriveUrl] = useState('');

  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const destinationRef = useRef(null);

  const [members, setMembers] = useState([
    { firstName: '', lastName: '', contribution: '' },
    { firstName: '', lastName: '', contribution: '' },
    { firstName: '', lastName: '', contribution: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdTripSummary, setCreatedTripSummary] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (destinationRef.current && !destinationRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDestinationChange = (e) => {
    const query = e.target.value;
    setDestination(query);

    if (query.trim().length > 0) {
      const matches = POPULAR_DESTINATIONS.filter((item) =>
        item.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredDestinations(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setFilteredDestinations([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectDestination = (chosen) => {
    setDestination(chosen);
    setShowSuggestions(false);
  };

  const getOtherMembersAllocated = (currentMembers, targetIdx) => {
    return currentMembers.reduce((sum, m, idx) => {
      if (idx === targetIdx) return sum;
      return sum + (parseFloat(m.contribution) || 0);
    }, 0);
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...members];

    if (field === 'contribution') {
      const budgetNum = parseFloat(estimatedBudget) || 0;

      if (value === '') {
        updated[index].contribution = '';
        setMembers(updated);
        return;
      }

      let parsedVal = parseFloat(value);
      if (isNaN(parsedVal) || parsedVal < 0) {
        parsedVal = 0;
      }

      if (budgetNum > 0) {
        const othersAllocated = getOtherMembersAllocated(members, index);
        const maxAllowed = Math.max(0, budgetNum - othersAllocated);

        if (othersAllocated >= budgetNum) {
          updated[index].contribution = '';
          setErrorMsg(
            `Target budget of ₹${budgetNum.toLocaleString()} is already satisfied. No additional deposits allowed for Member #${index + 1}.`
          );
          setMembers(updated);
          return;
        } else if (parsedVal > maxAllowed) {
          updated[index].contribution = maxAllowed.toString();
          setErrorMsg(
            `Contribution capped at ₹${maxAllowed.toLocaleString()} to prevent exceeding total target budget of ₹${budgetNum.toLocaleString()}.`
          );
          setMembers(updated);
          return;
        }
      }

      setErrorMsg('');
      updated[index].contribution = parsedVal.toString();
    } else {
      updated[index][field] = value;
    }

    setMembers(updated);
  };

  const handleAddMember = () => {
    setMembers([
      ...members,
      { firstName: '', lastName: '', contribution: '' },
    ]);
  };

  const handleRemoveMember = (index) => {
    if (members.length <= 1) {
      alert('Trip must have at least one member.');
      return;
    }
    setMembers(members.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !destination.trim()) {
      setErrorMsg('Trip title and destination are required.');
      return;
    }

    if (startDate && startDate < todayString) {
      setErrorMsg('Start date cannot be set in the past.');
      return;
    }

    if (endDate && startDate && endDate < startDate) {
      setErrorMsg('End date cannot be earlier than start date.');
      return;
    }

    const budgetNum = parseFloat(estimatedBudget) || 0;
    const totalAllocated = members.reduce(
      (sum, m) => sum + (parseFloat(m.contribution) || 0),
      0
    );

    if (budgetNum > 0 && totalAllocated > budgetNum) {
      setErrorMsg(
        `Total member contributions (₹${totalAllocated.toLocaleString()}) cannot exceed the target budget of ₹${budgetNum.toLocaleString()}.`
      );
      return;
    }

    const validMembers = members
      .filter((m) => m.firstName.trim().length > 0)
      .map((m) => ({
        firstName: m.firstName.trim(),
        lastName: m.lastName.trim(),
        contribution: parseFloat(m.contribution) || 0.0,
      }));

    if (validMembers.length === 0) {
      setErrorMsg('Please add at least one valid member with a name.');
      return;
    }

    const payload = {
      title: title.trim(),
      destination: destination.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      stayDetails: stayDetails.trim(),
      estimatedBudget: budgetNum,
      mediaDriveUrl: mediaDriveUrl.trim() || null,
      members: validMembers,
      expenses: [],
    };
 
    try {
    setLoading(true);

    const token = localStorage.getItem('trip_token') || localStorage.getItem('token');

    const response = await fetch('http://localhost:8080/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload) // 1. Use payload here
    });

    if (!response.ok) {
      throw new Error(`Failed to create trip (HTTP ${response.status})`);
    }

    const createdData = await response.json(); // 2. Use response.json() instead of res.json()
    setCreatedTripSummary(createdData);
    setShowConfirmModal(true);
  } catch (err) {
    console.error(err);
    setErrorMsg(err.message || 'Error creating trip. Check backend connection.');
  } finally {
    setLoading(false);
  }
};

  const handleProceedToDashboard = () => {
    setShowConfirmModal(false);
    navigate('/');
  };

  const budgetNum = parseFloat(estimatedBudget) || 0;
  const totalAllocated = members.reduce(
    (sum, m) => sum + (parseFloat(m.contribution) || 0),
    0
  );
  const remainingBudget = Math.max(0, budgetNum - totalAllocated);
  const isBudgetFullyMet = budgetNum > 0 && totalAllocated >= budgetNum;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-csk-blueDark text-slate-800 dark:text-slate-100 py-10 px-4 transition-colors relative">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-csk-yellow transition"
          >
            {t('backToAll', '← Back to All Trips')}
          </Link>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-csk-yellow/10 text-csk-yellow border border-csk-yellow/20">
            {t('planNewTour', 'Plan New Tour')}
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-csk-slate p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-csk-blue dark:text-csk-yellow">
              {t('newTrip', 'Create New Tour')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Initialize tour details, shared Google Drive album, and manage balanced contributions.
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-600 dark:text-red-300 font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* General Trip Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Trip Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Goa Monsoon Drive"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-csk-yellow"
                />
              </div>

              {/* Destination with Autocomplete */}
              <div className="relative" ref={destinationRef}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Destination *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type 'Pu' for Pune, 'Mu' for Mumbai..."
                  value={destination}
                  onChange={handleDestinationChange}
                  onFocus={() => {
                    if (destination.trim().length > 0 && filteredDestinations.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  autoComplete="off"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-csk-yellow"
                />

                {showSuggestions && (
                  <ul className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDestinations.map((dest, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleSelectDestination(dest)}
                        className="px-4 py-2.5 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-csk-yellow/20 hover:text-csk-yellow transition flex items-center gap-2"
                      >
                        <span className="text-slate-400">📍</span>
                        <span>{dest}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Dates & Target Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  min={todayString}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value > endDate) {
                      setEndDate('');
                    }
                  }}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-csk-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  min={startDate || todayString}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-csk-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Target Budget (₹) *
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1500"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-csk-yellow"
                />
              </div>
            </div>

            {budgetNum > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-csk-blueDark/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold">Budget Pool Status:</span>{' '}
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    ₹{totalAllocated.toLocaleString()}
                  </span>{' '}
                  <span className="text-slate-400">of ₹{budgetNum.toLocaleString()} Allocated</span>
                </div>
                <div>
                  {isBudgetFullyMet ? (
                    <span className="text-emerald-500 font-bold">
                      ✓ Target budget ₹{budgetNum.toLocaleString()} fully reached. Additional deposits locked to ₹0.
                    </span>
                  ) : (
                    <span className="text-csk-yellow font-bold">
                      ₹{remainingBudget.toLocaleString()} remaining headroom
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stay Details & Shared Google Drive URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Stay / Hotel Details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sea View Resort, Candolim"
                  value={stayDetails}
                  onChange={(e) => setStayDetails(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-csk-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Shared Google Drive Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={mediaDriveUrl}
                  onChange={(e) => setMediaDriveUrl(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-csk-yellow"
                />
              </div>
            </div>

            {/* Member List & Contributions */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-csk-blue dark:text-csk-yellow">
                  Tour Members & Pool Contributions
                </h3>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-csk-yellow/20 hover:bg-csk-yellow/30 text-csk-yellow transition"
                >
                  + Add Member
                </button>
              </div>

              <div className="space-y-3">
                {members.map((member, idx) => {
                  const othersAllocated = getOtherMembersAllocated(members, idx);
                  const isExhaustedByOthers = budgetNum > 0 && othersAllocated >= budgetNum;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-csk-blueDark/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3"
                    >
                      <span className="text-xs font-bold text-slate-400 w-6">
                        #{idx + 1}
                      </span>

                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          required
                          placeholder="First Name *"
                          value={member.firstName}
                          onChange={(e) => handleMemberChange(idx, 'firstName', e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-csk-yellow"
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={member.lastName}
                          onChange={(e) => handleMemberChange(idx, 'lastName', e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-csk-yellow"
                        />
                      </div>

                      <div className="w-full sm:w-48 relative">
                        <input
                          type="number"
                          placeholder={isExhaustedByOthers ? '0 (Covered)' : 'Contribution (₹)'}
                          value={isExhaustedByOthers && member.contribution === '0' ? '' : member.contribution}
                          disabled={isExhaustedByOthers}
                          onChange={(e) => handleMemberChange(idx, 'contribution', e.target.value)}
                          className={`w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-csk-blueDark text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-csk-yellow ${
                            isExhaustedByOthers ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                          }`}
                        />
                        {isExhaustedByOthers && (
                          <span className="text-[10px] text-emerald-500 font-bold block mt-1 sm:absolute sm:-bottom-4 sm:left-1 whitespace-nowrap">
                            Budget met; deposit locked to 0
                          </span>
                        )}
                      </div>

                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 transition text-sm self-end sm:self-center"
                          title="Remove member"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-csk-yellow hover:bg-csk-yellowDark text-csk-blue font-black uppercase tracking-wider text-sm shadow-xl transition transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Creating Tour...' : 'Create Tour & Open Dashboard →'}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && createdTripSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-csk-slate rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-scaleUp">
            
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
              ✓
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500">
                Tour Created Successfully
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {createdTripSummary.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                📍 {createdTripSummary.destination}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-csk-blueDark/50 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Budget:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  ₹{(createdTripSummary.estimatedBudget || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Registered Members:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {(createdTripSummary.members || []).length} People
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Dates:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {createdTripSummary.startDate || 'TBD'} to {createdTripSummary.endDate || 'TBD'}
                </span>
              </div>
              {createdTripSummary.mediaDriveUrl && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400">Shared Drive:</span>
                  <span className="text-csk-yellow font-bold truncate max-w-[180px]">
                    Linked ✓
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleProceedToDashboard}
                className="flex-1 py-3.5 rounded-xl bg-csk-yellow hover:bg-csk-yellowDark text-csk-blue font-black uppercase text-xs tracking-wider shadow-lg transition active:scale-95"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  navigate(`/trip/${createdTripSummary.id}`);
                }}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold uppercase text-xs tracking-wider transition active:scale-95"
              >
                View Trip Page
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}