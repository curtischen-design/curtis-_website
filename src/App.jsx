import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Menu, X, ArrowLeft, Save, Layout, LogIn, LogOut, ShieldCheck, Terminal } from 'lucide-react';

// Firebase 核心模組
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, Timestamp } from 'firebase/firestore';

/**
 * 🔑 您的 Firebase 配置
 */
const firebaseConfig = {
  apiKey: "AIzaSyAuGzaB70YTeYDrTzJk-IWtygBzkZvkpPM",
  authDomain: "my-profolio-9cdc0.firebaseapp.com",
  projectId: "my-profolio-9cdc0",
  storageBucket: "my-profolio-9cdc0.firebasestorage.app",
  messagingSenderId: "491917375774",
  appId: "1:491917375774:web:bfae2a4fd2b3af4f0fb10f",
  measurementId: "G-RG0GRM30J2"
};

// 🔐 管理員設定：已更新為您的 Google 帳號 Email
const ADMIN_EMAIL = "curtischentp6@gmail.com"; 

// 初始化 Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const appId = 'my-portfolio-v1';

const transition = { duration: 1.2, ease: [0.22, 1, 0.36, 1] };

// Markdown 渲染器
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl md:text-6xl font-bold mt-12 mb-8 font-serif leading-tight text-white">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl md:text-3xl font-bold mt-10 mb-6 font-serif text-white">$1</h2>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br/>');
};

/**
 * 管理員發文介面 (CMS Dashboard)
 */
const CMSDashboard = ({ user, setView }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), {
        title,
        content,
        publishDate: Timestamp.now(),
        createdAt: Timestamp.now(),
        authorEmail: user.email
      });
      alert('發布成功！');
      setView({ type: 'home' });
    } catch (err) {
      alert('發布失敗，請檢查 Firebase Rules 寫入權限。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <h2 className="text-4xl font-serif italic text-white">New Project.</h2>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors">Cancel</button>
      </div>
      <form onSubmit={handlePublish} className="space-y-12">
        <input required placeholder="Project Title" className="w-full bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-white transition-all text-white" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea required placeholder="Write your story in Markdown..." rows={12} className="w-full bg-black/5 border border-white/5 p-8 rounded-3xl text-white/80 font-mono leading-relaxed outline-none focus:border-white/20 transition-all" value={content} onChange={e => setContent(e.target.value)} />
        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl">
          {loading ? "Syncing..." : "Publish to Gallery"}
        </button>
      </form>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState({ type: 'home', id: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [articles, setArticles] = useState([]);
  const [user, setUser] = useState(null);

  const isAdmin = user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'articles');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(data.sort((a, b) => b.publishDate.toDate() - a.publishDate.toDate()));
    });
  }, []);

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
      `}</style>

      {/* 導航欄位 (Navigation) */}
      <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference">
        <div onClick={() => setView({type:'home'})} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic text-white">Curtis Chen</div>
        <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all">
          <Menu size={32} color="white" />
        </button>
      </nav>

      {/* 全螢幕選單 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={transition} className="fixed inset-0 bg-zinc-900 z-[120] flex flex-col justify-center items-center">
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 text-white/30 hover:text-white"><X size={32} /></button>
            <div className="flex flex-col gap-12 text-center text-7xl font-serif">
              <button onClick={() => { setView({type:'home'}); setIsMenuOpen(false); }} className="hover:italic transition-all text-white">Selected.</button>
              {isAdmin ? (
                <button onClick={() => { setView({type:'cms'}); setIsMenuOpen(false); }} className="text-xl uppercase tracking-[0.4em] text-white/40 italic hover:text-white">Admin CMS</button>
              ) : (
                <button onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))} className="text-xl uppercase tracking-[0.4em] text-white/20 italic hover:text-white transition-colors">Login</button>
              )}
            </div>
            {user && <button onClick={() => signOut(auth)} className="absolute bottom-12 text-[10px] uppercase tracking-widest text-white/10 hover:text-red-400 transition-colors">Logout: {user.email}</button>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24">
            <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, ...transition }} className="text-7xl md:text-[11vw] font-bold leading-[0.82] mb-48 uppercase tracking-tighter font-serif text-white">
              美學<br/>動態<br/>視覺
            </motion.h1>
            
            <div className="grid grid-cols-1 border-t border-white/10 mb-40">
              {articles.length === 0 ? (
                <div className="py-32 text-white/10 font-serif italic text-3xl border border-dashed border-white/5 rounded-[60px] text-center mt-12">
                  No projects yet.
                </div>
              ) : (
                articles.map((art, index) => (
                  <motion.div 
                    key={art.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    transition={{ delay: index * 0.1, ...transition }}
                    onClick={() => setView({ type: 'article', id: art.id })} 
                    className="group py-16 border-b border-white/10 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] transition-all px-8 -mx-8"
                  >
                    <div>
                      <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-700 text-white">{art.title}</h3>
                      <p className="text-[10px] text-white/30 mt-4 uppercase tracking-[0.3em]">Project — 0{index + 1}</p>
                    </div>
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-700 text-white">
                      <ArrowUpRight size={24} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.main>
        )}

        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-5xl mx-auto pb-60">
            <button onClick={() => setView({ type: 'home' })} className="mb-20 flex items-center gap-3 text-white/30 uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back to Gallery
            </button>
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-6xl md:text-9xl font-bold font-serif mb-20 leading-[0.9] tracking-tighter text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-10 font-serif max-w-3xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
              </>
            )}
          </motion.article>
        )}

        {view.type === 'cms' && isAdmin && <CMSDashboard user={user} setView={setView} />}
      </AnimatePresence>

      {/* 頁腳 (Footer) */}
      <footer className="p-8 md:p-24 border-t border-white/5 flex justify-between items-center text-[8px] text-white/20 uppercase tracking-[0.5em] font-light">
        <span>© 2026 Curtis Chen — DIGITAL DESIGN</span>
        <span className="flex items-center gap-2"><ShieldCheck size={10}/> Authenticated</span>
      </footer>
    </div>
  );
}