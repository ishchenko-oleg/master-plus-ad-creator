import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Music as MusicIcon, X, Layers } from 'lucide-react';

interface MediaInputProps {
  label: string;
  type: 'image' | 'audio';
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
}

export const MediaInput: React.FC<MediaInputProps> = ({ label, type, files, onFilesChange, accept, multiple = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBoxClick = () => {
    inputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilesChange([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
        onFilesChange([...files, ...Array.from(e.target.files)]);
      } else {
        onFilesChange([e.target.files[0]]);
      }
    }
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-brand-100 uppercase tracking-wider flex justify-between">
        <span>{label}</span>
        {files.length > 0 && <span className="text-brand-600 dark:text-brand-400 text-xs">{files.length} файлів</span>}
      </label>
      
      <div 
        onClick={handleBoxClick}
        className={`
          relative border-2 border-dashed rounded-xl min-h-[128px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 p-4
          ${files.length > 0
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/30' 
            : 'border-gray-300 dark:border-gray-700 hover:border-brand-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
          }
        `}
      >
        <input 
          type="file" 
          ref={inputRef}
          className="hidden" 
          accept={accept}
          onChange={handleChange}
          multiple={multiple}
        />

        {files.length > 0 ? (
          <div className="w-full">
             {type === 'image' ? (
                <div className="grid grid-cols-3 gap-2 w-full">
                    {files.slice(0, 5).map((f, i) => (
                        <div key={i} className="relative aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 group">
                            <img src={URL.createObjectURL(f)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="preview" />
                            <button 
                                onClick={(e) => removeFile(i, e)}
                                className="absolute top-1 right-1 bg-white/80 dark:bg-black/50 text-gray-800 dark:text-white rounded-full p-0.5 hover:bg-red-500 hover:text-white"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {files.length > 5 && (
                        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                            +{files.length - 5}
                        </div>
                    )}
                </div>
             ) : (
                <div className="flex flex-col items-center z-10 p-2 text-center w-full">
                    <MusicIcon className="w-8 h-8 text-brand-600 dark:text-brand-400 mb-2" />
                    <span className="text-sm text-gray-800 dark:text-white font-medium truncate max-w-[90%]">{files[0].name}</span>
                </div>
             )}
             
             <div className="mt-4 flex justify-center">
                 <button 
                  onClick={handleClear}
                  className="px-3 py-1 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 text-xs rounded-full transition-colors"
                >
                  Очистити все
                </button>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
            {type === 'image' ? <Layers className="w-8 h-8 mb-2" /> : <Upload className="w-8 h-8 mb-2" />}
            <span className="text-xs text-center">
               {multiple ? "Натисніть щоб обрати фото (можна декілька)" : "Натисніть щоб обрати файл"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};