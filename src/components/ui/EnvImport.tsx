'use client';

import React, { useState, useRef } from 'react';
import { FileText, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnvImportProps {
  onSave: (content: string) => Promise<void>;
  className?: string;
}

/**
 * EnvImport Component
 * 
 * A production-grade component for importing .env files or pasting their contents.
 * Adheres to the Laugh Lab V2 design system and architectural rules.
 */
export function EnvImport({ onSave, className }: EnvImportProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!content.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 bg-ink-900/50 border border-ink-800 rounded-xl shadow-sm",
      className
    )}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".env,text/plain"
      />

      {/* Import Button */}
      <button
        type="button"
        onClick={handleImportClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-ink-800 hover:bg-ink-700 text-ink-100 text-sm font-medium rounded-lg transition-colors border border-ink-700"
      >
        <FileText className="w-4 h-4" />
        Import .env
      </button>

      {/* Input Field */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="or paste the .env contents above"
          className="w-full bg-transparent border-none focus:ring-0 text-ink-300 placeholder:text-ink-500 text-sm py-1.5"
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!content.trim() || isSaving}
        className={cn(
          "flex items-center gap-2 px-4 py-1.5 bg-ink-100 hover:bg-white text-ink-950 text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          isSaving && "pl-3"
        )}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Save
      </button>
    </div>
  );
}
