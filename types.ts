export interface GenerationState {
  isLoading: boolean;
  statusMessage: string;
  progress: number; // 0-100
  error: string | null;
  videoUrl: string | null;
}

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'wipe';
export type AspectRatio = '16:9' | '9:16' | '1:1' | 'custom';
export type FrameStyle = 'none' | 'border' | 'shadow' | 'polaroid';
export type BackgroundType = 'color' | 'image';
export type TextAnimationType = 'none' | 'typewriter' | 'fade' | 'slide-up' | 'scale';

// New types for Intro
export type IntroStyle = 'orbit' | 'grid' | 'chaos';
export type IntroSource = 'all' | 'first-3' | 'first-5' | 'random-5' | 'custom';

export interface IntroSettings {
  enabled: boolean;
  style: IntroStyle;
  duration: number; // seconds
  source: IntroSource;
  customIds: string[]; // Array of selected slide IDs
  logoScale: number; // 0.5 - 2.0
  imageScale: number; // 0.5 - 2.0 (New: Scale of slide images in intro)
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number; // 1-10 (scale factor)
  color: string;
  backgroundColor: string;
  backgroundOpacity: number; // 0-1
  alignment: 'left' | 'center' | 'right';
  position: 'top' | 'center' | 'bottom';
  boxStyle: 'none' | 'rounded' | 'full-width';
}

export interface Slide {
  id: string;
  file: File;
  text: string;
}

export interface UserInput {
  slides: Slide[];
  audio: File | null;
  transition: TransitionType;
  
  // Resolution & Quality
  aspectRatio: AspectRatio;
  customWidth: number;
  customHeight: number;
  fps: number; // New: Frames per second
  
  slideDuration: number;
  enableZoom: boolean; 
  zoomTextWithFrame: boolean; // New setting to decouple text zoom from frame zoom
  logo: File | null;
  
  // Style
  frameStyle: FrameStyle;
  backgroundType: BackgroundType;
  backgroundColor: string;
  backgroundImage: File | null;
  
  // Intro
  intro: IntroSettings;
  
  // Text
  textAnimation: TextAnimationType;
  textStyle: TextStyle;
}

export interface VideoGenerationConfig {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
}