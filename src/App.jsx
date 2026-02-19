import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight, ChevronRight, Layers, Tag, Bookmark, Share2, Edit3, CheckCircle2, ChevronDown, Heart
} from 'lucide-react';

// Firebase 核心模組
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, Timestamp, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';

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
 * 🛠️ CMS 管理員發文與編輯後台
 */
const CMSDashboard = ({ user, setView, editData, showMessage, menuList }) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [mainMenu, setMainMenu] = useState(editData?.mainMenu || menuList[1] || '');
  const [pathInput, setPathInput] = useState(editData?.subPath?.join('/') || '');
  const [content, setContent] = useState(editData?.content || '');
  const [tagsInput, setTagsInput] = useState(editData?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');
    const subPath = pathInput.split('/').map(p => p.trim()).filter(p => p !== '');

    try {
      const articleData = {
        title,
        mainMenu: mainMenu.trim() || "未分類",
        subPath,
        content,
        tags,
        authorEmail: user.email
      };

      if (editData?.id) {
        const articleRef = doc(db, 'artifacts', appId, 'public', 'data', 'articles', editData.id);
        await updateDoc(articleRef, { ...articleData, lastModified: Timestamp.now() });
        showMessage('文章同步成功');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), { 
          ...articleData, publishDate: Timestamp.now() 
        });
        showMessage('內容發布成功');
      }
      setView({ type: 'home' });
    } catch (err) {
      showMessage('操作失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white font-sans">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <h2 className="text-4xl font-serif italic">{editData ? 'Edit Archive.' : 'New Post.'}</h2>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 text-[10px] tracking-widest hover:text-white uppercase cursor-pointer transition-colors">取消</button>
      </div>
      <form onSubmit={handlePublish} className="space-y-12">
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">1. 選單位置 (新增或選取)</label>
          <input required className="w-full bg-transparent border-b border-white/10 py-3 text-2xl font-serif outline-none focus:border-white text-white transition-all placeholder:text-white/10" value={mainMenu} onChange={(e) => setMainMenu(e.target.value)} placeholder="影評、雜記..." />
          <div className="flex flex-wrap gap-2">
            {menuList.map(m => (
              <button key={m} type="button" onClick={() => setMainMenu(m)}
                className={`px-4 py-1.5 rounded-full text-[9px] tracking-widest transition-all border cursor-pointer uppercase ${mainMenu === m ? 'bg-white text-[#368C84] border-white font-bold' : 'border-white/10 text-white/30 hover:border-white/50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">2. 子路徑 (使用 / 分隔)</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-lg outline-none focus:border-white text-white" value={pathInput} onChange={e => setPathInput(e.target.value)} placeholder="大一 / 上學期 / 筆記" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">3. 標題</label>
          <input required className="w-full bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-white text-white transition-all" value={title} onChange={e => setTitle(e.target.value)} placeholder="Post Title..." />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">4. 內容 (Markdown)</label>
          <textarea required rows={12} className="w-full bg-black/10 border border-white/5 p-8 rounded-3xl text-white/80 font-mono text-sm leading-relaxed outline-none focus:border-white/20 transition-all" value={content} onChange={e => setContent(e.target.value)} placeholder="Write your story..." />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl cursor-pointer">
          {loading ? "Processing..." : "確認發布內容"}
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
  const [activeMenu, setActiveMenu] = useState('All');
  const [activePath, setActivePath] = useState([]); 
  const [user, setUser] = useState(null);
  const [userBookmarks, setUserBookmarks] = useState([]); 
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [message, setMessage] = useState(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    return scrollYProgress.on("change", (v) => setPercent(Math.round(v * 100)));
  }, [scrollYProgress]);

  const isAdmin = user && user.email === ADMIN_EMAIL;
  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => { onAuthStateChanged(auth, setUser); }, []);
  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'articles');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(data.sort((a, b) => b.publishDate.toDate() - a.publishDate.toDate()));
    });
  }, []);

  const dynamicMenuItems = useMemo(() => {
    const baseItems = ["關於我", "校園生活", "隨想札記", "時事觀察", "音樂見聞", "讀書心得"];
    const fromArticles = new Set(articles.map(a => a.mainMenu));
    return [...new Set([...baseItems, ...Array.from(fromArticles)])].filter(Boolean);
  }, [articles]);

  useEffect(() => {
    if (!user) { setUserBookmarks([]); return; }
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'bookmarks');
    return onSnapshot(q, (snapshot) => setUserBookmarks(snapshot.docs.map(doc => doc.id)));
  }, [user]);

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

  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesMenu = activeMenu === 'All' || art.mainMenu === activeMenu;
      const matchesPath = activePath.every((segment, i) => art.subPath && art.subPath[i] === segment);
      const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            art.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMenu && matchesPath && matchesSearch;
    });
  }, [articles, activeMenu, activePath, searchQuery]);

  const currentLevelOptions = useMemo(() => {
    const options = new Set();
    articles.forEach(art => {
      if (activeMenu !== 'All' && art.mainMenu !== activeMenu) return;
      const matchesCurrentPath = activePath.every((segment, i) => art.subPath && art.subPath[i] === segment);
      if (matchesCurrentPath && art.subPath && art.subPath.length > activePath.length) {
        options.add(art.subPath[activePath.length]);
      }
    });
    return Array.from(options);
  }, [articles, activeMenu, activePath]);

  const toggleBookmark = async (articleId) => {
    if (!user) { showMessage('請先登入同步書籤'); signInWithPopup(auth, provider); return; }
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'bookmarks', articleId);
    if (userBookmarks.includes(articleId)) {
      await deleteDoc(ref); showMessage('已取消收藏');
    } else {
      await setDoc(ref, { addedAt: Timestamp.now() }); showMessage('已加入書籤');
    }
  };

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@300;400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      {/* 消息提示 */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} 
            className="fixed top-12 left-1/2 -translate-x-1/2 bg-white text-[#368C84] px-8 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-3 font-bold text-sm tracking-widest"
          >
            <CheckCircle2 size={16} /> {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 百分比懸浮進度條 */}
      <div className="fixed top-0 left-0 right-0 h-10 group z-[150] cursor-default">
        <motion.div className="h-1 bg-white origin-left shadow-[0_0_15px_rgba(255,255,255,0.4)]" style={{ scaleX }} />
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/20 backdrop-blur-xl px-6 py-2 rounded-full flex items-center gap-6 pointer-events-auto border border-white/10 shadow-xl">
            <span className="text-[10px] font-bold tracking-[0.2em]">{percent}% READ</span>
            <div className="h-3 w-px bg-white/20" />
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); showMessage('連結已複製'); }} className="hover:text-white/60 transition-colors cursor-pointer"><Share2 size={14}/></button>
            <button onClick={() => view.id && toggleBookmark(view.id)} className={`transition-colors cursor-pointer ${view.id && userBookmarks.includes(view.id) ? 'text-white fill-white' : 'hover:text-white/60'}`}><Bookmark size={14}/></button>
          </div>
        </div>
      </div>

      {/* 頂部導航 */}
      <motion.nav animate={{ y: showHeader ? 0 : -100 }} className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference">
        <div onClick={() => { setView({type:'home'}); setActiveMenu('All'); setActivePath([]); window.scrollTo(0,0); }} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic text-white transition-opacity hover:opacity-60">Curtis Chen</div>
        <div className="flex items-center gap-8">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 transition-all cursor-pointer"><Search size={24} color="white"/></button>
          <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 transition-all cursor-pointer relative"><Menu size={32} color="white"/></button>
        </div>
      </motion.nav>

      {/* 搜尋介面 */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <div className="max-w-4xl mx-auto relative">
              <input autoFocus placeholder="搜尋檔案紀錄..." className="w-full bg-white/10 border border-white/20 backdrop-blur-3xl p-6 rounded-full text-xl outline-none focus:border-white/40 transition-all font-serif text-white placeholder-white/30 shadow-2xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 自動調整間距的全螢幕選單 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col p-12 overflow-hidden">
            <div className="flex justify-end">
              <button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-all duration-500 cursor-pointer"><X size={48} strokeWidth={1} color="white" /></button>
            </div>
            
            {/* 動態間距：justify-around 會隨項目數量自動調整分配 */}
            <div className="flex-grow flex flex-col items-center justify-around py-12 overflow-y-auto scrollbar-hide max-h-[70vh]">
              <div className="flex flex-col items-center gap-6">
                {dynamicMenuItems.map((item, i) => (
                  <motion.button key={item} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                    onClick={() => { setActiveMenu(item); setActivePath([]); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }}
                    className="text-3xl md:text-5xl font-serif hover:italic hover:scale-105 transition-all cursor-pointer font-light tracking-tight"
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
              
              <motion.button 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                onClick={() => { setView({type:'bookmarks'}); setIsMenuOpen(false); window.scrollTo(0,0); }}
                className="text-[10px] uppercase tracking-[0.4em] flex items-center gap-3 border border-white/20 px-10 py-4 rounded-full hover:bg-white hover:text-[#368C84] transition-all cursor-pointer font-bold shadow-xl mt-4"
              >
                <Bookmark size={14} fill={userBookmarks.length > 0 ? "currentColor" : "none"} /> 我的收藏 ({userBookmarks.length})
              </motion.button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end gap-12 border-t border-white/10 pt-12 pb-8 mt-auto">
              <div className="flex gap-10 text-white/30">
                <a href="#" className="hover:text-white transition-colors"><Facebook size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Youtube size={24}/></a>
                <a href="#" className="hover:text-white transition-colors"><Mic size={24}/></a>
              </div>
              <div className="flex flex-col items-end gap-6">
                <div className="flex gap-4 items-center">
                  {isAdmin ? (
                    <button onClick={() => { setEditingArticle(null); setView({type:'cms'}); setIsMenuOpen(false); }} className="text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white border border-white/10 px-8 py-2 rounded-full cursor-pointer transition-colors">Admin CMS</button>
                  ) : (
                    <button onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))} className="text-[10px] uppercase tracking-[0.4em] text-white/20 hover:text-white transition-colors cursor-pointer italic underline decoration-white/10">{user ? `User: ${user.email.split('@')[0]}` : 'Sign In'}</button>
                  )}
                  {user && <button onClick={() => signOut(auth)} className="text-[10px] text-red-400/50 hover:text-red-400 uppercase tracking-widest cursor-pointer transition-colors">Logout</button>}
                </div>
                <p className="text-[8px] uppercase tracking-[0.6em] text-white/10 italic">© 2026 Curtis Chen. Museum Blog Archive.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* 首頁 */}
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40">
            <div className="mb-24">
              <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={transition} className="text-7xl md:text-[11vw] font-bold leading-[0.85] mb-20 uppercase tracking-tighter font-serif text-white">
                {activeMenu === 'All' ? <>博物館<br/>部落格</> : activeMenu}
              </motion.h1>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 overflow-x-auto py-4 border-b border-white/5 sticky top-0 bg-[#368C84]/90 backdrop-blur-lg z-50 scrollbar-hide">
                  <span className="text-[9px] uppercase tracking-widest text-white/20 flex-shrink-0 flex items-center gap-2"><Bookmark size={10}/> Section</span>
                  {['All', ...dynamicMenuItems].map(m => (
                    <button key={m} onClick={() => { setActiveMenu(m); setActivePath([]); }}
                      className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer ${activeMenu === m ? 'bg-white text-[#368C84] border-white font-bold shadow-lg' : 'border-white/10 text-white/40 hover:border-white/60'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {(activePath.length > 0 || currentLevelOptions.length > 0) && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 ml-4">
                    {activePath.length > 0 && (
                      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/40 italic">
                        <span className="cursor-pointer hover:text-white" onClick={() => setActivePath([])}>Root</span>
                        {activePath.map((seg, i) => (
                          <React.Fragment key={i}><ChevronRight size={10} /><span className="cursor-pointer hover:text-white" onClick={() => setActivePath(activePath.slice(0, i+1))}>{seg}</span></React.Fragment>
                        ))}
                      </div>
                    )}
                    {currentLevelOptions.length > 0 && (
                      <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-hide">
                        <Layers size={10} className="text-white/20 flex-shrink-0" />
                        {currentLevelOptions.map(opt => (
                          <button key={opt} onClick={() => setActivePath([...activePath, opt])}
                            className="px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-all border border-white/10 text-white/30 hover:bg-white/10 hover:text-white whitespace-nowrap cursor-pointer"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 border-t border-white/10">
              {filteredArticles.length === 0 ? (
                <div className="py-40 text-white/10 font-serif italic text-3xl text-center border border-dashed border-white/5 mt-10 rounded-[60px]">Archive is empty.</div>
              ) : (
                filteredArticles.map((art, index) => (
                  <motion.div key={art.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05, ...transition }}
                    onClick={() => { setView({ type: 'article', id: art.id }); window.scrollTo(0,0); }} 
                    className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.02] transition-all px-8 -mx-8"
                  >
                    <div className="flex-1 space-y-4 text-white">
                      <div className="flex items-center gap-3 flex-wrap text-[10px] uppercase tracking-widest text-white/40 font-light italic">
                        <span>{art.mainMenu}</span>
                        {art.subPath && art.subPath.map((p, i) => <span key={i} className="flex items-center gap-1 opacity-60"><ChevronRight size={10}/> {p}</span>)}
                        <div className="flex gap-2 ml-2">{art.tags?.map(t => <span key={t} className="text-[9px] text-white/20 bg-white/5 px-2 py-0.5 rounded">#{t}</span>)}</div>
                      </div>
                      <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-1000 leading-none">{art.title}</h3>
                    </div>
                    <div className="mt-8 md:mt-0 flex items-center gap-4">
                      {isAdmin && <button onClick={(e) => { e.stopPropagation(); setEditingArticle(art); setView({type:'cms'}); }} className="p-3 rounded-full border border-white/10 hover:bg-white hover:text-[#368C84] transition-all cursor-pointer"><Edit3 size={16} /></button>}
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-700 text-white"><ArrowUpRight size={24} /></div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.main>
        )}

        {/* 文章內容 */}
        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-5xl mx-auto pb-60">
            <div className="flex justify-between items-center mb-16">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/20 font-serif italic">
                <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { setView({type:'home'}); setActiveMenu(articles.find(a => a.id === view.id).mainMenu); }}>{articles.find(a => a.id === view.id)?.mainMenu}</span>
                {articles.find(a => a.id === view.id)?.subPath && articles.find(a => a.id === view.id).subPath.map((p, i) => (
                   <React.Fragment key={i}><ChevronRight size={10} /><span className="text-white/40">{p}</span></React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => toggleBookmark(view.id)} className={`p-3 rounded-full border transition-all cursor-pointer ${userBookmarks.includes(view.id) ? 'bg-white text-[#368C84] border-white shadow-lg' : 'border-white/10 hover:border-white/40'}`}><Bookmark size={16} fill={userBookmarks.includes(view.id) ? "currentColor" : "none"} /></button>
                {isAdmin && <button onClick={() => { setEditingArticle(articles.find(a => a.id === view.id)); setView({type:'cms'}); }} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white border border-white/10 px-6 py-2 rounded-full cursor-pointer transition-all"><Edit3 size={12}/> Edit Post</button>}
              </div>
            </div>
            
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-[7.5vw] font-bold font-serif mb-24 leading-[1.05] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-60" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                {/* 底部導航區域：推薦閱讀（置中） */}
                <div className="border-t border-white/10 pt-32 mb-40 text-center flex flex-col items-center">
                   <p className="text-[10px] uppercase tracking-[0.6em] text-white/20 mb-12 italic font-bold">Recommended Reading</p>
                   {articles.filter(a => a.id !== view.id)[0] && (
                     <motion.div 
                        whileHover={{ scale: 1.02 }}
                        onClick={() => { setView({type:'article', id: articles.filter(a => a.id !== view.id)[0].id}); window.scrollTo(0,0); }} 
                        className="group cursor-pointer max-w-2xl px-4"
                     >
                       <h4 className="text-4xl md:text-6xl font-serif text-white group-hover:italic transition-all leading-tight">{articles.filter(a => a.id !== view.id)[0].title}</h4>
                       <div className="flex justify-center mt-10">
                          <motion.div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-500">
                            <ArrowRight size={24} />
                          </motion.div>
                       </div>
                     </motion.div>
                   )}
                </div>

                {/* 底部導航：Back & Home (強制同一行 flex-row) */}
                <div className="flex flex-row justify-center items-center gap-8 md:gap-24 pt-20 border-t border-white/10">
                    <button onClick={() => { setView({type:'home'}); window.scrollTo(0,0); }} className="flex items-center gap-4 group cursor-pointer transition-all">
                        <div className="p-3 md:p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-[#368C84] transition-all duration-500 shadow-xl">
                            <ArrowLeft size={20} />
                        </div>
                        <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all whitespace-nowrap font-bold">Back to List</span>
                    </button>
                    
                    <div className="h-12 w-px bg-white/10 hidden md:block" />

                    <button onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="flex items-center gap-4 group cursor-pointer transition-all">
                        <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/40 group-hover:text-white group-hover:-translate-x-1 transition-all whitespace-nowrap font-bold">Return Home</span>
                        <div className="p-3 md:p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-[#368C84] transition-all duration-500 shadow-xl">
                            <Home size={20} />
                        </div>
                    </button>
                </div>
              </>
            )}
          </motion.article>
        )}

        {/* 收藏清單 */}
        {view.type === 'bookmarks' && (
          <motion.main key="bookmarks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40 min-h-screen">
             <div className="mb-24 border-b border-white/10 pb-12">
               <button onClick={() => setView({type:'home'})} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white mb-8 cursor-pointer transition-all"><ArrowLeft size={12}/> Back to Gallery</button>
               <h1 className="text-6xl md:text-8xl font-serif italic text-white font-light">My Library.</h1>
               <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 mt-4 italic">Archived collection by {user?.email?.split('@')[0] || 'Member'}</p>
             </div>
             <div className="grid grid-cols-1">
               {articles.filter(a => userBookmarks.includes(a.id)).length === 0 ? (
                 <div className="py-40 text-center text-white/5 font-serif italic text-2xl border border-dashed border-white/5 rounded-[60px]">No items saved yet.</div>
               ) : (
                 articles.filter(a => userBookmarks.includes(a.id)).map((art, index) => (
                   <motion.div key={art.id} onClick={() => setView({type:'article', id: art.id})} className="group py-12 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] px-8 -mx-8 transition-all">
                     <div>
                       <p className="text-[9px] uppercase tracking-widest text-white/40 mb-3 italic">{art.mainMenu} {art.subPath?.length > 0 && `/ ${art.subPath.join(' / ')}`}</p>
                       <h3 className="text-3xl md:text-5xl font-serif text-white group-hover:italic transition-all">{art.title}</h3>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); toggleBookmark(art.id); }} className="p-4 hover:text-red-400 cursor-pointer transition-colors"><X size={20} /></button>
                   </motion.div>
                 ))
               )}
             </div>
          </motion.main>
        )}

        {view.type === 'cms' && isAdmin && (
          <CMSDashboard user={user} setView={setView} editData={editingArticle} showMessage={showMessage} menuList={dynamicMenuItems} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackToTop && (
          <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-12 right-12 w-16 h-16 bg-white text-[#368C84] rounded-full shadow-2xl flex items-center justify-center z-[140] hover:scale-110 transition-transform cursor-pointer"
          >
            <ChevronUp size={28} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light italic">
        <span className="cursor-pointer transition-opacity hover:opacity-60" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — MUSEUM BLOG ARCHIVE</span>
        <div className="flex items-center gap-8 italic transition-all hover:text-white/40"><ShieldCheck size={10}/> SECURE CLOUD AUTHENTICATED</div>
      </footer>
    </div>
  );
}