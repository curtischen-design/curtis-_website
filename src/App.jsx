import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight, ChevronRight, Layers, Tag, Bookmark, Share2, Edit3, CheckCircle2, ChevronDown, Heart, MessageSquare, Trash2, History, Send, 
  Instagram, Music, Headphones, Link as LinkIcon, Calendar, Settings2, XCircle
} from 'lucide-react';

// Firebase 核心模組
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, Timestamp, doc, updateDoc, setDoc, deleteDoc, query } from 'firebase/firestore';

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

/**
 * Markdown 渲染器：支援 H1 - H6
 */
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^###### (.*$)/gim, '<h6 class="text-base font-bold mt-4 mb-2 font-serif text-white">$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5 class="text-lg font-bold mt-6 mb-3 font-serif text-white">$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-xl font-bold mt-8 mb-4 font-serif text-white">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-10 mb-5 font-serif text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-12 mb-6 font-serif text-white">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl md:text-6xl font-bold mt-12 mb-8 font-serif text-white leading-tight">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br/>');
};

/**
 * 🛠️ CMS 管理員發文與編輯後台
 */
const CMSDashboard = ({ user, setView, editData, showMessage, menuList, socialLinks, baseMenuItems }) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [mainMenu, setMainMenu] = useState(editData?.mainMenu || menuList[1] || '');
  const [pathInput, setPathInput] = useState(editData?.subPath?.join('/') || '');
  const [content, setContent] = useState(editData?.content || '');
  const [pubDate, setPubDate] = useState(
    editData?.publishDate 
    ? new Date(editData.publishDate.toDate()).toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  const [links, setLinks] = useState(socialLinks);
  const [customMenus, setCustomMenus] = useState(baseMenuItems || []);
  const [newMenuInput, setNewMenuInput] = useState("");

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const articleData = {
        title, mainMenu: mainMenu.trim() || "未分類",
        subPath: pathInput.split('/').map(p => p.trim()).filter(p => p !== ''),
        content, authorEmail: user.email,
        publishDate: Timestamp.fromDate(new Date(pubDate))
      };
      if (editData?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', editData.id), { ...articleData, lastModified: Timestamp.now() });
        showMessage('檔案已更新');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), articleData);
        showMessage('發布成功');
      }
      setView({ type: 'home' });
    } catch (err) { showMessage('操作失敗'); } finally { setLoading(false); }
  };

  const updateSettings = async (type, data) => {
    try {
      const path = type === 'links' ? 'socialLinks' : 'menuSettings';
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', path), data);
      showMessage('設定同步完成');
    } catch (err) { showMessage('更新失敗'); }
  };

  const removeMenu = (item) => {
    const updated = customMenus.filter(m => m !== item);
    setCustomMenus(updated);
    updateSettings('menus', { items: updated });
  };

  const addMenu = () => {
    if (!newMenuInput.trim() || customMenus.includes(newMenuInput)) return;
    const updated = [...customMenus, newMenuInput.trim()];
    setCustomMenus(updated);
    updateSettings('menus', { items: updated });
    setNewMenuInput("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white font-sans">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <h2 className="text-4xl font-serif italic">{editData ? '編輯檔案.' : '建立館藏.'}</h2>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 text-[10px] tracking-widest hover:text-white uppercase cursor-pointer">Back</button>
      </div>

      <form onSubmit={handlePublish} className="space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">1. 選單位置</label>
            <input required className="w-full bg-transparent border-b border-white/10 py-3 text-2xl font-serif outline-none focus:border-[#368C84]" value={mainMenu} onChange={(e) => setMainMenu(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {menuList.map(m => (
                <button key={m} type="button" onClick={() => setMainMenu(m)} className={`px-4 py-1.5 rounded-full text-[9px] tracking-widest border cursor-pointer ${mainMenu === m ? 'bg-white text-black border-white' : 'border-white/10 text-white/30'}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1 flex items-center gap-2"><Calendar size={12}/> 2. 發布日期</label>
            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm outline-none focus:border-[#368C84]" value={pubDate} onChange={e => setPubDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">3. 無限層級路徑</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-lg outline-none focus:border-white text-white" value={pathInput} onChange={e => setPathInput(e.target.value)} placeholder="路徑/子路徑" />
        </div>
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">4. 檔案標題</label>
          <input required className="w-full bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-[#368C84]" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">5. 內容 (Markdown)</label>
          <textarea required rows={12} className="w-full bg-black/10 border border-white/5 p-8 rounded-[40px] text-white/80 font-mono text-sm outline-none focus:border-[#368C84]/50 transition-all" value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl">確認發布</button>
      </form>

      <div className="mt-40 space-y-12">
        <div className="p-10 bg-white/5 rounded-[60px] border border-white/5 space-y-8">
          <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/30 flex items-center gap-3"><Settings2 size={14}/> 選單導覽管理</h3>
          <div className="flex flex-wrap gap-4">
            {customMenus.map(m => (
              <div key={m} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full group">
                <span className="text-xs uppercase tracking-widest text-white/60">{m}</span>
                <button onClick={() => removeMenu(m)} className="text-white/20 hover:text-red-400 transition-colors"><XCircle size={14}/></button>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <input className="flex-1 bg-black/30 border border-white/5 rounded-full px-6 py-3 text-xs outline-none focus:border-[#368C84]" value={newMenuInput} onChange={e => setNewMenuInput(e.target.value)} placeholder="新增預設選單項目..." />
            <button onClick={addMenu} className="px-8 py-3 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Add</button>
          </div>
        </div>

        <div className="p-10 bg-white/5 rounded-[60px] border border-white/5 space-y-10 shadow-2xl">
          <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/30 flex items-center gap-3"><LinkIcon size={14}/> 社群連結設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.keys(links).map(key => (
              <div key={key} className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-white/20 ml-4 font-bold">{key}</label>
                <input className="w-full bg-black/30 border border-white/5 rounded-full px-6 py-3 text-[11px] outline-none focus:border-[#368C84] text-white/60 transition-all" value={links[key]} onChange={e => setLinks({...links, [key]: e.target.value})} />
              </div>
            ))}
          </div>
          <button onClick={() => updateSettings('links', links)} className="w-full py-5 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all font-black">更新社群連結</button>
        </div>
      </div>
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
  
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', youtube: '', linktree: '', spotify: '', applePodcast: '', mic: '' });
  const [baseMenuItems, setBaseMenuItems] = useState(["關於我", "校園生活", "隨想札記", "時事觀察", "音樂見聞", "讀書心得"]);

  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState({});
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editHistoryOpen, setEditHistoryOpen] = useState(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [percent, setPercent] = useState(0);

  useEffect(() => { return scrollYProgress.on("change", v => setPercent(Math.round(v * 100))); }, [scrollYProgress]);

  const isAdmin = user && user.email === ADMIN_EMAIL;
  const showMessage = (text) => { setMessage(text); setTimeout(() => setMessage(null), 3000); };

  useEffect(() => { onAuthStateChanged(auth, setUser); }, []);

  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.publishDate.toDate() - a.publishDate.toDate()));
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'socialLinks'), (doc) => {
      if(doc.exists()) setSocialLinks(doc.data());
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'menuSettings'), (doc) => {
      if(doc.exists()) setBaseMenuItems(doc.data().items);
    });
  }, []);

  const dynamicMenuItems = useMemo(() => {
    const fromArticles = new Set(articles.map(a => a.mainMenu));
    return [...new Set([...baseMenuItems, ...Array.from(fromArticles)])].filter(Boolean);
  }, [articles, baseMenuItems]);

  const menuRows = useMemo(() => {
    const items = dynamicMenuItems;
    const n = items.length;
    if (n <= 3) return [items];
    if (n === 4) return [items.slice(0, 2), items.slice(2)];
    const middleCount = Math.min(Math.ceil(n * 0.45), 4);
    const sideCount = Math.floor((n - middleCount) / 2);
    return [ items.slice(0, sideCount), items.slice(sideCount, sideCount + middleCount), items.slice(sideCount + middleCount) ].filter(r => r.length > 0);
  }, [dynamicMenuItems]);

  useEffect(() => {
    if (view.type !== 'article') return;
    const unsubC = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments'), (s) => setComments(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => a.createdAt - b.createdAt)));
    const unsubR = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'reactions'), (s) => {
      const res = {};
      s.docs.forEach(d => {
        const data = d.data();
        res[data.type] = (res[data.type] || 0) + 1;
        if (d.id === user?.uid) res.myType = data.type;
      });
      setReactions(res);
    });
    return () => { unsubC(); unsubR(); };
  }, [view.id, user]);

  useEffect(() => {
    if (!user) { setUserBookmarks([]); return; }
    return onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'bookmarks'), (s) => setUserBookmarks(s.docs.map(d => d.id)));
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setShowHeader(window.scrollY <= lastScrollY || window.scrollY <= 100);
      setLastScrollY(window.scrollY);
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const mMenu = activeMenu === 'All' || art.mainMenu === activeMenu;
      const mPath = activePath.every((s, i) => art.subPath?.[i] === s);
      const mSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || art.content.toLowerCase().includes(searchQuery.toLowerCase());
      return mMenu && mPath && mSearch;
    });
  }, [articles, activeMenu, activePath, searchQuery]);

  const toggleBookmark = async (id) => {
    if (!user) { showMessage('請先登入同步書籤'); signInWithPopup(auth, provider); return; }
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'bookmarks', id);
    if (userBookmarks.includes(id)) { await deleteDoc(ref); showMessage('已取消收藏'); }
    else { await setDoc(ref, { addedAt: Timestamp.now() }); showMessage('已收藏'); }
  };

  const SocialIconsList = ({ className }) => (
    <div className={`flex gap-6 text-white/30 ${className}`}>
      {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" className="hover:text-white transition-all"><Facebook size={20}/></a>}
      {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" className="hover:text-white transition-all"><Instagram size={20}/></a>}
      {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" className="hover:text-white transition-all"><Youtube size={20}/></a>}
      {socialLinks.linktree && <a href={socialLinks.linktree} target="_blank" className="hover:text-white transition-all"><LinkIcon size={20}/></a>}
      {socialLinks.spotify && <a href={socialLinks.spotify} target="_blank" className="hover:text-white transition-all"><Music size={20}/></a>}
      {socialLinks.applePodcast && <a href={socialLinks.applePodcast} target="_blank" className="hover:text-white transition-all"><Headphones size={20}/></a>}
      {socialLinks.mic && <a href={socialLinks.mic} target="_blank" className="hover:text-white transition-all"><Mic size={20}/></a>}
    </div>
  );

  // 互動組件：通用變粗 + 底線動畫
  const InteractiveLink = ({ children, onClick, className = "" }) => (
    <button onClick={onClick} className={`relative group transition-all duration-300 hover:font-black ${className}`}>
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 group-hover:w-full"></span>
    </button>
  );

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@300;400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
        .vertical-text { writing-mode: vertical-rl; text-orientation: mixed; }
        .menu-underline-active::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background: currentColor; transition: width 0.3s ease; }
        .menu-underline-active:hover::after { width: 100%; }
      `}</style>

      <AnimatePresence>
        {message && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-12 left-1/2 -translate-x-1/2 bg-white text-[#368C84] px-8 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-3 font-black text-xs tracking-widest">
            <CheckCircle2 size={16} /> {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 right-0 h-10 group z-[150] cursor-default">
        <motion.div className="h-1 bg-white origin-left shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ scaleX }} />
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/20 backdrop-blur-xl px-6 py-2 rounded-full flex items-center gap-6 pointer-events-auto border border-white/10 shadow-xl">
            <span className="text-[10px] font-black tracking-[0.2em]">{percent}% READ</span>
            <div className="h-3 w-px bg-white/20" />
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); showMessage('連結已複製'); }} className="hover:text-white/60 transition-colors cursor-pointer"><Share2 size={14}/></button>
            <button onClick={() => view.id && toggleBookmark(view.id)} className={`transition-all cursor-pointer ${view.id && userBookmarks.includes(view.id) ? 'text-white fill-white' : 'hover:text-white/60'}`}><Bookmark size={14}/></button>
          </div>
        </div>
      </div>

      <motion.nav animate={{ y: showHeader ? 0 : -100 }} className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference font-black tracking-tighter uppercase italic">
        <div onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="text-xl cursor-pointer hover:opacity-50 transition-all">Curtis Chen</div>
        <div className="flex items-center gap-8">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 cursor-pointer transition-all"><Search size={24}/></button>
          <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 cursor-pointer relative transition-all"><Menu size={32}/></button>
        </div>
      </motion.nav>

      {/* 搜尋 */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <input autoFocus placeholder="搜尋數位檔案館..." className="w-full bg-white/10 border border-white/20 backdrop-blur-3xl p-6 rounded-full text-xl outline-none focus:border-[#368C84]/50 transition-all text-white placeholder-white/20 shadow-2xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全螢幕對稱選單 (排版下移且不可捲動) */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col p-12 overflow-hidden select-none">
            {/* 頂部關閉按鈕 */}
            <div className="flex justify-end"><button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-all duration-500 cursor-pointer"><X size={48} strokeWidth={1}/></button></div>
            
            {/* 選單主體向下偏移 */}
            <div className="flex-grow flex flex-col items-center justify-around py-24 max-h-[85vh]">
              <div className="flex flex-col items-center gap-12 md:gap-20 w-full">
                {menuRows.map((row, rid) => (
                  <div key={rid} className="flex flex-wrap justify-center gap-12 md:gap-24 w-full px-4">
                    {row.map((item, i) => (
                      <InteractiveLink key={item} onClick={() => { setActiveMenu(item); setActivePath([]); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }} className="text-3xl md:text-5xl font-serif font-light tracking-tight px-2">
                        {item}
                      </InteractiveLink>
                    ))}
                  </div>
                ))}
              </div>
              
              <InteractiveLink onClick={() => { setView({type:'bookmarks'}); setIsMenuOpen(false); window.scrollTo(0,0); }} className="mt-12 text-[11px] uppercase tracking-[0.5em] flex items-center gap-4 border border-white/10 px-12 py-5 rounded-full hover:bg-white hover:text-black transition-all font-black shadow-2xl">
                <Bookmark size={14} fill={userBookmarks.length > 0 ? "currentColor" : "none"} /> MY ARCHIVE ({userBookmarks.length})
              </InteractiveLink>
            </div>

            {/* 底部功能區 */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-12 border-t border-white/10 pt-12 pb-2 mt-auto">
              <SocialIconsList />
              <div className="flex flex-col items-end gap-6">
                <div className="flex gap-6 items-center text-[10px] uppercase tracking-[0.4em] font-black">
                  {isAdmin ? (
                    <InteractiveLink onClick={() => { setEditingArticle(null); setView({type:'cms'}); setIsMenuOpen(false); }}>DASHBOARD</InteractiveLink>
                  ) : (
                    <InteractiveLink onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))}>{user ? `USER: ${user.email.split('@')[0]}` : 'SIGN IN'}</InteractiveLink>
                  )}
                  {user && <InteractiveLink onClick={() => signOut(auth)} className="text-red-400/60 hover:text-red-400">LOGOUT</InteractiveLink>}
                </div>
                {/* 此小字將剛好被導覽列遮蓋 */}
                <p className="text-[8px] text-white/5 italic tracking-widest uppercase">© 2026 Curtis Chen. Museum Blog Archive.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40">
            <div className="flex flex-row items-start gap-12 mb-32">
              <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={transition} className="flex gap-4">
                <div className="text-7xl md:text-[9.5vw] font-black leading-none uppercase tracking-tighter font-serif vertical-text border-r border-white/10 pr-6">博物館</div>
                <div className="text-7xl md:text-[9.5vw] font-black leading-none uppercase tracking-tighter font-serif vertical-text pt-32 italic">部落格</div>
              </motion.div>
              <div className="flex-1 space-y-6 pt-16 hidden md:block">
                <p className="text-xs uppercase tracking-[0.6em] text-white/40 border-b border-white/10 pb-6 font-black">Digital Archives of Life</p>
                <p className="text-lg font-serif italic text-white/60 leading-relaxed max-w-sm">致力於收藏生活中的美學動態，將瑣碎的感知轉化為永恆的數位檔案。</p>
                <SocialIconsList className="!gap-4 !text-white/10 pt-4" />
              </div>
            </div>

            <div className="space-y-4 mb-24 sticky top-0 bg-[#368C84]/90 backdrop-blur-lg z-50 py-4 border-b border-white/5">
              <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
                <span className="text-[9px] uppercase tracking-widest text-white/20 flex-shrink-0 flex items-center gap-2 font-black"><Filter size={10}/> Section</span>
                {['All', ...dynamicMenuItems].map(m => (
                  <button key={m} onClick={() => { setActiveMenu(m); setActivePath([]); }} className={`px-6 py-2 rounded-full text-[10px] transition-all border whitespace-nowrap cursor-pointer font-black group relative ${activeMenu === m ? 'bg-white text-black border-white shadow-xl' : 'border-white/10 text-white/40 hover:border-white/60'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1">
              {filteredArticles.length === 0 ? <div className="py-40 text-white/5 font-serif italic text-3xl text-center border border-dashed border-white/5 mt-10 rounded-[60px]">Archive empty.</div> : filteredArticles.map((art, index) => (
                <motion.div key={art.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} onClick={() => { setView({ type: 'article', id: art.id }); window.scrollTo(0,0); }} className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.02] transition-all px-8 -mx-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap text-[10px] uppercase tracking-widest text-white/40 italic font-bold">
                      <span>{art.mainMenu}</span>
                      {art.subPath?.map((p, i) => <span key={i} className="flex items-center gap-1 opacity-40"><ChevronRight size={10}/> {p}</span>)}
                      {userBookmarks.includes(art.id) && <Bookmark size={10} fill="currentColor" className="ml-2 text-[#368C84] bg-white rounded-full p-0.5" />}
                    </div>
                    <h3 className="text-4xl md:text-7xl font-serif transition-all duration-1000 text-white leading-tight group-hover:font-black group-hover:italic">{art.title}</h3>
                    <p className="text-[9px] uppercase tracking-widest text-white/20 font-mono">{new Date(art.publishDate.toDate()).toLocaleDateString()}</p>
                  </div>
                  <div className="mt-8 md:mt-0 flex items-center gap-4">
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); setEditingArticle(art); setView({type:'cms'}); }} className="p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all cursor-pointer"><Edit3 size={16} /></button>}
                    <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700 text-white"><ArrowUpRight size={24}/></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.main>
        )}

        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-5xl mx-auto pb-60">
            <div className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/20 font-serif italic">
                <InteractiveLink onClick={() => { setView({type:'home'}); setActiveMenu(articles.find(a => a.id === view.id).mainMenu); }}>{articles.find(a => a.id === view.id).mainMenu}</InteractiveLink>
                {articles.find(a => a.id === view.id)?.subPath?.map((p, i) => (<React.Fragment key={i}><ChevronRight size={10} /><span className="text-white/40">{p}</span></React.Fragment>))}
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => toggleBookmark(view.id)} className={`p-3 rounded-full border transition-all cursor-pointer ${userBookmarks.includes(view.id) ? 'bg-white text-[#368C84] shadow-xl' : 'border-white/10 hover:border-white/40'}`}><Bookmark size={16} fill={userBookmarks.includes(view.id) ? "currentColor" : "none"} /></button>
                {isAdmin && <button onClick={() => { setEditingArticle(articles.find(a => a.id === view.id)); setView({type:'cms'}); }} className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-6 py-2 rounded-full cursor-pointer hover:bg-white hover:text-black transition-all shadow-xl font-black group relative">EDIT ARCHIVE<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 group-hover:w-full"></span></button>}
              </div>
            </div>
            
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-[7.5vw] font-black font-serif mb-24 leading-[1.05] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-60 article-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                {/* 互動區 */}
                <div className="flex flex-col items-center gap-8 mb-40 border-y border-white/5 py-12">
                  <div className="flex gap-4 flex-wrap justify-center">
                    {[{e: '❤️', t: 'heart'}, {e: '😂', t: 'funny'}, {e: '😮', t: 'wow'}, {e: '😢', t: 'sad'}, {e: '💩', t: 'poop'}].map(emo => (
                      <motion.button key={emo.t} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => setReaction(emo.t)}
                        className={`p-5 rounded-[30px] border transition-all flex flex-col items-center gap-1 ${reactions.myType === emo.t ? 'bg-white text-[#368C84]' : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'}`}
                      >
                        <span className="text-3xl">{emo.e}</span>
                        <span className="text-[10px] font-black">{reactions[emo.t] || 0}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 留言區 */}
                <div className="max-w-3xl mx-auto mb-60 space-y-16">
                  <h3 className="text-2xl font-serif italic flex items-center gap-4">檔案評論區 <span className="text-xs font-mono opacity-20 tracking-tighter">({comments.length})</span></h3>
                  <div className="space-y-12">
                    {comments.map(c => (
                      <div key={c.id} className="group flex gap-6 items-start">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden shadow-2xl">
                          {c.userPhoto ? <img src={c.userPhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 italic">?</div>}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-white/80">{c.userName}</span>
                              <span className="text-[9px] text-white/20 font-mono italic">{new Date(c.createdAt.toDate()).toLocaleDateString()}</span>
                              {(c.editedAt || (c.history && c.history.length > 0)) && (
                                <button onClick={() => setEditHistoryOpen(editHistoryOpen === c.id ? null : c.id)} className="text-[8px] text-[#368C84] bg-white px-3 py-1 rounded-full font-black cursor-pointer hover:scale-110 transition-all uppercase">Edited</button>
                              )}
                            </div>
                            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              {c.userId === user?.uid && <button onClick={() => {setEditingCommentId(c.id); setNewComment(c.text);}} className="text-white/20 hover:text-white transition-all cursor-pointer"><Edit3 size={14}/></button>}
                              {(c.userId === user?.uid || isAdmin) && <button onClick={() => deleteComment(c.id)} className="text-white/20 hover:text-red-400 transition-all cursor-pointer"><Trash2 size={14}/></button>}
                            </div>
                          </div>
                          <p className="text-white/60 font-serif text-lg leading-relaxed">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 底部導覽區域：Back & Home 強制一行 */}
                <div className="flex flex-row justify-center items-center gap-12 md:gap-32 pt-20 border-t border-white/10">
                    <InteractiveLink onClick={() => { setView({type:'home'}); window.scrollTo(0,0); }} className="flex items-center gap-6 group cursor-pointer">
                        <div className="p-4 md:p-6 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl"><ArrowLeft size={24}/></div>
                        <span className="text-[10px] md:text-[12px] uppercase tracking-[0.5em] text-white/30 group-hover:text-white whitespace-nowrap font-black">Back to List</span>
                    </InteractiveLink>
                    <div className="h-16 w-px bg-white/10 hidden md:block" />
                    <InteractiveLink onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="flex items-center gap-6 group cursor-pointer">
                        <span className="text-[10px] md:text-[12px] uppercase tracking-[0.5em] text-white/30 group-hover:text-white whitespace-nowrap font-black">Return Home</span>
                        <div className="p-4 md:p-6 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl"><Home size={24}/></div>
                    </InteractiveLink>
                </div>
              </>
            )}
          </motion.article>
        )}

        {view.type === 'cms' && isAdmin && (
          <CMSDashboard user={user} setView={setView} editData={editingArticle} showMessage={showMessage} menuList={dynamicMenuItems} socialLinks={socialLinks} baseMenuItems={baseMenuItems} />
        )}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light italic">
        <SocialIconsList />
        <InteractiveLink className="font-black" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — MUSEUM BLOG ARCHIVE</InteractiveLink>
        <div className="flex items-center gap-8 transition-all hover:text-white/40 font-black"><ShieldCheck size={10}/> PRIVATE ENCRYPTION ACTIVE</div>
      </footer>
    </div>
  );
}