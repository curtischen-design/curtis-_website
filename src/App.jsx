import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, Send, ChevronRight 
} from 'lucide-react';

// Firebase 核心模組
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, Timestamp } from 'firebase/firestore';

/**
 * 🔑 Firebase 配置
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

const ADMIN_EMAIL = "curtischentp6@gmail.com"; 

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const appId = 'my-portfolio-v1';

const transition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

// Markdown 渲染器
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl md:text-6xl font-bold mt-12 mb-8 font-serif text-white">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl md:text-3xl font-bold mt-10 mb-6 font-serif text-white">$1</h2>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br/>');
};

/**
 * 🛠️ CMS 管理員發文後台
 */
const CMSDashboard = ({ user, setView }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('作品輯錄');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ["關於我", "作品輯錄", "活動行程", "合作邀約", "跟我說話", "書與課程"];

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), {
        title,
        category,
        content,
        tags,
        publishDate: Timestamp.now(),
        authorEmail: user.email
      });
      alert('發布成功！');
      setView({ type: 'home' });
    } catch (err) {
      alert('發布失敗，請檢查規則。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <h2 className="text-4xl font-serif italic font-light">新增內容.</h2>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 text-[10px] tracking-widest hover:text-white uppercase">取消</button>
      </div>
      <form onSubmit={handlePublish} className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/30">標題</label>
            <input required className="w-full bg-transparent border-b border-white/10 py-2 text-xl font-serif outline-none focus:border-white transition-all" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/30">分類</label>
            <select className="w-full bg-transparent border-b border-white/10 py-2 text-xl font-serif outline-none focus:border-white" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c} className="bg-zinc-900" value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">標籤 (用逗號分隔)</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-sm outline-none focus:border-white text-white/60" placeholder="例如: 平面設計, 攝影, 2026" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">內文 (Markdown)</label>
          <textarea required rows={10} className="w-full bg-white/5 border border-white/5 p-6 rounded-2xl text-white/80 font-mono text-sm leading-relaxed outline-none focus:border-white/20" value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-white text-black py-6 rounded-full font-bold uppercase tracking-[0.4em] hover:scale-[0.98] transition-all flex items-center justify-center gap-2">
          {loading ? "上傳中..." : <><Plus size={18}/> 確認發布</>}
        </button>
      </form>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState({ type: 'home', id: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
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

  // 搜尋與篩選邏輯
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesCategory = activeCategory === 'All' || art.category === activeCategory || (art.tags && art.tags.includes(activeCategory));
      const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            art.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [articles, activeCategory, searchQuery]);

  const allTags = ['All', ...new Set(articles.flatMap(art => [art.category, ...(art.tags || [])]))].filter(Boolean);

  const menuItems = ["關於我", "作品輯錄", "活動行程", "合作邀約", "跟我說話", "書與課程"];

  return (
    <div className="bg-[#0c0c0c] text-white min-h-screen font-sans selection:bg-white selection:text-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@300;400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      {/* 導航欄 */}
      <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference">
        <div onClick={() => { setView({type:'home'}); setActiveCategory('All'); setSearchQuery(''); }} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic">Curtis Chen</div>
        <div className="flex items-center gap-8">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 transition-all"><Search size={24} /></button>
          <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all"><Menu size={32} /></button>
        </div>
      </nav>

      {/* 搜尋欄 (摺疊式) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <div className="max-w-4xl mx-auto relative">
              <input 
                autoFocus
                placeholder="搜尋作品或標籤..." 
                className="w-full bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-full text-xl outline-none focus:border-white/30 transition-all font-serif"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-8 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X size={20}/></button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 仿 image_727b98 全螢幕選單 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#0c0c0c] z-[120] flex flex-col p-12">
            <div className="flex justify-end mb-auto">
              <button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-all duration-500"><X size={48} strokeWidth={1} /></button>
            </div>
            
            {/* 橫向選單文字 */}
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 text-3xl md:text-5xl font-serif text-center mb-auto">
              {menuItems.map((item, i) => (
                <motion.button 
                  key={item} 
                  initial={{ y: 20, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.1 + (i * 0.05) }}
                  onClick={() => { setActiveCategory(item); setView({type:'home'}); setIsMenuOpen(false); }}
                  className="hover:italic hover:scale-110 transition-all duration-500 font-light tracking-tight"
                >
                  {item}
                </motion.button>
              ))}
            </div>

            {/* 底部社群圖示與版權 */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-t border-white/5 pt-12">
              <div className="flex gap-8 text-white/40">
                <a href="#" className="hover:text-white transition-colors"><Facebook size={20}/></a>
                <a href="#" className="hover:text-white transition-colors"><Youtube size={20}/></a>
                <a href="#" className="hover:text-white transition-colors"><Mic size={20}/></a>
              </div>
              
              <div className="flex flex-col items-end gap-4">
                {isAdmin ? (
                  <button onClick={() => { setView({type:'cms'}); setIsMenuOpen(false); }} className="text-[10px] uppercase tracking-[0.5em] text-white/30 hover:text-white transition-colors border border-white/20 px-6 py-2 rounded-full">Admin CMS</button>
                ) : (
                  <button onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))} className="text-[10px] uppercase tracking-[0.5em] text-white/20 hover:text-white transition-colors">Login</button>
                )}
                <p className="text-[8px] uppercase tracking-[0.5em] text-white/10 italic">© 2026 Curtis Chen. All Rights Reserved</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40">
            {/* 標題區域 */}
            <div className="mb-32">
              <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={transition} className="text-7xl md:text-[12vw] font-bold leading-[0.8] mb-12 uppercase tracking-tighter font-serif">
                {activeCategory === 'All' ? <>美學<br/>動態<br/>視覺</> : activeCategory}
              </motion.h1>
              
              {/* 分類標籤滾動列 */}
              <div className="flex items-center gap-4 overflow-x-auto py-6 scrollbar-hide border-b border-white/5">
                <Filter size={14} className="text-white/20 flex-shrink-0" />
                {allTags.map(tag => (
                  <button 
                    key={tag} 
                    onClick={() => setActiveCategory(tag)}
                    className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-all border ${activeCategory === tag ? 'bg-white text-black border-white' : 'border-white/10 text-white/30 hover:border-white/40 hover:text-white'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 作品清單 */}
            <div className="grid grid-cols-1 border-t border-white/10">
              {filteredArticles.length === 0 ? (
                <div className="py-40 text-white/5 font-serif italic text-4xl text-center">Empty.</div>
              ) : (
                filteredArticles.map((art, index) => (
                  <motion.div 
                    key={art.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, ...transition }}
                    onClick={() => setView({ type: 'article', id: art.id })} 
                    className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.01] transition-all px-8 -mx-8"
                  >
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-widest text-white/20 font-light">{art.category}</span>
                        {art.tags?.map(t => <span key={t} className="text-[10px] text-white/10 font-mono">#{t}</span>)}
                      </div>
                      <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-1000 leading-none">{art.title}</h3>
                    </div>
                    <div className="mt-8 md:mt-0 flex items-center gap-6">
                      <span className="text-[10px] text-white/10 uppercase tracking-[0.5em] group-hover:text-white/40 transition-colors">View Project</span>
                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700">
                        <ArrowUpRight size={20} />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.main>
        )}

        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-5xl mx-auto pb-60">
            <button onClick={() => setView({ type: 'home' })} className="mb-20 flex items-center gap-3 text-white/30 uppercase text-[10px] tracking-[0.5em] hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            {articles.find(a => a.id === view.id) && (
              <>
                <div className="flex items-center gap-4 mb-8">
                  <span className="px-4 py-1 border border-white/10 rounded-full text-[10px] text-white/40 uppercase tracking-widest">{articles.find(a => a.id === view.id).category}</span>
                  {articles.find(a => a.id === view.id).tags?.map(t => <span key={t} className="text-[10px] text-white/20">#{t}</span>)}
                </div>
                <h1 className="text-6xl md:text-[8vw] font-bold font-serif mb-20 leading-[0.9] tracking-tighter italic">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/60 space-y-12 font-serif max-w-3xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
              </>
            )}
          </motion.article>
        )}

        {view.type === 'cms' && isAdmin && <CMSDashboard user={user} setView={setView} />}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light">
        <span>© 2026 CURTIS CHEN — DESIGN & DIRECTION</span>
        <div className="flex items-center gap-8">
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">Behance</a>
          <div className="flex items-center gap-2 border-l border-white/10 pl-8"><ShieldCheck size={10}/> SECURE</div>
        </div>
      </footer>
    </div>
  );
}