import { UserInput } from "../types";
// @ts-ignore
import { Muxer, ArrayBufferTarget } from 'webm-muxer';

// Define missing WebCodecs types locally to fix build errors
declare class AudioEncoder {
  constructor(init: { output: (chunk: any, meta: any) => void, error: (e: any) => void });
  configure(config: { codec: string, sampleRate: number, numberOfChannels: number, bitrate?: number }): void;
  encode(data: any): void;
  flush(): Promise<void>;
  close(): void;
}

declare class VideoEncoder {
  constructor(init: { output: (chunk: any, meta: any) => void, error: (e: any) => void });
  configure(config: { codec: string, width: number, height: number, bitrate?: number, framerate?: number }): void;
  encode(frame: VideoFrame, options?: { keyFrame: boolean }): void;
  flush(): Promise<void>;
  close(): void;
}

declare class VideoFrame {
  constructor(image: CanvasImageSource, init: { timestamp: number, duration?: number });
  close(): void;
}

declare class AudioData {
  constructor(init: any);
  close(): void;
}

// Helper for robust image loading (supports SVG, PNG, JPG) with performance optimization
const loadAndOptimizeBitmap = async (file: File, targetMaxDimension: number): Promise<ImageBitmap> => {
  const isSvg = file.type === 'image/svg+xml';

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = async () => {
      let width = img.naturalWidth || img.width || 0;
      let height = img.naturalHeight || img.height || 0;

      if (!width || !height) { width = 1024; height = 1024; }

      const safeMax = targetMaxDimension * 1.5; 
      let finalWidth = width;
      let finalHeight = height;

      if (isSvg) {
         const aspect = width / height;
         if (width >= height) {
             finalWidth = safeMax;
             finalHeight = safeMax / aspect;
         } else {
             finalHeight = safeMax;
             finalWidth = safeMax * aspect;
         }
         img.width = finalWidth;
         img.height = finalHeight;
      } else {
         if (width > safeMax || height > safeMax) {
             const aspect = width / height;
             if (width >= height) {
                 finalWidth = safeMax;
                 finalHeight = safeMax / aspect;
             } else {
                 finalHeight = safeMax;
                 finalWidth = safeMax * aspect;
             }
         }
      }

      try {
          let canvas: HTMLCanvasElement | OffscreenCanvas;
          let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

          if (typeof OffscreenCanvas !== 'undefined') {
              canvas = new OffscreenCanvas(finalWidth, finalHeight);
              ctx = canvas.getContext('2d');
          } else {
              canvas = document.createElement('canvas');
              canvas.width = finalWidth;
              canvas.height = finalHeight;
              ctx = (canvas as HTMLCanvasElement).getContext('2d');
          }

          if (!ctx) throw new Error("Could not create context for image optimization");

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

          if (canvas instanceof OffscreenCanvas) {
              const bmp = canvas.transferToImageBitmap();
              resolve(bmp);
          } else {
              const bmp = await createImageBitmap(canvas as HTMLCanvasElement);
              resolve(bmp);
          }
      } catch (err) {
          console.error("Image optimization failed, falling back to raw:", err);
          createImageBitmap(img).then(resolve).catch(reject);
      } finally {
          URL.revokeObjectURL(url);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не вдалося завантажити зображення"));
    };
    
    img.src = url;
  });
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Prepare audio buffer for the exact duration of the video
const renderAudioTrack = async (audioFile: File, totalDuration: number): Promise<AudioBuffer> => {
    // Cross-browser OfflineAudioContext
    const OfflineContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error("OfflineAudioContext not supported in this browser");

    const actx = new OfflineContext(2, 48000 * totalDuration, 48000);
    const arrayBuffer = await audioFile.arrayBuffer();
    // Use a temporary normal context to decode if offline context decode is flaky in some browsers, 
    // but standard Actx is fine usually.
    // However, decodeAudioData is async.
    const audioBuffer = await actx.decodeAudioData(arrayBuffer);
    
    const source = actx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(actx.destination);
    source.start(0);
    
    return await actx.startRendering();
};

export const generateCollageVideo = async (
  input: UserInput,
  onStatusUpdate: (status: string) => void
): Promise<string> => {
  const { 
    slides, audio, transition, 
    aspectRatio, customWidth, customHeight,
    slideDuration, enableZoom, zoomTextWithFrame, logo, fps,
    frameStyle, backgroundType, backgroundColor, backgroundImage,
    textAnimation = 'none',
    textStyle,
    intro
  } = input;
  
  if (!Muxer || !ArrayBufferTarget) {
      throw new Error("WebM Muxer library not loaded correctly. Please refresh.");
  }

  if (slides.length === 0) throw new Error("Будь ласка, додайте хоча б один слайд.");
  if (slides.some(s => !s.file)) throw new Error("Всі слайди повинні мати завантажене фото.");

  // 1. Dimensions & Settings
  let WIDTH = 1280;
  let HEIGHT = 720;

  switch (aspectRatio) {
    case '9:16': WIDTH = 720; HEIGHT = 1280; break;
    case '1:1': WIDTH = 1080; HEIGHT = 1080; break;
    case 'custom': 
      WIDTH = customWidth || 1920; 
      HEIGHT = customHeight || 1080;
      WIDTH = Math.max(100, Math.min(3840, WIDTH));
      HEIGHT = Math.max(100, Math.min(3840, HEIGHT));
      break;
    case '16:9':
    default: WIDTH = 1280; HEIGHT = 720; break;
  }
  
  // Ensure dimensions are even (requirement for some codecs)
  if (WIDTH % 2 !== 0) WIDTH--;
  if (HEIGHT % 2 !== 0) HEIGHT--;

  const MAX_VIDEO_DIM = Math.max(WIDTH, HEIGHT);
  const FPS = fps || 30;
  const SLIDE_DURATION = slideDuration || 3; 
  const INTRO_DURATION = intro.enabled ? (intro.duration || 3.0) : 0; 
  const TRANSITION_DURATION = 0.8;
  const TEXT_ANIMATION_DURATION = Math.min(1.5, SLIDE_DURATION * 0.6);
  const TOTAL_DURATION = INTRO_DURATION + (slides.length * SLIDE_DURATION);
  const TOTAL_FRAMES = Math.ceil(TOTAL_DURATION * FPS);

  // 2. Load Resources
  onStatusUpdate("Підготовка та оптимізація...");
  
  let slideResources: { bmp: ImageBitmap, text: string }[] = [];
  try {
      slideResources = await Promise.all(slides.map(async (slide, index) => {
          onStatusUpdate(`Обробка фото ${index + 1}/${slides.length}...`);
          const bmp = await loadAndOptimizeBitmap(slide.file, MAX_VIDEO_DIM);
          return { bmp, text: slide.text };
      }));
  } catch (e: any) {
      throw e;
  }

  let logoBitmap: ImageBitmap | null = null;
  if (logo) logoBitmap = await loadAndOptimizeBitmap(logo, MAX_VIDEO_DIM / 4);

  let bgBitmap: ImageBitmap | null = null;
  if (backgroundType === 'image' && backgroundImage) {
      bgBitmap = await loadAndOptimizeBitmap(backgroundImage, MAX_VIDEO_DIM);
  }
  
  // 3. Audio Preparation
  let mixedAudioBuffer: AudioBuffer | null = null;
  if (audio) {
      onStatusUpdate("Мікшування аудіо...");
      mixedAudioBuffer = await renderAudioTrack(audio, TOTAL_DURATION);
  }

  // 4. Initialize Muxer & Encoders (WebCodecs)
  onStatusUpdate("Налаштування енкодера...");
  
  const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
          codec: 'V_VP9',
          width: WIDTH,
          height: HEIGHT,
          frameRate: FPS
      },
      audio: mixedAudioBuffer ? {
          codec: 'A_OPUS',
          numberOfChannels: mixedAudioBuffer.numberOfChannels,
          sampleRate: 48000 // Standard for Opus
      } : undefined
  });

  const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("Video Encoder Error", e)
  });

  videoEncoder.configure({
      codec: 'vp09.00.10.08', // VP9
      width: WIDTH,
      height: HEIGHT,
      bitrate: 4_000_000, // 4Mbps
      framerate: FPS
  });

  let audioEncoder: AudioEncoder | null = null;
  if (mixedAudioBuffer) {
      audioEncoder = new AudioEncoder({
          output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta),
          error: (e: any) => console.error("Audio Encoder Error", e)
      });
      audioEncoder.configure({
          codec: 'opus',
          sampleRate: 48000,
          numberOfChannels: mixedAudioBuffer.numberOfChannels,
          bitrate: 128_000
      });
  }

  // 5. Drawing Helpers (Reused logic, now purely functional)
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error("OffscreenCanvas failed");
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const drawBackground = () => {
    if (backgroundType === 'image' && bgBitmap) {
      const sw = bgBitmap.width;
      const sh = bgBitmap.height;
      const ratio = Math.max(WIDTH / sw, HEIGHT / sh);
      const dw = sw * ratio;
      const dh = sh * ratio;
      const dx = (WIDTH - dw) / 2;
      const dy = (HEIGHT - dh) / 2;
      ctx.drawImage(bgBitmap, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = backgroundColor || '#000000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  };

  const getIntroResources = () => {
      let res = [...slideResources];
      if (intro.source === 'first-3') res = res.slice(0, 3);
      else if (intro.source === 'first-5') res = res.slice(0, 5);
      else if (intro.source === 'random-5') res = [...slideResources].sort(() => 0.5 - Math.random()).slice(0, 5);
      else if (intro.source === 'custom') {
          const selectedIndices = slides.map((s, i) => intro.customIds.includes(s.id) ? i : -1).filter(i => i !== -1);
          res = selectedIndices.map(i => slideResources[i]);
          if (res.length === 0) res = slideResources.slice(0, 5);
      }
      return res;
  };
  const introResources = getIntroResources();

  const drawIntro = (time: number) => {
      // Reuse existing intro drawing logic...
      // For brevity in this offline render adaptation, I'm pasting the same logic structure
      const centerX = WIDTH / 2;
      const centerY = HEIGHT / 2;
      const minDim = Math.min(WIDTH, HEIGHT);
      const count = introResources.length;
      const imgScale = intro.imageScale ?? 1.0;

      drawBackground();

      if (intro.style === 'grid') {
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const cellW = WIDTH / cols;
        const cellH = HEIGHT / rows;

        introResources.forEach((res, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const x = c * cellW;
            const y = r * cellH;
            const sw = res.bmp.width; const sh = res.bmp.height;
            const ratio = Math.max(cellW / sw, cellH / sh);
            const dw = sw * ratio * imgScale; const dh = sh * ratio * imgScale;
            const dx = x + (cellW - dw)/2; const dy = y + (cellH - dh)/2;
            
            ctx.save();
            ctx.beginPath(); ctx.rect(x, y, cellW, cellH); ctx.clip();
            ctx.drawImage(res.bmp, dx, dy, dw, dh);
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x,y,cellW, cellH);
            ctx.restore();
        });
    } else if (intro.style === 'chaos') {
        introResources.forEach((res, i) => {
            const seed = (i + 1) * 9301;
            const randX = (Math.sin(seed) * 0.5 + 0.5); const randY = (Math.cos(seed) * 0.5 + 0.5);
            const randR = Math.sin(seed * 2) * 0.3;
            const size = minDim * 0.4 * imgScale;
            const x = randX * WIDTH; const y = randY * HEIGHT;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(randR + (Math.sin(time * 0.5 + i) * 0.05));
            ctx.shadowColor = 'black'; ctx.shadowBlur = 10;
            ctx.fillStyle = 'white'; ctx.fillRect(-size/2 - 10, -size/2 - 10, size + 20, size + 20);
            
            const sw = res.bmp.width; const sh = res.bmp.height;
            const ratio = Math.max(size / sw, size / sh);
            const dw = sw * ratio; const dh = sh * ratio;
            
            ctx.beginPath(); ctx.rect(-size/2, -size/2, size, size); ctx.clip();
            ctx.drawImage(res.bmp, -dw/2, -dh/2, dw, dh);
            ctx.restore();
        });
    } else {
        // ORBIT
        const orbitRadius = minDim * 0.35;
        const itemSize = minDim * 0.18 * imgScale;
        const currentAngle = time * 0.5;
        ctx.beginPath(); ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
        const step = (Math.PI * 2) / count;
        introResources.forEach((res, i) => {
            const angle = currentAngle + (i * step);
            const x = centerX + Math.cos(angle) * orbitRadius;
            const y = centerY + Math.sin(angle) * orbitRadius;
            ctx.save(); ctx.beginPath(); ctx.arc(x, y, itemSize / 2, 0, Math.PI * 2); ctx.closePath();
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; ctx.clip();
            const sw = res.bmp.width; const sh = res.bmp.height;
            const scale = Math.max(itemSize / sw, itemSize / sh);
            const dw = sw * scale; const dh = sh * scale;
            ctx.drawImage(res.bmp, x - dw/2, y - dh/2, dw, dh); ctx.restore();
            ctx.beginPath(); ctx.arc(x, y, itemSize / 2, 0, Math.PI * 2); ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
        });
    }

    if (logoBitmap) {
        const baseSize = minDim * 0.25;
        const scaleSetting = intro.logoScale || 1.0;
        const logoSize = baseSize * scaleSetting;
        const pulse = 1 + Math.sin(time * 3) * 0.05;
        const dw = logoSize * pulse;
        const dh = (logoSize * (logoBitmap.height / logoBitmap.width)) * pulse;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 15;
        ctx.drawImage(logoBitmap, centerX - dw/2, centerY - dh/2, dw, dh); ctx.restore();
    } else {
        ctx.fillStyle = 'white'; ctx.font = `bold ${minDim * 0.1 * (intro.logoScale || 1)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'black'; ctx.shadowBlur = 5;
        ctx.fillText("VIDEO", centerX, centerY);
    }
  };

  const drawText = (text: string, localTime: number) => {
      if (!text) return;
      const scaleFactor = (textStyle.fontSize || 5) * 0.01; 
      const fontSize = Math.floor(Math.min(WIDTH, HEIGHT) * (scaleFactor + 0.02)); 
      ctx.font = `bold ${fontSize}px ${textStyle.fontFamily || 'sans-serif'}`;
      
      const words = text.split(' ');
      let line = '';
      const lines: string[] = [];
      const maxWidth = WIDTH * 0.85;
      for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; } 
          else { line = testLine; }
      }
      lines.push(line);
      const lineHeight = fontSize * 1.3;
      const totalTextHeight = lines.length * lineHeight;
      let startY = 0;
      const paddingY = HEIGHT * 0.08; 
      switch (textStyle.position) {
          case 'top': startY = paddingY; break;
          case 'center': startY = (HEIGHT - totalTextHeight) / 2; break;
          case 'bottom': default: startY = HEIGHT - paddingY - totalTextHeight; break;
      }
      const boxPadding = fontSize * 0.6;
      let maxLineWidth = 0;
      lines.forEach(l => { const m = ctx.measureText(l); if (m.width > maxLineWidth) maxLineWidth = m.width; });
      const blockCenterX = WIDTH / 2;
      const boxX = blockCenterX - (maxLineWidth / 2) - boxPadding;
      const boxY = startY - boxPadding; 
      const boxW = maxLineWidth + (boxPadding * 2);
      const boxH = totalTextHeight + (boxPadding);
      const animStartDelay = 0.2; 
      const animProgress = Math.max(0, Math.min(1, (localTime - animStartDelay) / TEXT_ANIMATION_DURATION));
      const ease = 1 - Math.pow(1 - animProgress, 3); 
      ctx.save();
      if (textAnimation === 'fade') ctx.globalAlpha = ease;
      else if (textAnimation === 'slide-up') { const offset = 100 * (1 - ease); ctx.translate(0, offset); ctx.globalAlpha = ease; }
      else if (textAnimation === 'scale') { const scale = 0.5 + (0.5 * ease); const pivotX = blockCenterX; const pivotY = boxY + boxH / 2; ctx.translate(pivotX, pivotY); ctx.scale(scale, scale); ctx.translate(-pivotX, -pivotY); ctx.globalAlpha = ease; } 
      if (textAnimation === 'typewriter') ctx.globalAlpha = 1.0; 
      if (textStyle.boxStyle !== 'none') {
          const boxAlpha = (textStyle.backgroundOpacity ?? 0.7);
          const animAlphaMod = (textAnimation === 'typewriter') ? Math.min(1, animProgress * 3) : 1;
          ctx.fillStyle = hexToRgba(textStyle.backgroundColor || '#000000', boxAlpha * animAlphaMod);
          if (textStyle.boxStyle === 'full-width') ctx.fillRect(0, boxY, WIDTH, boxH);
          else { ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 12); ctx.fill(); }
      }
      ctx.textBaseline = 'top'; ctx.fillStyle = textStyle.color || '#ffffff'; ctx.textAlign = textStyle.alignment;
      let textAnchorX = blockCenterX;
      if (textStyle.alignment === 'left') textAnchorX = blockCenterX - (maxLineWidth / 2);
      if (textStyle.alignment === 'right') textAnchorX = blockCenterX + (maxLineWidth / 2);
      if (textAnimation === 'typewriter') {
          const totalChars = text.length; const charsToShow = Math.floor(totalChars * animProgress);
          let charsCounted = 0;
          lines.forEach((l, i) => {
              const lineLength = l.length;
              if (charsCounted < charsToShow) {
                  const remaining = charsToShow - charsCounted; const subString = l.substring(0, remaining);
                  ctx.fillText(subString, textAnchorX, startY + (i * lineHeight));
              }
              charsCounted += lineLength;
          });
      } else { lines.forEach((l, i) => { ctx.fillText(l, textAnchorX, startY + (i * lineHeight)); }); }
      ctx.restore();
  };

  const drawSlideContent = (bmp: ImageBitmap, text: string, alpha: number, localTime: number, offsetX: number, offsetY: number, scale: number) => {
      ctx.globalAlpha = alpha;
      if (frameStyle === 'none') {
          const sw = bmp.width; const sh = bmp.height;
          const ratio = Math.max(WIDTH / sw, HEIGHT / sh) * scale;
          const dw = sw * ratio; const dh = sh * ratio;
          const dx = (WIDTH - dw) / 2 + offsetX; const dy = (HEIGHT - dh) / 2 + offsetY;
          ctx.drawImage(bmp, dx, dy, dw, dh);
      } else {
          drawBackground();
          const safeW = WIDTH * 0.8; const safeH = HEIGHT * 0.7; 
          const imgRatio = bmp.width / bmp.height;
          let baseDw = safeW; let baseDh = safeW / imgRatio;
          if (baseDh > safeH) { baseDh = safeH; baseDw = safeH * imgRatio; }
          const dw = baseDw * scale; const dh = baseDh * scale;
          const dx = (WIDTH - dw) / 2 + offsetX; const dy = (HEIGHT - dh) / 2 + offsetY - (HEIGHT * 0.05);
          ctx.save(); ctx.translate(dx, dy);
          if (frameStyle === 'shadow') { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 15; ctx.drawImage(bmp, 0, 0, dw, dh); }
          else if (frameStyle === 'border') { const border = 20; ctx.fillStyle = '#ffffff'; ctx.fillRect(-border, -border, dw + border*2, dh + border*2); ctx.drawImage(bmp, 0, 0, dw, dh); }
          else if (frameStyle === 'polaroid') {
              const scaleRef = Math.min(WIDTH, HEIGHT);
              const pX_base = scaleRef * 0.03; const pTop_base = scaleRef * 0.03; const pBot_base = scaleRef * 0.20; 
              const pX = pX_base * scale; const pTop = pTop_base * scale; const pBot = pBot_base * scale;
              ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = scaleRef * 0.02; ctx.shadowOffsetY = scaleRef * 0.01;
              ctx.fillStyle = '#ffffff'; ctx.fillRect(-pX, -pTop, dw + pX*2, dh + pTop + pBot);
              ctx.shadowColor = 'transparent'; ctx.drawImage(bmp, 0, 0, dw, dh);
              if (text) {
                  ctx.fillStyle = '#1a1a1a'; 
                  const fontSizeBase = pBot_base * 0.35; let finalFontSize = fontSizeBase;
                  const maxTextWidthBase = baseDw + (pX_base * 0.5);
                  ctx.font = `400 ${finalFontSize}px ${textStyle.fontFamily || 'cursive'}`;
                  while (ctx.measureText(text).width > maxTextWidthBase && finalFontSize > 10) { finalFontSize -= 2; ctx.font = `400 ${finalFontSize}px ${textStyle.fontFamily || 'cursive'}`; }
                  const fontScale = zoomTextWithFrame ? scale : 1.0;
                  const scaledFontSize = finalFontSize * fontScale;
                  ctx.font = `400 ${scaledFontSize}px ${textStyle.fontFamily || 'cursive'}`;
                  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                  let textToDraw = text;
                  if (textAnimation === 'typewriter') {
                      const animStartDelay = 0.2; 
                      const animProgress = Math.max(0, Math.min(1, (localTime - animStartDelay) / TEXT_ANIMATION_DURATION));
                      const charsToShow = Math.floor(text.length * animProgress);
                      textToDraw = text.substring(0, charsToShow);
                  }
                  let textY = dh + (pBot / 2);
                  if (!zoomTextWithFrame) { textY = (dh / 2) + (baseDh / 2) + (pBot_base / 2); }
                  ctx.fillText(textToDraw, dw / 2, textY);
              }
          } else { ctx.drawImage(bmp, 0, 0, dw, dh); }
          ctx.restore();
      }
      ctx.globalAlpha = 1.0;
      if (logoBitmap) {
          const logoSize = Math.min(WIDTH, HEIGHT) * 0.12; const padding = Math.min(WIDTH, HEIGHT) * 0.05;
          const lRatio = logoBitmap.width / logoBitmap.height;
          let ldw = logoSize; let ldh = logoSize / lRatio;
          if (lRatio < 1) { ldh = logoSize; ldw = logoSize * lRatio; }
          ctx.drawImage(logoBitmap, WIDTH - ldw - padding, padding, ldw, ldh);
      }
      if (alpha > 0.8 && frameStyle !== 'polaroid') drawText(text, localTime);
  };

  // 6. RENDER LOOP (Offline Mode)
  // Instead of requestAnimationFrame, we simply loop N times.
  const frameIntervalMicroseconds = (1 / FPS) * 1_000_000;
  
  for (let i = 0; i < TOTAL_FRAMES; i++) {
      const time = i / FPS;
      
      // Update Progress UI every 30 frames (1 second) to avoid blocking UI too much
      if (i % 30 === 0) {
          const pct = Math.round((i / TOTAL_FRAMES) * 80); // First 80% is video
          onStatusUpdate(`Рендеринг відео: ${pct}% (${Math.round(time)}s / ${TOTAL_DURATION}s)`);
          // Yield to main thread briefly to let React UI update
          await new Promise(r => setTimeout(r, 0));
      }

      // Logic adapted from previous real-time loop
      if (intro.enabled && time < INTRO_DURATION) {
          drawIntro(time);
          if (time > INTRO_DURATION - 0.5) {
              const transitionProgress = (time - (INTRO_DURATION - 0.5)) / 0.5;
              const firstRes = slideResources[0];
              drawSlideContent(firstRes.bmp, firstRes.text, transitionProgress, 0, 0, 0, 1.0 + (0.05 * (1-transitionProgress)));
          }
      } else {
          const slideElapsed = intro.enabled ? (time - INTRO_DURATION) : time;
          const slideIndex = Math.floor(slideElapsed / SLIDE_DURATION);
          const nextSlideIndex = (slideIndex + 1) % slideResources.length;
          const localTime = slideElapsed % SLIDE_DURATION; 
          const isTransitioning = localTime > (SLIDE_DURATION - TRANSITION_DURATION);
          
          const currentRes = slideResources[slideIndex % slideResources.length];
          const nextRes = slideResources[nextSlideIndex];

          ctx.fillStyle = backgroundColor || '#000';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          const zoomBase = enableZoom ? (1.0 + (localTime / SLIDE_DURATION) * 0.05) : 1.0;

          if (!isTransitioning) {
              drawSlideContent(currentRes.bmp, currentRes.text, 1.0, localTime, 0, 0, zoomBase);
          } else {
              const progress = (localTime - (SLIDE_DURATION - TRANSITION_DURATION)) / TRANSITION_DURATION;
              const ease = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
              
              switch (transition) {
                  case 'fade':
                      drawSlideContent(currentRes.bmp, currentRes.text, 1.0, localTime, 0, 0, zoomBase);
                      drawSlideContent(nextRes.bmp, nextRes.text, ease, 0, 0, 0, 1.0);
                      break;
                  case 'slide':
                      const offsetX = WIDTH * ease;
                      drawSlideContent(currentRes.bmp, currentRes.text, 1.0, localTime, -offsetX, 0, zoomBase);
                      drawSlideContent(nextRes.bmp, nextRes.text, 1.0, 0, WIDTH - offsetX, 0, 1.0);
                      break;
                  case 'zoom':
                      drawSlideContent(currentRes.bmp, currentRes.text, 1.0 - ease, localTime, 0, 0, zoomBase + ease);
                      drawSlideContent(nextRes.bmp, nextRes.text, ease, 0, 0, 0, 0.5 + (0.5 * ease));
                      break;
                  case 'wipe':
                      drawSlideContent(currentRes.bmp, currentRes.text, 1.0, localTime, 0, 0, zoomBase);
                      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, WIDTH * ease, HEIGHT); ctx.clip();
                      drawSlideContent(nextRes.bmp, nextRes.text, 1.0, 0, 0, 0, 1.0); ctx.restore();
                      break;
              }
          }
      }

      // Encode Frame
      const videoFrame = new VideoFrame(canvas, { timestamp: i * frameIntervalMicroseconds });
      videoEncoder.encode(videoFrame);
      videoFrame.close();
  }

  // 7. Process Audio (Offline)
  if (mixedAudioBuffer && audioEncoder) {
      onStatusUpdate("Кодування аудіо...");
      const numberOfChannels = mixedAudioBuffer.numberOfChannels;
      const length = mixedAudioBuffer.length;
      const sampleRate = mixedAudioBuffer.sampleRate;
      
      // We process audio in chunks (e.g., 20ms implies better interleaving, but 1s is safer for simpler looping)
      // Opus likes 20ms frames typically, WebCodecs handles it, but let's pass ~100ms chunks
      const chunkSize = Math.floor(sampleRate / 10); // 100ms
      
      for (let i = 0; i < length; i += chunkSize) {
          const remaining = length - i;
          const size = Math.min(chunkSize, remaining);
          const durationMicroseconds = (size / sampleRate) * 1_000_000;
          const timestamp = (i / sampleRate) * 1_000_000;
          
          // Construct AudioData
          // We need an AudioDataInit object which requires a buffer in specific format
          // AudioData expects planar data in a single buffer or separate? 
          // The API accepts `data` as BufferSource.
          // For Float32 Planar: LLLLLRRRRR
          
          const planarBuffer = new Float32Array(size * numberOfChannels);
          for (let c = 0; c < numberOfChannels; c++) {
              const channelData = mixedAudioBuffer.getChannelData(c);
              // Copy chunk into planar location
              planarBuffer.set(channelData.subarray(i, i + size), c * size);
          }

          const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate: sampleRate,
              numberOfFrames: size,
              numberOfChannels: numberOfChannels,
              timestamp: timestamp,
              data: planarBuffer
          });

          audioEncoder.encode(audioData);
          audioData.close();
          
          if (i % (chunkSize * 10) === 0) await new Promise(r => setTimeout(r, 0));
      }
  }

  // 8. Finalize
  onStatusUpdate("Фіналізація файлу...");
  
  await videoEncoder.flush();
  if (audioEncoder) await audioEncoder.flush();
  
  muxer.finalize();
  
  const blob = new Blob([muxer.target.buffer], { type: 'video/webm' });
  return URL.createObjectURL(blob);
};