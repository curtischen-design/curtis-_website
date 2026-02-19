import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowUpRight, Menu, X, ArrowLeft, Search, 
  Facebook, Youtube, Mic, ShieldCheck, Hash, 
  Filter, Plus, ChevronUp, Home, ArrowRight, ChevronRight, Layers, Tag, Bookmark, Share2, Edit3, CheckCircle2, ChevronDown, Heart, MessageSquare, Trash2, History, Send, 
  Instagram, Music, Headphones, ExternalLink, Globe, Link as LinkIcon
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

const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl md:text-6xl font-bold mt-12 mb-8 font-serif text-white leading-tight">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl md:text-3xl font-bold mt-10 mb-6 font-serif text-white">$1</h2>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\n/g, '<br/>');
};

/**
 * 🛠️ CMS 管理員發文與編輯後台 (新增社群連結管理)
 */
const CMSDashboard = ({ user, setView, editData, showMessage, menuList, socialLinks }) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [mainMenu, setMainMenu] = useState(editData?.mainMenu || menuList[1] || '');
  const [pathInput, setPathInput] = useState(editData?.subPath?.join('/') || '');
  const [content, setContent] = useState(editData?.content || '');
  const [loading, setLoading] = useState(false);

  // 社群連結狀態
  const [links, setLinks] = useState(socialLinks || {
    facebook: '', instagram: '', youtube: '', linktree: '', spotify: '', applePodcast: '', mic: ''
  });

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const articleData = {
        title, mainMenu: mainMenu.trim() || "未分類",
        subPath: pathInput.split('/').map(p => p.trim()).filter(p => p !== ''),
        content, authorEmail: user.email
      };
      if (editData?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', editData.id), { ...articleData, lastModified: Timestamp.now() });
        showMessage('內容已更新');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), { ...articleData, publishDate: Timestamp.now() });
        showMessage('發布成功');
      }
      setView({ type: 'home' });
    } catch (err) { showMessage('操作失敗'); } finally { setLoading(false); }
  };

  const handleUpdateLinks = async () => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'socialLinks'), links);
      showMessage('社群連結已同步');
    } catch (err) { showMessage('更新連結失敗'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-32 px-8 md:px-24 max-w-4xl mx-auto pb-40 text-white font-sans">
      <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
        <h2 className="text-4xl font-serif italic">{editData ? 'Edit Post.' : 'New Creation.'}</h2>
        <button onClick={() => setView({ type: 'home' })} className="text-white/30 text-[10px] tracking-widest hover:text-white uppercase cursor-pointer">返回主頁</button>
      </div>

      {/* 社群連結編輯區 */}
      <div className="mb-24 p-8 bg-white/5 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
        <h3 className="text-xs uppercase tracking-[0.4em] text-white/40 flex items-center gap-2"><LinkIcon size={12}/> Social Media Links Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(links).map(key => (
            <div key={key} className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-white/20 ml-2">{key}</label>
              <input className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2 text-xs outline-none focus:border-[#368C84]" value={links[key]} onChange={e => setLinks({...links, [key]: e.target.value})} placeholder={`https://${key}.com/...`} />
            </div>
          ))}
        </div>
        <button onClick={handleUpdateLinks} className="w-full py-4 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all font-bold">更新全站社群連結</button>
      </div>

      <form onSubmit={handlePublish} className="space-y-12">
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1 text-[#368C84]">1. 檔案歸類</label>
          <input required className="w-full bg-transparent border-b border-white/10 py-3 text-2xl font-serif outline-none focus:border-white text-white transition-all" value={mainMenu} onChange={(e) => setMainMenu(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {menuList.map(m => (
              <button key={m} type="button" onClick={() => setMainMenu(m)} className={`px-4 py-1.5 rounded-full text-[9px] tracking-widest border cursor-pointer uppercase ${mainMenu === m ? 'bg-white text-[#368C84] border-white' : 'border-white/10 text-white/30'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">2. 子路徑 (例如: 大一 / 生活)</label>
          <input className="w-full bg-transparent border-b border-white/10 py-2 text-lg outline-none focus:border-white text-white" value={pathInput} onChange={e => setPathInput(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">3. 標題</label>
          <input required className="w-full bg-transparent border-b border-white/10 py-4 text-3xl font-serif outline-none focus:border-white text-white" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">4. 內容 (Markdown)</label>
          <textarea required rows={12} className="w-full bg-black/10 border border-white/5 p-8 rounded-3xl text-white/80 font-mono text-sm leading-relaxed outline-none focus:border-[#368C84]/50 transition-all" value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-white text-[#368C84] py-8 rounded-full font-bold uppercase tracking-[0.5em] hover:scale-[0.98] transition-all shadow-2xl cursor-pointer">{loading ? "Uploading..." : "Confirm & Publish"}</button>
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
  
  // 社群連結狀態
  const [socialLinks, setSocialLinks] = useState({
    facebook: '', instagram: '', youtube: '', linktree: '', spotify: '', applePodcast: '', mic: ''
  });

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

  // 監聽文章與社群連結
  useEffect(() => {
    const qA = collection(db, 'artifacts', appId, 'public', 'data', 'articles');
    onSnapshot(qA, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.publishDate.toDate() - a.publishDate.toDate()));
    });
    
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'socialLinks'), (doc) => {
      if(doc.exists()) setSocialLinks(doc.data());
    });
  }, []);

  const dynamicMenuItems = useMemo(() => {
    const base = ["關於我", "校園生活", "隨想札記", "時事觀察", "音樂見聞", "讀書心得"];
    return [...new Set([...base, ...articles.map(a => a.mainMenu)])].filter(Boolean);
  }, [articles]);

  // 選單：中段肥對稱排法 (2/3/2 邏輯)
  const menuRows = useMemo(() => {
    const items = dynamicMenuItems;
    const n = items.length;
    if (n <= 3) return [items];
    if (n <= 5) return [items.slice(0, 1), items.slice(1, 4), items.slice(4)];
    const middleCount = Math.min(Math.ceil(n * 0.4), 4);
    const sideCount = Math.floor((n - middleCount) / 2);
    return [
      items.slice(0, sideCount), 
      items.slice(sideCount, sideCount + middleCount), 
      items.slice(sideCount + middleCount)
    ];
  }, [dynamicMenuItems]);

  useEffect(() => {
    if (view.type !== 'article') return;
    const qC = collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments');
    const qR = collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'reactions');
    const unsubC = onSnapshot(qC, (s) => setComments(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => a.createdAt - b.createdAt)));
    const unsubR = onSnapshot(qR, (s) => {
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

  const subOptions = useMemo(() => {
    const opts = new Set();
    articles.forEach(art => {
      if ((activeMenu === 'All' || art.mainMenu === activeMenu) && activePath.every((s, i) => art.subPath?.[i] === s) && art.subPath?.length > activePath.length) {
        opts.add(art.subPath[activePath.length]);
      }
    });
    return Array.from(opts);
  }, [articles, activeMenu, activePath]);

  const postComment = async () => {
    if (!user) { signInWithPopup(auth, provider); return; }
    if (!newComment.trim()) return;
    const coll = collection(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments');
    if (editingCommentId) {
      const old = comments.find(c => c.id === editingCommentId);
      await updateDoc(doc(coll, editingCommentId), { 
        text: newComment, 
        editedAt: Timestamp.now(), 
        history: [...(old.history || []), { text: old.text, time: old.editedAt || old.createdAt }]
      });
      setEditingCommentId(null);
      showMessage('留言已修改');
    } else {
      await addDoc(coll, { text: newComment, userId: user.uid, userName: user.displayName, userPhoto: user.photoURL, createdAt: Timestamp.now(), history: [] });
      showMessage('留言成功');
    }
    setNewComment("");
  };

  const deleteComment = async (id) => {
    if (!confirm("確定刪除此留言？")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'comments', id));
    showMessage('已刪除');
  };

  const setReaction = async (type) => {
    if (!user) { signInAnonymously(auth); return; }
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'articles', view.id, 'reactions', user.uid);
    if (reactions.myType === type) { await deleteDoc(ref); }
    else { await setDoc(ref, { type, updatedAt: Timestamp.now() }); }
  };

  const toggleBookmark = async (id) => {
    if (!user) { signInWithPopup(auth, provider); return; }
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'bookmarks', id);
    if (userBookmarks.includes(id)) { await deleteDoc(ref); showMessage('已取消收藏'); }
    else { await setDoc(ref, { addedAt: Timestamp.now() }); showMessage('已收藏'); }
  };

  // 社群圖示列元件
  const SocialIconsList = ({ className }) => (
    <div className={`flex gap-6 text-white/30 ${className}`}>
      {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" className="hover:text-white transition-colors"><Facebook size={20}/></a>}
      {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" className="hover:text-white transition-colors"><Instagram size={20}/></a>}
      {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" className="hover:text-white transition-colors"><Youtube size={20}/></a>}
      {socialLinks.linktree && <a href={socialLinks.linktree} target="_blank" className="hover:text-white transition-colors"><LinkIcon size={20}/></a>}
      {socialLinks.spotify && <a href={socialLinks.spotify} target="_blank" className="hover:text-white transition-colors"><Music size={20}/></a>}
      {socialLinks.applePodcast && <a href={socialLinks.applePodcast} target="_blank" className="hover:text-white transition-colors"><Headphones size={20}/></a>}
      {socialLinks.mic && <a href={socialLinks.mic} target="_blank" className="hover:text-white transition-colors"><Mic size={20}/></a>}
    </div>
  );

  return (
    <div className="bg-[#368C84] text-white min-h-screen font-sans selection:bg-white selection:text-[#368C84]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Noto+Serif+TC:wght@300;400;700&display=swap');
        .font-serif { font-family: 'Noto Serif TC', serif; }
        ::-webkit-scrollbar { width: 0px; }
        .vertical-text { writing-mode: vertical-rl; text-orientation: mixed; }
      `}</style>

      <AnimatePresence>
        {message && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-12 left-1/2 -translate-x-1/2 bg-white text-[#368C84] px-8 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-3 font-bold text-xs tracking-widest">
            <CheckCircle2 size={16} /> {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 right-0 h-10 group z-[150] cursor-default">
        <motion.div className="h-1 bg-white origin-left" style={{ scaleX }} />
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/20 backdrop-blur-xl px-6 py-2 rounded-full flex items-center gap-6 pointer-events-auto border border-white/10 shadow-xl">
            <span className="text-[10px] font-bold tracking-[0.2em]">{percent}% READ</span>
            <div className="h-3 w-px bg-white/20" />
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); showMessage('連結已複製'); }} className="hover:text-white/60 transition-colors cursor-pointer"><Share2 size={14}/></button>
            <button onClick={() => view.id && toggleBookmark(view.id)} className={`transition-colors cursor-pointer ${view.id && userBookmarks.includes(view.id) ? 'text-white fill-white' : 'hover:text-white/60'}`}><Bookmark size={14}/></button>
          </div>
        </div>
      </div>

      <motion.nav animate={{ y: showHeader ? 0 : -100 }} className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[110] mix-blend-difference">
        <div onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="font-bold text-xl cursor-pointer tracking-tighter uppercase italic">Curtis Chen</div>
        <div className="flex items-center gap-8">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:opacity-50 cursor-pointer"><Search size={24}/></button>
          <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-50 cursor-pointer relative"><Menu size={32}/></button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-0 w-full px-8 md:px-24 z-[105]">
            <input autoFocus placeholder="搜尋數位館藏..." className="w-full bg-white/10 border border-white/20 backdrop-blur-3xl p-6 rounded-full text-xl outline-none focus:border-white/40 transition-all text-white placeholder-white/30 shadow-2xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="fixed inset-0 bg-[#368C84] z-[120] flex flex-col p-12 overflow-hidden">
            <div className="flex justify-end"><button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-all duration-500 cursor-pointer"><X size={48} strokeWidth={1}/></button></div>
            <div className="flex-grow flex flex-col items-center justify-center gap-12 overflow-y-auto scrollbar-hide">
              <div className="flex flex-col items-center gap-8 md:gap-12 w-full">
                {menuRows.map((row, rid) => (
                  <div key={rid} className="flex flex-wrap justify-center gap-8 md:gap-16 w-full">
                    {row.map((item, i) => (
                      <motion.button key={item} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: rid*0.1 + i*0.05 }}
                        onClick={() => { setActiveMenu(item); setActivePath([]); setView({type:'home'}); setIsMenuOpen(false); window.scrollTo(0,0); }}
                        className="text-3xl md:text-5xl font-serif hover:italic transition-all font-light"
                      >{item}</motion.button>
                    ))}
                  </div>
                ))}
              </div>
              <motion.button onClick={() => { setView({type:'bookmarks'}); setIsMenuOpen(false); window.scrollTo(0,0); }} className="mt-8 text-[10px] tracking-[0.4em] flex items-center gap-3 border border-white/20 px-10 py-4 rounded-full hover:bg-white hover:text-[#368C84] transition-all cursor-pointer font-bold shadow-xl">
                <Bookmark size={14} fill={userBookmarks.length > 0 ? "currentColor" : "none"} /> 我的收藏 ({userBookmarks.length})
              </motion.button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-end gap-12 border-t border-white/10 pt-12 pb-8">
              <SocialIconsList />
              <div className="flex flex-col items-end gap-6 text-[10px] uppercase tracking-[0.4em]">
                {isAdmin ? (
                  <button onClick={() => { setEditingArticle(null); setView({type:'cms'}); setIsMenuOpen(false); }} className="text-white/40 hover:text-white border border-white/10 px-8 py-2 rounded-full cursor-pointer">管理主控台</button>
                ) : (
                  <button onClick={() => signInWithPopup(auth, provider).then(() => setIsMenuOpen(false))} className="text-white/20 hover:text-white underline">{user ? user.email : 'Sign In'}</button>
                )}
                <p className="text-[8px] text-white/10 italic">© 2026 Curtis Chen. Museum Blog.</p>
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
                <div className="text-7xl md:text-[9vw] font-bold leading-none uppercase tracking-tighter font-serif vertical-text border-r border-white/10 pr-6">博物館</div>
                <div className="text-7xl md:text-[9vw] font-bold leading-none uppercase tracking-tighter font-serif vertical-text pt-24 italic">部落格</div>
              </motion.div>
              <div className="flex-1 space-y-6 pt-12 hidden md:block">
                <p className="text-xs uppercase tracking-[0.6em] text-white/40 border-b border-white/10 pb-4">Digital Archives of Life</p>
                <p className="text-lg font-serif italic text-white/60 leading-relaxed max-w-sm">致力於收藏生活中的美學動態，將瑣碎的感知轉化為永恆的數位檔案。</p>
                <SocialIconsList className="!gap-4 !text-white/20 pt-4" />
              </div>
            </div>

            <div className="space-y-4 mb-24">
              <div className="flex items-center gap-4 overflow-x-auto py-4 border-b border-white/5 sticky top-0 bg-[#368C84]/90 backdrop-blur-lg z-50 scrollbar-hide">
                <span className="text-[9px] uppercase tracking-widest text-white/20 flex-shrink-0 flex items-center gap-2"><Filter size={10}/> Section</span>
                {['All', ...dynamicMenuItems].map(m => (
                  <button key={m} onClick={() => { setActiveMenu(m); setActivePath([]); }} className={`px-6 py-2 rounded-full text-[10px] transition-all border whitespace-nowrap cursor-pointer ${activeMenu === m ? 'bg-white text-[#368C84] border-white font-bold' : 'border-white/10 text-white/40 hover:border-white/60'}`}>{m}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 border-t border-white/10">
              {filteredArticles.length === 0 ? <div className="py-40 text-white/10 font-serif italic text-3xl text-center border border-dashed border-white/5 mt-10 rounded-[60px]">Archive empty.</div> : filteredArticles.map((art, index) => (
                <motion.div key={art.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} onClick={() => { setView({ type: 'article', id: art.id }); window.scrollTo(0,0); }} className="group py-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-white/[0.02] transition-all px-8 -mx-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap text-[10px] uppercase tracking-widest text-white/40 italic font-light">
                      <span>{art.mainMenu}</span>
                      {art.subPath?.map((p, i) => <span key={i} className="flex items-center gap-1 opacity-60"><ChevronRight size={10}/> {p}</span>)}
                      {userBookmarks.includes(art.id) && <Bookmark size={10} fill="currentColor" className="ml-2 text-white/40" />}
                    </div>
                    <h3 className="text-4xl md:text-7xl font-serif group-hover:italic transition-all duration-1000 text-white leading-none">{art.title}</h3>
                  </div>
                  <div className="mt-8 md:mt-0 flex items-center gap-4">
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); setEditingArticle(art); setView({type:'cms'}); }} className="p-3 rounded-full border border-white/10 hover:bg-white hover:text-[#368C84] transition-all cursor-pointer"><Edit3 size={16} /></button>}
                    <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-700 text-white"><ArrowUpRight size={24}/></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.main>
        )}

        {view.type === 'article' && (
          <motion.article key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pt-40 px-8 md:px-24 max-w-5xl mx-auto pb-60">
            <div className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/20 font-serif italic">
                <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { setView({type:'home'}); setActiveMenu(articles.find(a => a.id === view.id).mainMenu); }}>{articles.find(a => a.id === view.id).mainMenu}</span>
                {articles.find(a => a.id === view.id)?.subPath?.map((p, i) => (<React.Fragment key={i}><ChevronRight size={10} /><span className="text-white/40">{p}</span></React.Fragment>))}
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => toggleBookmark(view.id)} className={`p-3 rounded-full border transition-all cursor-pointer ${userBookmarks.includes(view.id) ? 'bg-white text-[#368C84]' : 'border-white/10 hover:border-white/40'}`}><Bookmark size={16} fill={userBookmarks.includes(view.id) ? "currentColor" : "none"} /></button>
                {isAdmin && <button onClick={() => { setEditingArticle(articles.find(a => a.id === view.id)); setView({type:'cms'}); }} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-6 py-2 rounded-full cursor-pointer hover:bg-white hover:text-black transition-all shadow-xl"><Edit3 size={12}/> 編輯文章</button>}
              </div>
            </div>
            
            {articles.find(a => a.id === view.id) && (
              <>
                <h1 className="text-5xl md:text-[7.5vw] font-bold font-serif mb-24 leading-[1.05] tracking-tighter italic text-white">{articles.find(a => a.id === view.id).title}</h1>
                <div className="text-xl md:text-2xl leading-relaxed text-white/70 space-y-12 font-serif max-w-3xl mb-40 article-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(articles.find(a => a.id === view.id).content) }} />
                
                {/* 反應區 */}
                <div className="flex flex-col items-center gap-8 mb-40 border-y border-white/5 py-12">
                  <div className="flex gap-4">
                    {[
                      {e: '❤️', t: 'heart'}, {e: '😂', t: 'funny'}, 
                      {e: '😮', t: 'wow'}, {e: '😢', t: 'sad'}, {e: '💩', t: 'poop'}
                    ].map(emo => (
                      <motion.button key={emo.t} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => setReaction(emo.t)}
                        className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-1 ${reactions.myType === emo.t ? 'bg-white/10 border-white text-white' : 'border-white/5 bg-white/5 text-white/40'}`}
                      >
                        <span className="text-3xl">{emo.e}</span>
                        <span className="text-[10px] font-bold">{reactions[emo.t] || 0}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 留言區 */}
                <div className="max-w-3xl mx-auto mb-60 space-y-16">
                  <h3 className="text-2xl font-serif italic flex items-center gap-3">互動留言 <span className="text-xs font-mono opacity-20 tracking-tighter">({comments.length})</span></h3>
                  <div className="space-y-12">
                    {comments.map(c => (
                      <div key={c.id} className="group flex gap-6 items-start">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden shadow-2xl">
                          {c.userPhoto ? <img src={c.userPhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 italic">?</div>}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-white/80">{c.userName}</span>
                              {(c.editedAt || (c.history && c.history.length > 0)) && (
                                <button onClick={() => setEditHistoryOpen(editHistoryOpen === c.id ? null : c.id)} className="text-[8px] text-[#368C84] bg-white px-2 py-0.5 rounded-full font-bold cursor-pointer hover:scale-105 transition-all">已編輯</button>
                              )}
                            </div>
                            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              {c.userId === user?.uid && <button onClick={() => {setEditingCommentId(c.id); setNewComment(c.text);}} className="text-white/20 hover:text-white transition-colors cursor-pointer"><Edit3 size={14}/></button>}
                              {(c.userId === user?.uid || isAdmin) && <button onClick={() => deleteComment(c.id)} className="text-white/20 hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={14}/></button>}
                            </div>
                          </div>
                          <p className="text-white/60 font-serif text-lg leading-relaxed">{c.text}</p>
                          <AnimatePresence>
                            {editHistoryOpen === c.id && c.history && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-black/10 rounded-2xl p-4 mt-2 border border-white/5 space-y-2 shadow-inner">
                                {c.history.map((h, i) => <div key={i} className="text-white/20 text-[10px] italic border-l border-white/5 pl-4">"{h.text}" — {new Date(h.time.toDate()).toLocaleString()}</div>)}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relative pt-8">
                    <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-[40px] p-8 outline-none focus:border-[#368C84]/30 transition-all font-serif text-white placeholder-white/10" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="撰寫回饋..." />
                    <button onClick={postComment} className="absolute bottom-6 right-6 bg-white text-[#368C84] px-8 py-3 rounded-full font-bold text-xs flex items-center gap-3 cursor-pointer shadow-2xl hover:scale-105 transition-all">
                      {editingCommentId ? "儲存修訂" : "發送留言"} <Send size={16}/>
                    </button>
                  </div>
                </div>

                {/* 底部導覽區域 */}
                <div className="border-t border-white/10 pt-32 mb-40 text-center flex flex-col items-center">
                   <p className="text-[10px] uppercase tracking-[0.6em] text-white/20 mb-12 italic font-bold">Recommended Reading</p>
                   {articles.filter(a => a.id !== view.id)[0] && (
                     <motion.div whileHover={{ scale: 1.02 }} onClick={() => { setView({type:'article', id: articles.filter(a => a.id !== view.id)[0].id}); window.scrollTo(0,0); }} className="group cursor-pointer max-w-2xl px-4">
                       <h4 className="text-4xl md:text-6xl font-serif text-white group-hover:italic transition-all leading-tight">{articles.filter(a => a.id !== view.id)[0].title}</h4>
                       <div className="flex justify-center mt-10"><motion.div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#368C84] transition-all duration-500 shadow-2xl"><ArrowRight size={24}/></motion.div></div>
                     </motion.div>
                   )}
                </div>

                <div className="flex flex-row justify-center items-center gap-8 md:gap-24 pt-20 border-t border-white/10">
                    <button onClick={() => { setView({type:'home'}); window.scrollTo(0,0); }} className="flex items-center gap-4 group cursor-pointer transition-all">
                        <div className="p-3 md:p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-[#368C84] transition-all duration-500 shadow-xl"><ArrowLeft size={20}/></div>
                        <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/40 group-hover:text-white transition-all whitespace-nowrap font-bold">Back to List</span>
                    </button>
                    <div className="h-12 w-px bg-white/10" />
                    <button onClick={() => { setView({type:'home'}); setActiveMenu('All'); window.scrollTo(0,0); }} className="flex items-center gap-4 group cursor-pointer transition-all">
                        <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/40 group-hover:text-white transition-all whitespace-nowrap font-bold">Return Home</span>
                        <div className="p-3 md:p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-[#368C84] transition-all duration-500 shadow-xl"><Home size={20}/></div>
                    </button>
                </div>
              </>
            )}
          </motion.article>
        )}

        {view.type === 'bookmarks' && (
          <motion.main key="bookmarks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 md:px-24 pb-40 min-h-screen">
             <div className="mb-24 border-b border-white/10 pb-12">
               <button onClick={() => setView({type:'home'})} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white mb-8 cursor-pointer transition-all"><ArrowLeft size={12}/> 返回館藏</button>
               <h1 className="text-6xl md:text-8xl font-serif italic text-white font-light">My Library.</h1>
             </div>
             <div className="grid grid-cols-1">
               {articles.filter(a => userBookmarks.includes(a.id)).map((art, index) => (
                   <motion.div key={art.id} onClick={() => setView({type:'article', id: art.id})} className="group py-12 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] px-8 -mx-8 transition-all">
                     <div><p className="text-[9px] uppercase tracking-widest text-white/40 mb-3 italic">{art.mainMenu} {art.subPath?.length > 0 && `/ ${art.subPath.join(' / ')}`}</p><h3 className="text-3xl md:text-5xl font-serif text-white group-hover:italic transition-all">{art.title}</h3></div>
                     <button onClick={(e) => { e.stopPropagation(); toggleBookmark(art.id); }} className="p-4 hover:text-red-400 cursor-pointer transition-colors"><X size={20}/></button>
                   </motion.div>
               ))}
             </div>
          </motion.main>
        )}

        {view.type === 'cms' && isAdmin && (
          <CMSDashboard user={user} setView={setView} editData={editingArticle} showMessage={showMessage} menuList={dynamicMenuItems} socialLinks={socialLinks} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackToTop && (
          <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-12 right-12 w-16 h-16 bg-white text-[#368C84] rounded-full shadow-2xl flex items-center justify-center z-[140] hover:scale-110 transition-transform cursor-pointer"><ChevronUp size={28} strokeWidth={3}/></motion.button>
        )}
      </AnimatePresence>

      <footer className="p-12 md:p-24 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[8px] text-white/10 uppercase tracking-[0.6em] font-light italic">
        <SocialIconsList />
        <span className="cursor-pointer transition-opacity hover:opacity-60" onClick={() => setView({type:'home'})}>© 2026 CURTIS CHEN — MUSEUM BLOG ARCHIVE</span>
        <div className="flex items-center gap-8 transition-all hover:text-white/40"><ShieldCheck size={10}/> SECURE CLOUD ACTIVE</div>
      </footer>
    </div>
  );
}