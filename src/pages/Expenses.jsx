import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, LogOut, DollarSign, Calendar, Pencil, Save } from 'lucide-react';

// FIREBASE IMPORTS
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';

const Expenses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userPin = location.state?.pin;

  // State
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    category: 'Food',
    account: 'CASH', // Added Default Account
    amount: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Redirect if no PIN
  useEffect(() => {
    if (!userPin) navigate('/');
  }, [userPin, navigate]);

  // --- 1. REAL-TIME SYNC FROM FIREBASE ---
  useEffect(() => {
    if (!userPin) return;

    const q = query(collection(db, "expenses"), where("pin", "==", userPin));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(expensesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userPin]);

  // --- Handlers ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) {
      alert("Please enter an amount.");
      return;
    }

    const processedData = {
      pin: userPin,
      date: formData.date,
      item: formData.item || '-',
      category: formData.category,
      account: formData.account, // Saving Account Info
      amount: parseFloat(formData.amount),
      createdAt: new Date()
    };

    try {
      if (isEditing) {
        // UPDATE FIRESTORE
        const expenseRef = doc(db, "expenses", editId);
        await updateDoc(expenseRef, processedData);
        setIsEditing(false);
        setEditId(null);
      } else {
        // ADD TO FIRESTORE
        await addDoc(collection(db, "expenses"), processedData);
      }

      // Reset Form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        item: '',
        category: 'Food',
        account: 'CASH', // Reset to default
        amount: ''
      });
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error saving to cloud");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense?")) {
      await deleteDoc(doc(db, "expenses", id));
    }
  };

  const handleEditClick = (expense) => {
    setFormData({
      date: expense.date,
      item: expense.item,
      category: expense.category,
      account: expense.account || 'CASH', // Handle old data that might not have account
      amount: expense.amount
    });
    setIsEditing(true);
    setEditId(expense.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item: '',
      category: 'Food',
      account: 'CASH',
      amount: ''
    });
  };

  // Grouping Logic
  const getGroupedExpenses = () => {
    const groups = {};
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedExpenses.forEach(expense => {
      const dateObj = new Date(expense.date);
      const monthYear = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(expense);
    });
    return groups;
  };

  const groupedExpenses = getGroupedExpenses();

  if (!userPin) return null;

  return (
    <div className="min-h-screen bg-emerald-50 font-sans text-emerald-950">
      
      {/* NAVBAR */}
      <nav className="bg-emerald-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          ₹ Expense Tracker 
          <span className="text-xs bg-emerald-700 px-2 py-0.5 rounded text-emerald-200">Cloud ID: {userPin}</span>
        </h1>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded transition">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6 space-y-8"> 
        {/* Changed max-w-5xl to max-w-6xl to fit the extra column nicely */}
        
        {/* INPUT FORM */}
        <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 ${isEditing ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-emerald-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{isEditing ? 'Editing Expense...' : 'Add New Expense'}</h3>
            {isEditing && <button onClick={handleCancelEdit} className="text-sm text-red-500 hover:underline">Cancel</button>}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4"> 
             {/* Changed grid cols to 6 to fit new field */}
            
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="p-3 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none" />
            
            <input type="text" name="item" placeholder="Item Name (Optional)" value={formData.item} onChange={handleChange} className="p-3 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none md:col-span-2" />
            
            <select name="category" value={formData.category} onChange={handleChange} className="p-3 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none">
              <option>Food</option>
              <option>Metro Ticket (Recharge)</option>
              <option>Ticket</option>
              <option>Parking</option>
              <option>Shopping</option>
              <option>Entertainment</option>
              <option>Others</option>
            </select>

            {/* NEW BANK ACCOUNT DROPDOWN */}
            <select name="account" value={formData.account} onChange={handleChange} className="p-3 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none font-semibold text-emerald-800">
              <option value="CASH">CASH</option>
              <option value="HDFC">HDFC</option>
              <option value="SBI">SBI</option>
              <option value="KOTAK">KOTAK</option>
            </select>

            <div className="relative">
               <span className="absolute left-3 top-3 text-gray-400">₹</span>
               <input type="number" name="amount" placeholder="Amount" value={formData.amount} onChange={handleChange} className="w-full p-3 pl-8 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none" />
            </div>
          </form>
          <button onClick={handleSubmit} className={`mt-4 w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition ${isEditing ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            {isEditing ? <><Save size={20} /> Update Expense</> : <><Plus size={20} /> Add Expense</>}
          </button>
        </div>

        {/* LOADING STATE */}
        {loading && <div className="text-center p-10 text-emerald-600">Loading Cloud Data...</div>}

        {/* EXPENSE TABLES */}
        {!loading && Object.keys(groupedExpenses).length === 0 ? (
          <div className="text-center p-10 text-gray-400 bg-white rounded-2xl border border-emerald-100">
            No cloud data found for PIN: {userPin}.
          </div>
        ) : (
          Object.keys(groupedExpenses).map((month) => {
            const monthTotal = groupedExpenses[month].reduce((acc, curr) => acc + curr.amount, 0);
            return (
              <div key={month} className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-8">
                <div className="bg-emerald-100 px-6 py-3 border-b border-emerald-200 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-700"/>
                  <h2 className="text-lg font-bold text-emerald-800">{month}</h2>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-emerald-50 text-emerald-900 text-sm uppercase">
                    <tr>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Item</th>
                      <th className="p-4 font-semibold">Category</th>
                      <th className="p-4 font-semibold">Account</th> {/* New Header */}
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedExpenses[month].map((expense) => (
                      <tr key={expense.id} className={`border-t border-gray-100 hover:bg-gray-50 transition ${editId === expense.id ? 'bg-emerald-50' : ''}`}>
                        <td className="p-4 text-gray-600 text-sm">{expense.date}</td>
                        <td className="p-4 font-medium text-gray-800">{expense.item}</td>
                        <td className="p-4 font-medium text-gray-800">{expense.category}</td>
                        
                        {/* New Account Column */}
                        <td className="p-4 text-sm font-bold text-gray-600">
                          {expense.account || 'CASH'}
                        </td>
                        
                        <td className="p-4 font-bold text-emerald-700">₹{expense.amount}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEditClick(expense)} className="text-blue-400 hover:text-blue-600 p-2"><Pencil size={18} /></button>
                            <button onClick={() => handleDelete(expense.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50 border-t-2 border-emerald-100">
                      <td colSpan="4" className="p-4 text-right font-bold text-emerald-900 uppercase text-sm">Total for {month}:</td> {/* Increased colSpan */}
                      <td colSpan="2" className="p-4 font-extrabold text-xl text-emerald-700">₹{monthTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Expenses;