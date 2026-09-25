import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export default function App() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [newTrip, setNewTrip] = useState({
    title: '', destination: '', stayDetails: '',
    startDate: '', endDate: '', estimatedBudget: '', members: ''
  });
  const [newExpense, setNewExpense] = useState({
    title: '', amount: '', paidBy: '', paymentMode: 'UPI', category: 'FOOD'
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await axios.get(`${API_BASE}/trips`);
      setTrips(res.data);
      if (res.data.length > 0 && !selectedTrip) {
        selectTrip(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    }
  };

  const selectTrip = async (trip) => {
    setSelectedTrip(trip);
    try {
      const [expRes, setRes] = await Promise.all([
        axios.get(`${API_BASE}/expenses/trip/${trip.id}`),
        axios.get(`${API_BASE}/expenses/trip/${trip.id}/settle`)
      ]);
      setExpenses(expRes.data);
      setSettlements(setRes.data);
    } catch (err) {
      console.error('Error loading trip details:', err);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    const payload = {
      ...newTrip,
      estimatedBudget: parseFloat(newTrip.estimatedBudget),
      members: newTrip.members.split(',').map(m => m.trim())
    };
    await axios.post(`${API_BASE}/trips`, payload);
    setNewTrip({ title: '', destination: '', stayDetails: '', startDate: '', endDate: '', estimatedBudget: '', members: '' });
    fetchTrips();
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;

    let proofUrl = '';

    // Step A: Upload image if a receipt was selected
    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const uploadRes = await axios.post(`${API_BASE}/files/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        proofUrl = uploadRes.data;
      } catch (err) {
        console.error('Failed to upload receipt:', err);
      } finally {
        setUploading(false);
      }
    }

    // Step B: Save expense with the uploaded proofUrl
    const payload = {
      ...newExpense,
      tripId: selectedTrip.id,
      amount: parseFloat(newExpense.amount),
      proofUrl: proofUrl
    };

    await axios.post(`${API_BASE}/expenses`, payload);
    setNewExpense({ title: '', amount: '', paidBy: '', paymentMode: 'UPI', category: 'FOOD' });
    setSelectedFile(null);
    selectTrip(selectedTrip);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-gray-800">Trip & Expense Manager</h1>
          <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
            Active Trips: {trips.length}
          </span>
        </header>

        {/* Create Trip */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Create New Trip</h2>
          <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required placeholder="Trip Title" className="border p-2 rounded" value={newTrip.title} onChange={e => setNewTrip({...newTrip, title: e.target.value})} />
            <input required placeholder="Destination" className="border p-2 rounded" value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} />
            <input placeholder="Stay Details" className="border p-2 rounded" value={newTrip.stayDetails} onChange={e => setNewTrip({...newTrip, stayDetails: e.target.value})} />
            <input required type="date" className="border p-2 rounded" value={newTrip.startDate} onChange={e => setNewTrip({...newTrip, startDate: e.target.value})} />
            <input required type="date" className="border p-2 rounded" value={newTrip.endDate} onChange={e => setNewTrip({...newTrip, endDate: e.target.value})} />
            <input required type="number" placeholder="Budget (₹)" className="border p-2 rounded" value={newTrip.estimatedBudget} onChange={e => setNewTrip({...newTrip, estimatedBudget: e.target.value})} />
            <input required placeholder="Members (comma-separated, e.g. Rahul, Aman, Vikas)" className="border p-2 rounded md:col-span-2" value={newTrip.members} onChange={e => setNewTrip({...newTrip, members: e.target.value})} />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Create Trip</button>
          </form>
        </div>

        {/* Trip Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {trips.map(trip => (
            <button
              key={trip.id}
              onClick={() => selectTrip(trip)}
              className={`px-4 py-2 rounded-lg font-medium ${selectedTrip?.id === trip.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
            >
              {trip.title} ({trip.destination})
            </button>
          ))}
        </div>

        {selectedTrip && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Section: Expenses & Add Form */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-3">Add Expense for {selectedTrip.title}</h3>
                <form onSubmit={handleAddExpense} className="grid grid-cols-2 gap-4">
                  <input required placeholder="Expense Title" className="border p-2 rounded" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
                  <input required type="number" placeholder="Amount (₹)" className="border p-2 rounded" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                  <select className="border p-2 rounded" value={newExpense.paidBy} onChange={e => setNewExpense({...newExpense, paidBy: e.target.value})} required>
                    <option value="">Paid By...</option>
                    {selectedTrip.members?.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="border p-2 rounded" value={newExpense.paymentMode} onChange={e => setNewExpense({...newExpense, paymentMode: e.target.value})}>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>

                  {/* File Upload Input */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt / Payment Screenshot (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="border p-2 rounded w-full bg-gray-50 text-sm"
                      onChange={e => setSelectedFile(e.target.files[0])}
                    />
                  </div>

                  <button type="submit" disabled={uploading} className="bg-green-600 text-white p-2 rounded col-span-2 hover:bg-green-700 disabled:bg-gray-400">
                    {uploading ? 'Uploading Receipt...' : 'Log Expense'}
                  </button>
                </form>
              </div>

              {/* Expense History List */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-3">Expense History</h3>
                <div className="divide-y">
                  {expenses.length === 0 ? <p className="text-gray-500 py-2">No expenses added yet.</p> : expenses.map(exp => (
                    <div key={exp.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{exp.title}</p>
                        <p className="text-xs text-gray-500">
                          Paid by <span className="font-semibold">{exp.paidBy}</span> via {exp.paymentMode}
                        </p>
                        {exp.proofUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(exp.proofUrl)}
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            View Receipt Proof ↗
                          </button>
                        )}
                      </div>
                      <span className="font-bold text-gray-700">₹{exp.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section: Settlement */}
            <div className="bg-white p-6 rounded-lg shadow h-fit">
              <h3 className="text-lg font-semibold mb-3">Settlement Summary</h3>
              <div className="space-y-3">
                {settlements.length === 0 ? (
                  <p className="text-sm text-gray-500">All balances are settled.</p>
                ) : (
                  settlements.map((set, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-100 rounded text-sm">
                      <span className="font-bold text-red-700">{set.fromUser}</span> owes{' '}
                      <span className="font-bold text-green-700">{set.toUser}</span>:
                      <div className="text-lg font-bold text-gray-800">₹{set.amount}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal for viewing Receipt Image */}
        {previewImage && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-4 rounded-lg max-w-lg w-full space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-700">Receipt Image</h4>
                <button onClick={() => setPreviewImage(null)} className="text-gray-500 hover:text-black font-bold text-lg">&times;</button>
              </div>
              <img src={previewImage} alt="Receipt Proof" className="max-h-96 w-full object-contain rounded border" />
              <button onClick={() => setPreviewImage(null)} className="w-full bg-gray-200 py-1.5 rounded text-sm font-medium">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}