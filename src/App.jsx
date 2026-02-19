import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight, ChevronRight, Layers
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
 * 🛠️ CMS 管理員發文後台 (支援動態分類與子分類)
 */
const CMSDashboard = ({ user, setView, existingStructure }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 取得現有的主分類清單供建議使用
  const existingCategories = Object.keys(existingStructure);
  // 根據目前輸入的主分類，取得對應的子分類建議
  const existingSubCategories = existingStructure[category] || [];

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), {
        title,
        category: category || "未分類",
        subCategory: subCategory || "",
        content,
        tags,
        publishDate: Timestamp.now(),
        authorEmail: user.email
      });
      alert('發布成功！新分類已自動建立。');
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
        <h2 className="text-4xl font-serif italic">New Creation.</h2>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 text-[10px] tracking-widest hover:text-white uppercase">取消</button>
      </div>
      <form onSubmit={handlePublish} className="space-y-12">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">文章標題</label>
          <input required className="w-full bg-transparent border-b border-white/10 py-2 text-xl font-serif outline-none focus:border-white transition-all" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/30">主分類 (可直接輸入新名稱)</label>
            <input 
              required
              list="categories-list"
              className="w-full bg-transparent border-b border-white/10 py-2 text-lg outline-none focus:border-white"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="例如：校園生活"
            />
            <datalist id="categories-list">
              {existingCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/30">子分類 (可選，可自創)</label>
            <input 
              list="subcategories-list"
              className="w-full bg-transparent border-b border-white/10 py-2 text-lg outline-none focus:border-white"
              value={subCategory}
              onChange={e => setSubCategory(e.target.value)}
              placeholder="例如：大四紀錄"
            />
            <datalist id="subcategories-list">
              {existingSubCategories.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">標籤 Hashtags (逗號分隔)</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-sm outline-none focus:border-white text-white/60" placeholder="例如: 筆記, 2026, 靈感" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">內容 (Markdown)</label>
          <textarea required rows={10} className="w-full bg-white/5 border border-white/5 p-8 rounded-3xl text-white/80 font-mono text-sm leading-relaxed outline-none focus:border-white/20" value={content} onChange={e => setContent(e.target.value)} />
        </div>

        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl">
          {loading ? "處理中..." : "確認並發布"}
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
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [user, setUser] = useState(null);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowHeader(currentScrollY <= lastScrollY || currentScrollY <= 100);
      setLastScrollY(currentScrollY);
      setShowBackToTop(currentScrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // 動態建立分類與子分類的階層對照表
  const categoryStructure = useMemo(() => {
    const structure = {};
    articles.forEach(art => {
      if (!structure[art.category]) structure[art.category] = new Set();
      if (art.subCategory) structure[art.category].add(art.subCategory);
    });
    // 轉回 Array 方便渲染
    const final = {};
    Object.keys(structure).forEach(cat => {
      final[cat] = Array.from(structure[cat]);
    });
    return final;
  }, [articles]);

  const allMainCategories = ['All', ...Object.keys(categoryStructure)];
  const currentSubCategories = activeCategory !== 'All' ? ['All', ...categoryStructure[activeCategory]] : [];

  // 篩選邏輯：支援主分類 + 子分類 + 搜尋
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesMain = activeCategory === 'All' || art.category === activeCategory;
      const matchesSub = activeSubCategory === 'All' || art.subCategory === activeSubCategory;
      const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            art.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (art.tags && art.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesMain && matchesSub && matchesSearch;
    });
  }, [articles, activeCategory, activeSubCategory, searchQuery]);

  const menuItems = ["關於我", "校園生活", "隨想札記", "時事觀察"];

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@300;400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-white origin-left z-[150]" style={{ scaleX }} />

      <motion.nav 
        animate={{ y: showHeader ? 0 : -100 }}
        className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference"
      >
        <div onClick={() => { setView({type:'home'}); setActiveCategory('All'); setActiveSubCategory('All'); window.scrollTo(0,0); }} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic">Curtis Chen</div>
        <div className="flex items-center gap-8">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 transition-all cursor-pointer"><Search size={24} /></button>
          <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all cursor-pointer"><Menu size={32} /></button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <div className="max-w-4xl mx-auto">
              <input 
                autoFocus
                placeholder="搜尋標題、內容或標籤..." 
                className="w-full bg-white/10 border border-white/20 backdrop-blur-xl p-6 rounded-full text-xl outline-none focus:border-white/40 transition-all font-serif text-white placeholder-white/30 shadow-2xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col items-center justify-center p-12">
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 hover:rotate-90 transition-all duration-500 cursor-pointer"><X size={48} strokeWidth={1} /></button>
            
            <div className="flex flex-col items-center gap-10 text-5xl md:text-7xl font-serif text-center">
              {menuItems.map((item, i) => (
                <motion.button 
                  key={item} 
                  initial={{ y: 30, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: i * 0.1 }}
                  onClick={() => { setActiveCategory(item); setActiveSubCategory('All'); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }}
                  className="hover:italic transition-all duration-500 font-light tracking-tight cursor-pointer"
                >
                  {item}
                </motion.button>
              ))}
            </div>

            <div className="absolute bottom-12 flex flex-col items-center gap-6">
              <div className="flex gap-10 text-white/30">
                <a href="#" className="hover:text-white transition-colors"><Facebook size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Youtube size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Mic size={24}/></a>
              </div>
              <div className="text-center">
                {isAdmin ? (
                  <button onClick={() => { setView({type:'cms'}); setIsMenuOpen(false); }} className="text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white border border-white/10 px-8 py-2 rounded-full mb-4">Admin CMS</button>
                ) : (
                  <button onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))} className="text-[10px] uppercase tracking-[0.4em] text-white/20 hover:text-white transition-colors">Login</button>
                )}
                <p className="text-[8px] uppercase tracking-[0.5em] text-white/10 italic">© 2026 Curtis Chen.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40">
            <div className="mb-24">
              <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={transition} className="text-7xl md:text-[11vw] font-bold leading-[0.85] mb-20 uppercase tracking-tighter font-serif text-white">
                {activeCategory === 'All' ? <>美學<br/>動態<br/>視覺</> : activeCategory}
              </motion.h1>
              
              {/* 第一層：主分類 */}
              <div className="flex items-center gap-4 overflow-x-auto py-4 mb-4 scrollbar-hide border-b border-white/5 sticky top-0 bg-[#368C84]/90 backdrop-blur-lg z-50">
                <span className="text-[9px] uppercase tracking-widest text-white/20 flex-shrink-0 flex items-center gap-2"><Filter size={10}/> Category</span>
                {allMainCategories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { setActiveCategory(cat); setActiveSubCategory('All'); }}
                    className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all border whitespace-nowrap ${activeCategory === cat ? 'bg-white text-[#368C84] border-white font-bold' : 'border-white/10 text-white/40 hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 第二層：子分類 (僅在選中主分類且有子分類時顯示) */}
              {currentSubCategories.length > 1 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 overflow-x-auto py-2 mb-8 scrollbar-hide">
                  <span className="text-[9px] uppercase tracking-widest text-white/20 flex-shrink-0 flex items-center gap-2 ml-4"><Layers size={10}/> Sub</span>
                  {currentSubCategories.map(sub => (
                    <button 
                      key={sub} 
                      onClick={() => setActiveSubCategory(sub)}
                      className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-all border whitespace-nowrap ${activeSubCategory === sub ? 'bg-white/20 text-white border-white/40' : 'border-white/5 text-white/30 hover:text-white'}`}
                    >
                      {sub}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 border-t border-white/10">
              {filteredArticles.length === 0 ? (
                <div className="py-40 text-white/10 font-serif italic text-3xl text-center border border-dashed border-white/5 mt-10 rounded-[60px]">Archive is empty.</div>
              ) : (
                filteredArticles.map((art, index) => (
                  <motion.div 
                    key={art.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, ...transition }}
                    onClick={() => { setView({ type: 'article', id: art.id }); window.scrollTo(0,0); }} 
                    className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.02] transition-all px-8 -mx-8"
                  >
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-light italic">{art.category}</span>
                        {art.subCategory && <span className="text-[10px] text-white/20 flex items-center gap-1"><ChevronRight size={10}/> {art.subCategory}</span>}
                        {art.tags?.map(t => <span key={t} className="text-[10px] text-white/10 bg-white/5 px-2 py-0.5 rounded">#{t}</span>)}
                      </div>
                      <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-1000 leading-none text-white">{art.title}</h3>
                    </div>
                    <div className="mt-8 md:mt-0">
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-700">
                        <ArrowUpRight size={24} />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.main>
        )}

        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-5xl mx-auto pb-60">
            <div className="flex justify-between items-center mb-16">
              <button onClick={() => setView({ type: 'home' })} className="flex items-center gap-3 text-white/30 uppercase text-[10px] tracking-[0.5em] hover:text-white transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Back
              </button>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/20">
                <span className="cursor-pointer hover:text-white" onClick={() => { setView({type:'home'}); setActiveCategory(articles.find(a => a.id === view.id).category); }}>{articles.find(a => a.id === view.id)?.category}</span>
                {articles.find(a => a.id === view.id)?.subCategory && (
                   <>
                   <ChevronRight size={10} />
                   <span className="cursor-pointer hover:text-white" onClick={() => { setView({type:'home'}); setActiveCategory(articles.find(a => a.id === view.id).category); setActiveSubCategory(articles.find(a => a.id === view.id).subCategory); }}>{articles.find(a => a.id === view.id).subCategory}</span>
                   </>
                )}
              </div>
            </div>
            
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-[7.5vw] font-bold font-serif mb-20 leading-[1.05] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-40 article-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                {/* 底部導航 */}
                <div className="border-t border-white/10 pt-20 flex flex-col md:flex-row justify-between items-start gap-12">
                   <div className="max-w-xs">
                     <p className="text-[10px] uppercase tracking-[0.5em] text-white/20 mb-4 italic">Next Reading</p>
                     {articles.filter(a => a.id !== view.id)[0] && (
                       <div onClick={() => { setView({type:'article', id: articles.filter(a => a.id !== view.id)[0].id}); window.scrollTo(0,0); }} className="group cursor-pointer">
                         <h4 className="text-2xl font-serif group-hover:italic transition-all">{articles.filter(a => a.id !== view.id)[0].title}</h4>
                         <ArrowRight size={16} className="mt-4 text-white/20 group-hover:translate-x-3 transition-transform" />
                       </div>
                     )}
                   </div>
                   <button onClick={() => { setView({type:'home'}); window.scrollTo(0,0); }} className="p-8 border border-white/10 rounded-full hover:bg-white hover:text-[#368C84] transition-all"><Home size={32}/></button>
                </div>
              </>
            )}
          </motion.article>
        )}

        {view.type === 'cms' && isAdmin && <CMSDashboard user={user} setView={setView} existingStructure={categoryStructure} />}
      </AnimatePresence>

      <AnimatePresence>
        {showBackToTop && (
          <motion.button 
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-12 right-12 w-16 h-16 bg-white text-[#368C84] rounded-full shadow-2xl flex items-center justify-center z-[140] hover:scale-110 transition-transform cursor-pointer"
          >
            <ChevronUp size={28} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light">
        <span className="cursor-pointer" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — DESIGN & THOUGHTS</span>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 italic"><ShieldCheck size={10}/> Authenticated Admin</div>
        </div>
      </footer>
    </div>
  );
}