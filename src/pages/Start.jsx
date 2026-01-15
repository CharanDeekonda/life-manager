import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, CheckSquare, ArrowRight } from 'lucide-react';

const Start = () => {
  const navigate = useNavigate();
  
  const [expenseKey, setExpenseKey] = useState('');
  const [todoKey, setTodoKey] = useState('');

  // Handle Expense Login
  const handleExpenseLogin = (e) => {
    e.preventDefault();
    if (!expenseKey.trim()) return;

    // Navigate to Expenses page and PASS THE KEY
    navigate('/expenses', { state: { pin: expenseKey } });
  };

  // Handle Todo Login
  const handleTodoLogin = (e) => {
    e.preventDefault();
    if (!todoKey.trim()) return;

    // Navigate to Todos page and PASS THE KEY
    navigate('/todos', { state: { pin: todoKey } });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full font-sans">
      
      {/* LEFT SIDE: Expense Tracker */}
      <div className="w-full md:w-1/2 bg-emerald-900 text-white flex flex-col justify-center items-center p-10 transition-all duration-300 hover:bg-emerald-950">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Wallet className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 text-4xl font-bold tracking-tight">Expense Tracker</h2>
          </div>
          
          <form onSubmit={handleExpenseLogin} className="mt-8 space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Your Access PIN"
                className="w-full px-4 py-3 rounded-lg bg-emerald-800 border border-emerald-700 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center tracking-widest text-xl"
                value={expenseKey}
                onChange={(e) => setExpenseKey(e.target.value)}
                maxLength={6} 
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-semibold text-emerald-950 transition duration-200"
            >
              Access Sheet <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT SIDE: Todo List */}
      <div className="w-full md:w-1/2 bg-slate-900 text-white flex flex-col justify-center items-center p-10 transition-all duration-300 hover:bg-slate-950">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckSquare className="mx-auto h-16 w-16 text-indigo-400" />
            <h2 className="mt-4 text-4xl font-bold tracking-tight">Daily Todo</h2>
          </div>
          
          <form onSubmit={handleTodoLogin} className="mt-8 space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Your Access PIN"
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-center tracking-widest text-xl"
                value={todoKey}
                onChange={(e) => setTodoKey(e.target.value)}
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition duration-200"
            >
              Access List <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default Start;