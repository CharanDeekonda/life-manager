import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, LogOut, DollarSign, Calendar, Pencil, Save, FileDown, FileUp, Upload } from 'lucide-react';

// FIREBASE IMPORTS
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';

const Expenses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userPin = location.state?.pin;
  const fileInputRef = useRef(null); // Ref for hidden file input

  // --- DEFAULT LISTS ---
  const defaultCategories = ["Food", "Metro Ticket (Recharge)", "Ticket", "Parking", "Petrol", "Shopping", "Entertainment", "Others"];
  const defaultAccounts = ["CASH", "HDFC", "SBI", "KOTAK"];

  // --- STATE FOR DROPDOWNS ---
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('customCategories');
    return saved ? JSON.parse(saved) : defaultCategories;
  });

  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('customAccounts');
    return saved ? JSON.parse(saved) : defaultAccounts;
  });

  // --- DATA STATE ---
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    category: 'Food',
    account: 'CASH',
    amount: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Redirect if no PIN
  useEffect(() => {
    if (!userPin) navigate('/');
  }, [userPin, navigate]);

  // --- REAL-TIME SYNC FROM FIREBASE ---
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

  // --- CSV EXPORT FUNCTION ---
  const handleExport = () => {
    if (expenses.length === 0) {
      alert("No data to export!");
      return;
    }

    // 1. Create CSV Header
    const headers = ["Date", "Item", "Category", "Account", "Amount"];
    
    // 2. Map data to rows
    const rows = expenses.map(exp => [
      exp.date,
      `"${exp.item.replace(/"/g, '""')}"`, // Handle commas/quotes in item name
      exp.category,
      exp.account || 'CASH',
      exp.amount
    ]);

    // 3. Join everything
    const csvContent = [
      headers.join(","), 
      ...rows.map(row => row.join(","))
    ].join("\n");

    // 4. Create Download Link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${userPin}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV IMPORT FUNCTION ---
  const handleImportClick = () => {
    fileInputRef.current.click(); // Trigger hidden input
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split("\n");
      
      // Remove header row if present (simple check: if first line contains "Date")
      const startIdx = lines[0].toLowerCase().includes("date") ? 1 : 0;
      
      let count = 0;

      // Loop through lines
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Basic CSV splitting (handling simple cases)
        // Format expected: date, item, category, account, amount
        // NOTE: This basic split might fail if item name has commas. 
        // For simple use, we assume clean CSVs.
        const cols = line.split(",");
        
        if (cols.length >= 5) {
          const newExpense = {
            pin: userPin,
            date: cols[0].trim(),
            item: cols[1].replace(/"/g, '').trim(), // Remove quotes if present
            category: cols[2].trim(),
            account: cols[3].trim(),
            amount: parseFloat(cols[4].trim()),
            createdAt: new Date()
          };

          // Basic validation
          if (newExpense.amount && !isNaN(newExpense.amount)) {
            await addDoc(collection(db, "expenses"), newExpense);
            count++;
          }
        }
      }
      alert(`Successfully imported ${count} expenses!`);
      event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  };

  // --- HANDLERS (Same as before) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category' && value === 'ADD_NEW_CAT') {
      const newCat = prompt("Enter New Category Name:");
      if (newCat) {
        const updatedCats = [...categories, newCat];
        setCategories(updatedCats);
        localStorage.setItem('customCategories', JSON.stringify(updatedCats));
        setFormData({ ...formData, category: newCat });
      }
      return;
    }
    if (name === 'account' && value === 'ADD_NEW_ACC') {
      const newAcc = prompt("Enter New Bank/Account Name:");
      if (newAcc) {
        const updatedAccs = [...accounts, newAcc];
        setAccounts(updatedAccs);
        localStorage.setItem('customAccounts', JSON.stringify(updatedAccs));
        setFormData({ ...formData, account: newAcc });
      }
      return;
    }
    setFormData({ ...formData, [name]: value });
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
      item: formData.item || 'Untitled',
      category: formData.category,
      account: formData.account,
      amount: parseFloat(formData.amount),
      createdAt: new Date()
    };

    try {
      if (isEditing) {
        const expenseRef = doc(db, "expenses", editId);
        await updateDoc(expenseRef, processedData);
        setIsEditing(false);
        setEditId(null);
      } else {
        await addDoc(collection(db, "expenses"), processedData);
      }
      setFormData({
        date: new Date().toISOString().split('T')[0],
        item: '',
        category: 'Food',
        account: 'CASH',
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
      account: expense.account || 'CASH',
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
      <nav className="bg-emerald-900 text-white p-4 shadow-lg flex flex-wrap justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          ₹ Expense Tracker 
          <span className="text-xs bg-emerald-700 px-2 py-0.5 rounded text-emerald-200">Cloud ID: {userPin}</span>
        </h1>
        
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          {/* EXPORT BUTTON */}
          <button onClick={handleExport} className="flex items-center gap-1 text-sm bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded transition border border-emerald-600" title="Download CSV">
            <FileDown size={16} /> <span className="hidden sm:inline">Export</span>
          </button>

          {/* IMPORT BUTTON */}
          <button onClick={handleImportClick} className="flex items-center gap-1 text-sm bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded transition border border-emerald-600" title="Upload CSV">
            <Upload size={16} /> <span className="hidden sm:inline">Import</span>
          </button>
          {/* Hidden Input for File Upload */}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

          {/* LOGOUT */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm bg-emerald-800 hover:bg-red-600 px-3 py-1.5 rounded transition ml-2">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 space-y-8"> 
        
        {/* INPUT FORM */}
        <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 ${isEditing ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-emerald-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{isEditing ? 'Editing Expense...' : 'Add New Expense'}</h3>
            {isEditing && <button onClick={handleCancelEdit} className="text-sm text-red-500 hover:underline">Cancel</button>}
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4"> 
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="p-3 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none" />
            <input type="text" name="item" placeholder="Item Name (Optional)" value={formData.item} onChange={handleChange} className="p-1 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none md:col-span-1" />
            
            <select name="category" value={formData.category} onChange={handleChange} className="p-3 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none">
              {categories.map((cat, index) => <option key={index} value={cat}>{cat}</option>)}
              <option value="ADD_NEW_CAT" className="font-bold text-blue-600 bg-gray-100">+ Add New Category</option>
            </select>


            <div className="relative">
               <span className="absolute left-3 top-3 text-gray-400">₹</span>
               <input type="number" name="amount" placeholder="Amount" value={formData.amount} onChange={handleChange} className="w-full p-3 pl-8 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none" />
            </div>
            
            <select name="account" value={formData.account} onChange={handleChange} className="p-3 bg-white rounded-lg border focus:ring-2 focus:ring-emerald-400 outline-none font-semibold text-emerald-800">
              {accounts.map((acc, index) => <option key={index} value={acc}>{acc}</option>)}
              <option value="ADD_NEW_ACC" className="font-bold text-blue-600 bg-gray-100">+ Add New Account</option>
            </select>
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
            No cloud data found for PIN: {userPin}.<br/>Add an expense or Import a CSV to get started.
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
                      <th className="p-4 font-semibold">Account</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedExpenses[month].map((expense) => (
                      <tr key={expense.id} className={`border-t border-gray-100 hover:bg-gray-50 transition ${editId === expense.id ? 'bg-emerald-50' : ''}`}>
                        <td className="p-4 text-gray-600 text-sm">{expense.date}</td>
                        <td className="p-4 font-medium text-gray-800">{expense.item}</td>
                        <td className="p-4"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{expense.category}</span></td>
                        <td className="p-4 text-sm font-bold text-gray-600">{expense.account || 'CASH'}</td>
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
                      <td colSpan="4" className="p-4 text-right font-bold text-emerald-900 uppercase text-sm">Total for {month}:</td>
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