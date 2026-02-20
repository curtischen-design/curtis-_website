import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight, ChevronRight, Layers, Tag, Bookmark, Share2, Edit3, CheckCircle2, ChevronDown, Heart, MessageSquare, Trash2, History, Send, 
  Instagram, Music, Headphones, Link as LinkIcon, Calendar, Settings2, XCircle, User as UserIcon, FileText, Globe, Star, SortAsc, Info, Quote, Save
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
 * Markdown 渲染器：支援 Obsidian Callouts (修正加強版)
 */
const renderMarkdown = (text) => {
  if (!text) return '';
  let processed = text;

  // 1. Obsidian Callout 渲染 (支援多行且過濾 > 符號)
  const calloutRegex = /^> \[!(quote|info)\](.*?)\n((?:^>.*\n?)+)/gim;
  processed = processed.replace(calloutRegex, (match, type, title, content) => {
    const innerContent = content.replace(/^>\s?/gm, '').trim();
    if (type.toLowerCase() === 'quote') {
      return `<div class="my-10 p-8 bg-white/5 border-l-4 border-white/40 rounded-r-3xl italic font-serif text-white/90 shadow-inner relative">
                <div class="text-xl md:text-2xl leading-relaxed text-white">“${innerContent}”</div>
              </div>`;
    } else {
      return `<div class="my-10 p-8 bg-[#368C84]/20 border-l-4 border-[#368C84] rounded-r-3xl shadow-xl text-white">
                <div class="flex items-center gap-3 mb-4 opacity-50 text-white font-black">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span class="uppercase tracking-[0.4em] text-[10px] text-white">Information</span>
                </div>
                <div class="text-white/80 leading-relaxed text-white">${innerContent}</div>
              </div>`;
    }
  });

  return processed
    .replace(/^###### (.*$)/gim, '<h6 class="text-base font-bold mt-4 mb-2 font-serif text-white">$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5 class="text-lg font-bold mt-6 mb-3 font-serif text-white">$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-xl font-bold mt-8 mb-4 font-serif text-white">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-10 mb-5 font-serif text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-12 mb-6 font-serif text-white">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl md:text-6xl font-bold mt-12 mb-8 font-serif text-white leading-tight">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br/>');
};

const InteractiveLink = ({ children, onClick, className = "" }) => (
  <button onClick={onClick} className={`relative group transition-all duration-300 hover:font-black cursor-pointer inline-flex items-center ${className}`}>
    {children}
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 group-hover:w-full"></span>
  </button>
);

/**
 * 🛠️ CMS 管理員面板 (支援草稿條目羅列)
 */
const CMSDashboard = ({ user, setView, editData, showMessage, menuList, articles, featuredMenus, menuQuotes }) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [mainMenu, setMainMenu] = useState(editData?.mainMenu || menuList[0] || '');
  const [pathInput, setPathInput] = useState(editData?.subPath?.join('/') || '');
  const [content, setContent] = useState(editData?.content || '');
  const [isPinned, setIsPinned] = useState(editData?.isPinned || false);
  
  const formatForInput = (date) => {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };
  
  const [pubDate, setPubDate] = useState(
    editData?.publishDate ? formatForInput(editData.publishDate.toDate()) : formatForInput(new Date())
  );

  const [loading, setLoading] = useState(false);

  // 草稿分組邏輯
  const groupedDrafts = useMemo(() => {
    const drafts = articles.filter(a => a.status === 'draft');
    const groups = {};
    drafts.forEach(d => {
      const m = d.mainMenu || '未分類';
      const s = d.subPath?.[0] || '一般展品';
      if (!groups[m]) groups[m] = {};
      if (!groups[m][s]) groups[m][s] = [];
      groups[m][s].push(d);
    });
    return groups;
  }, [articles]);

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
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), articleData);
      }
      showMessage(isDraft ? '草稿已保存' : '館藏已同步');
      setView({ type: 'home' });
    } catch (err) { showMessage('操作失敗'); } finally { setLoading(false); }
  };

  const toggleFMenu = async (name) => {
    const updated = featuredMenus.includes(name) ? featuredMenus.filter(m => m !== name) : [...featuredMenus, name];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'featuredMenuSettings'), { items: updated });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-60 text-white font-sans">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8 text-white">
        <h2 className="text-4xl font-serif italic text-white">{editData ? '編輯檔案.' : '新增展品.'}</h2>
        <InteractiveLink onClick={() => setView({ type: 'home' })} className="text-white text-white">Back</InteractiveLink>
      </div>

      <div className="space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">1. 選單分類</label>
            <input required className="w-full bg-transparent border-b border-white/10 py-3 text-2xl font-serif outline-none focus:border-[#368C84] text-white" value={mainMenu} onChange={(e) => setMainMenu(e.target.value)} />
            <div className="flex flex-wrap gap-2 mt-4">
              {menuList.map(m => (
                <button key={m} type="button" onClick={() => setMainMenu(m)} className={`px-4 py-1.5 rounded-full text-[9px] tracking-widest border cursor-pointer text-white ${mainMenu === m ? 'bg-white text-black border-white' : 'border-white/10 text-white/30 hover:border-white/50'}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4 text-white">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1 flex items-center gap-2 text-white"><Calendar size={12}/> 2. 檔案標記時間</label>
            <input type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm outline-none focus:border-[#368C84] transition-all text-white" value={pubDate} onChange={e => setPubDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">3. 標題與訂選 (Star)</label>
          <div className="flex gap-4 items-center">
            <input required className="flex-1 bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-[#368C84] text-white" value={title} onChange={e => setTitle(e.target.value)} />
            <button onClick={() => setIsPinned(!isPinned)} className={`p-4 rounded-full border transition-all ${isPinned ? 'bg-white text-[#368C84] border-white' : 'border-white/10 text-white/20'}`}>
              <Star size={24} fill={isPinned ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <div className="space-y-4 text-white">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">4. 子路徑 (如: 大一 / 生活)</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-lg outline-none focus:border-white text-white" value={pathInput} onChange={e => setPathInput(e.target.value)} placeholder="Root / Path / Subpath" />
        </div>

        <div className="space-y-4 text-white">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1 text-white">5. 內容 (支援 &gt; [!quote] 渲染)</label>
          <textarea required rows={12} className="w-full bg-black/10 border border-white/5 p-8 rounded-[40px] text-white/80 font-mono text-sm leading-relaxed outline-none focus:border-[#368C84]/50 transition-all text-white" value={content} onChange={e => setContent(e.target.value)} />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <button disabled={loading} onClick={() => handlePublish(false)} className="flex-1 bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3">
            <Globe size={18}/> 正式發布
          </button>
          <button disabled={loading} onClick={() => handlePublish(true)} className="flex-1 bg-white/10 border border-white/20 text-white py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:bg-white/20 transition-all flex items-center justify-center gap-3 text-white">
            <FileText size={18}/> 存為秘密草稿
          </button>
        </div>
      </div>

      {/* 草稿羅列管理區 */}
      <div className="mt-40 space-y-12 border-t border-white/10 pt-40 text-white">
        <h3 className="text-[10px] uppercase tracking-[0.6em] text-white/30 flex items-center gap-3 text-white"><FileText size={14}/> 草稿檔案庫 (按分類與子區分組)</h3>
        {Object.keys(groupedDrafts).length === 0 ? (
          <p className="text-white/10 font-serif italic text-xl">目前沒有未完成的草稿。</p>
        ) : (
          Object.entries(groupedDrafts).map(([menu, subGroups]) => (
            <div key={menu} className="space-y-6">
              <h4 className="text-xs uppercase tracking-[0.4em] text-[#368C84] font-black border-l-2 border-[#368C84] pl-4">{menu}</h4>
              {Object.entries(subGroups).map(([sub, arts]) => (
                <div key={sub} className="ml-6 space-y-4">
                  <span className="text-[10px] text-white/20 uppercase tracking-widest italic">{sub}</span>
                  <div className="flex flex-col gap-2">
                    {arts.map(art => (
                      <button key={art.id} onClick={() => { setEditingArticle(art); window.scrollTo(0,0); }} className="text-left py-2 border-b border-white/5 hover:text-[#368C84] transition-colors group flex items-center justify-between">
                         <span className="font-serif text-lg">{art.title}</span>
                         <Edit3 size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
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
  const [activeSubPath, setActiveSubPath] = useState('All');
  const [user, setUser] = useState(null);
  const [userBookmarks, setUserBookmarks] = useState([]); 
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [message, setMessage] = useState(null);
  const [sortMode, setSortMode] = useState('time');
  const [menuPulseKey, setMenuPulseKey] = useState(0);

  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', youtube: '', linktree: '', spotify: '', applePodcast: '', mic: '' });
  const [baseMenuItems, setBaseMenuItems] = useState([]);
  const [featuredMenus, setFeaturedMenus] = useState([]);
  const [menuQuotes, setMenuQuotes] = useState({});

  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState({});
  const [newComment, setNewComment] = useState("");
  const [isEditingQuote, setIsEditingQuote] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [percent, setPercent] = useState(0);

  useEffect(() => { return scrollYProgress.on("change", v => setPercent(Math.round(v * 100))); }, [scrollYProgress]);

  const isAdmin = user && user.email === ADMIN_EMAIL;
  const showMessage = (text) => { setMessage(text); setTimeout(() => setMessage(null), 3000); };

  useEffect(() => { 
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth); // 確保互動功能可用
    });
  }, []);

  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'socialLinks'), (doc) => { if(doc.exists()) setSocialLinks(doc.data()); });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'menuSettings'), (doc) => { if(doc.exists()) setBaseMenuItems(doc.data().items || []); });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'featuredMenuSettings'), (doc) => { if(doc.exists()) setFeaturedMenus(doc.data().items || []); });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'menuQuotes'), (doc) => { if(doc.exists()) setMenuQuotes(doc.data()); });
  }, []);

  const dynamicMenuItems = useMemo(() => {
    const fromArticles = new Set(articles.map(a => a.mainMenu));
    return [...new Set([...baseMenuItems, ...Array.from(fromArticles)])].filter(Boolean);
  }, [articles, baseMenuItems]);

  const menuRows = useMemo(() => {
    const items = dynamicMenuItems;
    const n = items.length;
    if (n <= 3) return [items];
    const middleCount = Math.min(Math.ceil(n * 0.45), 4);
    const sideCount = Math.floor((n - middleCount) / 2);
    return [ items.slice(0, sideCount), items.slice(sideCount, sideCount + middleCount), items.slice(sideCount + middleCount) ].filter(r => r.length > 0);
  }, [dynamicMenuItems]);

  // 排序與安全過濾邏輯
  const processedArticles = useMemo(() => {
    let list = articles.filter(art => {
      const isPublic = art.status === 'published';
      const mMenu = activeMenu === 'All' || art.mainMenu === activeMenu;
      const mSub = activeSubPath === 'All' || art.subPath?.[0] === activeSubPath;
      const mSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || art.content.toLowerCase().includes(searchQuery.toLowerCase());
      // 只有管理員能看到草稿，或者文章狀態是正式發布
      return (isAdmin || isPublic) && mMenu && mSub && mSearch;
    });

    if (sortMode === 'time') list.sort((a, b) => b.publishDate.toDate() - a.publishDate.toDate());
    else if (sortMode === 'comments') list.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));

    if (view.type === 'home' && activeMenu === 'All') {
       const pinned = list.filter(a => a.isPinned).slice(0, 5);
       const unpinned = list.filter(a => !a.isPinned);
       return [...pinned, ...unpinned.slice(0, 5)];
    }
    return list;
  }, [articles, activeMenu, activeSubPath, searchQuery, isAdmin, view.type, sortMode]);

  const showroomSubPaths = useMemo(() => {
     if (activeMenu === 'All') return [];
     const paths = new Set();
     articles.filter(a => a.mainMenu === activeMenu).forEach(a => { if (a.subPath?.[0]) paths.add(a.subPath[0]); });
     return Array.from(paths);
  }, [articles, activeMenu]);

  const groupedArticles = useMemo(() => {
    if (activeMenu === 'All') return null;
    const groups = {};
    processedArticles.forEach(art => {
       const groupName = art.subPath?.[0] || '一般展品';
       if (!groups[groupName]) groups[groupName] = [];
       groups[groupName].push(art);
    });
    return groups;
  }, [processedArticles, activeMenu]);

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
    const handleScroll = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 10;
      if (atBottom) { setMenuPulseKey(prev => prev + 1); } 
      setShowHeader(window.scrollY <= lastScrollY || window.scrollY <= 100);
      setLastScrollY(window.scrollY);
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // 管理員專屬：更新精選
  const toggleFMenu = async (name) => {
    if (!isAdmin) return;
    const updated = featuredMenus.includes(name) ? featuredMenus.filter(m => m !== name) : [...featuredMenus, name];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'featuredMenuSettings'), { items: updated });
    showMessage('精選列表同步中');
  };

  // 管理員專屬：更新名言
  const updateQuote = async (val) => {
    const updated = { ...menuQuotes, [activeMenu]: val };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'menuQuotes'), updated);
    setIsEditingQuote(false);
    showMessage('展廳標語已更新');
  };

  const toggleBookmark = async (id) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'bookmarks', id);
    if (userBookmarks.includes(id)) { await deleteDoc(ref); }
    else { await setDoc(ref, { addedAt: Timestamp.now() }); }
  };

  const setReaction = async (type) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'reactions', user.uid);
    if (reactions.myType === type) { await deleteDoc(ref); }
    else { await setDoc(ref, { type, updatedAt: Timestamp.now() }); }
  };

  const postComment = async () => {
    if (!user || !newComment.trim()) return;
    const coll = collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments');
    await addDoc(coll, { text: newComment, userId: user.uid, userName: user.displayName || '訪客訪員', userPhoto: user.photoURL, createdAt: Timestamp.now() });
    setNewComment("");
  };

  const deleteComment = async (id) => {
    if (!confirm("永久移除此評論？")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments', id));
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
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84] text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Noto+Serif+TC:wght@300;400;700;900&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
        .vertical-text { writing-mode: vertical-rl; text-orientation: mixed; }
      `}</style>

      {/* Toast Notification */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-12 left-1/2 -translate-x-1/2 bg-white text-[#368C84] px-8 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-3 font-black text-xs tracking-widest uppercase">
            <CheckCircle2 size={16} color="#368C84" /> <span className="text-[#368C84]">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav animate={{ y: showHeader ? 0 : -100 }} className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference font-black tracking-tighter uppercase italic text-white">
        <div onClick={() => { setView({type:'home'}); setActiveMenu('All'); setActiveSubPath('All'); window.scrollTo(0,0); }} className="text-xl cursor-pointer hover:opacity-50 transition-all">Curtis Chen</div>
        <div className="flex items-center gap-6">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 cursor-pointer transition-all"><Search size={20} color="white"/></button>
          <motion.button 
             key={menuPulseKey}
             animate={{ scale: [1, 1.3, 1], backgroundColor: ["rgba(255,255,255,0)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0)"] }}
             transition={{ repeat: 4, duration: 0.6, ease: "easeInOut" }}
             onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 cursor-pointer relative transition-all p-2 rounded-full"
          ><Menu size={28} color="white"/></motion.button>
        </div>
      </motion.nav>

      {/* Fullscreen Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col p-12 overflow-hidden select-none text-white">
            <div className="flex justify-end items-center gap-8 text-white">
              <button onClick={() => { setIsSearchOpen(true); setIsMenuOpen(false); }} className="hover:opacity-50 transition-all cursor-pointer text-white"><Search size={28} color="white"/></button>
              <button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-all duration-500 cursor-pointer text-white"><X size={48} strokeWidth={1} color="white"/></button>
            </div>
            <div className="flex-grow flex flex-col items-center justify-around py-24 max-h-[85vh] text-white">
              <div className="flex flex-col items-center gap-12 md:gap-20 w-full text-white text-white">
                {menuRows.map((row, rid) => (
                  <div key={rid} className="flex flex-wrap justify-center gap-12 md:gap-24 w-full px-4 text-white">
                    {row.map((item) => (
                      <InteractiveLink key={item} onClick={() => { setActiveMenu(item); setActiveSubPath('All'); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }} className="text-3xl md:text-5xl font-serif font-light tracking-tight px-2 text-white">
                        {item}
                      </InteractiveLink>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-8 mt-12 w-full text-white">
                <div className="flex flex-wrap justify-center gap-12 text-white/50 text-white">
                   {isAdmin && <InteractiveLink onClick={() => { setEditingArticle(null); setView({type:'cms'}); setIsMenuOpen(false); }}>DASHBOARD</InteractiveLink>}
                   {!isAdmin && !user && <InteractiveLink onClick={() => { signInWithPopup(auth, provider).then(() => setIsMenuOpen(false)); }}>LOGIN</InteractiveLink>}
                </div>
                <InteractiveLink onClick={() => { setView({type:'bookmarks'}); setIsMenuOpen(false); window.scrollTo(0,0); }} className="text-[11px] uppercase tracking-[0.5em] flex items-center gap-4 border border-white/10 px-12 py-5 rounded-full hover:bg-white hover:text-black transition-all font-black shadow-2xl text-white">
                  MY ARCHIVE ({userBookmarks.length})
                </InteractiveLink>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* 首頁與分類展廳 */}
        {view.type === 'home' && (
          <motion.main key={activeMenu} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40 text-white font-sans text-white">
            <div className="flex flex-row items-start gap-12 mb-32 text-white">
              <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={transition} className="flex gap-4 text-white">
                <div className="text-7xl md:text-[9.5vw] font-black leading-none uppercase tracking-tighter font-serif vertical-text border-r border-white/10 pr-6 text-white text-white">{activeMenu === 'All' ? '博物館' : activeMenu}</div>
                <div className="text-7xl md:text-[9.5vw] font-black leading-none uppercase tracking-tighter font-serif vertical-text pt-32 italic text-white text-white">{activeMenu === 'All' ? '部落格' : '展覽室'}</div>
              </motion.div>
              <div className="flex-1 space-y-6 pt-16 hidden md:block text-white/60 text-white">
                <p className="text-xs uppercase tracking-[0.6em] text-white/40 border-b border-white/10 pb-6 font-black tracking-[0.4em] text-white">
                   {activeMenu === 'All' ? 'Digital Curations by Curtis Chen' : `Archives Gallery / ${activeMenu}`}
                </p>
                <div className="relative group text-white">
                   {isEditingQuote ? (
                      <div className="flex flex-col gap-4 text-white">
                        <textarea autoFocus className="bg-white/5 border border-white/20 p-4 rounded-xl text-white font-serif italic outline-none focus:border-white w-full" defaultValue={menuQuotes[activeMenu]} onBlur={(e) => updateQuote(e.target.value)} />
                        <span className="text-[8px] text-white/30 uppercase tracking-widest italic">離開輸入框即自動保存</span>
                      </div>
                   ) : (
                      <p className="text-lg font-serif italic text-white/60 leading-relaxed max-w-sm text-white">
                        {activeMenu === 'All' ? '致力於收藏生活中的美學動態，將瑣碎的感知轉化為永恆的數位檔案。' : (menuQuotes[activeMenu] || '此展廳正待修復。')}
                        {isAdmin && activeMenu !== 'All' && <button onClick={() => setIsEditingQuote(true)} className="ml-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white text-white"><Edit3 size={14}/></button>}
                      </p>
                   )}
                </div>
                <SocialIconsList className="!gap-4 !text-white/10 pt-4 text-white" />
              </div>
            </div>

            {/* 過濾橫列 */}
            <div className="space-y-8 mb-24 sticky top-0 bg-[#368C84]/90 backdrop-blur-lg z-[100] py-6 border-b border-white/5 text-white text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
                <div className="flex flex-col text-white text-white">
                  <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide font-black text-white text-white">
                    <span className="text-[11px] uppercase tracking-[0.4em] text-white flex-shrink-0 flex items-center gap-2 font-black">
                       {activeMenu === 'All' ? '精選' : '展廳分區'}
                    </span>
                    {activeMenu === 'All' ? (
                       ['All', ...featuredMenus].map(m => (
                        <div key={m} className="relative group flex items-center">
                          <button onClick={() => { setActiveMenu(m); setActiveSubPath('All'); }} className={`px-6 py-2 rounded-full text-[10px] border whitespace-nowrap cursor-pointer transition-all ${activeMenu === m ? 'bg-white text-black border-white shadow-xl' : 'border-white/10 text-white/40 hover:border-white/60'}`}>{m}</button>
                          {isAdmin && m !== 'All' && (
                             <button onClick={() => toggleFMenu(m)} className="absolute -top-2 -right-2 p-1 bg-[#368C84] border border-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Star size={10} fill="white" color="white" />
                             </button>
                          )}
                        </div>
                      ))
                    ) : (
                       ['All', ...showroomSubPaths].map(p => (
                        <button key={p} onClick={() => setActiveSubPath(p)} className={`px-6 py-2 rounded-full text-[10px] border whitespace-nowrap cursor-pointer transition-all ${activeSubPath === p ? 'bg-white text-black border-white shadow-xl' : 'border-white/10 text-white/40 hover:border-white/60'}`}>{p}</button>
                       ))
                    )}
                  </div>
                  {activeMenu === 'All' && <span className="text-[9px] text-white/10 ml-16 mt-2 tracking-widest font-black">[（看更多請點右上選單）]</span>}
                </div>
                <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.2em] font-black text-white/40 self-end md:self-auto text-white">
                   <SortAsc size={12} color="white"/><span className="text-white">排序</span>
                   <select className="bg-transparent border-none outline-none text-white transition-all font-black text-[10px]" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                        <option value="time" className="bg-[#368C84]">Timeline</option>
                        <option value="reaction_heart" className="bg-[#368C84]">❤️ Love</option>
                        <option value="comments" className="bg-[#368C84]">Discussion</option>
                   </select>
                </div>
              </div>
            </div>

            {/* 列表渲染 (支援草稿標記與子路徑找回) */}
            <div className="grid grid-cols-1 text-white">
              {activeMenu !== 'All' ? (
                Object.entries(groupedArticles).map(([group, arts]) => (
                  <div key={group} className="mb-24">
                     <h2 className="text-4xl md:text-7xl font-serif italic text-white/10 mb-12 border-b border-white/5 pb-8">{group}</h2>
                     <div className="space-y-0">
                        {arts.map((art) => (
                          <motion.div key={art.id} onClick={() => setView({ type: 'article', id: art.id })} className="group py-12 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.02] px-8 -mx-8 relative text-white">
                             <div className="flex-1">
                                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/40 italic font-bold mb-3">
                                  {art.subPath?.map((p, i) => <span key={i} className="flex items-center gap-1 opacity-40"><ChevronRight size={10} color="white"/> {p}</span>)}
                                  {art.status === 'draft' && <span className="bg-yellow-500/20 text-yellow-500 px-2 rounded-full text-[8px] tracking-widest border border-yellow-500/20">DRAFT</span>}
                                </div>
                                <h3 className="text-3xl md:text-5xl font-serif leading-tight group-hover:font-black group-hover:italic text-white">{art.title}</h3>
                             </div>
                             <ArrowUpRight size={24} color="white" className="mt-8 md:mt-0 text-white/20 group-hover:text-white transition-all" />
                          </motion.div>
                        ))}
                     </div>
                  </div>
                ))
              ) : (
                processedArticles.map((art) => (
                  <motion.div key={art.id} onClick={() => setView({ type: 'article', id: art.id })} className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.02] px-8 -mx-8 relative text-white">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3 flex-wrap text-[10px] uppercase tracking-widest text-white/40 italic font-bold text-white">
                        {art.isPinned && <Star size={12} fill="white" className="text-white mr-2" />}
                        <span>{art.mainMenu}</span>
                        {art.subPath?.map((p, i) => <span key={i} className="flex items-center gap-1 opacity-40 text-white text-white"><ChevronRight size={10} color="white"/> {p}</span>)}
                        {art.status === 'draft' && <span className="bg-yellow-500/20 text-yellow-500 px-2 rounded-full text-[8px] tracking-widest border border-yellow-500/20 ml-2">DRAFT</span>}
                      </div>
                      <h3 className="text-4xl md:text-7xl font-serif leading-tight group-hover:font-black group-hover:italic text-white">{art.title}</h3>
                      <p className="text-[9px] uppercase tracking-widest text-white/20 font-mono text-white/20">{new Date(art.publishDate.toDate()).toLocaleDateString()}</p>
                    </div>
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); setEditingArticle(art); setView({type:'cms'}); }} className="p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all cursor-pointer z-10"><Edit3 size={16} color="white"/></button>}
                  </motion.div>
                ))
              )}
            </div>
          </motion.main>
        )}

        {/* 文章內頁 */}
        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-6xl mx-auto pb-60 text-white font-sans text-white text-white">
            <div className="flex justify-between items-center mb-16 border-b border-white/5 pb-8 text-white">
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/20 font-serif italic text-white text-white">
                <InteractiveLink onClick={() => { setView({type:'home'}); setActiveMenu(articles.find(a => a.id === view.id).mainMenu); }} className="text-white">{articles.find(a => a.id === view.id).mainMenu}</InteractiveLink>
                {articles.find(a => a.id === view.id)?.subPath?.map((p, i) => (<React.Fragment key={i}><ChevronRight size={10} color="white" /><span className="text-white/40 text-white">{p}</span></React.Fragment>))}
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => toggleBookmark(view.id)} className={`p-3 rounded-full border transition-all cursor-pointer ${userBookmarks.includes(view.id) ? 'bg-white text-[#368C84] shadow-xl' : 'border-white/10 hover:border-white/40'}`}><Bookmark size={16} color="white" fill={userBookmarks.includes(view.id) ? "white" : "none"} /></button>
                {isAdmin && <button onClick={() => { setEditingArticle(articles.find(a => a.id === view.id)); setView({type:'cms'}); }} className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-6 py-2 rounded-full font-black shadow-xl transition-all hover:bg-white hover:text-black uppercase text-white">編輯館藏</button>}
              </div>
            </div>
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-[7.5vw] font-black font-serif mb-24 leading-[1.05] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-60 article-content text-white" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                {/* 反應區 */}
                <div className="flex flex-col items-center gap-8 mb-40 border-y border-white/5 py-12 text-white">
                  <div className="flex gap-4 flex-wrap justify-center">
                    {[{e: '❤️', t: 'heart'}, {e: '😂', t: 'funny'}, {e: '😮', t: 'wow'}, {e: '😢', t: 'sad'}, {e: '💩', t: 'poop'}].map(emo => (
                      <motion.button key={emo.t} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => setReaction(emo.t)} className={`p-5 rounded-[30px] border transition-all flex flex-col items-center gap-1 z-10 ${reactions.myType === emo.t ? 'bg-white text-[#368C84]' : 'border-white/5 bg-white/5 text-white/40'}`}>
                        <span className="text-3xl text-white">{emo.e}</span>
                        <span className="text-[10px] font-black text-white">{reactions[emo.t] || 0}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="max-w-3xl mx-auto mb-60 space-y-16 text-white text-white">
                  <h3 className="text-2xl font-serif italic flex items-center gap-4 text-white">檔案評論區 <span className="text-xs font-mono opacity-20 tracking-tighter text-white">({comments.length})</span></h3>
                  <div className="space-y-12 text-white">
                    {comments.map(c => (
                      <div key={c.id} className="group flex gap-6 items-start text-white text-white">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden shadow-2xl text-white text-white">
                          {c.userPhoto ? <img src={c.userPhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 italic font-black font-serif uppercase">?</div>}
                        </div>
                        <div className="flex-1 space-y-2 text-white text-white">
                          <div className="flex items-center justify-between text-white text-white">
                            <div className="flex items-center gap-3 text-white text-white text-white">
                              <span className="text-xs font-black text-white/80 text-white">{c.userName}</span>
                              <span className="text-[9px] text-white/20 font-mono italic text-white">{new Date(c.createdAt.toDate()).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity text-white text-white text-white">
                              {(c.userId === user?.uid || isAdmin) && <button onClick={() => deleteComment(c.id)} className="text-white/20 hover:text-red-400 transition-all cursor-pointer text-white"><Trash2 size={14} color="white"/></button>}
                            </div>
                          </div>
                          <p className="text-white/60 font-serif text-lg leading-relaxed text-white text-white text-white">${c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relative pt-12 text-white text-white text-white">
                    <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-[50px] p-10 outline-none focus:border-[#368C84]/50 transition-all font-serif text-white placeholder-white/5 shadow-inner text-white text-white text-white" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={user ? "撰寫評論..." : "請先登入以發表評論"} />
                    <div className="flex justify-end mt-4">
                       <button onClick={postComment} className="bg-white text-[#368C84] px-10 py-4 rounded-full font-black text-xs flex items-center gap-4 cursor-pointer shadow-2xl hover:scale-105 transition-all text-[#368C84] z-10">Submit <Send size={18} color="#368C84"/></button>
                    </div>
                  </div>
                </div>

                <div className="pt-32 border-t border-white/10 flex flex-col items-center text-white text-white">
                    <p className="text-[10px] uppercase tracking-[0.6em] text-white/20 mb-12 italic font-black text-white/40 text-white text-white">Next Exhibition</p>
                    <div className="w-full flex flex-row items-center justify-between gap-4 md:gap-12 px-2 text-white text-white text-white">
                        <div onClick={() => { setView({type:'home'}); window.scrollTo(0,0); }} className="flex items-center gap-6 group cursor-pointer text-white flex-shrink-0 text-white">
                            <div className="p-4 md:p-6 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl flex items-center justify-center text-white text-white">
                                <ArrowLeft size={20} color="white" className="group-hover:stroke-black text-white text-white" />
                            </div>
                            <span className="text-[9px] md:text-[11px] uppercase tracking-[0.5em] text-white/30 group-hover:text-white whitespace-nowrap font-black hidden lg:inline text-white">Back to List</span>
                        </div>
                        {articles.filter(a => a.id !== view.id)[0] && (
                           <motion.div whileHover={{ scale: 1.05 }} onClick={() => { setView({type:'article', id: articles.filter(a => a.id !== view.id)[0].id}); window.scrollTo(0,0); }} className="flex flex-col items-center group cursor-pointer max-w-[50%] md:max-w-xl text-center text-white overflow-hidden text-white text-white">
                              <h4 className="text-xl md:text-4xl font-serif text-white transition-all leading-tight tracking-tighter group-hover:italic group-hover:font-black truncate w-full text-white text-white">
                                 {articles.filter(a => a.id !== view.id)[0].title}
                              </h4>
                              <ArrowRight size={20} className="mt-4 text-white/20 group-hover:text-white transition-colors text-white text-white" color="white" />
                           </motion.div>
                        )}
                        <div onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="flex items-center gap-6 group cursor-pointer text-white flex-shrink-0 text-white text-white">
                            <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/30 group-hover:text-white whitespace-nowrap font-black hidden lg:inline text-white text-white">Return Home</span>
                            <div className="p-3 md:p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl flex items-center justify-center text-white text-white">
                                <Home size={20} color="white" className="group-hover:stroke-black text-white text-white" />
                            </div>
                        </div>
                    </div>
                </div>
              </>
            )}
          </motion.article>
        )}

        {/* CMS */}
        {view.type === 'cms' && isAdmin && (
          <CMSDashboard user={user} setView={setView} editData={editingArticle} showMessage={showMessage} menuList={dynamicMenuItems} featuredMenus={featuredMenus} menuQuotes={menuQuotes} articles={articles} />
        )}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light italic text-white/10 text-white text-white">
        <SocialIconsList className="text-white text-white text-white" />
        <InteractiveLink className="font-black text-white/20 text-white text-white" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — MUSEUM BLOG ARCHIVE</InteractiveLink>
        <div className="flex items-center gap-8 transition-all hover:text-white/40 font-black uppercase text-white/20 text-white text-white"><ShieldCheck size={10} color="white"/> Private Encryption Active</div>
      </footer>
    </div>
  );
}