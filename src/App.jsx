import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Menu, X, ArrowLeft, Save, Layout, LogIn, LogOut, ShieldCheck, Tag, Hash, Filter } from 'lucide-react';

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

// 🔐 管理員設定
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
 * 元件：管理員發文介面 (新增標籤功能)
 */
const CMSDashboard = ({ user, setView }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState(''); // 以逗號分隔的標籤字串
  const [loading, setLoading] = useState(false);

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 將字串轉為陣列，移除空白與重複項
    const tags = tagsInput.split(',')
      .map(t => t.trim())
      .filter(t => t !== '');

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), {
        title,
        content,
        tags, // 儲存標籤陣列
        publishDate: Timestamp.now(),
        createdAt: Timestamp.now(),
        authorEmail: user.email
      });
      alert('作品已成功同步至雲端！');
      setView({ type: 'home' });
    } catch (err) {
      alert('發布失敗，請確認 Firebase Rules 設定。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-4xl font-serif italic">New Creation.</h2>
          <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest italic">Curating as {user.email}</p>
        </div>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors">Cancel</button>
      </div>
      <form onSubmit={handlePublish} className="space-y-12">
        <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Project Title</label>
            <input required placeholder="給作品一個響亮的標題" className="w-full bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-white transition-all text-white" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2"><Hash size={10}/> Categories / Hashtags (用英文逗號分隔)</label>
            <input placeholder="例如：平面設計, 品牌識別, 2026" className="w-full bg-transparent border-b border-white/10 py-4 text-lg outline-none focus:border-white transition-all text-white/70" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
        </div>

        <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Markdown Content</label>
            <textarea required placeholder="使用 Markdown 描述你的設計歷程..." rows={12} className="w-full bg-black/5 border border-white/5 p-8 rounded-3xl text-white/80 font-mono leading-relaxed outline-none focus:border-white/20 transition-all" value={content} onChange={e => setContent(e.target.value)} />
        </div>

        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl">
          {loading ? "Archiving..." : "Publish to Gallery"}
        </button>
      </form>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState({ type: 'home', id: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [articles, setArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All'); // 目前篩選的類別
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

  // 取得所有作品中不重複的標籤列表
  const allCategories = ['All', ...new Set(articles.flatMap(art => art.tags || []))];

  // 根據選擇的類別篩選作品
  const filteredArticles = activeCategory === 'All' 
    ? articles 
    : articles.filter(art => art.tags && art.tags.includes(activeCategory));

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      setIsMenuOpen(false);
    } catch (error) {
      alert("登入失敗，請確認 Firebase 授權網域。");
    }
  };

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference text-white">
        <div onClick={() => setView({type:'home'})} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic">Curtis Chen</div>
        <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all">
          <Menu size={32} />
        </button>
      </nav>

      {/* Fullscreen Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={transition} className="fixed inset-0 bg-zinc-900 z-[120] flex flex-col justify-center items-center">
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 text-white/30 hover:text-white"><X size={32} /></button>
            <div className="flex flex-col gap-12 text-center text-7xl font-serif">
              <button onClick={() => { setView({type:'home'}); setIsMenuOpen(false); }} className="hover:italic transition-all text-white">Gallery.</button>
              {isAdmin ? (
                <button onClick={() => { setView({type:'cms'}); setIsMenuOpen(false); }} className="text-xl uppercase tracking-[0.4em] text-white/40 italic hover:text-white">Admin CMS</button>
              ) : (
                <button onClick={handleLogin} className="text-xl uppercase tracking-[0.4em] text-white/20 italic hover:text-white transition-colors">Admin Login</button>
              )}
            </div>
            {user && (
              <div className="absolute bottom-12 flex flex-col items-center gap-4">
                <p className="text-white/20 text-[10px] tracking-widest uppercase italic">Session: {user.email}</p>
                <button onClick={() => signOut(auth)} className="text-[10px] uppercase tracking-widest text-red-400/40 hover:text-red-400">Logout</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24">
            <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, ...transition }} className="text-7xl md:text-[11vw] font-bold leading-[0.82] mb-12 uppercase tracking-tighter font-serif text-white">
              美學<br/>動態<br/>視覺
            </motion.h1>

            {/* 分類篩選列 */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4 overflow-x-auto py-8 mb-20 border-b border-white/5 scrollbar-hide sticky top-0 bg-[#368C84]/80 backdrop-blur-md z-50"
            >
                <span className="text-[10px] uppercase tracking-widest text-white/30 mr-4 flex items-center gap-2 flex-shrink-0"><Filter size={10}/> Filter by</span>
                {allCategories.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-2 rounded-full text-xs uppercase tracking-widest transition-all border whitespace-nowrap ${
                            activeCategory === cat 
                            ? 'bg-white text-[#368C84] border-white font-bold' 
                            : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </motion.div>
            
            <div className="grid grid-cols-1 mb-40">
              {filteredArticles.length === 0 ? (
                <div className="py-32 text-white/10 font-serif italic text-3xl border border-dashed border-white/5 rounded-[60px] text-center">
                  {activeCategory === 'All' ? 'No projects yet.' : `No projects found in "${activeCategory}"`}
                </div>
              ) : (
                filteredArticles.map((art, index) => (
                  <motion.div 
                    key={art.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, ...transition }}
                    onClick={() => setView({ type: 'article', id: art.id })} 
                    className="group py-16 border-b border-white/10 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] transition-all px-8 -mx-8"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-6">
                        {art.tags && art.tags.map(tag => (
                            <span key={tag} className="text-[9px] uppercase tracking-widest border border-white/20 px-3 py-1 rounded-full text-white/40 group-hover:border-white/40 group-hover:text-white transition-all">#{tag}</span>
                        ))}
                      </div>
                      <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-700 text-white leading-tight">{art.title}</h3>
                    </div>
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-700 ml-8 flex-shrink-0">
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
                <div className="flex flex-wrap gap-3 mb-8">
                  {articles.find(a => a.id === view.id).tags?.map(tag => (
                      <span key={tag} className="text-[10px] uppercase tracking-[0.2em] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-white/60">#{tag}</span>
                  ))}
                </div>
                <h1 className="text-6xl md:text-9xl font-bold font-serif mb-20 leading-[0.9] tracking-tighter text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-10 font-serif max-w-3xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
              </>
            )}
          </motion.article>
        )}

        {view.type === 'cms' && isAdmin && <CMSDashboard user={user} setView={setView} />}
      </AnimatePresence>

      <footer className="p-8 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/20 uppercase tracking-[0.5em] font-light">
        <div className="flex flex-col items-center md:items-start gap-2">
            <span>© 2026 Curtis Chen — DIGITAL DESIGN</span>
            <span className="flex items-center gap-2"><ShieldCheck size={10}/> Authenticated via Firebase Cloud</span>
        </div>
        <div className="flex gap-8 italic">
            <button onClick={() => setView({type:'home'})} className="hover:text-white transition-colors">Portfolio</button>
            <button className="hover:text-white transition-colors cursor-not-allowed opacity-30">Archives</button>
            <button className="hover:text-white transition-colors cursor-not-allowed opacity-30">Contact</button>
        </div>
      </footer>
    </div>
  );
}