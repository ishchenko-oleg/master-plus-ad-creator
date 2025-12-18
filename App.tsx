import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaInput } from './components/MediaInput';
import { SlideItem } from './components/SlideItem';
import { ResultPlayer } from './components/ResultPlayer';
import { generateCollageVideo } from './services/videoGenerator';
import { UserInput, GenerationState, Slide, TransitionType, AspectRatio, FrameStyle, TextAnimationType, TextStyle, IntroSettings } from './types';
import { Wand2, AlertCircle, Loader2, PlayCircle, Plus, RectangleHorizontal, RectangleVertical, Square, Scan, Monitor, LayoutTemplate, PaintBucket, Image as ImageIcon, Type, ArrowUpFromLine, Maximize, Keyboard, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignEndVertical, AlignCenterVertical, Sparkles, Orbit, Grid, Shuffle, Check, ZoomIn, Briefcase, CaseSensitive, Film } from 'lucide-react';

const DEFAULT_INPUT: UserInput = {
  slides: [],
  audio: null,
  transition: 'fade',
  aspectRatio: '16:9',
  customWidth: 1920,
  customHeight: 1080,
  fps: 30,
  slideDuration: 3,
  enableZoom: true,
  zoomTextWithFrame: true,
  logo: null,
  frameStyle: 'none',
  backgroundType: 'color',
  backgroundColor: '#111827',
  backgroundImage: null,
  textAnimation: 'typewriter',
  textStyle: {
    fontFamily: 'sans-serif',
    fontSize: 5,
    color: '#ffffff',
    backgroundColor: '#000000',
    backgroundOpacity: 0.7,
    alignment: 'center',
    position: 'bottom',
    boxStyle: 'rounded'
  },
  intro: {
      enabled: true,
      style: 'orbit',
      duration: 3,
      source: 'all',
      customIds: [],
      logoScale: 1.0,
      imageScale: 1.0
  }
};

const App: React.FC = () => {
  // Theme Persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('app_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Settings Persistence
  const [input, setInput] = useState<UserInput>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_INPUT,
            ...parsed,
            // Reset fields that cannot be saved (files) or rely on them
            slides: [],
            audio: null,
            logo: null,
            backgroundImage: null,
            textStyle: { ...DEFAULT_INPUT.textStyle, ...parsed.textStyle },
            intro: { 
              ...DEFAULT_INPUT.intro, 
              ...parsed.intro,
              customIds: [] // IDs are invalid without slides
            }
          };
        } catch (e) {
          console.error("Failed to load settings:", e);
        }
      }
    }
    return DEFAULT_INPUT;
  });

  useEffect(() => {
    // Save everything except heavy media files
    const { slides, audio, logo, backgroundImage, ...settingsToSave } = input;
    localStorage.setItem('user_settings', JSON.stringify(settingsToSave));
  }, [input]);

  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    statusMessage: '',
    progress: 0,
    error: null,
    videoUrl: null,
  });

  // Slide Management
  const addSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      file: null as any,
      text: ''
    };
    setInput(prev => ({ ...prev, slides: [...prev.slides, newSlide] }));
  };

  const updateSlide = (id: string, updates: Partial<Slide>) => {
    setInput(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const removeSlide = (id: string) => {
    setInput(prev => ({
      ...prev,
      slides: prev.slides.filter(s => s.id !== id)
    }));
  };

  const handleAudioChange = (files: File[]) => {
    setInput(prev => ({ ...prev, audio: files[0] || null }));
  };
  
  const handleLogoChange = (files: File[]) => {
    setInput(prev => ({ ...prev, logo: files[0] || null }));
  };
  
  const handleBgImageChange = (files: File[]) => {
    setInput(prev => ({ ...prev, backgroundImage: files[0] || null }));
  };

  const updateTextStyle = (updates: Partial<TextStyle>) => {
    setInput(prev => ({
      ...prev,
      textStyle: { ...prev.textStyle, ...updates }
    }));
  };

  const updateIntro = (updates: Partial<IntroSettings>) => {
      setInput(prev => ({
          ...prev,
          intro: { ...prev.intro, ...updates }
      }));
  };

  const toggleIntroSlide = (slideId: string) => {
     setInput(prev => {
         const isSelected = prev.intro.customIds.includes(slideId);
         const newIds = isSelected 
            ? prev.intro.customIds.filter(id => id !== slideId)
            : [...prev.intro.customIds, slideId];
         
         return {
             ...prev,
             intro: { ...prev.intro, customIds: newIds }
         };
     });
  };

  const handleGenerate = async () => {
    if (input.slides.length === 0) return;
    if (input.slides.some(s => !s.file)) {
        setState(prev => ({ ...prev, error: 'Всі слайди повинні мати фото!' }));
        return;
    }

    setState({ 
        isLoading: true, 
        statusMessage: 'Ініціалізація...', 
        progress: 0, 
        error: null, 
        videoUrl: null 
    });

    try {
      const videoUrl = await generateCollageVideo(input, (status) => {
        setState(prev => ({ ...prev, statusMessage: status }));
      });

      setState({
        isLoading: false,
        statusMessage: 'Готово!',
        progress: 100,
        error: null,
        videoUrl: videoUrl
      });

    } catch (err: any) {
      console.error(err);
      setState({
        isLoading: false,
        statusMessage: '',
        progress: 0,
        error: err.message || 'Помилка генерації відео',
        videoUrl: null
      });
    }
  };

  const toggleTheme = () => {
      setIsDarkMode(!isDarkMode);
  };

  const FONTS = [
    { name: 'Standard', value: 'sans-serif' },
    { name: 'Serif', value: 'serif' },
    { name: 'Mono', value: 'monospace' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Courier', value: '"Courier New", monospace' },
    { name: 'Comic', value: '"Comic Sans MS", cursive' },
    { name: 'Trebuchet', value: '"Trebuchet MS", sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' }
  ];

  // Helper for consistent button styling
  const getToggleClass = (isSelected: boolean) => {
    if (isSelected) {
      // High contrast for selected state in both modes
      return 'bg-brand-600 dark:bg-brand-600 border-brand-600 text-white shadow-md transform scale-[1.02]';
    }
    // Clear inactive state
    return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700';
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
    <div className="min-h-screen bg-gray-100 dark:bg-[#0f0f12] text-gray-900 dark:text-white font-sans selection:bg-brand-500 selection:text-white pb-20 transition-colors duration-300">
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      <main className="max-w-7xl mx-auto px-4 pt-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Settings & Editor */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Global Settings Panel */}
            <div className="bg-white dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-8 shadow-sm dark:shadow-none transition-colors">
               
               {/* Section 1: Dimensions */}
               <div>
                  <div className="flex items-center gap-2 mb-3 text-brand-600 dark:text-brand-200 font-medium">
                      <Monitor className="w-5 h-5" />
                      <span>Розмір та Час</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Aspect Ratio */}
                      <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                              {[
                                { id: '16:9', icon: RectangleHorizontal, label: 'YouTube' },
                                { id: '9:16', icon: RectangleVertical, label: 'TikTok' },
                                { id: '1:1', icon: Square, label: 'Post' },
                                { id: 'custom', icon: Scan, label: 'Свій' }
                              ].map(opt => (
                                <button 
                                  key={opt.id}
                                  onClick={() => setInput(prev => ({ ...prev, aspectRatio: opt.id as AspectRatio }))}
                                  className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 text-[10px] md:text-xs border transition-all duration-200 ${getToggleClass(input.aspectRatio === opt.id)}`}
                                >
                                   <opt.icon className="w-4 h-4 md:w-5 md:h-5" />
                                   <span>{opt.label}</span>
                                </button>
                              ))}
                          </div>
                          
                          {/* Custom Resolution Inputs */}
                          {input.aspectRatio === 'custom' && (
                              <div className="flex gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                 <div className="flex-1">
                                    <label className="text-[10px] text-gray-500 block mb-1">Ширина</label>
                                    <input 
                                       type="number"
                                       value={input.customWidth}
                                       onChange={(e) => setInput(prev => ({ ...prev, customWidth: parseInt(e.target.value) || 1080 }))}
                                       className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:border-brand-500 outline-none text-center font-mono text-gray-900 dark:text-white"
                                    />
                                 </div>
                                 <div className="flex-1">
                                    <label className="text-[10px] text-gray-500 block mb-1">Висота</label>
                                    <input 
                                       type="number"
                                       value={input.customHeight}
                                       onChange={(e) => setInput(prev => ({ ...prev, customHeight: parseInt(e.target.value) || 1080 }))}
                                       className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:border-brand-500 outline-none text-center font-mono text-gray-900 dark:text-white"
                                    />
                                 </div>
                              </div>
                          )}

                           {/* FPS Selection */}
                           <div className="mt-2">
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                                    <Film className="w-3 h-3" /> Якість (FPS)
                                </label>
                                <div className="flex gap-1">
                                    {[
                                        { val: 15, label: '15 (Eco)' },
                                        { val: 24, label: '24 (Кіно)' },
                                        { val: 30, label: '30 (TV)' },
                                        { val: 60, label: '60 (Max)' }
                                    ].map(f => (
                                        <button
                                            key={f.val}
                                            onClick={() => setInput(prev => ({ ...prev, fps: f.val }))}
                                            className={`flex-1 py-1.5 text-[10px] rounded border transition-all ${getToggleClass(input.fps === f.val)}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                {input.fps > 30 && <p className="text-[10px] text-orange-500 mt-1">Високий FPS може викликати лаги на слабких ПК.</p>}
                           </div>
                      </div>

                      {/* Duration & Zoom */}
                      <div className="flex flex-col gap-4">
                          <div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 font-bold mb-2">
                                <span>Час слайду</span>
                                <span className="text-brand-500 dark:text-brand-400">{input.slideDuration}s</span>
                              </div>
                              <input 
                                type="range" 
                                min="2" max="10" step="0.5" 
                                value={input.slideDuration}
                                onChange={(e) => setInput(prev => ({...prev, slideDuration: parseFloat(e.target.value)}))}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                              />
                          </div>

                          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                               <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                                   <ZoomIn className="w-4 h-4" />
                                   <span>Ефект зуму (Ken Burns)</span>
                               </div>
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={input.enableZoom}
                                    onChange={(e) => setInput(prev => ({ ...prev, enableZoom: e.target.checked }))}
                                  />
                                  <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                </label>
                          </div>
                      </div>
                  </div>
               </div>

               {/* Section 1.5: Intro (Preview Frame) */}
               <div>
                   <div className="flex items-center justify-between mb-3 border-t border-gray-200 dark:border-gray-800 pt-4">
                       <div className="flex items-center gap-2 text-brand-600 dark:text-brand-200 font-medium">
                            <Sparkles className="w-5 h-5" />
                            <span>Прев'ю кадр (Інтро)</span>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={input.intro.enabled}
                            onChange={(e) => updateIntro({ enabled: e.target.checked })}
                          />
                          <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                   </div>
                   
                   {input.intro.enabled && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800 animate-in fade-in slide-in-from-top-1">
                           {/* Style Selection */}
                           <div>
                               <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Стиль анімації</label>
                               <div className="flex gap-2">
                                   {[
                                       { id: 'orbit', icon: Orbit, label: 'Орбіта' },
                                       { id: 'grid', icon: Grid, label: 'Сітка' },
                                       { id: 'chaos', icon: Shuffle, label: 'Хаос' }
                                   ].map(s => (
                                       <button
                                        key={s.id}
                                        onClick={() => updateIntro({ style: s.id as any })}
                                        className={`flex-1 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px] border transition-all ${getToggleClass(input.intro.style === s.id)}`}
                                       >
                                           <s.icon className="w-4 h-4" />
                                           <span>{s.label}</span>
                                       </button>
                                   ))}
                               </div>
                           </div>

                           {/* Source & Config */}
                           <div className="space-y-4">
                               <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Які слайди брати</label>
                                    <select 
                                        value={input.intro.source}
                                        onChange={(e) => updateIntro({ source: e.target.value as any })}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-brand-500 text-gray-900 dark:text-white"
                                    >
                                        <option value="all">Всі слайди</option>
                                        <option value="first-3">Перші 3</option>
                                        <option value="first-5">Перші 5</option>
                                        <option value="random-5">Випадкові 5</option>
                                        <option value="custom">Вибрати вручну</option>
                                    </select>
                               </div>
                               
                               {/* Manual Selection Grid */}
                               {input.intro.source === 'custom' && (
                                   <div className="grid grid-cols-4 gap-2 bg-gray-100 dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto custom-scrollbar">
                                       {input.slides.map((slide, i) => {
                                           const isSelected = input.intro.customIds.includes(slide.id);
                                           return (
                                               <div 
                                                key={slide.id} 
                                                onClick={() => toggleIntroSlide(slide.id)}
                                                className={`relative aspect-square rounded cursor-pointer overflow-hidden border-2 transition-all group ${isSelected ? 'border-brand-500' : 'border-gray-300 dark:border-gray-700 opacity-60 hover:opacity-100'}`}
                                               >
                                                   {slide.file ? (
                                                       <img src={URL.createObjectURL(slide.file)} className="w-full h-full object-cover" alt="" />
                                                   ) : (
                                                       <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-500">#{i+1}</div>
                                                   )}
                                                   {isSelected && (
                                                       <div className="absolute top-0 right-0 p-0.5 bg-brand-500 rounded-bl-lg">
                                                           <Check className="w-3 h-3 text-white" />
                                                       </div>
                                                   )}
                                               </div>
                                           );
                                       })}
                                       {input.slides.length === 0 && <span className="text-xs text-gray-500 col-span-4 text-center py-2">Немає слайдів</span>}
                                   </div>
                               )}
                               
                               <div className="flex gap-4">
                                    <div className="flex-1">
                                         <label className="text-[10px] text-gray-500 mb-1 block">Тривалість: {input.intro.duration}s</label>
                                         <input 
                                            type="range" min="1" max="5" step="0.5"
                                            value={input.intro.duration}
                                            onChange={(e) => updateIntro({ duration: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                        />
                                    </div>
                                    <div className="flex-1">
                                         <label className="text-[10px] text-gray-500 mb-1 block">Розмір Лого: {input.intro.logoScale}x</label>
                                         <input 
                                            type="range" min="0.5" max="2" step="0.1"
                                            value={input.intro.logoScale}
                                            onChange={(e) => updateIntro({ logoScale: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                        />
                                    </div>
                               </div>

                               <div>
                                    <label className="text-[10px] text-gray-500 mb-1 block">Розмір Фото: {input.intro.imageScale ?? 1.0}x</label>
                                    <input 
                                        type="range" min="0.5" max="2" step="0.1"
                                        value={input.intro.imageScale ?? 1.0}
                                        onChange={(e) => updateIntro({ imageScale: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                    />
                               </div>
                           </div>
                       </div>
                   )}
               </div>
               
               {/* Section 2: Style & Background */}
               <div>
                   <div className="flex items-center gap-2 mb-3 text-brand-600 dark:text-brand-200 font-medium border-t border-gray-200 dark:border-gray-800 pt-4">
                      <LayoutTemplate className="w-5 h-5" />
                      <span>Стиль та Фон</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Frames */}
                      <div>
                         <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-2 block">Рамка товару</label>
                         <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'none', label: 'На весь екран' },
                                { id: 'border', label: 'Біла рамка' },
                                { id: 'shadow', label: 'Тінь (Card)' },
                                { id: 'polaroid', label: 'Polaroid' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setInput(prev => ({ ...prev, frameStyle: f.id as FrameStyle }))}
                                    className={`py-2 px-3 text-xs rounded-lg border text-left transition-all ${getToggleClass(input.frameStyle === f.id)}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                         </div>
                      </div>

                      {/* Background */}
                      <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-2 block">Фон відео</label>
                          <div className="flex gap-2 mb-2">
                              <button 
                                onClick={() => setInput(prev => ({ ...prev, backgroundType: 'color' }))}
                                className={`flex-1 py-1 text-xs rounded border transition-all ${getToggleClass(input.backgroundType === 'color')}`}
                              >
                                  <PaintBucket className="w-3 h-3 inline mr-1"/> Колір
                              </button>
                              <button 
                                onClick={() => setInput(prev => ({ ...prev, backgroundType: 'image' }))}
                                className={`flex-1 py-1 text-xs rounded border transition-all ${getToggleClass(input.backgroundType === 'image')}`}
                              >
                                  <ImageIcon className="w-3 h-3 inline mr-1"/> Картинка
                              </button>
                          </div>

                          {input.backgroundType === 'color' ? (
                              <div className="flex items-center gap-3">
                                  <input 
                                    type="color" 
                                    value={input.backgroundColor}
                                    onChange={(e) => setInput(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                                  />
                                  <span className="text-sm text-gray-500 font-mono">{input.backgroundColor}</span>
                              </div>
                          ) : (
                              <MediaInput 
                                label="" 
                                type="image" 
                                accept="image/*"
                                multiple={false}
                                files={input.backgroundImage ? [input.backgroundImage] : []}
                                onFilesChange={handleBgImageChange}
                              />
                          )}
                      </div>
                  </div>
               </div>
               
               {/* Section 3: Text Customization */}
               <div>
                  <div className="flex items-center gap-2 mb-3 text-brand-600 dark:text-brand-200 font-medium border-t border-gray-200 dark:border-gray-800 pt-4">
                      <Type className="w-5 h-5" />
                      <span>Налаштування Тексту</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {/* Column 1: Font & Size */}
                      <div className="space-y-4">
                           <div>
                               <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Шрифт</label>
                               <select 
                                value={input.textStyle.fontFamily}
                                onChange={(e) => updateTextStyle({ fontFamily: e.target.value })}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 text-gray-900 dark:text-white"
                               >
                                   {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                               </select>
                           </div>
                           
                           <div>
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span>Розмір</span>
                                    <span>{input.textStyle.fontSize}</span>
                                </div>
                                <input 
                                    type="range" min="2" max="10" step="0.5"
                                    value={input.textStyle.fontSize}
                                    onChange={(e) => updateTextStyle({ fontSize: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                />
                           </div>

                           {/* New Text Zoom Toggle */}
                           <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                               <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                                   <CaseSensitive className="w-4 h-4" />
                                   <span>Зумувати текст з фото</span>
                               </div>
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={input.zoomTextWithFrame}
                                    onChange={(e) => setInput(prev => ({ ...prev, zoomTextWithFrame: e.target.checked }))}
                                  />
                                  <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                </label>
                          </div>

                           <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Колір тексту</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={input.textStyle.color}
                                            onChange={(e) => updateTextStyle({ color: e.target.value })}
                                            className="w-8 h-8 rounded border-0 p-0 bg-transparent cursor-pointer"
                                        />
                                        <span className="text-xs font-mono text-gray-500">{input.textStyle.color}</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Колір підкладки</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={input.textStyle.backgroundColor}
                                            onChange={(e) => updateTextStyle({ backgroundColor: e.target.value })}
                                            className="w-8 h-8 rounded border-0 p-0 bg-transparent cursor-pointer"
                                        />
                                        <span className="text-xs font-mono text-gray-500">{input.textStyle.backgroundColor}</span>
                                    </div>
                                </div>
                           </div>
                      </div>

                      {/* Column 2: Layout & Box */}
                      <div className="space-y-4">
                           {/* Alignment & Position */}
                           <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Вирівнювання</label>
                                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                        {[
                                            { id: 'left', icon: AlignLeft },
                                            { id: 'center', icon: AlignCenter },
                                            { id: 'right', icon: AlignRight }
                                        ].map(a => (
                                            <button 
                                                key={a.id}
                                                onClick={() => updateTextStyle({ alignment: a.id as any })}
                                                className={`flex-1 p-1 rounded flex justify-center transition-colors ${input.textStyle.alignment === a.id ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                                            >
                                                <a.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Позиція</label>
                                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                        {[
                                            { id: 'top', icon: AlignStartVertical },
                                            { id: 'center', icon: AlignCenterVertical },
                                            { id: 'bottom', icon: AlignEndVertical }
                                        ].map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => updateTextStyle({ position: p.id as any })}
                                                className={`flex-1 p-1 rounded flex justify-center transition-colors ${input.textStyle.position === p.id ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                                            >
                                                <p.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                           </div>

                           {/* Box Style */}
                           <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Стиль підкладки</label>
                                <div className="flex gap-2 text-xs">
                                     {['none', 'rounded', 'full-width'].map(s => (
                                         <button
                                            key={s}
                                            onClick={() => updateTextStyle({ boxStyle: s as any })}
                                            className={`px-3 py-1.5 rounded-lg border capitalize transition-all ${getToggleClass(input.textStyle.boxStyle === s)}`}
                                         >
                                             {s === 'none' ? 'Без фону' : s === 'rounded' ? 'Блок' : 'Смуга'}
                                         </button>
                                     ))}
                                </div>
                           </div>

                           {/* Opacity */}
                           {input.textStyle.boxStyle !== 'none' && (
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        <span>Прозорість підкладки</span>
                                        <span>{Math.round(input.textStyle.backgroundOpacity * 100)}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="1" step="0.1"
                                        value={input.textStyle.backgroundOpacity}
                                        onChange={(e) => updateTextStyle({ backgroundOpacity: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                    />
                                </div>
                           )}
                      </div>
                  </div>

                  {/* Animation Buttons */}
                  <div className="mt-4">
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Анімація</label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {[
                              { id: 'none', label: 'Немає', icon: Type },
                              { id: 'typewriter', label: 'Друк', icon: Keyboard },
                              { id: 'fade', label: 'Поява', icon: Wand2 },
                              { id: 'slide-up', label: 'Вгору', icon: ArrowUpFromLine },
                              { id: 'scale', label: 'Поп', icon: Maximize },
                          ].map(anim => (
                              <button
                                key={anim.id}
                                onClick={() => setInput(prev => ({ ...prev, textAnimation: anim.id as TextAnimationType }))}
                                className={`
                                    py-2 px-2 rounded-lg text-xs border transition-all flex flex-col items-center gap-1
                                    ${getToggleClass(input.textAnimation === anim.id)}
                                `}
                              >
                                 <anim.icon className="w-4 h-4" />
                                 <span>{anim.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>
               </div>

               {/* Logo & Transitions */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-800 pt-4">
                  <div>
                    <MediaInput 
                        label="Логотип" 
                        type="image" 
                        accept="image/*"
                        files={input.logo ? [input.logo] : []}
                        onFilesChange={handleLogoChange}
                        multiple={false}
                    />
                  </div>
                  <div>
                       <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-3 block">Переходи між слайдами</label>
                       <div className="grid grid-cols-2 gap-2">
                          {(['fade', 'slide', 'zoom', 'wipe'] as TransitionType[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => setInput(prev => ({ ...prev, transition: t }))}
                              className={`
                                py-2 px-3 rounded-lg text-xs capitalize border transition-all
                                ${getToggleClass(input.transition === t)}
                              `}
                            >
                              {t}
                            </button>
                          ))}
                       </div>
                   </div>
               </div>
            </div>

            {/* Slides List */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <Briefcase className="w-5 h-5 text-brand-600 dark:text-brand-400" /> Товари / Слайди
                  </h2>
                  <span className="text-xs text-gray-500">{input.slides.length} шт.</span>
               </div>
               
               {input.slides.map((slide, index) => (
                  <SlideItem 
                    key={slide.id} 
                    index={index} 
                    slide={slide} 
                    onUpdate={updateSlide} 
                    onRemove={removeSlide}
                  />
               ))}

               <button 
                onClick={addSlide}
                className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-white hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all group"
               >
                  <div className="bg-gray-200 dark:bg-gray-800 p-3 rounded-full group-hover:bg-brand-500 transition-colors group-hover:text-white">
                      <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-medium">Додати товар</span>
               </button>
            </div>

            {/* Audio */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <MediaInput 
                label="Фонова музика" 
                type="audio" 
                accept="audio/*"
                multiple={false}
                files={input.audio ? [input.audio] : []}
                onFilesChange={handleAudioChange}
                />
            </div>
          </div>

          {/* Right Column: Actions & Preview */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-32 h-fit">
             
             {/* Generate Button */}
             <button
              onClick={handleGenerate}
              disabled={state.isLoading || input.slides.length === 0}
              className={`
                w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-xl shadow-brand-200 dark:shadow-brand-900/50 transition-all
                ${state.isLoading || input.slides.length === 0
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white transform hover:scale-[1.02] active:scale-[0.98]'
                }
              `}
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>{state.statusMessage || 'Обробка...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-6 h-6" />
                  <span>Згенерувати Рекламу</span>
                </>
              )}
            </button>
            
            {state.error && (
              <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-200 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

             <div className="flex-1 bg-white dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
                
                {state.videoUrl ? (
                   <div className="w-full h-full p-4 flex items-center justify-center">
                      <ResultPlayer videoUrl={state.videoUrl} audioFile={null} />
                   </div>
                ) : (
                   <div className="text-center p-8 max-w-sm">
                      {state.isLoading ? (
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-20 h-20 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
                           <p className="text-brand-600 dark:text-brand-200 animate-pulse text-lg">{state.statusMessage}</p>
                           <p className="text-sm text-gray-500">Ми створюємо вашу рекламну кампанію...</p>
                        </div>
                      ) : (
                        <>
                           <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400 dark:text-gray-600">
                              <PlayCircle className="w-12 h-12 opacity-50" />
                           </div>
                           <h3 className="text-gray-900 dark:text-gray-300 font-bold text-lg mb-2">Попередній перегляд</h3>
                           <p className="text-gray-500 text-sm">
                              Налаштуйте формат, завантажте логотип та товари зліва, щоб отримати готове відео.
                           </p>
                        </>
                      )}
                   </div>
                )}
             </div>
          </div>

        </div>
      </main>
    </div>
    </div>
  );
};

export default App;