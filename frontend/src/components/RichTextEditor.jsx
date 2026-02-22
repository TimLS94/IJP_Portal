import { useState, useRef, useCallback } from 'react';
import { Bold, Italic, List, HelpCircle } from 'lucide-react';

/**
 * Einfacher Rich-Text-Editor mit Bold, Italic und Listen-Formatierung.
 * Speichert HTML-formatierte Inhalte, ist aber abwärtskompatibel mit Plain-Text.
 */
export default function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = '', 
  rows = 4,
  className = '',
  helpText = ''
}) {
  const editorRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);

  // Formatierung anwenden
  const applyFormat = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    // Änderung triggern
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Bold
  const handleBold = (e) => {
    e.preventDefault();
    applyFormat('bold');
  };

  // Italic
  const handleItalic = (e) => {
    e.preventDefault();
    applyFormat('italic');
  };

  // Unordered List
  const handleList = (e) => {
    e.preventDefault();
    applyFormat('insertUnorderedList');
  };

  // Input-Handler
  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Paste-Handler: Plain-Text einfügen, um Formatierung von außen zu verhindern
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        applyFormat('bold');
      } else if (e.key === 'i') {
        e.preventDefault();
        applyFormat('italic');
      }
    }
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-2 border-b-0 border-gray-200 rounded-t-xl">
        <button
          type="button"
          onClick={handleBold}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Fett (Strg+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Kursiv (Strg+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleList}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Aufzählung"
        >
          <List className="h-4 w-4" />
        </button>
        
        <div className="flex-1" />
        
        {/* Hilfe-Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-400"
            title="Hilfe"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          
          {showHelp && (
            <div className="absolute right-0 top-full mt-1 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10 text-sm">
              <p className="font-medium mb-2">Tastenkürzel:</p>
              <ul className="space-y-1 text-gray-600">
                <li><kbd className="px-1 bg-gray-100 rounded">Strg+B</kbd> Fett</li>
                <li><kbd className="px-1 bg-gray-100 rounded">Strg+I</kbd> Kursiv</li>
              </ul>
              <p className="mt-2 text-gray-500 text-xs">
                Markieren Sie Text und klicken Sie auf ein Format-Symbol.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-b-xl 
                   focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                   transition-all min-h-[100px] prose prose-sm max-w-none"
        style={{ minHeight: `${rows * 1.5}rem` }}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      {/* Hilfetext */}
      {helpText && (
        <p className="text-gray-500 text-xs mt-1">{helpText}</p>
      )}
      
      {/* CSS für Placeholder */}
      <style>{`
        .rich-text-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-text-editor [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .rich-text-editor [contenteditable] li {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}
