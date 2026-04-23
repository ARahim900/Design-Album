/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { collection, onSnapshot, addDoc, updateDoc, query, orderBy, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { GoogleGenAI, Type } from "@google/genai";
import { db, storage } from './firebase';

type Slide = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  location: string;
  date: string;
  createdAt?: number;
};

const initialSlides: Slide[] = [
  {
    title: "Pump Station Upgrade",
    subtitle: "Mechanical completion",
    description: "Before-and-after view of the upgraded pump room and piping arrangement.",
    image: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1600&q=80",
    location: "Muscat Bay",
    date: "March 2026",
  },
  {
    title: "Waterfront Walk",
    subtitle: "Transition moment",
    description: "A wide immersive image of the main promenade with enough breathing space for the caption card to slide in softly while scrolling.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    location: "Coastal Edge",
    date: "April 2026",
  },
  {
    title: "Site Footprint",
    subtitle: "Urban chapter",
    description: "This section works well for before-and-after site photos, project milestones, or album moments grouped as visual chapters.",
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80",
    location: "Downtown Framework",
    date: "Album Scene 03",
  },
  {
    title: "Quiet Interior",
    subtitle: "Detail frame",
    description: "Use frames like this for equipment rooms, finished spaces, pump station upgrades, or close-up engineering details.",
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1600&q=80",
    location: "Interior Focus",
    date: "Album Scene 04",
  },
  {
    title: "Golden Horizon",
    subtitle: "Feature highlight",
    description: "A strong feature image can be pinned visually in the user's attention through scale, depth, and active-state emphasis.",
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80",
    location: "Sunset Point",
    date: "Album Scene 05",
  },
  {
    title: "Final Handover",
    subtitle: "Closing scene",
    description: "End with a clean emotional image or final project shot so the album lands with a memorable finish rather than abruptly stopping.",
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80",
    location: "Closing View",
    date: "May 2026",
  }
];

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [slidesData, setSlidesData] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    location: '',
    date: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [slideToDelete, setSlideToDelete] = useState<Slide | null>(null);

  const slidesRef = useRef<(HTMLElement | null)[]>([]);

  // Fetch initial slides
  useEffect(() => {
    const fetchSlides = async () => {
      const q = query(collection(db, 'slides'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty, seed it with our excellent starting values.
          try {
            const batch = writeBatch(db);
            const now = Date.now();
            initialSlides.forEach((slide, idx) => {
               const docRef = doc(collection(db, 'slides'));
               batch.set(docRef, { ...slide, createdAt: now + idx });
            });
            await batch.commit();
          } catch (e) {
            console.error("Error seeding initial data: ", e);
            // Fallback for security rules issues
            setSlidesData(initialSlides);
          }
        } else {
          const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Slide[];
          setSlidesData(slides);
        }
      });
      return unsubscribe;
    };
    
    let unsub: (() => void) | undefined;
    fetchSlides().then(u => { unsub = u; });
    return () => { if (unsub) unsub(); };
  }, []);

  // Setup theme initially and when it changes
  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-theme")) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      setTheme(root.getAttribute("data-theme") as 'light' | 'dark' ?? 'dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Setup GSAP ScrollTrigger for slides
  useGSAP(() => {
    // Small delay to ensure DOM is ready and images start rendering
    setTimeout(() => {
      ScrollTrigger.refresh();
      
      slidesRef.current.forEach((slide, i) => {
        if (!slide) return;
        
        const mediaWrap = slide.querySelector('.media-wrap');
        const img = slide.querySelector('.media-wrap img');
        const captionCard = slide.querySelector('.caption-card');
        
        // Initial state before entering viewport
        gsap.set(mediaWrap, { opacity: 0.3, scale: 0.85, filter: 'saturate(0.5)' });
        gsap.set(img, { scale: 1.15 });
        gsap.set(captionCard, { opacity: 0, y: 60 });

        // Animation for entering and centering
        gsap.to(mediaWrap, {
          opacity: 1,
          scale: 1,
          filter: 'saturate(1)',
          scrollTrigger: {
            trigger: slide,
            start: "top 85%",
            end: "center center",
            scrub: 1.5, // 1.5s smoothing
            onEnter: () => setActiveIndex(i),
            onEnterBack: () => setActiveIndex(i),
          }
        });

        gsap.to(img, {
          scale: 1,
          scrollTrigger: {
            trigger: slide,
            start: "top 85%",
            end: "center center",
            scrub: 1.5,
          }
        });

        gsap.to(captionCard, {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: slide,
            start: "top 75%",
            end: "center center",
            scrub: 1.5,
          }
        });

        // Animation for leaving viewport (scrolling past)
        gsap.to(mediaWrap, {
          opacity: 0.3,
          scale: 0.9,
          filter: 'saturate(0.5)',
          scrollTrigger: {
            trigger: slide,
            start: "center center",
            end: "bottom 15%",
            scrub: 1.5,
          }
        });

        gsap.to(captionCard, {
          opacity: 0,
          y: -40,
          scrollTrigger: {
            trigger: slide,
            start: "center center",
            end: "bottom 25%",
            scrub: 1.5,
          }
        });
      });
    }, 100);
    
    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { dependencies: [slidesData] });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showUploadModal) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollToSlide(Math.min(activeIndex + 1, slidesData.length - 1));
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToSlide(Math.max(activeIndex - 1, 0));
      }
      if (event.key === "Home") {
        event.preventDefault();
        scrollToSlide(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        scrollToSlide(slidesData.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, slidesData.length, showUploadModal]);

  const scrollToSlide = (index: number) => {
    const target = slidesRef.current[index];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const scrollToAlbum = () => {
    document.getElementById("album")?.scrollIntoView({ behavior: "smooth" });
  };

  const resetForm = () => {
    setUploadFile(null);
    setPreview(null);
    setEditingSlideId(null);
    setFormData({ title: '', subtitle: '', description: '', location: '', date: '' });
  };

  const openUploadModal = () => {
    resetForm();
    setShowUploadModal(true);
  };

  const openEditModal = (slide: Slide) => {
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle,
      description: slide.description,
      location: slide.location,
      date: slide.date
    });
    setPreview(slide.image);
    setUploadFile(null); // Keep null until they pick a new one
    setEditingSlideId(slide.id || null);
    setShowUploadModal(true);
  };

  const handleAutoFill = async (fileToAnalyze: File) => {
    setIsGenerating(true);
    try {
      const base64EncodeString = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(fileToAnalyze);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: fileToAnalyze.type,
                data: base64EncodeString,
              },
            },
            {
              text: "Analyze this image and provide a catchy title, a short subtitle, a descriptive story about what is happening, and suggest a plausible real-world location if discernible (or a generic descriptive location otherwise).",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              description: { type: Type.STRING },
              location: { type: Type.STRING }
            },
            required: ["title", "subtitle", "description", "location"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const json = JSON.parse(text);
        setFormData(prev => ({
          ...prev,
          title: json.title || prev.title,
          subtitle: json.subtitle || prev.subtitle,
          description: json.description || prev.description,
          location: json.location || prev.location
        }));
      }
    } catch (err) {
      console.error(err);
      alert('Error generating text: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setPreview(URL.createObjectURL(file));
      // Automatically analyze the image when selected
      handleAutoFill(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !editingSlideId && !preview) return;

    setIsUploading(true);
    try {
      let imageUrl = preview; // if editing without new file, keep existing URL
      
      // If a new file was selected, upload it
      if (uploadFile) {
        const fileRef = ref(storage, `photos/${Date.now()}-${uploadFile.name}`);
        await uploadBytes(fileRef, uploadFile);
        imageUrl = await getDownloadURL(fileRef);
      }

      const slideData = {
        title: formData.title || 'Untitled',
        subtitle: formData.subtitle || 'Custom addition',
        description: formData.description || 'Uploaded image details.',
        image: imageUrl || '',
        location: formData.location || 'Unknown location',
        date: formData.date || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      };

      if (editingSlideId) {
        // Update existing document
        await updateDoc(doc(db, 'slides', editingSlideId), slideData);
      } else {
        // Create new document
        await addDoc(collection(db, 'slides'), {
          ...slideData,
          createdAt: Date.now()
        });
      }

      setShowUploadModal(false);
      resetForm();
      
    } catch (err) {
      console.error(err);
      alert('Error saving slide: ' + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSlide = (slide: Slide) => {
    setSlideToDelete(slide);
  };

  const confirmDelete = async () => {
    if (!slideToDelete) return;
    const slide = slideToDelete;
    
    try {
      if (slide.id) {
        // Delete from Firestore
        await deleteDoc(doc(db, 'slides', slide.id));

        // Try to delete from Storage if it's an uploaded image
        if (slide.image.includes('firebasestorage.googleapis.com')) {
          try {
            const imageRef = ref(storage, slide.image);
            await deleteObject(imageRef);
          } catch (storageErr) {
            console.warn("Storage deletion warning:", storageErr);
          }
        }
      } else {
        // If it's a hardcoded/fallback slide without an ID in the DB, just remove it locally
        setSlidesData(prev => prev.filter(s => s !== slide));
      }
      
      // Fix active index if out of bounds
      if (activeIndex >= slidesData.length - 1) {
        setActiveIndex(Math.max(0, slidesData.length - 2));
      }
    } catch (err) {
      console.error("Error deleting slide:", err);
      alert('Error deleting slide: ' + (err as Error).message);
    } finally {
      setSlideToDelete(null);
    }
  };

  if (slidesData.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Loading album...</div>;
  }

  return (
    <>
      <a href="#album" className="skip-link">Skip to album</a>

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" style={{ background: 'transparent', border: 'none', width: '32px', height: '32px', overflow: 'hidden' }}>
            <img src="/logo.jpg" alt="Home Interior Exterior Design" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="brand-text">
            <strong>HE Home</strong>
            <span>Interior Exterior Design</span>
          </div>
        </div>

        <div className="toolbar">
          <button className="icon-btn" onClick={openUploadModal} title="Add slide" aria-label="Add slide">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              {theme === 'dark' ? (
                <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
          <button className="icon-btn" onClick={scrollToAlbum} aria-label="Go to gallery">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M12 19L6 13M12 19L18 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {showUploadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display">{editingSlideId ? 'Edit Slide' : 'Add to Album'}</h3>
              <button className="text-muted hover:text-text" onClick={() => { setShowUploadModal(false); resetForm(); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="w-full text-sm placeholder:text-muted bg-surface-2 border border-border rounded-md p-2 focus:outline-none focus:border-primary"
                  required={!editingSlideId && !preview} 
                />
                {preview && (
                  <img src={preview} alt="Preview" className="mt-3 rounded-md max-h-32 object-cover border border-border" />
                )}
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-muted">Title</label>
                  {preview && uploadFile && (
                    <button 
                      type="button" 
                      onClick={() => handleAutoFill(uploadFile)}
                      disabled={isGenerating}
                      className="text-xs flex items-center gap-1 font-medium px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      <span>✨</span>
                      {isGenerating ? 'Analyzing...' : 'Auto-fill with AI'}
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full text-sm bg-surface-2 border border-border rounded-md p-2 focus:outline-none focus:border-primary text-text"
                  placeholder="e.g. Pump Station Upgrade"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Subtitle / Chapter</label>
                <input 
                  type="text" 
                  value={formData.subtitle} 
                  onChange={e => setFormData({...formData, subtitle: e.target.value})}
                  className="w-full text-sm bg-surface-2 border border-border rounded-md p-2 focus:outline-none focus:border-primary text-text"
                  placeholder="e.g. Mechanical completion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-muted">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full text-sm bg-surface-2 border border-border rounded-md p-2 focus:outline-none focus:border-primary text-text min-h-[80px]"
                  placeholder="Tell the story behind this image..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted">Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full text-sm bg-surface-2 border border-border rounded-md p-2 focus:outline-none focus:border-primary text-text"
                    placeholder="e.g. Muscat Bay"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted">Date</label>
                  <input 
                    type="text" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full text-sm bg-surface-2 border border-border rounded-md p-2 focus:outline-none focus:border-primary text-text"
                    placeholder="e.g. May 2026"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  className="px-4 py-2 text-sm rounded-full font-medium hover:bg-surface-2 border border-transparent transition-actions" 
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading || (!uploadFile && !editingSlideId && !preview)}
                  className="px-5 py-2 text-sm rounded-full font-medium bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover shadow-md transition-all"
                >
                  {isUploading ? 'Saving...' : 'Save to Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {slideToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-sm p-6 text-center">
            <h3 className="text-xl font-display mb-2">Delete Slide?</h3>
            <p className="text-muted mb-6 text-sm">
              Are you sure you want to permanently delete "{slideToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                type="button" 
                className="px-4 py-2 text-sm rounded-full font-medium hover:bg-surface-2 border border-transparent transition-actions" 
                onClick={() => setSlideToDelete(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="px-5 py-2 text-sm rounded-full font-medium bg-red-500 text-white hover:bg-red-600 shadow-md transition-all"
                onClick={confirmDelete}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        <section className="hero">
          <div className="hero-grid">
            <motion.div 
              className="hero-copy"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, staggerChildren: 0.2 }}
            >
              <motion.div 
                className="eyebrow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Interactive Space Showcase
              </motion.div>
              <motion.h1 
                className="text-4xl md:text-5xl lg:text-7xl font-display leading-tight tracking-tight max-w-[12ch] md:max-w-[10ch]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Modern Living, Envisioned.
              </motion.h1>
              <motion.p 
                className="mt-5 max-w-[58ch] text-muted text-base md:text-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Explore an immersive interior design showcase. Step into a world of sophisticated modern architecture, tailored spaces, and 
                breathtaking aesthetic living environments presented in a high-fidelity visual experience.
              </motion.p>

              <motion.div 
                className="hero-actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <button className="btn btn-primary" onClick={scrollToAlbum}>Open Gallery</button>
                <button className="btn btn-secondary" onClick={() => scrollToSlide(0)}>View Feature</button>
              </motion.div>

              <div className="progress-mobile" id="mobileDots">
                {slidesData.map((_, i) => (
                  <button
                    key={`mobile-dot-${i}`}
                    className={`dot ${activeIndex === i ? 'active' : ''}`}
                    aria-label={`Go to ${slidesData[i].title}`}
                    onClick={() => scrollToSlide(i)}
                  />
                ))}
              </div>
            </motion.div>

            <div className="hero-card">
              <img
                src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80"
                alt="Aesthetic modern interior design room"
              />
              <div className="hero-note">
                <div>
                  <strong>Signature Collection</strong>
                  <span>Award-winning spaces</span>
                </div>
                <span>Scroll down</span>
              </div>
            </div>
          </div>
        </section>

        <section className="album-shell" id="album" aria-label="Interactive photo album">
          <nav className="dots-nav" aria-label="Album progress">
            {slidesData.map((slide, i) => (
              <button
                key={`dot-${i}`}
                className={`dot ${activeIndex === i ? 'active' : ''}`}
                aria-label={`Go to ${slide.title}`}
                onClick={() => scrollToSlide(i)}
              />
            ))}
          </nav>

          <div className="slides">
            {slidesData.map((slide, i) => (
              <section
                key={`slide-${i}`}
                className={`slide ${activeIndex === i ? 'active' : ''}`}
                id={`slide-${i}`}
                data-index={i}
                ref={el => { slidesRef.current[i] = el; }}
              >
                <div className="slide-inner">
                  <div className="media-wrap">
                    <img src={slide.image} alt={slide.title} loading="lazy" />
                  </div>
                  <div className="caption-card relative group">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10">
                      <button
                        onClick={() => openEditModal(slide)}
                        className="p-2 text-muted hover:text-primary bg-surface/50 rounded-full md:bg-transparent"
                        aria-label="Edit slide"
                        title="Edit slide"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSlide(slide)}
                        className="p-2 text-muted hover:text-red-500 bg-surface/50 rounded-full md:bg-transparent"
                        aria-label="Delete slide"
                        title="Delete slide"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="eyebrow">{String(i + 1).padStart(2, "0")} · {slide.subtitle}</div>
                    <h2>{slide.title}</h2>
                    <p>{slide.description}</p>
                    <div className="meta">
                      <div className="meta-item">
                        <span>Location</span>
                        <strong>{slide.location}</strong>
                      </div>
                      <div className="meta-item">
                        <span>Reference</span>
                        <strong>{slide.date}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <aside className="thumbs-panel" aria-label="Thumbnail navigation">
            {slidesData.map((slide, i) => (
              <button
                key={`thumb-${i}`}
                className={`thumb-btn ${activeIndex === i ? 'active' : ''}`}
                aria-label={`Open ${slide.title}`}
                onClick={() => scrollToSlide(i)}
              >
                <img src={slide.image} alt={slide.title} loading="lazy" />
                <div className="thumb-copy">
                  <strong>{slide.title}</strong>
                  <span>{slide.subtitle}</span>
                </div>
              </button>
            ))}
          </aside>
        </section>

        <section className="footer-note">
          <div className="footer-box">
            Replace the image links, titles, descriptions, and metadata in the JavaScript array to turn this into your own project album, water network showcase, STP progress gallery, or event storybook.
          </div>
        </section>
      </main>
    </>
  );
}
