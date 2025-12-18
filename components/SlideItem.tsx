import React, { useRef } from 'react';
import { X, Image as ImageIcon, Upload } from 'lucide-react';
import { Slide } from '../types';

interface SlideItemProps {
  slide: Slide;
  index: number;
  onUpdate: (id: string, updates: Partial<Slide>) => void;
  onRemove: (id: string) => void;
}

export const SlideItem: React.FC<SlideItemProps> = ({ slide, index, onUpdate, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpdate(slide.id, { file: e.target.files[0] });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-4 items-start group hover:border-brand-500/50 transition-colors relative shadow-sm dark:shadow-none">
      {/* Remove Button */}
      <button 
        onClick={() => onRemove(slide.id)}
        className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 border border-gray-200 dark:border-gray-700 hover:border-red-400 rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Number Badge */}
      <div className="absolute top-4 left-4 bg-brand-600 text-white text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center shadow-lg pointer-events-none">
        {index + 1}
      </div>

      {/* Image Preview / Upload */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="w-32 h-32 shrink-0 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 overflow-hidden relative"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
        />
        {slide.file ? (
          <img 
            src={URL.createObjectURL(slide.file)} 
            alt={`Slide ${index + 1}`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase">Фото</span>
          </div>
        )}
      </div>

      {/* Text Input */}
      <div className="flex-1">
        <label className="text-xs text-gray-600 dark:text-brand-200 font-medium mb-1 block">Опис до фото</label>
        <textarea
          value={slide.text}
          onChange={(e) => onUpdate(slide.id, { text: e.target.value })}
          placeholder="Що відбувається на цьому фото?"
          className="w-full h-32 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-500 focus:border-transparent outline-none resize-none placeholder:text-gray-400 text-gray-800 dark:text-white"
        />
      </div>
    </div>
  );
};