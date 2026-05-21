import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Phone, Mail, User, Building2, Headphones, Radio, ShoppingBag, Music, Copy, CheckCircle2, Edit3, Trash2, Plus, Lock, X, AlertCircle, Sparkles, SlidersHorizontal, Filter, FileSpreadsheet, WifiOff } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import SpreadsheetImport from './SpreadsheetImport.jsx';

// ============================================================================
// 🔑 FIREBASE CONFIGURATION (via environment variables)
// ============================================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234';

let app, auth, db;
const appId = 'the-industry-connect-prod';

try {
  const config = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : (firebaseConfig.apiKey ? firebaseConfig : null);
  if (config) {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.info('Firebase config not set; running in offline mode with local data.');
  }
} catch (error) {
  console.warn('Firebase initialization skipped or failed.', error);
}

// ============================================================================
// 📦 INITIAL DATASET
// ============================================================================
const initialDirectoryData = {
  "Labels & A&R": [
    { title: "Top Dawg Ent. (TDE)", name: "Anthony \"Moosa\" Tiffith Jr.", role: "President", email: "info@tde.com", phone: "(310) 955-1445", location: "Los Angeles, CA", tags: "Record Label" },
    { title: "Empire Distribution", name: "Tina Davis", role: "President", email: "deals@empiredistribution.com", phone: "(747) 500-1766", location: "Los Angeles, CA", tags: "Distribution" },
    { title: "Aftermath Ent.", name: "Bruce Iglauer", role: "A&R / Executive", email: "info@aftermath-ent.com", phone: "(310) 865-7642", location: "Los Angeles, CA", tags: "Record Label" },
    { title: "Death Row Records", name: "Snoop Dogg", role: "Owner / CEO", email: "licensing@deathrowrecords.com", phone: "(310) 550-1000", location: "Los Angeles, CA", tags: "Classic Hip Hop" },
    { title: "Stones Throw Records", name: "Oscar P.", role: "A&R (Demos)", email: "demos@stonesthrow.com", phone: "(323) 539-2520", location: "Los Angeles, CA", tags: "Independent" },
    { title: "Interscope Records", name: "Nicole Wyskoarko", role: "EVP / Urban A&R", email: "info@interscope.com", phone: "(310) 865-1000", location: "Los Angeles, CA", tags: "Major Label" },
    { title: "Sick Wid It Records", name: "E-40", role: "CEO / Founder", email: "contact@sickwiditrecords.com", phone: "N/A", location: "Vallejo, CA", tags: "Bay Area" },
    { title: "Slovenly Recordings", name: "Pete Menchetti", role: "Founder / Owner", email: "info@slovenly.com", phone: "(775) 358-7865", location: "Las Vegas, NV", tags: "Independent" },
    { title: "Imirage Sound Lab", name: "Tom Gordon", role: "Chief Engineer & Manager", email: "tom@inspired-amateur.com", phone: "(775) 358-7484", location: "Reno, NV", tags: "Studio" },
    { title: "Granny's Recording Studio", name: "Studio Operations", role: "Booking Coordinator", email: "General Form Contact Only", phone: "(775) 786-2622", location: "Reno, NV", tags: "Studio" }
  ],
  "Streaming": [
    { title: "Apple Music", name: "Apple Music for Artists Portal", role: "A&R / Editorial Submission", email: "press@apple.com", phone: "N/A", location: "SF / Cupertino, CA", tags: "DSP Portal" },
    { title: "Audiomack", name: "Audiomack Creators / Artist Pro", role: "A&R / Editorial Submission", email: "support@audiomack.com", phone: "N/A", location: "New York, NY", tags: "Discovery Engine" },
    { title: "SoundCloud", name: "SoundCloud for Artists / \"First Fans\"", role: "A&R / Editorial Submission", email: "press@soundcloud.com", phone: "N/A", location: "International", tags: "Discovery Engine" },
    { title: "Spotify", name: "Spotify for Artists Pitching Tool", role: "A&R / Editorial Submission", email: "press@spotify.com", phone: "N/A", location: "New York, NY", tags: "DSP Portal" },
    { title: "TIDAL", name: "TIDAL Artist Home", role: "A&R / Editorial Submission", email: "press@tidal.com", phone: "N/A", location: "New York, NY", tags: "DSP Portal" },
    { title: "YouTube Music", name: "YouTube for Artists / Studio", role: "A&R / Editorial Submission", email: "press@google.com", phone: "N/A", location: "SF / San Bruno, CA", tags: "Video & Streaming" }
  ],
  "Radio Directors": [
    { title: "Power 106 (KPWR)", subtitle: "Los Angeles", name: "DJ E-Man (Emanuel Coquia)", role: "Program Director", email: "eman@power106.com", phone: "(818) 953-4200", location: "Los Angeles, CA", tags: "Urban Radio" },
    { title: "Real 92.3 (KRRL)", subtitle: "Los Angeles", name: "Doc Wynter", role: "iHeartMedia Urban Lead", email: "docwynter@iheartmedia.com", phone: "(818) 559-2252", location: "Los Angeles, CA", tags: "Urban Radio" },
    { title: "93.5 KDAY", subtitle: "Los Angeles", name: "E-Man", role: "Programming Lead", email: "programming@935kday.com", phone: "(818) 953-4200", location: "Los Angeles, CA", tags: "Classic Hip Hop" },
    { title: "106.1 KMEL", subtitle: "San Francisco", name: "Donashea Guy", role: "Program Director", email: "donasheaguy@iheartmedia.com", phone: "(415) 358-1061", location: "San Francisco, CA", tags: "Urban Radio" },
    { title: "KBLX 102.9", subtitle: "San Francisco", name: "Elroy Smith", role: "Program Director", email: "elroy.smith@urban1.com", phone: "(415) 765-8800", location: "San Francisco, CA", tags: "Urban Radio" },
    { title: "KUBE 93.3", subtitle: "Seattle", name: "Mark Adams", role: "VP of Programming", email: "markadams@iheartmedia.com", phone: "N/A", location: "Seattle, WA", tags: "Pacific NW" },
    { title: "KXJM (JAM'N 107.5)", subtitle: "Portland", name: "Tim Rainey", role: "Program Director", email: "timrainey@iheartmedia.com", phone: "(503) 225-1190", location: "Portland, OR", tags: "Pacific NW" },
    { title: "XHTZ (Z90.3)", subtitle: "San Diego", name: "R Dub! (Randy Williams)", role: "Program Director", email: "rdub@z90.com", phone: "(619) 426-9090", location: "Long Beach / SD", tags: "Urban Radio" },
    { title: "K-V101.1 (KHYL)", subtitle: "Sacramento", name: "Complex", role: "Program Director", email: "complex@v1011fm.com", phone: "(916) 334-7777", location: "Sacramento, CA", tags: "Urban Radio" }
  ],
  "Retail & Brand": [
    { title: "Culture Kings", subtitle: "Clothing/Hats/Shoes", name: "Retail Director", role: "Lead Contact", email: "info@culturekings.com", phone: "(702) 473-5100", location: "Las Vegas, NV", tags: "Streetwear" },
    { title: "Diamond Supply Co.", subtitle: "Streetwear/Skate", name: "Nick Tershay", role: "Founder", email: "sales@diamondsupplyco.com", phone: "(213) 621-4200", location: "Los Angeles, CA", tags: "Streetwear" },
    { title: "The Hundreds", subtitle: "Apparel/Lifestyle", name: "Bobby Hundreds", role: "Co-Founder", email: "info@thehundreds.com", phone: "(323) 230-7780", location: "Los Angeles, CA", tags: "Streetwear" },
    { title: "Flight Club LA", subtitle: "Rare Sneakers", name: "Consignment Mgr", role: "Lead Contact", email: "la@flightclub.com", phone: "(323) 782-8616", location: "Los Angeles, CA", tags: "Sneakers" },
    { title: "Mr. Bling Grillz", subtitle: "Custom Grills", name: "Lead Jeweler", role: "Lead Contact", email: "mrblingm2h@gmail.com", phone: "(213) 265-7570", location: "Los Angeles, CA", tags: "Collectibles" },
    { title: "True", subtitle: "Streetwear", name: "Manager", role: "Lead Contact", email: "info@true-sf.com", phone: "(415) 626-2882", location: "San Francisco, CA", tags: "Streetwear" },
    { title: "Proper LBC", subtitle: "Sneakers", name: "Lead Buyer", role: "Lead Contact", email: "contact@properlbc.com", phone: "(562) 628-9100", location: "Long Beach, CA", tags: "Sneakers" },
    { title: "Bait Inc.", subtitle: "Collectibles", name: "Marketing Manager", role: "Lead Contact", email: "info@baitme.com", phone: "(909) 396-1800", location: "Los Angeles, CA", tags: "Collectibles" }
  ],
  "DJs": [
    { title: "DJ Mustard", subtitle: "YG / Chart-topping Producer", name: "Los Angeles", role: "Primary Market", email: "info@djmustard.com", phone: "(310) 275-6135", location: "Los Angeles, CA", tags: "Producer" },
    { title: "DJ E-Man", subtitle: "Power 106 PD / Club Resident", name: "Burbank / LA", role: "Primary Market", email: "eman@power106.com", phone: "(818) 953-4200", location: "Los Angeles, CA", tags: "Radio DJ" },
    { title: "DJ Quik", subtitle: "G-Funk Legend / Touring DJ", name: "Compton / LA", role: "Primary Market", email: "booking@djquik.com", phone: "(310) 865-1000", location: "Los Angeles, CA", tags: "Classic" },
    { title: "DJ Muggs", subtitle: "Cypress Hill / Soul Assassins", name: "Los Angeles", role: "Primary Market", email: "info@soulassassins.com", phone: "(323) 654-1234", location: "Los Angeles, CA", tags: "Classic" },
    { title: "DJ Amen", subtitle: "Young California / Real 92.3", name: "SF / Bay Area", role: "Primary Market", email: "djamen@real923la.com", phone: "(415) 358-1061", location: "San Francisco, CA", tags: "Open Format" },
    { title: "DJ Toure", subtitle: "Hieroglyphics / Souls of Mischief", name: "Oakland", role: "Primary Market", email: "info@hieroglyphics.com", phone: "(510) 465-4376", location: "San Francisco, CA", tags: "Hip Hop Heritage" },
    { title: "DJ Skee", subtitle: "DASH Radio / Event Host", name: "Los Angeles", role: "Primary Market", email: "booking@djskee.com", phone: "(323) 539-2520", location: "Los Angeles, CA", tags: "Radio DJ" },
    { title: "REMiXnet", subtitle: "Open Format / Luxury Events", name: "San Diego", role: "Primary Market", email: "info@remixnet.live", phone: "(619) 456-7890", location: "Long Beach / SD", tags: "Open Format" }
  ]
};

const fallbackContactsArray = [];
Object.entries(initialDirectoryData).forEach(([category, items]) => {
  items.forEach((item, index) => {
    fallbackContactsArray.push({
      id: `fallback-${category}-${index}`,
      category,
      ...item
    });
  });
});

const DEFAULT_CATEGORIES = ["Labels & A&R", "Streaming", "Radio Directors", "Retail & Brand", "DJs"];

const categoryIcons = {
  "Labels & A&R": <Building2 size={18} />,
  "Streaming": <Headphones size={18} />,
  "Radio Directors": <Radio size={18} />,
  "Retail & Brand": <ShoppingBag size={18} />,
  "DJs": <Music size={18} />
};

const getCategoryIcon = (cat) => {
  return categoryIcons[cat] || <Building2 size={18} />;
};

// --- LOADING SKELETON ---
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="bg-neutral-800/40 border border-neutral-700/30 rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-neutral-700/50 rounded w-3/4 mb-3" />
        <div className="h-3 bg-neutral-700/30 rounded w-1/4 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-neutral-700/30 rounded w-1/2" />
          <div className="h-4 bg-neutral-700/30 rounded w-2/3" />
          <div className="h-4 bg-neutral-700/30 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// --- CONTACT CARD COMPONENT ---
const ContactCard = ({ data, isAdmin, onEdit, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-5 hover:bg-neutral-800 transition-all hover:border-neutral-600 shadow-lg flex flex-col h-full relative group">
      {isAdmin && (
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/80 p-1.5 rounded-lg backdrop-blur-sm z-10 border border-neutral-700">
          <button onClick={() => onEdit(data)} className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded-md transition-colors" title="Edit Contact">
            <Edit3 size={16} />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 text-red-400 hover:bg-red-400/20 rounded-md transition-colors" title="Delete Contact">
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-neutral-900/95 rounded-xl z-20 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle size={32} className="text-red-500 mb-2" />
          <h4 className="text-white font-medium mb-1">Delete this contact?</h4>
          <p className="text-neutral-400 text-xs mb-4">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button onClick={() => { onDelete(data.id); setShowDeleteConfirm(false); }} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 pr-12">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h3 className="text-xl font-bold text-white tracking-tight">{data.title}</h3>
          {data.tags && (
            <span className="px-2 py-0.5 bg-neutral-700/60 rounded text-[10px] uppercase font-bold text-amber-400 tracking-wider border border-neutral-600/40">
              {data.tags}
            </span>
          )}
        </div>
        {data.subtitle && <p className="text-sm font-medium text-amber-500/90">{data.subtitle}</p>}
      </div>

      <div className="flex-grow space-y-3">
        <div className="flex items-start gap-3">
          <User className="text-neutral-500 mt-0.5 shrink-0" size={16} />
          <div>
            <p className="text-neutral-200 font-medium">{data.name || 'N/A'}</p>
            <p className="text-neutral-400 text-xs">{data.role}</p>
          </div>
        </div>

        {data.email && data.email !== "N/A" && (
          <div className="flex items-start gap-3 group/email">
            <Mail className="text-neutral-500 mt-0.5 shrink-0" size={16} />
            <div className="flex items-center gap-2 flex-wrap">
              <a href={`mailto:${data.email}`} className="text-amber-400 hover:text-amber-300 hover:underline text-sm break-all">
                {data.email}
              </a>
              <button
                onClick={() => handleCopy(data.email)}
                className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md hover:bg-neutral-700"
                title="Copy Email"
              >
                {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {data.phone && data.phone !== "N/A" && (
          <div className="flex items-start gap-3">
            <Phone className="text-neutral-500 mt-0.5 shrink-0" size={16} />
            <a href={`tel:${data.phone.replace(/[^0-9]/g, '')}`} className="text-neutral-300 hover:text-white text-sm">
              {data.phone}
            </a>
          </div>
        )}

        {data.location && data.location !== "N/A" && (
          <div className="flex items-start gap-3">
            <MapPin className="text-neutral-500 mt-0.5 shrink-0" size={16} />
            <p className="text-neutral-300 text-sm">{data.location}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- ANIMATED SPLASH SCREEN COMPONENT ---
const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setFadeOut(true), 400);
          setTimeout(() => onComplete(), 900);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-neutral-950 z-50 flex flex-col items-center justify-center p-6 transition-all duration-700 ${fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative flex flex-col items-center max-w-sm w-full">
        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/20 animate-pulse relative mb-8 group">
          <div className="absolute inset-0.5 bg-neutral-950 rounded-[14px] flex items-center justify-center">
            <svg className="w-12 h-12 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 21c-.4 0-.8-.2-1-.6-.3-.5-.2-1.1.2-1.4l5.6-4H10c-.4 0-.8-.2-1-.6-.2-.4-.2-.9 0-1.3l4-7c.3-.5.9-.7 1.4-.4.5.3.7.9.4 1.4L10.2 11H15c.4 0 .8.2 1 .6.2.4.2.9 0 1.3l-4 7c-.2.3-.6.5-1 .5z"/>
            </svg>
          </div>
          <div className="absolute -inset-1 bg-amber-500/30 blur-xl opacity-70 group-hover:opacity-100 transition-opacity rounded-2xl animate-ping duration-1000" />
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-wider uppercase mb-1 flex items-center gap-2">
          THE INDUSTRY <span className="text-amber-500">CONNECT</span>
        </h2>
        <p className="text-neutral-500 text-xs font-mono tracking-widest uppercase mb-12">Universal Hub Engine v2.0</p>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-full h-1.5 p-0.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-150"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between w-full mt-2 text-[10px] font-mono text-neutral-500 tracking-wider">
          <span>SYNCING CLOUD DATA...</span>
          <span>{Math.min(progress, 100)}%</span>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION CONTROLLER ---
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("Labels & A&R");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const isSeedingRef = useRef(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Authentication failed:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }
    const contactsRef = collection(db, 'artifacts', appId, 'public', 'data', 'contacts');
    const unsubscribe = onSnapshot(contactsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContacts(data);
      setLoading(false);
    }, (error) => {
      console.warn("Using offline local memory dataset.", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!loading && contacts.length === 0 && db && user && !isSeedingRef.current) {
      isSeedingRef.current = true;
      const autoSeed = async () => {
        try {
          const contactsRef = collection(db, 'artifacts', appId, 'public', 'data', 'contacts');
          for (const category of DEFAULT_CATEGORIES) {
            const items = initialDirectoryData[category] || [];
            for (const item of items) {
              await addDoc(contactsRef, { ...item, category });
            }
          }
        } catch (error) {
          console.error("Auto seeding failed:", error);
        } finally {
          isSeedingRef.current = false;
        }
      };
      autoSeed();
    }
  }, [loading, contacts, user]);

  const isOffline = !loading && contacts.length === 0;

  const activeContacts = useMemo(() => {
    return contacts.length > 0 ? contacts : fallbackContactsArray;
  }, [contacts]);

  const allCategories = useMemo(() => {
    const cats = new Set([...DEFAULT_CATEGORIES]);
    activeContacts.forEach(c => {
      if (c.category && c.category.trim()) {
        cats.add(c.category.trim());
      }
    });
    return Array.from(cats);
  }, [activeContacts]);

  const availableTags = useMemo(() => {
    const tabData = activeContacts.filter(c => c.category === activeTab);
    const tagsSet = new Set(["All"]);
    tabData.forEach(item => { if (item.tags) tagsSet.add(item.tags); });
    return Array.from(tagsSet);
  }, [activeContacts, activeTab]);

  const availableLocations = useMemo(() => {
    const tabData = activeContacts.filter(c => c.category === activeTab);
    const locationsSet = new Set(["All"]);
    tabData.forEach(item => {
      if (!item.location || item.location === "N/A") return;
      const str = item.location.toLowerCase();
      if (str.includes("los angeles") || str.includes("la")) locationsSet.add("LA");
      else if (str.includes("san francisco") || str.includes("sf") || str.includes("oakland") || str.includes("vallejo")) locationsSet.add("SF / Bay Area");
      else if (str.includes("las vegas") || str.includes("vegas")) locationsSet.add("Las Vegas");
      else if (str.includes("long beach")) locationsSet.add("Long Beach");
      else if (str.includes("reno")) locationsSet.add("Reno / Sparks");
    });
    return Array.from(locationsSet);
  }, [activeContacts, activeTab]);

  useEffect(() => {
    setSelectedTag("All");
    setSelectedLocation("All");
  }, [activeTab]);

  const filteredData = useMemo(() => {
    let output = activeContacts.filter(c => c.category === activeTab);
    if (selectedTag !== "All") {
      output = output.filter(item => item.tags === selectedTag);
    }
    if (selectedLocation !== "All") {
      output = output.filter(item => {
        if (!item.location) return false;
        const loc = item.location.toLowerCase();
        if (selectedLocation === "LA") return loc.includes("los angeles") || loc.includes("burbank") || loc.includes("sylmar") || loc.includes("santa monica") || loc.includes("carson") || loc.includes("compton");
        if (selectedLocation === "SF / Bay Area") return loc.includes("san francisco") || loc.includes("sf") || loc.includes("oakland") || loc.includes("vallejo");
        if (selectedLocation === "Las Vegas") return loc.includes("las vegas") || loc.includes("vegas");
        if (selectedLocation === "Long Beach") return loc.includes("long beach") || loc.includes("lbc");
        if (selectedLocation === "Reno / Sparks") return loc.includes("reno") || loc.includes("sparks");
        return false;
      });
    }
    if (debouncedSearch) {
      const lowerQuery = debouncedSearch.toLowerCase();
      output = output.filter(item => {
        return (
          (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(lowerQuery)) ||
          (item.name && item.name.toLowerCase().includes(lowerQuery)) ||
          (item.role && item.role.toLowerCase().includes(lowerQuery)) ||
          (item.location && item.location.toLowerCase().includes(lowerQuery)) ||
          (item.tags && item.tags.toLowerCase().includes(lowerQuery))
        );
      });
    }
    return output;
  }, [activeContacts, activeTab, selectedTag, selectedLocation, debouncedSearch]);

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (adminPin === ADMIN_PIN) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPin("");
      setLoginError("");
    } else {
      setLoginError("Incorrect PIN.");
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    setFormData({
      category: activeTab,
      title: "", subtitle: "", name: "", role: "", email: "", phone: "", location: "", tags: ""
    });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (contact) => {
    const cleanId = contact.id.startsWith("fallback-") ? null : contact.id;
    setEditingContact(cleanId ? contact : null);
    setFormData({ ...contact, id: cleanId });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title || !formData.title.trim()) {
      errors.title = 'Company / Entity Title is required.';
    }
    if (formData.email && formData.email !== 'N/A') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Enter a valid email address.';
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!db) return;
    setIsSaving(true);
    try {
      const contactsRef = collection(db, 'artifacts', appId, 'public', 'data', 'contacts');
      if (editingContact && editingContact.id) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'contacts', editingContact.id);
        const { id, ...updateData } = formData;
        await updateDoc(docRef, updateData);
      } else {
        const { id, ...newData } = formData;
        await addDoc(contactsRef, newData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to commit changes:", error);
    }
    setIsSaving(false);
  };

  const handleDeleteContact = async (contactId) => {
    if (!db) return;
    if (contactId.startsWith("fallback-")) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
      return;
    }
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'contacts', contactId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Failed to delete contact:", error);
    }
  };

  const handleImport = async (rows) => {
    if (!db) throw new Error('Database not available');
    const contactsRef = collection(db, 'artifacts', appId, 'public', 'data', 'contacts');
    let imported = 0;
    const catsSeen = new Set();
    for (const row of rows) {
      await addDoc(contactsRef, row);
      imported++;
      if (row.category && row.category.trim()) catsSeen.add(row.category.trim());
    }
    const existingCats = new Set(allCategories.map(c => c.toLowerCase()));
    const newCats = Array.from(catsSeen).filter(c => !existingCats.has(c.toLowerCase()));
    return { success: true, count: imported, newCategories: newCats };
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedTag("All");
    setSelectedLocation("All");
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200 font-sans selection:bg-amber-500/30 selection:text-amber-200 flex flex-col relative">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <header className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-500 text-neutral-950 font-black rounded-lg flex items-center justify-center text-lg tracking-tighter">
                  ⚡
                </div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  THE INDUSTRY <span className="text-amber-500">CONNECT</span>
                </h1>
                {isAdmin && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Admin</span>}
              </div>
              <p className="text-neutral-400 mt-1 text-xs md:text-sm font-medium">
                Unified discovery ecosystem for vetted Hip-Hop directory metrics.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-500" />
                </div>
                <input
                  type="text"
                  placeholder={`Search ${activeTab.toLowerCase()} properties...`}
                  className="block w-full pl-9 pr-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium px-3 py-2 rounded-lg transition-colors text-sm shrink-0 border border-neutral-700"
                  >
                    <FileSpreadsheet size={16} />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  <button
                    onClick={openAddModal}
                    className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 rounded-lg transition-colors text-sm shrink-0 shadow-lg shadow-amber-500/10"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add Contact</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto hide-scrollbar border-b border-neutral-800 gap-6">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`whitespace-nowrap py-3.5 px-0.5 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors tracking-tight ${
                  activeTab === cat
                    ? "border-amber-500 text-amber-500"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {getCategoryIcon(cat)}
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="bg-neutral-900/40 border-b border-neutral-800/60 py-3.5 backdrop-blur-sm sticky top-[125px] md:top-[93px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-3 sm:flex-row sm:items-center text-xs">
          {availableTags.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
              <span className="text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal size={12} /> Specialty:
              </span>
              <div className="flex gap-1.5">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-1 rounded-md font-medium border transition-all ${
                      selectedTag === tag
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold"
                        : "bg-neutral-800/40 border-neutral-700/40 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableTags.length > 1 && availableLocations.length > 1 && (
            <span className="hidden sm:inline text-neutral-700">|</span>
          )}

          {availableLocations.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              <span className="text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <Filter size={12} /> Location:
              </span>
              <div className="flex gap-1.5">
                {availableLocations.map(loc => (
                  <button
                    key={loc}
                    onClick={() => setSelectedLocation(loc)}
                    className={`px-2.5 py-1 rounded-md font-medium border transition-all ${
                      selectedLocation === loc
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold"
                        : "bg-neutral-800/40 border-neutral-700/40 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-grow w-full pb-16">
        {isOffline && (
          <div className="mb-4 flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2.5 text-xs text-amber-400">
            <WifiOff size={14} />
            <span className="font-medium">Offline mode</span>
            <span className="text-neutral-500">— showing local seed data. Firebase is not connected.</span>
          </div>
        )}

        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            Active Index File / {activeTab}
            {!loading && <span className="text-neutral-600">({filteredData.length} records)</span>}
          </h2>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filteredData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredData.map((item) => (
              <ContactCard
                key={item.id}
                data={item}
                isAdmin={isAdmin}
                onEdit={openEditModal}
                onDelete={handleDeleteContact}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-neutral-800/20 rounded-2xl border border-neutral-800 border-dashed flex flex-col items-center max-w-xl mx-auto mt-8">
            <Search className="mx-auto h-10 w-10 text-neutral-700 mb-3" />
            <h3 className="text-base font-bold text-neutral-300 tracking-tight">No match discovered</h3>
            <p className="text-neutral-500 text-xs mt-1 px-6">
              No index criteria maps directly onto your combined search metrics and tag parameters. Reset attributes filters to scale width.
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 text-xs font-bold text-amber-500 hover:text-amber-400 underline"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>

      <footer className="bg-neutral-950 border-t border-neutral-900 mt-auto shadow-inner">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center text-xs font-medium text-neutral-500">
          <p>© 2026 The Industry Connect Ecosystem</p>
          {!isAdmin ? (
            <button onClick={() => setShowAdminLogin(true)} className="flex items-center gap-1.5 hover:text-neutral-300 transition-colors">
              <Lock size={12} /> Admin Mode
            </button>
          ) : (
            <button onClick={() => setIsAdmin(false)} className="flex items-center gap-1.5 text-amber-500 hover:text-amber-400 transition-colors font-bold">
              Exit Authorization Shield
            </button>
          )}
        </div>
      </footer>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center justify-center w-10 h-10 bg-amber-500/10 rounded-lg mb-3 mx-auto">
              <Lock className="text-amber-500" size={20} />
            </div>
            <h3 className="text-lg font-bold text-white text-center tracking-tight mb-1">Authorization Shield</h3>
            <p className="text-neutral-400 text-xs text-center mb-5">Provide administrative access credentials.</p>
            <form onSubmit={handleAdminSubmit}>
              <div className="mb-4">
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 text-center tracking-widest text-base font-bold"
                  autoFocus
                />
                {loginError && <p className="text-red-400 text-xs mt-2 text-center font-medium">{loginError}</p>}
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 rounded-lg transition-colors text-sm">
                Unlock Workspace
              </button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-xl shadow-2xl relative my-8">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-4 rounded-t-xl flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                {editingContact ? <Edit3 size={18} className="text-amber-500"/> : <Plus size={18} className="text-amber-500"/>}
                {editingContact ? "Edit Directory Record" : "Append New Directory Record"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveContact} className="p-5 space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Category *</label>
                    <select
                      name="category"
                      value={formData.category || ""}
                      onChange={handleFormChange}
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Company / Entity Title *</label>
                    <input
                      type="text" name="title" value={formData.title || ""} onChange={handleFormChange} required
                      placeholder="e.g. Culture Kings"
                      className={`w-full bg-neutral-950 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 ${validationErrors.title ? 'border-red-500' : 'border-neutral-800'}`}
                    />
                    {validationErrors.title && <p className="text-red-400 text-[10px] mt-1">{validationErrors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Subtitle / Specialty</label>
                    <input
                      type="text" name="subtitle" value={formData.subtitle || ""} onChange={handleFormChange}
                      placeholder="e.g. Rare Sneakers"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Filter Tag Category</label>
                    <input
                      type="text" name="tags" value={formData.tags || ""} onChange={handleFormChange}
                      placeholder="Streetwear, Sneakers, Collectibles, Record Label"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Key Contact Person Name</label>
                    <input
                      type="text" name="name" value={formData.name || ""} onChange={handleFormChange}
                      placeholder="e.g. Tina Davis"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Operational Role Title</label>
                    <input
                      type="text" name="role" value={formData.role || ""} onChange={handleFormChange}
                      placeholder="e.g. Lead Buyer / President"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Email Route</label>
                    <input
                      type="text" name="email" value={formData.email || ""} onChange={handleFormChange}
                      placeholder="e.g. info@domain.com"
                      className={`w-full bg-neutral-950 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 ${validationErrors.email ? 'border-red-500' : 'border-neutral-800'}`}
                    />
                    {validationErrors.email && <p className="text-red-400 text-[10px] mt-1">{validationErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Phone Link</label>
                    <input
                      type="text" name="phone" value={formData.phone || ""} onChange={handleFormChange}
                      placeholder="e.g. (310) 555-1212"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-bold uppercase tracking-wider">Physical Location / Address</label>
                <input
                  type="text" name="location" value={formData.location || ""} onChange={handleFormChange}
                  placeholder="e.g. Los Angeles, CA or 451 N Fairfax Ave"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3 text-sm">
                <button
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors disabled:opacity-50 shadow-md shadow-amber-500/10"
                >
                  {isSaving ? "Saving Metrics..." : "Commit Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SpreadsheetImport
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        existingCategories={allCategories}
      />
    </div>
  );
}
