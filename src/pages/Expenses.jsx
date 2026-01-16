import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, LogOut, DollarSign, Calendar, Pencil, Save, FileDown, Upload } from 'lucide-react';

// FIREBASE IMPORTS
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';

const Expenses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userPin = location.state?.pin;
  const fileInputRef = useRef(null);

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
  
  // --- NOTIFICATION STATE ---
  const [notification, setNotification] = useState('');

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

  // --- HELPER: FORMAT DATE (dd-mm-yyyy) ---
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
  };

  // --- SHOW NOTIFICATION HELPER ---
  const showMessage = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification('');
    }, 3000);
  };

  // --- CSV EXPORT FUNCTION ---
  const handleExport = () => {
    if (expenses.length === 0) {
      alert("No data to export!");
      return;
    }
    const headers = ["Date", "Item", "Category", "Account", "Amount"];
    const rows = expenses.map(exp => [
      formatDate(exp.date), // Export formatted date
      `"${exp.item.replace(/"/g, '""')}"`,
      exp.category,
      exp.account || 'CASH',
      exp.amount
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${userPin}_${formatDate(new Date().toISOString().split('T')[0])}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV IMPORT FUNCTION ---
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split("\n");
      const startIdx = lines[0].toLowerCase().includes("date") ? 1 : 0;
      let count = 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",");
        
        if (cols.length >= 5) {
          // If importing dd-mm-yyyy, we might need to convert back to yyyy-mm-dd for sorting/storage
          // But assuming standard import or re-importing exported file:
          let dateStr = cols[0].trim();
          
          // Simple check if it's dd-mm-yyyy and convert to yyyy-mm-dd for consistent storage
          if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
             const [d, m, y] = dateStr.split('-');
             dateStr = `${y}-${m}-${d}`;
          }

          const newExpense = {
            pin: userPin,
            date: dateStr, 
            item: cols[1].replace(/"/g, '').trim(),
            category: cols[2].trim(),
            account: cols[3].trim(),
            amount: parseFloat(cols[4].trim()),
            createdAt: new Date()
          };
          if (newExpense.amount && !isNaN(newExpense.amount)) {
            await addDoc(collection(db, "expenses"), newExpense);
            count++;
          }
        }
      }
      showMessage(`Imported ${count} expenses successfully`);
      event.target.value = ''; 
    };
    reader.readAsText(file);
  };

  // --- HANDLERS ---
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
      item: formData.item || '-',
      category: formData.category,
      account: formData.account,
      amount: parseFloat(formData.amount),
      createdAt: new Date()
    };

    try {
      if (isEditing) {
        const expenseRef = doc(db, "expenses", editId);
        await updateDoc(expenseRef, processedData);
        showMessage("Updated successfully"); 
        setIsEditing(false);
        setEditId(null);
      } else {
        await addDoc(collection(db, "expenses"), processedData);
        showMessage("Added successfully"); 
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
      alert("Error saving to data");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense?")) {
      await deleteDoc(doc(db, "expenses", id));
      showMessage("Deleted successfully");
    }
  };

  const handleDeleteMonth = async (monthName, monthExpenses) => {
    if (window.confirm(`Are you sure you want to DELETE ALL ${monthExpenses.length} expenses for ${monthName}? This cannot be undone.`)) {
      try {
        const deletePromises = monthExpenses.map(exp => deleteDoc(doc(db, "expenses", exp.id)));
        await Promise.all(deletePromises);
        showMessage("Deleted successfully");
      } catch (error) {
        console.error("Error deleting month:", error);
        alert("Error deleting data");
      }
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

  // --- GROUPING AND SORTING ---
  const getGroupedExpenses = () => {
    const groups = {};
    const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    
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
    <div className="min-h-screen bg-emerald-50 font-sans text-emerald-950 relative">
      
      {/* SUCCESS NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed top-20 right-5 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl font-bold animate-bounce flex items-center gap-2">
           <span>✅ {notification}</span>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-emerald-900 text-white p-4 shadow-lg flex flex-wrap justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          ₹ Expense Tracker 
          <span className="text-xs bg-emerald-700 px-2 py-0.5 rounded text-emerald-200">ID: {userPin}</span>
        </h1>
        
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <button onClick={handleExport} className="flex items-center gap-1 text-sm bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded transition border border-emerald-600" title="Download CSV">
            <FileDown size={16} /> <span className="hidden sm:inline">Export</span>
          </button>

          <button onClick={handleImportClick} className="flex items-center gap-1 text-sm bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded transition border border-emerald-600" title="Upload CSV">
            <Upload size={16} /> <span className="hidden sm:inline">Import</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

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
        {loading && <div className="text-center p-10 text-emerald-600">Loading Data...</div>}

        {/* EXPENSE TABLES */}
        {!loading && Object.keys(groupedExpenses).length === 0 ? (
          <div className="text-center p-10 text-gray-400 bg-white rounded-2xl border border-emerald-100">
            No data found for PIN: {userPin}.<br/>Add an expense or Import a CSV to get started.
          </div>
        ) : (
          Object.keys(groupedExpenses).map((month) => {
            const monthTotal = groupedExpenses[month].reduce((acc, curr) => acc + curr.amount, 0);
            return (
              <div key={month} className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-8">
                <div className="bg-emerald-100 px-6 py-3 border-b border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-emerald-700"/>
                    <h2 className="text-lg font-bold text-emerald-800">{month}</h2>
                  </div>
                  {/* DELETE ALL BUTTON FOR THE MONTH */}
                  <button 
                    onClick={() => handleDeleteMonth(month, groupedExpenses[month])}
                    className="flex items-center gap-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 transition font-bold"
                  >
                    <Trash2 size={14} /> Delete All
                  </button>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead className="bg-emerald-50 text-emerald-900 text-sm uppercase">
                    <tr>
                      <th className="p-4 font-semibold text-gray-500 w-12 text-center">#</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Item</th>
                      <th className="p-4 font-semibold">Category</th>
                      <th className="p-4 font-semibold">Account</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedExpenses[month].map((expense, index) => (
                      <tr key={expense.id} className={`border-t border-gray-100 hover:bg-gray-50 transition ${editId === expense.id ? 'bg-emerald-50' : ''}`}>
                        {/* COUNT CELL */}
                        <td className="p-4 text-gray-400 text-sm font-bold text-center">{index + 1}</td> 
                        
                        {/* FORMATTED DATE */}
                        <td className="p-4 text-gray-800 text-sm">{formatDate(expense.date)}</td>
                        
                        <td className="p-4 font-medium text-gray-800">{expense.item}</td>
                        <td className="p-4 font-medium text-gray-800">{expense.category}</td>
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
                      <td colSpan="5" className="p-4 text-right font-bold text-emerald-900 uppercase text-sm">Total for {month}:</td>
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