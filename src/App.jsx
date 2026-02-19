import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight, ChevronRight, Layers, Tag, Bookmark, Share2, Edit3, CheckCircle2
} from 'lucide-react';

// Firebase 核心模組
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';

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
// 新增音樂見聞、讀書心得
const MENU_ITEMS = ["關於我", "校園生活", "隨想札記", "時事觀察", "音樂見聞", "讀書心得"];

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
 * 🛠️ CMS 管理員發文與編輯後台
 */
const CMSDashboard = ({ user, setView, existingStructure, allTags, editData, showMessage }) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [category, setCategory] = useState(editData?.category || MENU_ITEMS[1]);
  const [subCategory, setSubCategory] = useState(editData?.subCategory || '');
  const [content, setContent] = useState(editData?.content || '');
  const [tagsInput, setTagsInput] = useState(editData?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);

  const existingSubCategories = existingStructure[category] || [];

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');

    try {
      if (editData?.id) {
        // 更新模式
        const articleRef = doc(db, 'artifacts', appId, 'public', 'data', 'articles', editData.id);
        await updateDoc(articleRef, {
          title, category, subCategory, content, tags,
          lastModified: Timestamp.now()
        });
        showMessage('內容已成功更新');
      } else {
        // 新增模式
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), {
          title, category, subCategory, content, tags,
          publishDate: Timestamp.now(),
          authorEmail: user.email
        });
        showMessage('新內容已成功發布');
      }
      setView({ type: 'home' });
    } catch (err) {
      showMessage('操作失敗，請檢查權限設定');
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tag) => {
    const current = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');
    if (!current.includes(tag)) setTagsInput([...current, tag].join(', '));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-4xl font-serif italic">{editData ? 'Edit Archive.' : 'New Archive.'}</h2>
          <p className="text-[10px] text-white/30 mt-2 tracking-widest uppercase italic">{editData ? 'Updating' : 'Creating'} as {user.email}</p>
        </div>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 text-[10px] tracking-widest hover:text-white uppercase cursor-pointer">取消</button>
      </div>
      <form onSubmit={handlePublish} className="space-y-12">
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">歸類至選單項目 (變更文章位置)</label>
          <div className="flex flex-wrap gap-3">
            {MENU_ITEMS.map(m => (
              <button 
                key={m} type="button" 
                onClick={() => setCategory(m)}
                className={`px-6 py-2 rounded-full text-xs transition-all border cursor-pointer ${category === m ? 'bg-white text-[#368C84] border-white' : 'border-white/10 text-white/40 hover:border-white/40'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">文章標題</label>
          <input required className="w-full bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-white text-white" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">子分類 (如：大一、紀錄...)</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-lg outline-none focus:border-white" value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="輸入或選取" />
          <div className="flex flex-wrap gap-2">
            {existingSubCategories.map(s => (
              <button key={s} type="button" onClick={() => setSubCategory(s)} className="text-[9px] px-3 py-1 rounded-full border border-white/5 hover:border-white/30 text-white/30 hover:text-white uppercase cursor-pointer">{s}</button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">標籤 Hashtags</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-sm outline-none focus:border-white text-white/60" placeholder="以逗號分隔" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {allTags.filter(t => t !== 'All' && !MENU_ITEMS.includes(t)).slice(0, 8).map(tag => (
              <button key={tag} type="button" onClick={() => addTag(tag)} className="text-[9px] px-3 py-1 rounded-full bg-white/5 text-white/20 hover:text-white transition-all italic cursor-pointer">#{tag}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">正文內容 (支援 Markdown)</label>
          <textarea required rows={10} className="w-full bg-black/10 border border-white/5 p-8 rounded-3xl text-white/80 font-mono text-sm leading-relaxed outline-none focus:border-white/20" value={content} onChange={e => setContent(e.target.value)} />
        </div>

        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl cursor-pointer">
          {loading ? "處理中..." : editData ? "更新存檔" : "確認發布"}
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
  const [editingArticle, setEditingArticle] = useState(null);
  const [message, setMessage] = useState(null);

  // 捲動百分比相關
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    return scrollYProgress.onChange(v => setPercent(Math.round(v * 100)));
  }, [scrollYProgress]);

  const isAdmin = user && user.email === ADMIN_EMAIL;

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

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

  const categoryStructure = useMemo(() => {
    const structure = {};
    articles.forEach(art => {
      if (!structure[art.category]) structure[art.category] = new Set();
      if (art.subCategory) structure[art.category].add(art.subCategory);
    });
    const final = {};
    Object.keys(structure).forEach(cat => final[cat] = Array.from(structure[cat]));
    return final;
  }, [articles]);

  const allTagsAndCats = useMemo(() => {
    const tags = new Set(articles.flatMap(art => [art.category, ...(art.tags || [])]));
    return ['All', ...Array.from(tags)].filter(Boolean);
  }, [articles]);

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

  // 複製連結功能
  const copyLink = () => {
    const dummy = document.createElement('input');
    document.body.appendChild(dummy);
    dummy.value = window.location.href;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    showMessage('連結已複製到剪貼簿');
  };

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@300;400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      {/* 頂部通知盒 */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-8 left-1/2 -translate-x-1/2 bg-white text-[#368C84] px-8 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-3 font-bold">
            <CheckCircle2 size={18} /> {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 增強型進度條與互動功能 */}
      <div className="fixed top-0 left-0 right-0 h-10 group z-[150] cursor-default">
        <motion.div className="h-1 bg-white origin-left" style={{ scaleX }} />
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 absolute top-2 left-0 right-0 flex justify-center items-center gap-6 pointer-events-none">
          <div className="bg-black/20 backdrop-blur-md px-4 py-1 rounded-full flex items-center gap-6 pointer-events-auto border border-white/10">
            <span className="text-[10px] font-bold tracking-widest">{percent}% READ</span>
            <div className="h-3 w-px bg-white/20" />
            <button onClick={copyLink} className="hover:text-white/60 transition-colors cursor-pointer"><Share2 size={12}/></button>
            <button onClick={() => showMessage('書籤功能開發中')} className="hover:text-white/60 transition-colors cursor-pointer"><Bookmark size={12}/></button>
          </div>
        </div>
      </div>

      {/* 自動收放頂欄 */}
      <motion.nav 
        animate={{ y: showHeader ? 0 : -100 }}
        className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference"
      >
        <div onClick={() => { setView({type:'home'}); setActiveCategory('All'); setActiveSubCategory('All'); window.scrollTo(0,0); }} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic text-white">Curtis Chen</div>
        <div className="flex items-center gap-8">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 transition-all cursor-pointer"><Search size={24} color="white"/></button>
          <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all cursor-pointer"><Menu size={32} color="white"/></button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <div className="max-w-4xl mx-auto relative">
              <input 
                autoFocus placeholder="搜尋全站內容..." 
                className="w-full bg-white/10 border border-white/20 backdrop-blur-xl p-6 rounded-full text-xl outline-none focus:border-white/40 transition-all font-serif text-white placeholder-white/30"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-8 top-1/2 -translate-y-1/2 text-white/30 hover:text-white cursor-pointer"><X size={20}/></button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col p-12 overflow-hidden">
            <div className="flex justify-end">
              <button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-all duration-500 cursor-pointer"><X size={48} strokeWidth={1} color="white" /></button>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-center gap-8">
              {MENU_ITEMS.map((item, i) => (
                <motion.button 
                  key={item} 
                  initial={{ y: 30, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: i * 0.08 }}
                  onClick={() => { setActiveCategory(item); setActiveSubCategory('All'); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }}
                  className="text-4xl md:text-6xl font-serif hover:italic hover:scale-105 transition-all duration-500 font-light tracking-tight cursor-pointer"
                >
                  {item}
                </motion.button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end gap-12 border-t border-white/10 pt-12 pb-4">
              <div className="flex gap-10 text-white/30">
                <a href="#" className="hover:text-white transition-colors"><Facebook size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Youtube size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Mic size={24}/></a>
              </div>
              
              <div className="flex flex-col items-end gap-6">
                <div className="flex gap-4">
                  {isAdmin ? (
                    <button onClick={() => { setEditingArticle(null); setView({type:'cms'}); setIsMenuOpen(false); }} className="text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white border border-white/10 px-8 py-2 rounded-full cursor-pointer">Admin CMS</button>
                  ) : (
                    <button onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))} className="text-[10px] uppercase tracking-[0.4em] text-white/20 hover:text-white transition-colors cursor-pointer italic underline">Login</button>
                  )}
                  {user && <button onClick={() => signOut(auth)} className="text-[10px] text-red-400/50 hover:text-red-400 uppercase tracking-widest cursor-pointer">Logout</button>}
                </div>
                <p className="text-[8px] uppercase tracking-[0.6em] text-white/10 italic">© 2026 Curtis Chen. Design & Archive.</p>
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
              
              <div className="flex items-center gap-4 overflow-x-auto py-4 mb-4 scrollbar-hide border-b border-white/5 sticky top-0 bg-[#368C84]/90 backdrop-blur-lg z-50">
                <span className="text-[9px] uppercase tracking-widest text-white/20 flex-shrink-0 flex items-center gap-2"><Bookmark size={10}/> Section</span>
                {['All', ...MENU_ITEMS].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { setActiveCategory(cat); setActiveSubCategory('All'); }}
                    className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer ${activeCategory === cat ? 'bg-white text-[#368C84] border-white font-bold' : 'border-white/10 text-white/40 hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {activeCategory !== 'All' && categoryStructure[activeCategory]?.length > 0 && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 overflow-x-auto py-2 mb-8 scrollbar-hide">
                  <span className="text-[9px] uppercase tracking-widest text-white/20 flex-shrink-0 flex items-center gap-2 ml-4"><Layers size={10}/> Sub</span>
                  {['All', ...categoryStructure[activeCategory]].map(sub => (
                    <button 
                      key={sub} 
                      onClick={() => setActiveSubCategory(sub)}
                      className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer ${activeSubCategory === sub ? 'bg-white/20 text-white border-white/40' : 'border-white/5 text-white/30 hover:text-white'}`}
                    >
                      {sub}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 border-t border-white/10">
              {filteredArticles.length === 0 ? (
                <div className="py-40 text-white/10 font-serif italic text-3xl text-center border border-dashed border-white/5 mt-10 rounded-[60px]">Empty.</div>
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
                      <div className="flex items-center gap-3 flex-wrap text-white">
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-light italic">{art.category}</span>
                        {art.subCategory && <span className="text-[10px] text-white/20 flex items-center gap-1"><ChevronRight size={10}/> {art.subCategory}</span>}
                        {art.tags?.map(t => <span key={t} className="text-[10px] text-white/10 bg-white/5 px-2 py-0.5 rounded">#{t}</span>)}
                      </div>
                      <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-1000 leading-none text-white">{art.title}</h3>
                    </div>
                    <div className="mt-8 md:mt-0 flex items-center gap-4">
                      {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingArticle(art); setView({type:'cms'}); }} 
                          className="p-3 rounded-full border border-white/10 hover:bg-white hover:text-[#368C84] transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-700">
                        <ArrowUpRight size={24} color="white" className="group-hover:stroke-[#368C84]" />
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
              
              <div className="flex items-center gap-6">
                {isAdmin && (
                  <button 
                    onClick={() => { setEditingArticle(articles.find(a => a.id === view.id)); setView({type:'cms'}); }}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white border border-white/10 px-4 py-1.5 rounded-full cursor-pointer"
                  >
                    <Edit3 size={12}/> Edit Post
                  </button>
                )}
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/20 font-serif">
                  <span className="hover:text-white cursor-pointer" onClick={() => { setView({type:'home'}); setActiveCategory(articles.find(a => a.id === view.id).category); }}>{articles.find(a => a.id === view.id)?.category}</span>
                  {articles.find(a => a.id === view.id)?.subCategory && (
                     <><ChevronRight size={10} /><span className="text-white/40 italic">{articles.find(a => a.id === view.id).subCategory}</span></>
                  )}
                </div>
              </div>
            </div>
            
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-[7.5vw] font-bold font-serif mb-20 leading-[1.05] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-40" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                <div className="border-t border-white/10 pt-20 flex flex-col md:flex-row justify-between items-start gap-12 text-white">
                   <div className="max-w-xs">
                     <p className="text-[10px] uppercase tracking-[0.5em] text-white/20 mb-4 italic">Continue Reading</p>
                     {articles.filter(a => a.id !== view.id)[0] && (
                       <div onClick={() => { setView({type:'article', id: articles.filter(a => a.id !== view.id)[0].id}); window.scrollTo(0,0); }} className="group cursor-pointer">
                         <h4 className="text-2xl font-serif group-hover:italic transition-all">{articles.filter(a => a.id !== view.id)[0].title}</h4>
                         <ArrowRight size={16} className="mt-4 text-white/20 group-hover:translate-x-3 transition-transform" />
                       </div>
                     )}
                   </div>
                   <button onClick={() => { setView({type:'home'}); window.scrollTo(0,0); }} className="p-8 border border-white/10 rounded-full hover:bg-white hover:text-[#368C84] transition-all shadow-xl group cursor-pointer"><Home size={32} className="group-hover:stroke-[#368C84]" /></button>
                </div>
              </>
            )}
          </motion.article>
        )}

        {view.type === 'cms' && isAdmin && (
          <CMSDashboard 
            user={user} 
            setView={setView} 
            existingStructure={categoryStructure} 
            allTags={allTagsAndCats} 
            editData={editingArticle}
            showMessage={showMessage}
          />
        )}
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
        <span className="cursor-pointer" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — ARCHIVE & DIRECTION</span>
        <div className="flex items-center gap-8 italic">
          <ShieldCheck size={10}/> ADMIN AUTHENTICATED
        </div>
      </footer>
    </div>
  );
}