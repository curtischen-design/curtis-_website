import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight
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
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl md:text-6xl font-bold mt-12 mb-8 font-serif text-white leading-tight">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl md:text-3xl font-bold mt-10 mb-6 font-serif text-white">$1</h2>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br/>');
};

/**
 * 🛠️ CMS 管理員發文後台
 */
const CMSDashboard = ({ user, setView }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('校園生活');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ["關於我", "校園生活", "隨想札記", "時事觀察"];

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
      alert('發布失敗。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <h2 className="text-4xl font-serif italic">New Archive.</h2>
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
              {categories.map(c => <option key={c} className="bg-[#368C84]" value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">標籤 (用逗號分隔)</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-sm outline-none focus:border-white" placeholder="例如: 筆記, 生活, 思考" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">內文 (Markdown)</label>
          <textarea required rows={10} className="w-full bg-white/5 border border-white/5 p-6 rounded-2xl text-white/80 font-mono text-sm outline-none focus:border-white/20" value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-6 rounded-full font-bold uppercase tracking-[0.4em] hover:scale-[0.98] transition-all">
          {loading ? "處理中..." : "確認發布"}
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
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // 滾動進度條
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

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

  // 自動收頂欄與返回頂部按鈕邏輯
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // 頂欄收合
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
      
      // 返回頂部按鈕
      if (currentScrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesCategory = activeCategory === 'All' || art.category === activeCategory || (art.tags && art.tags.includes(activeCategory));
      const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            art.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [articles, activeCategory, searchQuery]);

  const allTags = useMemo(() => {
    const tags = new Set(articles.flatMap(art => [art.category, ...(art.tags || [])]));
    return ['All', ...Array.from(tags)].filter(Boolean);
  }, [articles]);

  const menuItems = ["關於我", "校園生活", "隨想札記", "時事觀察"];

  // 推薦閱讀邏輯
  const recommendedArticles = useMemo(() => {
    if (view.type !== 'article') return [];
    return articles
      .filter(a => a.id !== view.id)
      .slice(0, 2);
  }, [articles, view]);

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@300;400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      {/* 閱讀百分比進度條 */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-white origin-left z-[150]" style={{ scaleX }} />

      {/* 自動收放頂欄 */}
      <motion.nav 
        animate={{ y: showHeader ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference"
      >
        <div onClick={() => { setView({type:'home'}); setActiveCategory('All'); window.scrollTo(0,0); }} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic">Curtis Chen</div>
        <div className="flex items-center gap-8">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 transition-all cursor-pointer"><Search size={24} /></button>
          <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all cursor-pointer"><Menu size={32} /></button>
        </div>
      </motion.nav>

      {/* 搜尋欄 */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <div className="max-w-4xl mx-auto">
              <input 
                autoFocus
                placeholder="搜尋關鍵字..." 
                className="w-full bg-white/10 border border-white/20 backdrop-blur-xl p-6 rounded-full text-xl outline-none focus:border-white/40 transition-all font-serif text-white placeholder-white/30"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 直式全螢幕選單 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col items-center justify-center p-12">
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 hover:rotate-90 transition-all duration-500 cursor-pointer"><X size={48} strokeWidth={1} /></button>
            
            <div className="flex flex-col items-center gap-12 text-5xl md:text-7xl font-serif text-center">
              {menuItems.map((item, i) => (
                <motion.button 
                  key={item} 
                  initial={{ y: 30, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.1 + (i * 0.1) }}
                  onClick={() => { setActiveCategory(item); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }}
                  className="hover:italic hover:scale-105 transition-all duration-500 font-light tracking-tight cursor-pointer"
                >
                  {item}
                </motion.button>
              ))}
            </div>

            <div className="absolute bottom-12 flex flex-col items-center gap-8">
              <div className="flex gap-12 text-white/40">
                <a href="#" className="hover:text-white transition-colors"><Facebook size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Youtube size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Mic size={24}/></a>
              </div>
              <div className="text-center">
                {isAdmin ? (
                  <button onClick={() => { setView({type:'cms'}); setIsMenuOpen(false); }} className="text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white transition-colors border border-white/20 px-8 py-2 rounded-full mb-4">Admin Dashboard</button>
                ) : (
                  <button onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))} className="text-[10px] uppercase tracking-[0.4em] text-white/20 hover:text-white">Admin Login</button>
                )}
                <p className="text-[8px] uppercase tracking-[0.5em] text-white/20 italic">© 2026 Curtis Chen. All Rights Reserved</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40">
            <div className="mb-32">
              <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={transition} className="text-7xl md:text-[12vw] font-bold leading-[0.8] mb-12 uppercase tracking-tighter font-serif text-white">
                {activeCategory === 'All' ? <>美學<br/>動態<br/>視覺</> : activeCategory}
              </motion.h1>
              
              <div className="flex items-center gap-4 overflow-x-auto py-6 scrollbar-hide border-b border-white/10 sticky top-0 bg-[#368C84]/80 backdrop-blur-md z-50">
                <Filter size={14} className="text-white/20 flex-shrink-0" />
                {allTags.map(tag => (
                  <button 
                    key={tag} 
                    onClick={() => { setActiveCategory(tag); window.scrollTo({top: 400, behavior: 'smooth'}); }}
                    className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-all border cursor-pointer ${activeCategory === tag ? 'bg-white text-[#368C84] border-white' : 'border-white/10 text-white/40 hover:border-white/60 hover:text-white'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 border-t border-white/10">
              {filteredArticles.length === 0 ? (
                <div className="py-40 text-white/10 font-serif italic text-4xl text-center border border-dashed border-white/5 mt-10 rounded-[60px]">Archive is empty.</div>
              ) : (
                filteredArticles.map((art, index) => (
                  <motion.div 
                    key={art.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, ...transition }}
                    onClick={() => { setView({ type: 'article', id: art.id }); window.scrollTo(0,0); }} 
                    className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.03] transition-all px-8 -mx-8"
                  >
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-light italic">{art.category}</span>
                        {art.tags?.map(t => <span key={t} className="text-[10px] text-white/20 font-mono">#{t}</span>)}
                      </div>
                      <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-1000 leading-none text-white">{art.title}</h3>
                    </div>
                    <div className="mt-8 md:mt-0 flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-700 text-white">
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
          <motion.article key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-5xl mx-auto pb-40">
            <div className="flex justify-between items-center mb-20">
              <button onClick={() => { setView({ type: 'home' }); window.scrollTo(0,0); }} className="flex items-center gap-3 text-white/40 uppercase text-[10px] tracking-[0.5em] hover:text-white transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={() => { setView({ type: 'home' }); window.scrollTo(0,0); }} className="p-3 border border-white/10 rounded-full hover:bg-white hover:text-[#368C84] transition-all"><Home size={18}/></button>
            </div>
            
            {articles.find(a => a.id === view.id) && (
              <>
                <div className="flex items-center gap-4 mb-8">
                  <span className="px-4 py-1 border border-white/10 rounded-full text-[10px] text-white/60 uppercase tracking-widest italic">{articles.find(a => a.id === view.id).category}</span>
                </div>
                <h1 className="text-5xl md:text-[7vw] font-bold font-serif mb-20 leading-[1.1] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-40" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                {/* 推薦閱讀 */}
                {recommendedArticles.length > 0 && (
                  <div className="border-t border-white/10 pt-20">
                    <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 mb-12 italic">Recommended Reading</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {recommendedArticles.map(art => (
                        <div key={art.id} onClick={() => { setView({type:'article', id: art.id}); window.scrollTo(0,0); }} className="group p-8 border border-white/5 rounded-[40px] cursor-pointer hover:bg-white/5 transition-all">
                          <p className="text-[9px] uppercase tracking-widest text-white/20 mb-4">{art.category}</p>
                          <h4 className="text-2xl font-serif mb-6 group-hover:italic transition-all">{art.title}</h4>
                          <ArrowRight className="text-white/10 group-hover:translate-x-2 transition-all group-hover:text-white" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.article>
        )}

        {view.type === 'cms' && isAdmin && <CMSDashboard user={user} setView={setView} />}
      </AnimatePresence>

      {/* 觸底浮動返回頂部 */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-12 right-12 w-14 h-14 bg-white text-[#368C84] rounded-full shadow-2xl flex items-center justify-center z-[140] hover:scale-110 transition-transform cursor-pointer"
          >
            <ChevronUp size={24} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light">
        <span className="cursor-pointer" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — ARCHIVE OF THOUGHTS</span>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2"><ShieldCheck size={10}/> CLOUD ACTIVE</div>
        </div>
      </footer>
    </div>
  );
}