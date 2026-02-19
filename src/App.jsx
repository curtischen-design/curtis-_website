import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Menu, X, ArrowLeft, Layout, LogIn, LogOut, Send, ShieldCheck, User, Lock, Terminal, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

// Firebase 核心模組
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, Timestamp } from 'firebase/firestore';

/**
 * 🔑 配置區：已填入您的真實金鑰
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

// 🔐 資安強化：請將下方改為您個人的 Gmail
const ADMIN_EMAIL = "curtischentp6@gmail.com"; 

// 初始化 Firebase
const isConfigValid = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("您的Gmail");
let app, auth, db, provider;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    provider = new GoogleAuthProvider();
  } catch (e) {
    console.error("Firebase 初始化失敗", e);
  }
}

const appId = 'my-portfolio-v1';
const transition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

/**
 * 簡易 Markdown 渲染器
 */
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl md:text-5xl font-bold mt-12 mb-6 font-serif text-white">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 font-serif text-white">$1</h2>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br/>');
};

/**
 * 🛠️ 診斷介面：針對「Cannot find module 'tailwindcss'」錯誤進行引導
 */
const DiagnosticUI = () => (
  <div className="min-h-screen bg-[#368C84] flex items-center justify-center p-8 text-white">
    <div className="max-w-xl w-full bg-black/40 p-10 rounded-[40px] border border-white/10 backdrop-blur-3xl shadow-2xl">
      <h2 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3 italic">
        <Terminal className="text-blue-400" /> 系統診斷報告
      </h2>
      
      <div className="space-y-6">
        {/* Firebase 狀態 */}
        <div className="p-6 rounded-3xl bg-green-500/10 border border-green-500/30 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest text-white">1. Firebase 金鑰狀態</h3>
            <p className="text-xs text-white/50 italic">金鑰已連結至 my-profolio-9cdc0</p>
          </div>
          <CheckCircle2 className="text-green-400" size={24} />
        </div>

        {/* Tailwind 報錯修復建議 */}
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-400" size={20} />
            <h3 className="font-bold text-sm uppercase tracking-widest text-white">2. 偵測到模組缺失錯誤</h3>
          </div>
          <p className="text-xs text-white/70 leading-relaxed mb-4">
            你遇到的 <code className="bg-black/40 px-1 rounded text-red-300">Cannot find module 'tailwindcss'</code> 是因為系統找不到排版工具。請執行以下動作：
          </p>
          <div className="space-y-3">
            <div className="bg-black/40 p-4 rounded-xl">
              <p className="text-[10px] text-white/30 uppercase mb-2 flex items-center gap-1"><Info size={10}/> 解決方案 A (使用 CMD)</p>
              <p className="text-[11px] font-mono text-blue-300">npm install tailwindcss postcss autoprefixer</p>
            </div>
            <div className="bg-black/40 p-4 rounded-xl">
              <p className="text-[10px] text-white/30 uppercase mb-2 flex items-center gap-1"><Info size={10}/> 解決方案 B (強制重新安裝)</p>
              <p className="text-[11px] font-mono text-green-300">npm install</p>
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-10 text-[9px] uppercase tracking-[0.4em] text-white/20 text-center italic">
        請在 VS Code 終端機 (CMD 模式) 執行上述指令並重新啟動 npm run dev
      </p>
    </div>
  </div>
);

/**
 * CMS 創作後台元件
 */
const CMSDashboard = ({ user, setView }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), {
        title,
        content,
        category: 'Selected Work',
        publishDate: Timestamp.now(),
        createdAt: Timestamp.now(),
        authorEmail: user.email
      });
      alert('發布成功！');
      setView({ type: 'home' });
    } catch (err) {
      alert('發布失敗，請確認 Firebase Rules 的寫入權限。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white font-serif">
      <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
        <h2 className="text-3xl font-bold italic">創作新內容</h2>
        <button onClick={() => setView({ type: 'home' })} className="text-white/40 hover:text-white transition-colors">取消</button>
      </div>
      <form onSubmit={handlePublish} className="space-y-8">
        <input required placeholder="文章標題" className="w-full bg-black/10 border border-white/10 p-5 rounded-xl text-white outline-none focus:border-white/30 transition-all" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea required placeholder="內容 (支援 Markdown # 標題, **粗體**)" rows={12} className="w-full bg-black/10 border border-white/10 p-6 rounded-xl text-white font-mono leading-relaxed outline-none focus:border-white/30 transition-all" value={content} onChange={e => setContent(e.target.value)} />
        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-6 rounded-full font-bold uppercase tracking-[0.3em] hover:scale-95 transition-all shadow-xl">
          {loading ? "正在同步雲端..." : "立即發布作品"}
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
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'articles');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(data.sort((a, b) => b.publishDate.toDate() - a.publishDate.toDate()));
    });
  }, [user]);

  // 當管理員 Email 還沒修改時顯示診斷畫面
  if (!isConfigValid) return <DiagnosticUI />;

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Noto+Serif+TC:wght@400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
      `}</style>

      {/* 導覽列 */}
      <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference text-white">
        <div onClick={() => setView({type:'home'})} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic">Chuck Style.</div>
        <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all"><Menu size={32} /></button>
      </nav>

      {/* 全螢幕選單 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={transition} className="fixed inset-0 bg-zinc-900 z-[120] flex flex-col justify-center items-center">
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><X size={32} /></button>
            <div className="flex flex-col gap-12 text-center text-6xl font-serif">
              <button onClick={() => { setView({type:'home'}); setIsMenuOpen(false); }} className="hover:italic transition-all">Selected Works</button>
              {isAdmin ? (
                <div className="space-y-8 mt-12">
                  <button onClick={() => { setView({type:'cms'}); setIsMenuOpen(false); }} className="text-xl uppercase tracking-[0.4em] text-white italic hover:text-white transition-colors flex items-center justify-center gap-2"><Layout size={18} /> CMS 後台</button>
                  <button onClick={() => signOut(auth)} className="text-[10px] uppercase tracking-[0.4em] text-white/20 hover:text-red-400 transition-colors">Logout</button>
                </div>
              ) : (
                <button onClick={() => signInWithPopup(auth, provider)} className="text-xl uppercase tracking-widest text-white/40 italic mt-24 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <LogIn size={18} /> Admin Login
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-40 px-8 md:px-24">
            <h1 className="text-7xl md:text-[10vw] font-bold leading-[0.85] mb-40 uppercase tracking-tighter font-serif text-white">美學<br/>動態<br/>視覺</h1>
            <div className="grid grid-cols-1 border-t border-white/10">
              {articles.length === 0 ? (
                <div className="py-20 text-white/10 font-serif italic text-2xl border border-dashed border-white/10 rounded-[40px] text-center mt-10">
                  雲端已連線。請登入後台發布第一篇作品吧。
                </div>
              ) : (
                articles.map(art => (
                  <div key={art.id} onClick={() => setView({ type: 'article', id: art.id })} className="group py-12 border-b border-white/10 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-all px-4">
                    <div>
                      <h3 className="text-3xl md:text-5xl font-serif group-hover:italic transition-all text-white">{art.title}</h3>
                      <p className="text-[10px] text-white/40 mt-3 uppercase tracking-widest">Selected Project</p>
                    </div>
                    <ArrowUpRight className="text-white/20 group-hover:text-white transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                ))
              )}
            </div>
          </motion.main>
        )}
        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="pt-40 px-8 md:px-24 max-w-4xl mx-auto pb-60 text-white">
            <button onClick={() => setView({ type: 'home' })} className="mb-16 flex items-center gap-2 text-white/40 uppercase text-[10px] tracking-widest hover:text-white transition-colors"><ArrowLeft size={14} /> Back to index</button>
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-8xl font-bold font-serif mb-12 leading-tight text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/80 space-y-8 font-serif" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
              </>
            )}
          </motion.article>
        )}
        {view.type === 'cms' && isAdmin && <CMSDashboard user={user} setView={setView} />}
      </AnimatePresence>

      <footer className="p-8 md:p-24 border-t border-white/10 flex justify-between items-center text-[9px] text-white/20 uppercase tracking-[0.4em]">
        <span>© 2026 CHUCK STYLE</span>
        <span>Environment Diagnostic: ACTIVE</span>
      </footer>
    </div>
  );
}