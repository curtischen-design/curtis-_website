import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight, ChevronRight, Layers, Tag, Bookmark, Share2, Edit3, CheckCircle2, ChevronDown, Heart, MessageSquare, Trash2, History, Send, 
  Instagram, Music, Headphones, Link as LinkIcon, Calendar, Settings2, XCircle, User as UserIcon, FileText, Globe, Star, SortAsc
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
 * Markdown 渲染器：支援 H1-H6 與 Obsidian Callouts
 */
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^> \[!quote\]\n([\s\S]*?)(?=\n\n|$)/gim, '<div class="my-8 p-6 bg-white/5 border-l-4 border-white/40 rounded-r-2xl italic font-serif text-white/90">“$1”</div>')
    .replace(/^> \[!info\]\n([\s\S]*?)(?=\n\n|$)/gim, '<div class="my-8 p-6 bg-[#368C84]/20 border-l-4 border-[#368C84] rounded-r-2xl text-white/80"><strong class="block mb-2 uppercase tracking-widest text-[10px] opacity-50">Information</strong>$1</div>')
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
 * 🛠️ 通用組件：互動連結 (變粗 + 底線動畫)
 */
const InteractiveLink = ({ children, onClick, className = "" }) => (
  <button onClick={onClick} className={`relative group transition-all duration-300 hover:font-black cursor-pointer inline-flex items-center ${className}`}>
    {children}
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 group-hover:w-full"></span>
  </button>
);

/**
 * 🛠️ CMS 管理員發文與編輯後台
 */
const CMSDashboard = ({ user, setView, editData, showMessage, menuList, socialLinks, baseMenuItems }) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [mainMenu, setMainMenu] = useState(editData?.mainMenu || menuList[1] || '');
  const [pathInput, setPathInput] = useState(editData?.subPath?.join('/') || '');
  const [content, setContent] = useState(editData?.content || '');
  const [isPinned, setIsPinned] = useState(editData?.isPinned || false);
  
  const formatForInput = (date) => {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };
  
  const [pubDate, setPubDate] = useState(
    editData?.publishDate 
    ? formatForInput(editData.publishDate.toDate()) 
    : formatForInput(new Date())
  );

  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState(socialLinks);
  const [customMenus, setCustomMenus] = useState(baseMenuItems || []);

  const handlePublish = async (isDraft = false) => {
    setLoading(true);
    try {
      const articleData = {
        title, mainMenu: mainMenu.trim() || "未分類",
        subPath: pathInput.split('/').map(p => p.trim()).filter(p => p !== ''),
        content, authorEmail: user.email,
        publishDate: Timestamp.fromDate(new Date(pubDate)),
        status: isDraft ? 'draft' : 'published',
        isPinned: isPinned
      };
      if (editData?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', editData.id), { ...articleData, lastModified: Timestamp.now() });
        showMessage(isDraft ? '草稿更新' : '已更新並發布');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), articleData);
        showMessage(isDraft ? '草稿已存' : '成功入庫');
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white font-sans">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8 text-white">
        <h2 className="text-4xl font-serif italic text-white">{editData ? '編輯檔案.' : '建立館藏.'}</h2>
        <InteractiveLink onClick={() => setView({ type: 'home' })} className="text-white/30 text-[10px] tracking-widest uppercase text-white">Back</InteractiveLink>
      </div>

      <div className="space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-white">
          <div className="space-y-4 text-white">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">1. 選單位置</label>
            <input required className="w-full bg-transparent border-b border-white/10 py-3 text-2xl font-serif outline-none focus:border-[#368C84] text-white" value={mainMenu} onChange={(e) => setMainMenu(e.target.value)} />
            <div className="flex flex-wrap gap-2 text-white">
              {menuList.map(m => (
                <button key={m} type="button" onClick={() => setMainMenu(m)} className={`px-4 py-1.5 rounded-full text-[9px] tracking-widest border cursor-pointer text-white ${mainMenu === m ? 'bg-white text-black border-white' : 'border-white/10 text-white/30'}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1 flex items-center gap-2"><Calendar size={12}/> 2. 發布時間</label>
            <input type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm outline-none focus:border-[#368C84] transition-all text-white" value={pubDate} onChange={e => setPubDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">3. 檔案標題與置頂</label>
          <div className="flex gap-4 items-center">
            <input required className="flex-1 bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-[#368C84] text-white" value={title} onChange={e => setTitle(e.target.value)} />
            <button onClick={() => setIsPinned(!isPinned)} className={`p-4 rounded-full border transition-all ${isPinned ? 'bg-white text-[#368C84] border-white' : 'border-white/10 text-white/20'}`}>
              <Star size={24} fill={isPinned ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">4. 內容 (Markdown)</label>
          <textarea required rows={12} className="w-full bg-black/10 border border-white/5 p-8 rounded-[40px] text-white/80 font-mono text-sm leading-relaxed outline-none focus:border-[#368C84]/50 transition-all text-white" value={content} onChange={e => setContent(e.target.value)} />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <button disabled={loading} onClick={() => handlePublish(false)} className="flex-1 bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3">
            <Globe size={18}/> 正式發布
          </button>
          <button disabled={loading} onClick={() => handlePublish(true)} className="flex-1 bg-white/10 border border-white/20 text-white py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:bg-white/20 transition-all flex items-center justify-center gap-3">
            <FileText size={18}/> 存為草稿
          </button>
        </div>
      </div>

      <div className="mt-40 space-y-12 border-t border-white/10 pt-40">
        <div className="p-10 bg-white/5 rounded-[60px] border border-white/5 space-y-8">
          <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/30 flex items-center gap-3"><Settings2 size={14}/> 導覽路徑管理</h3>
          <div className="flex flex-wrap gap-4">
            {customMenus.map(m => (
              <div key={m} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full group text-white">
                <span className="text-xs uppercase tracking-widest text-white/60">{m}</span>
                <button onClick={() => {
                  const updated = customMenus.filter(item => item !== m);
                  updateSettings('menus', { items: updated });
                }} className="text-white/20 hover:text-red-400 transition-colors cursor-pointer"><XCircle size={14}/></button>
              </div>
            ))}
          </div>
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
  const [sortMode, setSortMode] = useState('time');
  
  // 呼吸動畫狀態
  const [menuPulse, setMenuPulse] = useState(0);

  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', youtube: '', linktree: '', spotify: '', applePodcast: '', mic: '' });
  const [baseMenuItems, setBaseMenuItems] = useState([]);

  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState({});
  const [newComment, setNewComment] = useState("");

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [percent, setPercent] = useState(0);

  useEffect(() => { return scrollYProgress.on("change", v => setPercent(Math.round(v * 100))); }, [scrollYProgress]);

  const isAdmin = user && user.email === ADMIN_EMAIL;
  const showMessage = (text) => { setMessage(text); setTimeout(() => setMessage(null), 3000); };

  useEffect(() => { onAuthStateChanged(auth, setUser); }, []);

  // 變更：進網頁觸發 5 次呼吸
  useEffect(() => { setMenuPulse(prev => prev + 1); }, []);

  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'socialLinks'), (doc) => {
      if(doc.exists()) setSocialLinks(doc.data());
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'menuSettings'), (doc) => {
      if(doc.exists()) setBaseMenuItems(doc.data().items || []);
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

  const processedArticles = useMemo(() => {
    let list = articles.filter(art => {
      const isPublic = art.status === 'published';
      const mMenu = activeMenu === 'All' || art.mainMenu === activeMenu;
      const mPath = activePath.every((s, i) => art.subPath?.[i] === s);
      const mSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || art.content.toLowerCase().includes(searchQuery.toLowerCase());
      return (isAdmin || isPublic) && mMenu && mPath && mSearch;
    });
    list.sort((a, b) => b.publishDate.toDate() - a.publishDate.toDate());
    const pinned = list.filter(a => a.isPinned).slice(0, 5);
    const unpinned = list.filter(a => !a.isPinned);
    if (sortMode === 'comments') unpinned.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    else if (sortMode.startsWith('reaction_')) {
      const type = sortMode.split('_')[1];
      unpinned.sort((a, b) => (b.reactionData?.[type] || 0) - (a.reactionData?.[type] || 0));
    }
    return [...pinned, ...unpinned.slice(0, 5)];
  }, [articles, activeMenu, activePath, searchQuery, isAdmin, sortMode]);

  useEffect(() => {
    if (view.type !== 'article') return;
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments'), (s) => setComments(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => a.createdAt - b.createdAt)));
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'reactions'), (s) => {
      const res = {};
      s.docs.forEach(d => {
        const data = d.data();
        res[data.type] = (res[data.type] || 0) + 1;
        if (d.id === user?.uid) res.myType = data.type;
      });
      setReactions(res);
    });
  }, [view.id, user]);

  useEffect(() => {
    if (!user) { setUserBookmarks([]); return; }
    return onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'bookmarks'), (s) => setUserBookmarks(s.docs.map(d => d.id)));
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
      if (atBottom) { setMenuPulse(prev => prev + 1); } // 變更：觸底呼吸
      setShowHeader(window.scrollY <= lastScrollY || window.scrollY <= 100);
      setLastScrollY(window.scrollY);
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const toggleBookmark = async (id) => {
    if (!user) { showMessage('請先登入'); signInWithPopup(auth, provider); return; }
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'bookmarks', id);
    if (userBookmarks.includes(id)) { await deleteDoc(ref); showMessage('已取消'); }
    else { await setDoc(ref, { addedAt: Timestamp.now() }); showMessage('已收藏'); }
  };

  const setReaction = async (type) => {
    if (!user) { signInAnonymously(auth); return; }
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'reactions', user.uid);
    if (reactions.myType === type) { await deleteDoc(ref); }
    else { await setDoc(ref, { type, updatedAt: Timestamp.now() }); }
  };

  const postComment = async () => {
    if (!user) { signInWithPopup(auth, provider); return; }
    if (!newComment.trim()) return;
    const coll = collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments');
    await addDoc(coll, { text: newComment, userId: user.uid, userName: user.displayName, userPhoto: user.photoURL, createdAt: Timestamp.now() });
    setNewComment("");
    showMessage('留言成功');
  };

  const deleteComment = async (id) => {
    if (!confirm("確定要將這條評論永久刪除？")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments', id));
    showMessage('已刪除');
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

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Noto+Serif+TC:wght@300;400;700;900&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
        .vertical-text { writing-mode: vertical-rl; text-orientation: mixed; }
      `}</style>

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-12 left-1/2 -translate-x-1/2 bg-white text-[#368C84] px-8 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-3 font-black text-xs tracking-widest uppercase">
            <CheckCircle2 size={16} /> {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover 進度條工具列 */}
      <div className="fixed top-0 left-0 right-0 h-10 group z-[150] cursor-default text-white">
        <motion.div className="h-1 bg-white origin-left shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ scaleX }} />
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/20 backdrop-blur-xl px-6 py-2 rounded-full flex items-center gap-6 pointer-events-auto border border-white/10 shadow-xl">
            <span className="text-[10px] font-black tracking-[0.2em]">{percent}% READ</span>
            <div className="h-3 w-px bg-white/20" />
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); showMessage('連結已複製'); }} className="hover:text-white/60 transition-colors cursor-pointer"><Share2 size={14} color="white"/></button>
            <button onClick={() => view.id && toggleBookmark(view.id)} className={`transition-all cursor-pointer ${view.id && userBookmarks.includes(view.id) ? 'text-white fill-white' : 'hover:text-white/60'}`}><Bookmark size={14} color="white"/></button>
          </div>
        </div>
      </div>

      {/* 頂部導航 */}
      <motion.nav animate={{ y: showHeader ? 0 : -100 }} className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference font-black tracking-tighter uppercase italic text-white">
        <div onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="text-xl cursor-pointer hover:opacity-50 transition-all">Curtis Chen</div>
        
        <div className="flex items-center gap-6">
          <div className="h-4 w-px bg-white/20 hidden md:block" />
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 cursor-pointer transition-all"><Search size={20} color="white"/></button>
          <motion.button 
             key={menuPulse}
             animate={{ scale: [1, 1.25, 1] }}
             transition={{ repeat: 4, duration: 0.6, ease: "easeInOut" }}
             onClick={() => setIsMenuOpen(true)} 
             className="hover:opacity-50 cursor-pointer relative transition-all"
          >
            <Menu size={28} color="white"/>
          </motion.button>
        </div>
      </motion.nav>

      {/* 搜尋視窗 */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <input autoFocus placeholder="搜尋數位檔案館..." className="w-full bg-white/10 border border-white/20 backdrop-blur-3xl p-6 rounded-full text-xl outline-none focus:border-[#368C84]/50 transition-all text-white placeholder-white/20 shadow-2xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全螢幕對稱選單 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col p-12 overflow-hidden select-none text-white">
            <div className="flex justify-end items-center gap-8">
              <button onClick={() => { setIsSearchOpen(true); setIsMenuOpen(false); }} className="hover:opacity-50 transition-all cursor-pointer"><Search size={28} color="white"/></button>
              <button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-all duration-500 cursor-pointer"><X size={48} strokeWidth={1} color="white"/></button>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-around py-24 max-h-[85vh]">
              <div className="flex flex-col items-center gap-12 md:gap-20 w-full text-white">
                {menuRows.map((row, rid) => (
                  <div key={rid} className="flex flex-wrap justify-center gap-12 md:gap-24 w-full px-4 text-white">
                    {row.map((item) => (
                      <InteractiveLink key={item} onClick={() => { setActiveMenu(item); setActivePath([]); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }} className="text-3xl md:text-5xl font-serif font-light tracking-tight px-2 text-white">
                        {item}
                      </InteractiveLink>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col items-center gap-8 mt-12 w-full text-white">
                <div className="flex flex-wrap justify-center gap-12 text-white/50">
                   {isAdmin && <InteractiveLink onClick={() => { setEditingArticle(null); setView({type:'cms'}); setIsMenuOpen(false); }} className="text-xs tracking-[0.2em] text-white">DASHBOARD</InteractiveLink>}
                   {!isAdmin && !user && <InteractiveLink onClick={() => { signInWithPopup(auth, provider).then(() => setIsMenuOpen(false)); }} className="text-xs tracking-[0.2em] text-white">LOGIN</InteractiveLink>}
                </div>
                <InteractiveLink onClick={() => { setView({type:'bookmarks'}); setIsMenuOpen(false); window.scrollTo(0,0); }} className="text-[11px] uppercase tracking-[0.5em] flex items-center gap-4 border border-white/10 px-12 py-5 rounded-full hover:bg-white hover:text-black transition-all font-black shadow-2xl text-white">
                  <Bookmark size={14} fill={userBookmarks.length > 0 ? "currentColor" : "none"} /> MY ARCHIVE ({userBookmarks.length})
                </InteractiveLink>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end gap-12 border-t border-white/10 pt-12 pb-4 mt-auto text-white/30">
              <SocialIconsList />
              <div className="flex flex-col items-end gap-6 text-[10px] uppercase tracking-[0.4em] font-black text-white">
                <div className="flex gap-6 items-center text-white">
                  {user && <InteractiveLink onClick={() => signOut(auth)} className="text-red-400/60 hover:text-red-400">LOGOUT</InteractiveLink>}
                </div>
                <p className="text-[8px] text-white/5 italic tracking-widest uppercase opacity-30">© 2026 Curtis Chen. Museum Blog Archive.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* 首頁 */}
        {view.type === 'home' && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40 text-white">
            <div className="flex flex-row items-start gap-12 mb-32">
              <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={transition} className="flex gap-4">
                <div className="text-7xl md:text-[9.5vw] font-black leading-none uppercase tracking-tighter font-serif vertical-text border-r border-white/10 pr-6 text-white">博物館</div>
                <div className="text-7xl md:text-[9.5vw] font-black leading-none uppercase tracking-tighter font-serif vertical-text pt-32 italic text-white">部落格</div>
              </motion.div>
              <div className="flex-1 space-y-6 pt-16 hidden md:block text-white/60">
                <p className="text-xs uppercase tracking-[0.6em] text-white/40 border-b border-white/10 pb-6 font-black text-white/40">Digital Curations by Curtis Chen</p>
                <p className="text-lg font-serif italic text-white/60 leading-relaxed max-w-sm">致力於收藏生活中的美學動態，將瑣碎的感知轉化為永恆的數位檔案。</p>
                <SocialIconsList className="!gap-4 !text-white/10 pt-4" />
              </div>
            </div>

            <div className="space-y-8 mb-24 sticky top-0 bg-[#368C84]/90 backdrop-blur-lg z-50 py-6 border-b border-white/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* 修改重點：精選標題與限制選單顯示 */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide font-black text-white">
                    <span className="text-[9px] uppercase tracking-widest text-white/40 flex-shrink-0 flex items-center gap-2 font-black"><Filter size={10}/> 精選</span>
                    {['All', ...(activeMenu !== 'All' ? [activeMenu] : [])].map(m => (
                      <button key={m} onClick={() => { setActiveMenu(m); setActivePath([]); }} className={`px-6 py-2 rounded-full text-[10px] transition-all border whitespace-nowrap cursor-pointer relative group ${activeMenu === m ? 'bg-white text-black border-white shadow-xl' : 'border-white/10 text-white/40 hover:border-white/60'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <span className="text-[8px] text-white/10 ml-10 mt-1">[（看更多請點右上選單）]</span>
                </div>

                <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.2em] font-black text-white/40 self-end md:self-auto">
                   <SortAsc size={12}/>
                   <span>Sort By</span>
                   <select 
                      className="bg-transparent border-none outline-none text-white cursor-pointer hover:text-white transition-colors"
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                   >
                      <option value="time" className="bg-[#368C84]">Timeline</option>
                      <option value="reaction_heart" className="bg-[#368C84]">Reaction ❤️</option>
                      <option value="reaction_poop" className="bg-[#368C84]">Reaction 💩</option>
                      <option value="comments" className="bg-[#368C84]">Discussion</option>
                   </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1">
              {processedArticles.map((art, index) => (
                <motion.div key={art.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} onClick={() => { setView({ type: 'article', id: art.id }); window.scrollTo(0,0); }} className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.02] transition-all px-8 -mx-8 relative text-white">
                  <div className="flex-1 space-y-4 text-white">
                    <div className="flex items-center gap-3 flex-wrap text-[10px] uppercase tracking-widest text-white/40 italic font-bold">
                      {art.isPinned && <Star size={12} fill="white" className="text-white mr-2" />}
                      <span>{art.mainMenu}</span>
                      {art.subPath?.map((p, i) => <span key={i} className="flex items-center gap-1 opacity-40"><ChevronRight size={10} color="white"/> {p}</span>)}
                    </div>
                    <h3 className="text-4xl md:text-7xl font-serif transition-all duration-1000 text-white leading-tight group-hover:font-black group-hover:italic">{art.title}</h3>
                    <div className="flex gap-6 text-[9px] uppercase tracking-widest text-white/20 font-mono text-white/20">
                      <span>{new Date(art.publishDate.toDate()).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={10}/> {art.commentsCount || 0}</span>
                      <span className="flex items-center gap-1">💩 {art.reactionData?.poop || 0}</span>
                    </div>
                  </div>
                  <div className="mt-8 md:mt-0 flex items-center gap-4 text-white">
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); setEditingArticle(art); setView({type:'cms'}); }} className="p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all cursor-pointer"><Edit3 size={16} color="white"/></button>}
                    <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700 text-white"><ArrowUpRight size={24} color="white" className="group-hover:stroke-black" /></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.main>
        )}

        {/* 文章內容 */}
        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-6xl mx-auto pb-60 text-white">
            <div className="flex justify-between items-center mb-16 border-b border-white/5 pb-8 text-white">
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/20 font-serif italic text-white">
                <InteractiveLink onClick={() => { setView({type:'home'}); setActiveMenu(articles.find(a => a.id === view.id).mainMenu); }} className="text-white">{articles.find(a => a.id === view.id).mainMenu}</InteractiveLink>
                {articles.find(a => a.id === view.id)?.subPath?.map((p, i) => (<React.Fragment key={i}><ChevronRight size={10} color="white" /><span className="text-white/40">{p}</span></React.Fragment>))}
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => toggleBookmark(view.id)} className={`p-3 rounded-full border transition-all cursor-pointer ${userBookmarks.includes(view.id) ? 'bg-white text-[#368C84] shadow-xl' : 'border-white/10 hover:border-white/40'}`}><Bookmark size={16} color="white" fill={userBookmarks.includes(view.id) ? "white" : "none"} /></button>
                {isAdmin && <button onClick={() => { setEditingArticle(articles.find(a => a.id === view.id)); setView({type:'cms'}); }} className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-6 py-2 rounded-full font-black shadow-xl transition-all hover:bg-white hover:text-black uppercase text-white">Edit exhibit</button>}
              </div>
            </div>
            
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-[7.5vw] font-black font-serif mb-24 leading-[1.05] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-60 article-content text-white" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                {/* 反應區 */}
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
                  <h3 className="text-2xl font-serif italic flex items-center gap-4 text-white">檔案評論區 <span className="text-xs font-mono opacity-20 tracking-tighter">({comments.length})</span></h3>
                  <div className="space-y-12 text-white">
                    {comments.map(c => (
                      <div key={c.id} className="group flex gap-6 items-start text-white">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden shadow-2xl text-white">
                          {c.userPhoto ? <img src={c.userPhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 italic font-black font-serif uppercase">?</div>}
                        </div>
                        <div className="flex-1 space-y-2 text-white">
                          <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-3 text-white">
                              <span className="text-xs font-black text-white/80">{c.userName}</span>
                              <span className="text-[9px] text-white/20 font-mono italic">{new Date(c.createdAt.toDate()).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(c.userId === user?.uid || isAdmin) && <button onClick={() => deleteComment(c.id)} className="text-white/20 hover:text-red-400 transition-all cursor-pointer"><Trash2 size={14}/></button>}
                            </div>
                          </div>
                          <p className="text-white/60 font-serif text-lg leading-relaxed">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relative pt-12">
                    <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-[50px] p-10 outline-none focus:border-[#368C84]/50 transition-all font-serif text-white placeholder-white/5 shadow-inner" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={user ? "撰寫評論..." : "請先登入以發表評論"} disabled={!user} />
                    {user ? (
                      <button onClick={postComment} className="absolute bottom-8 right-10 bg-white text-[#368C84] px-10 py-4 rounded-full font-black text-xs flex items-center gap-4 cursor-pointer shadow-2xl hover:scale-105 transition-all uppercase tracking-widest text-[#368C84]">
                        Submit <Send size={18}/>
                      </button>
                    ) : (
                      <button onClick={() => signInWithPopup(auth, provider)} className="absolute bottom-8 right-10 bg-white/10 text-white px-10 py-4 rounded-full font-black text-xs cursor-pointer hover:bg-white/20 transition-all font-black tracking-widest uppercase text-white">Sign In to Post</button>
                    )}
                  </div>
                </div>

                {/* 整合導覽區塊 */}
                <div className="pt-32 border-t border-white/10 flex flex-col items-center">
                    <p className="text-[10px] uppercase tracking-[0.6em] text-white/20 mb-12 italic font-black text-white/40">Next Exhibition</p>
                    <div className="w-full flex flex-row items-center justify-between gap-4 md:gap-12 px-2">
                        <div onClick={() => { setView({type:'home'}); window.scrollTo(0,0); }} className="flex items-center gap-6 group cursor-pointer text-white flex-shrink-0">
                            <div className="p-3 md:p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl flex items-center justify-center">
                                <ArrowLeft size={20} color="white" className="group-hover:stroke-black" />
                            </div>
                            <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/30 group-hover:text-white whitespace-nowrap font-black hidden lg:inline">Back to List</span>
                        </div>
                        {articles.filter(a => a.id !== view.id)[0] && (
                           <motion.div whileHover={{ scale: 1.05 }} onClick={() => { setView({type:'article', id: articles.filter(a => a.id !== view.id)[0].id}); window.scrollTo(0,0); }} className="flex flex-col items-center group cursor-pointer max-w-[50%] md:max-w-xl text-center text-white overflow-hidden">
                              <h4 className="text-xl md:text-4xl font-serif text-white transition-all leading-tight tracking-tighter group-hover:italic group-hover:font-black truncate w-full">
                                 {articles.filter(a => a.id !== view.id)[0].title}
                              </h4>
                              <ArrowRight size={20} className="mt-4 text-white/20 group-hover:text-white transition-colors" />
                           </motion.div>
                        )}
                        <div onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="flex items-center gap-6 group cursor-pointer text-white flex-shrink-0">
                            <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/30 group-hover:text-white whitespace-nowrap font-black hidden lg:inline">Return Home</span>
                            <div className="p-3 md:p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl flex items-center justify-center">
                                <Home size={20} color="white" className="group-hover:stroke-black" />
                            </div>
                        </div>
                    </div>
                </div>
              </>
            )}
          </motion.article>
        )}

        {view.type === 'bookmarks' && (
          <motion.main key="bookmarks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40 min-h-screen text-white">
             <div className="mb-24 border-b border-white/10 pb-12 text-white">
               <InteractiveLink onClick={() => setView({type:'home'})} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-8 font-black text-white">BACK TO HALL</InteractiveLink>
               <h1 className="text-6xl md:text-8xl font-serif italic font-light leading-none text-white">My Private Gallery.</h1>
             </div>
             <div className="grid grid-cols-1">
               {articles.filter(a => userBookmarks.includes(a.id)).map((art, index) => (
                   <motion.div key={art.id} onClick={() => setView({type:'article', id: art.id})} className="group py-12 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] px-8 -mx-8 transition-all text-white">
                     <div><p className="text-[9px] uppercase tracking-widest text-white/40 mb-3 italic font-bold">{art.mainMenu} {art.subPath?.length > 0 && `/ ${art.subPath.join(' / ')}`}</p><h3 className="text-3xl md:text-5xl font-serif text-white transition-all group-hover:font-black group-hover:italic">{art.title}</h3></div>
                     <button onClick={(e) => { e.stopPropagation(); toggleBookmark(art.id); }} className="p-4 hover:text-red-400 cursor-pointer transition-all"><X size={24} color="white"/></button>
                   </motion.div>
               ))}
             </div>
          </motion.main>
        )}

        {view.type === 'cms' && isAdmin && (
          <CMSDashboard user={user} setView={setView} editData={editingArticle} showMessage={showMessage} menuList={dynamicMenuItems} socialLinks={socialLinks} baseMenuItems={baseMenuItems} />
        )}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light italic text-white/10">
        <SocialIconsList />
        <InteractiveLink className="font-black text-white/20" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — MUSEUM BLOG ARCHIVE</InteractiveLink>
        <div className="flex items-center gap-8 transition-all hover:text-white/40 font-black uppercase text-white/20"><ShieldCheck size={10}/> Private Encryption Active</div>
      </footer>
    </div>
  );
}