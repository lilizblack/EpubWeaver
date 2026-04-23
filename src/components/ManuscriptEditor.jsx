import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Image } from '@tiptap/extension-image';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Heading } from '@tiptap/extension-heading';
import { FontFamily } from '@tiptap/extension-font-family';
import { 
  FontSize, 
  LineHeight, 
  Indent, 
  ParagraphSpacing 
} from '../extensions/CustomExtensions';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify, 
  Heading1, 
  Heading2, 
  Quote, 
  Image as ImageIcon,
  Settings,
  Type,
  Plus,
  Minus,
  ArrowRightFromLine
} from 'lucide-react';

const ManuscriptEditor = ({ content, onChange, onUpdateTOC, style, setStyle }) => {
  const [showTypography, setShowTypography] = React.useState(false);
  const [, setSelectionUpdate] = React.useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Underline,
      TextStyle,
      Color,
      Highlight,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
      }),
      FontFamily,
      FontSize,
      LineHeight,
      Indent,
      ParagraphSpacing,
    ],
    content: content,
    onSelectionUpdate: ({ editor }) => {
      setSelectionUpdate(prev => prev + 1);
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      const headers = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          headers.push({
            level: node.attrs.level,
            text: node.textContent,
          });
        }
      });
      onUpdateTOC(headers);
    },
  });

  if (!editor) {
    return <div className="p-8 glass text-center">Loading Editor...</div>;
  }

  const addImage = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="manuscript-editor-container">
      <div className="editor-toolbar glass mb-4">
        <div className="toolbar-group">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className={editor.isActive('bold') ? 'active' : ''}
          >
            <Bold size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className={editor.isActive('italic') ? 'active' : ''}
          >
            <Italic size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            className={editor.isActive('underline') ? 'active' : ''}
          >
            <UnderlineIcon size={18} />
          </button>
        </div>

        <div className="divider" />

        <div className="toolbar-group">
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
          >
            <Heading1 size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
          >
            <Heading2 size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            className={editor.isActive('blockquote') ? 'active' : ''}
          >
            <Quote size={18} />
          </button>
        </div>
        
        <div className="divider" />
        
        <div className="toolbar-group">
          <button 
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''}
          >
            <AlignLeft size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''}
          >
            <AlignCenter size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''}
          >
            <AlignRight size={18} />
          </button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
            className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}
          >
            <AlignJustify size={18} />
          </button>
           <button 
             onClick={() => editor.chain().focus().setIndent(1.0).run()}
             className={editor.getAttributes('paragraph').indent === 1.0 ? 'active' : ''}
             title="Apply First Line Indent (1.0em)"
           >
             <ArrowRightFromLine size={18} />
           </button>
           <button 
             onClick={() => editor.chain().focus().setHorizontalRule().run()}
             title="Scene Divider"
           >
             <Minus size={18} />
           </button>
        </div>

        <div className="divider" />
        
        <div className="toolbar-group">
          <button onClick={addImage} title="Add Image">
            <ImageIcon size={18} />
          </button>
        </div>

        <div className="divider" />
        
        <div className="toolbar-group">
          <button 
            onClick={() => setShowTypography(!showTypography)} 
            className={showTypography ? 'active' : ''}
            title="Typography & Formatting"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="editor-main-layout flex-1 flex overflow-hidden">
        <div className="editor-workspace-scroll flex-1 overflow-y-auto relative p-8 flex flex-col items-center">
          {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bubble-menu glass p-1 rounded-lg flex gap-1">
              <button 
                onClick={() => editor.chain().focus().toggleBold().run()} 
                className={editor.isActive('bold') ? 'active bg-accent/20 text-accent' : 'hover:bg-white/10'}
              >
                <Bold size={16} />
              </button>
              <button 
                onClick={() => editor.chain().focus().toggleItalic().run()} 
                className={editor.isActive('italic') ? 'active bg-accent/20 text-accent' : 'hover:bg-white/10'}
              >
                <Italic size={16} />
              </button>
              <button 
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                className={editor.isActive('heading', { level: 2 }) ? 'active bg-accent/20 text-accent' : 'hover:bg-white/10'}
              >
                <Heading2 size={16} />
              </button>
              <button 
                onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
                className={editor.isActive({ textAlign: 'justify' }) ? 'active bg-accent/20 text-accent' : 'hover:bg-white/10'}
              >
                <AlignJustify size={16} />
              </button>
            </BubbleMenu>
          )}

          <div className="editor-parchment parchment relative w-full max-w-[850px] min-h-full p-16 shadow-2xl">
            <EditorContent editor={editor} />
          </div>
        </div>

        {showTypography && (
          <div className="typography-panel glass w-72 p-6 overflow-y-auto animate-fade-in border-l border-white/5">
            <h3 className="gold-text text-sm uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <Type size={16} /> Typography
            </h3>
            
            <div className="space-y-6">
              <div className="control-group">
                <label className="text-[10px] uppercase tracking-tighter text-secondary mb-2 block">
                  Font Size ({editor?.getAttributes('textStyle').fontSize || 16}px)
                </label>
                <input 
                  type="range" min="12" max="32" 
                  value={editor?.getAttributes('textStyle').fontSize || 16}
                  onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}
                  className="w-full accent-gold"
                />
              </div>

              <div className="control-group">
                <label className="text-[10px] uppercase tracking-tighter text-secondary mb-2 block">
                  Line Height ({editor?.getAttributes('paragraph').lineHeight || 1.6})
                </label>
                <input 
                  type="range" min="1" max="2.5" step="0.1"
                  value={editor?.getAttributes('paragraph').lineHeight ?? editor?.getAttributes('heading').lineHeight ?? 1.6}
                  onChange={e => editor.chain().focus().setLineHeight(e.target.value).run()}
                  className="w-full accent-gold"
                />
              </div>

              <div className="control-group">
                <label className="text-[10px] uppercase tracking-tighter text-secondary mb-2 block">
                  Paragraph Spacing ({editor?.getAttributes('paragraph').spacing || 20}px)
                </label>
                <input 
                  type="range" min="0" max="60" step="5"
                  value={editor?.getAttributes('paragraph').spacing || 20}
                  onChange={e => editor.chain().focus().setParagraphSpacing(e.target.value).run()}
                  className="w-full accent-gold"
                />
              </div>

              <div className="control-group">
                <label className="text-xs font-medium text-slate-400 block mb-2">
                  First Line Indent ({editor?.getAttributes('paragraph').indent || 1.0}em)
                </label>
                <input 
                  type="range" min="0" max="4" step="0.1"
                  value={editor?.getAttributes('paragraph').indent ?? 1.0}
                  onChange={e => editor.chain().focus().setIndent(parseFloat(e.target.value)).run()}
                  className="w-full accent-gold"
                />
              </div>

              <div className="control-group">
                <label className="text-[10px] uppercase tracking-tighter text-secondary mb-2 block">Font Family</label>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-accent"
                  onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
                  value={editor?.getAttributes('textStyle').fontFamily || ''}
                >
                  <option value="">Default (Lora)</option>
                  <option value="'Inter', sans-serif">Inter</option>
                  <option value="'Playfair Display', serif">Playfair Display</option>
                  <option value="'Merriweather', serif">Merriweather</option>
                  <option value="'Roboto Mono', monospace">Roboto Mono</option>
                  <option value="'Montserrat', sans-serif">Montserrat</option>
                </select>
              </div>

              <div className="control-group">
                <label className="text-[10px] uppercase tracking-tighter text-secondary mb-2 block">Text Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color"
                    onChange={e => editor.chain().focus().setColor(e.target.value).run()}
                    value={editor?.getAttributes('textStyle').color || '#1a1a1a'}
                    className="flex-1 h-10 bg-transparent border-none cursor-pointer p-0"
                  />
                  <button 
                    onClick={() => editor.chain().focus().unsetColor().run()}
                    className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-tighter text-secondary mb-4">Text Styles</p>
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
                    title="Bold"
                  >
                    <Bold size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
                    title="Italic"
                  >
                    <Italic size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-2 rounded ${editor?.isActive('underline') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
                    title="Underline"
                  >
                    <UnderlineIcon size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={`p-2 rounded ${editor?.isActive('highlight') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
                    title="Highlight"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .manuscript-editor-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .editor-main-layout {
          position: relative;
        }

        .typography-panel {
          height: 100%;
          background: rgba(10,10,10,0.8);
          backdrop-filter: blur(20px);
          z-index: 10;
        }

        .accent-gold {
          accent-color: var(--accent-color);
        }

        .parchment {
          background: #f4f1ea;
          color: #1a1a1a;
          max-width: 850px;
          margin: 0 auto;
          min-height: 100%;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2), inset 0 0 100px rgba(0,0,0,0.05);
          border-radius: 4px;
        }
        
        .ProseMirror {
          outline: none;
          min-height: 100%;
          padding: 80px 100px;
          font-family: 'Lora', serif;
          cursor: text;
        }

        .bubble-menu {
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 4px;
          border-radius: 8px;
          display: flex;
          gap: 4px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .bubble-menu button {
          background: transparent;
          border: none;
          color: white;
          padding: 4px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bubble-menu button:hover {
          background: rgba(255,255,255,0.1);
        }

        .bubble-menu button.active {
          color: var(--accent-color);
          background: var(--accent-glow);
        }

        .ProseMirror h1 {
          font-family: ${style?.fontFamily || 'serif'};
          font-size: 3em;
          text-align: center;
          margin-bottom: 1.5em;
          color: var(--header-color);
        }

        .ProseMirror h2 {
          font-family: ${style?.fontFamily || 'serif'};
          font-size: 2em;
          margin-top: 2em;
          margin-bottom: 1em;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding-bottom: 0.5em;
          color: var(--header-color);
        }

        .ProseMirror p {
          margin-bottom: 20px;
          line-height: 1.6;
          font-size: 16px;
        }

        .ProseMirror blockquote {
          border-left: 4px solid var(--header-color);
          padding-left: 20px;
          font-style: italic;
          color: #444;
          margin: 2em 0;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 20px auto;
          display: block;
          transition: all 0.3s;
          cursor: pointer;
        }

        .editor-toolbar {
          display: flex;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 12px;
          align-items: center;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
        }

        .toolbar-group {
          display: flex;
          gap: 4px;
        }

        .divider {
          width: 1px;
          height: 24px;
          background: var(--border-color);
        }

        .editor-toolbar button {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .editor-toolbar button:hover {
          background: var(--glass-border);
          color: var(--text-primary);
        }

        .editor-toolbar button.active {
          background: var(--accent-glow);
          color: var(--accent-color);
          border-color: var(--accent-color);
        }
      `}</style>
    </div>
  );
};

export default ManuscriptEditor;
