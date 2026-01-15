import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, LogOut, CheckSquare, Square, XCircle } from 'lucide-react';

// FIREBASE IMPORTS
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';

const Todos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userPin = location.state?.pin;

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!userPin) navigate('/');
  }, [userPin, navigate]);

  // --- 1. REAL-TIME SYNC ---
  useEffect(() => {
    if (!userPin) return;
    const q = query(collection(db, "todos"), where("pin", "==", userPin));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTodos(todosData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userPin]);

  // --- Handlers ---
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    await addDoc(collection(db, "todos"), {
      pin: userPin,
      text: input,
      completed: false,
      createdAt: new Date().toLocaleDateString()
    });
    setInput('');
  };

  const toggleComplete = async (todo) => {
    const todoRef = doc(db, "todos", todo.id);
    await updateDoc(todoRef, {
      completed: !todo.completed
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "todos", id));
  };

  const clearCompleted = async () => {
    if (window.confirm("Remove all completed tasks?")) {
      const completedTodos = todos.filter(t => t.completed);
      // Delete one by one (Firestore doesn't support 'delete all where...' in client SDK easily)
      completedTodos.forEach(async (todo) => {
        await deleteDoc(doc(db, "todos", todo.id));
      });
    }
  };

  const sortedTodos = [...todos].sort((a, b) => Number(a.completed) - Number(b.completed));
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  if (!userPin) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-slate-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CheckSquare className="text-indigo-400" /> Daily Tasks
          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">Cloud ID: {userPin}</span>
        </h1>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {totalCount > 0 && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between text-sm font-semibold text-slate-500 mb-2"><span>Progress</span><span>{progress}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleAdd} className="flex gap-4">
            <input type="text" placeholder="What needs to be done?" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg" />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl transition shadow-md"><Plus size={24} /></button>
          </form>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-center text-slate-400">Syncing with cloud...</div>}
          {!loading && todos.length === 0 && <div className="text-center p-12 text-slate-400"><p>No cloud tasks yet.</p></div>}
          
          {sortedTodos.map((todo) => (
            <div key={todo.id} className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${todo.completed ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleComplete(todo)}>
                <div className={`transition-colors ${todo.completed ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400'}`}>
                  {todo.completed ? <CheckSquare size={24} /> : <Square size={24} />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-lg transition-all ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{todo.text}</span>
                  <span className="text-xs text-slate-400">{todo.createdAt}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(todo.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={20} /></button>
            </div>
          ))}
        </div>

        {completedCount > 0 && (
          <div className="text-center">
            <button onClick={clearCompleted} className="text-sm text-slate-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto"><XCircle size={16} /> Clear Completed</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Todos;