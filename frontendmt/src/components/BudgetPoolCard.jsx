import React from 'react';

export default function BudgetPoolCard({ members = [], expenses = [] }) {
  const totalPoolTarget = members.reduce(
    (acc, m) => acc + (parseFloat(m.contribution) || 0), 
    0
  );

  const totalSpent = expenses.reduce(
    (acc, e) => acc + (parseFloat(e.amount) || 0), 
    0
  );

  const balanceRemaining = totalPoolTarget - totalSpent;
  const percentageUsed = totalPoolTarget > 0 
    ? Math.min(Math.round((totalSpent / totalPoolTarget) * 100), 100) 
    : 0;

  const isDeficit = balanceRemaining < 0;

  return (
    <div className="bg-white dark:bg-csk-blueDark border border-gray-200 dark:border-csk-blue/50 rounded-2xl shadow-lg p-6 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-csk-blue dark:text-csk-yellow flex items-center gap-2">
          <span>💰</span> Shared Budget Pool
        </h3>
        <span className={`text-xs px-3 py-1 font-semibold rounded-full uppercase tracking-wider ${
          isDeficit 
            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' 
            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
        }`}>
          {isDeficit ? 'Deficit / Over Budget' : 'Within Budget'}
        </span>
      </div>

      {/* Main 3 Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
        <div className="bg-gray-50 dark:bg-csk-slate/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Total Pool Fund</p>
          <p className="text-2xl font-black text-csk-blue dark:text-white mt-1">₹{totalPoolTarget.toLocaleString()}</p>
        </div>

        <div className="bg-gray-50 dark:bg-csk-slate/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Total Deducted</p>
          <p className="text-2xl font-black text-csk-yellowDark dark:text-csk-yellow mt-1">₹{totalSpent.toLocaleString()}</p>
        </div>

        <div className="bg-gray-50 dark:bg-csk-slate/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Pool Balance</p>
          <p className={`text-2xl font-black mt-1 ${isDeficit ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
            ₹{balanceRemaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
          <span>Pool Consumption</span>
          <span>{percentageUsed}% Spent</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isDeficit ? 'bg-red-500' : 'bg-csk-yellow'
            }`} 
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
      </div>

      {/* Member Breakdown Table */}
      <div>
        <h4 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
          Member Contributions
        </h4>
        <div className="space-y-2">
          {members.map((m, idx) => (
            <div 
              key={idx} 
              className="flex justify-between items-center text-sm py-2 px-3 rounded-lg bg-gray-50 dark:bg-csk-blue/40 border border-gray-100 dark:border-csk-blue/30"
            >
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {m.firstName} {m.lastName}
              </span>
              <span className="font-bold text-csk-blue dark:text-csk-yellow">
                ₹{(parseFloat(m.contribution) || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}