import React from 'react';
import CropModal from './CropModal';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { ResizableImage } from '../extensions/CustomExtensions';
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
  Heading3, 
  Quote, 
  Image as ImageIcon,
  Settings,
  Type,
  Plus,
  Minus,
  ArrowRightFromLine,
  ChevronUp,
  Scaling,
  Crop,
  Layout
} from 'lucide-react';

const ManuscriptEditor = ({ content, onChange, onUpdateTOC, style, setStyle }) => {
  const [showTypography, setShowTypography] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState(null);
  const [cropModal, setCropModal] = React.useState(null); // { src }
  const [, setSelectionUpdate] = React.useState(0);
  const containerRef = React.useRef(null);
  const toolbarRef = React.useRef(null);
  const scrollerRef = React.useRef(null);
  const imagePosRef = React.useRef(null); // ProseMirror position of selected image

  // Force explicit pixel height on the scroller so overflow-y:auto works
  React.useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current || !toolbarRef.current || !scrollerRef.current) return;
      const containerH = containerRef.current.getBoundingClientRect().height;
      const toolbarH = toolbarRef.current.getBoundingClientRect().height;
      const newH = containerH - toolbarH;
      if (newH > 0) scrollerRef.current.style.height = `${newH}px`;
    };

    updateHeight();
    // Small delay on first run to ensure layout is complete
    const t = setTimeout(updateHeight, 50);
    const ro = new ResizeObserver(updateHeight);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [showTypography]);

  // Auto-scroll the canvas when dragging a text selection near the edges
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let animFrameId = null;
    let mouseY = 0;
    let isDragging = false;
    const EDGE_ZONE = 80; // px from edge to trigger scroll
    const MAX_SPEED = 12; // max px per frame

    const autoScroll = () => {
      if (!isDragging) return;
      const rect = scroller.getBoundingClientRect();
      const distFromTop = mouseY - rect.top;
      const distFromBottom = rect.bottom - mouseY;

      if (distFromTop < EDGE_ZONE && distFromTop > 0) {
        const speed = ((EDGE_ZONE - distFromTop) / EDGE_ZONE) * MAX_SPEED;
        scroller.scrollTop -= speed;
      } else if (distFromBottom < EDGE_ZONE && distFromBottom > 0) {
        const speed = ((EDGE_ZONE - distFromBottom) / EDGE_ZONE) * MAX_SPEED;
        scroller.scrollTop += speed;
      }
      animFrameId = requestAnimationFrame(autoScroll);
    };

    const onMouseMove = (e) => { mouseY = e.clientY; };
    const onMouseDown = () => {
      isDragging = true;
      animFrameId = requestAnimationFrame(autoScroll);
    };
    const onMouseUp = () => {
      isDragging = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };

    scroller.addEventListener('mousemove', onMouseMove);
    scroller.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      scroller.removeEventListener('mousemove', onMouseMove);
      scroller.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, []);

  // Show/hide the Back to Top button based on scroll position
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => setShowBackToTop(scroller.scrollTop > 300);
    scroller.addEventListener('scroll', onScroll);
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  const extensions = React.useMemo(() => [
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
    ResizableImage.configure({
      inline: true,
      allowBase64: true,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph', 'image'],
      defaultAlignment: 'justify',
    }),
    FontFamily,
    FontSize,
    LineHeight,
    Indent,
    ParagraphSpacing,
  ], []);

  const updateTimeoutRef = React.useRef(null);

  const editor = useEditor({
    extensions,
    content: content,
    onSelectionUpdate: ({ editor }) => {
      setSelectionUpdate(prev => prev + 1);
      // Detect if the cursor is on an image node
      const { selection } = editor.state;
      const node = selection.node;
      if (node && node.type.name === 'image') {
        const rawWidth = node.attrs.width;
        const pct = rawWidth ? parseInt(rawWidth) : 100;
        imagePosRef.current = selection.from; // save position for callback
        setSelectedImage({ width: isNaN(pct) ? 100 : pct });
      } else {
        setSelectedImage(null);
      }
    },
    onUpdate: ({ editor }) => {
      // Debounce to prevent massive re-renders of the whole book on every key
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        const html = editor.getHTML();
        onChange(html);
        
        const headers = [];
        editor.state.doc.descendants((node) => {
          if (node.type.name === 'heading' && node.attrs.level !== 3) {
            headers.push({
              level: node.attrs.level,
              text: node.textContent,
            });
          }
        });
        onUpdateTOC(headers);
      }, 500);
    },
    parseOptions: {
      preserveWhitespace: 'full',
    },
  });

  React.useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, []);

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
    <div ref={containerRef} className="manuscript-editor-container relative">
      {/* 1. STICKY TOPBAR */}
      <div ref={toolbarRef} className="editor-top-nav glass sticky top-0 z-[60] p-3 border-b border-white/5 flex items-center justify-between shadow-2xl shrink-0">
        <div className="flex items-center gap-4 mx-auto min-w-0">
          <div className="editor-toolbar flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
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
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
                className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
                title="Heading 3 (25px) — not included in TOC"
              >
                <Heading3 size={18} />
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
        </div>
      </div>

      <div className="editor-layout-main flex-1 flex min-h-0 bg-[#080808]" style={{ overflow: 'hidden' }}>
        {/* 2. SCROLLABLE WRITING CANVAS */}
        <div ref={scrollerRef} className="editor-scroller" style={{ overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', position: 'relative' }}>

          {/* BACK TO TOP BUTTON */}
          <button
            className={`back-to-top-btn${showBackToTop ? ' visible' : ''}`}
            onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Back to top"
            aria-label="Scroll back to top"
          >
            <ChevronUp size={18} />
            <span>Top</span>
          </button>
          <div className="parchment-container py-12 px-4 md:px-12 flex justify-center">
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

            <div className="editor-parchment parchment relative w-full max-w-[850px] min-h-[1100px] shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
              {/* IMAGE TRANSFORM PANEL */}
              {selectedImage && (
                <div className="img-transform-panel">
                  <div className="img-transform-header">
                    <Scaling size={14} />
                    <span>Image Scale</span>
                    <span className="img-transform-value">{selectedImage.width}%</span>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={selectedImage.width}
                    onChange={e => {
                      const w = parseInt(e.target.value);
                      setSelectedImage(s => ({ ...s, width: w }));
                      editor.chain().focus().updateAttributes('image', { width: `${w}%` }).run();
                    }}
                    className="img-scale-slider"
                  />

                  <div className="img-presets">
                    {[25, 50, 75, 100].map(p => (
                      <button
                        key={p}
                        className={`img-preset-btn${selectedImage.width === p ? ' active' : ''}`}
                        onClick={() => {
                          setSelectedImage(s => ({ ...s, width: p }));
                          editor.chain().focus().updateAttributes('image', { width: `${p}%` }).run();
                        }}
                      >
                        {p}%
                      </button>
                    ))}
                    <button
                      className={`img-preset-btn${selectedImage.width >= 100 ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedImage(s => ({ ...s, width: 100 }));
                        editor.chain().focus().updateAttributes('image', { width: '100%' }).run();
                      }}
                    >
                      Full
                    </button>
                  </div>

                  {/* Layout Presets (Square/Wrap) */}
                  <div className="img-transform-divider" />
                  <div className="img-transform-header">
                    <Layout size={14} />
                    <span>Wrapping</span>
                  </div>
                  <div className="img-presets">
                    <button 
                      className={`img-preset-btn${editor.getAttributes('image').display === 'inline-block' && editor.getAttributes('image').float === 'none' ? ' active' : ''}`}
                      onClick={() => editor.chain().focus().updateAttributes('image', { float: 'none', display: 'inline-block' }).run()}
                      title="In line with text"
                    >
                      In Line
                    </button>
                    <button 
                      className={`img-preset-btn${editor.getAttributes('image').float === 'left' ? ' active' : ''}`}
                      onClick={() => editor.chain().focus().updateAttributes('image', { float: 'left', display: 'inline-block' }).run()}
                      title="Text wraps around image (Left)"
                    >
                      Square Left
                    </button>
                    <button 
                      className={`img-preset-btn${editor.getAttributes('image').display === 'block' ? ' active' : ''}`}
                      onClick={() => editor.chain().focus().updateAttributes('image', { float: 'none', display: 'block' }).run()}
                      title="Centered on its own line"
                    >
                      Centered
                    </button>
                    <button 
                      className={`img-preset-btn${editor.getAttributes('image').float === 'right' ? ' active' : ''}`}
                      onClick={() => editor.chain().focus().updateAttributes('image', { float: 'right', display: 'inline-block' }).run()}
                      title="Text wraps around image (Right)"
                    >
                      Square Right
                    </button>
                  </div>

                  {/* Crop button */}
                  <div className="img-transform-divider" />
                  <button
                    className="img-crop-btn"
                    title="Open crop tool"
                    onClick={() => {
                      const pos = imagePosRef.current;
                      if (pos === null) return;
                      const node = editor.state.doc.nodeAt(pos);
                      if (node) setCropModal({ src: node.attrs.src });
                    }}
                  >
                    <Crop size={14} />
                    <span>Crop</span>
                  </button>
                </div>
              )}

              {/* CROP MODAL */}
              {cropModal && (
                <CropModal
                  src={cropModal.src}
                  onClose={() => setCropModal(null)}
                  onApply={(newSrc) => {
                    const pos = imagePosRef.current;
                    if (pos !== null) {
                      editor.chain().focus().command(({ tr, state }) => {
                        const node = state.doc.nodeAt(pos);
                        if (node && node.type.name === 'image') {
                          tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newSrc, width: null });
                          return true;
                        }
                        return false;
                      }).run();
                    }
                    setCropModal(null);
                  }}
                />
              )}
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* 3. SIDE TYPOGRAPHY PANEL */}
        {showTypography && (
          <div className="typography-panel glass w-72 p-6 overflow-y-auto animate-slide-in border-l border-white/5 shrink-0 bg-[#0a0a0a]">
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
                  Line Height ({editor?.getAttributes('paragraph').lineHeight || 1.2})
                </label>
                <input 
                  type="range" min="1" max="2.5" step="0.1"
                  value={editor?.getAttributes('paragraph').lineHeight ?? editor?.getAttributes('heading').lineHeight ?? 1.2}
                  onChange={e => editor.chain().focus().setLineHeight(e.target.value).run()}
                  className="w-full accent-gold"
                />
              </div>

              <div className="control-group">
                <label className="text-[10px] uppercase tracking-tighter text-secondary mb-2 block">
                  Paragraph Spacing ({editor?.getAttributes('paragraph').spacing || 3}px)
                </label>
                <input 
                  type="range" min="0" max="60" step="1"
                  value={editor?.getAttributes('paragraph').spacing || 3}
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
                <p className="text-[10px] uppercase tracking-tighter text-secondary mb-4">Quick Styles</p>
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
                  >
                    <Bold size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
                  >
                    <Italic size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-2 rounded ${editor?.isActive('underline') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
                  >
                    <UnderlineIcon size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={`p-2 rounded ${editor?.isActive('highlight') ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 border border-white/5'}`}
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
          --header-color: ${style?.chapterColor || '#d4af37'};
        }

        /* ── Back to Top ─────────────────────────────── */
        .back-to-top-btn {
          position: sticky;
          top: calc(100% - 100px);
          float: right;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 10px 12px;
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-secondary, #888);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          z-index: 50;
          opacity: 0;
          pointer-events: none;
          transform: translateY(8px);
          transition: opacity 0.25s ease, transform 0.25s ease, border-color 0.2s ease, color 0.2s ease;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }

        .back-to-top-btn.visible {
          opacity: 1;
          pointer-events: all;
          transform: translateY(0);
        }

        .back-to-top-btn:hover {
          border-color: var(--accent-color, #c9a84c);
          color: var(--accent-color, #c9a84c);
          background: rgba(201, 168, 76, 0.08);
          box-shadow: 0 4px 24px rgba(201, 168, 76, 0.15);
        }

        .editor-main-layout {
          position: relative;
        }

        /* ── Image Transform Panel ─────────────────────────── */
        .img-transform-panel {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(244, 241, 234, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding: 10px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: sans-serif;
        }

        .img-transform-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #555;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .img-transform-value {
          color: var(--accent-color, #c9a84c);
          font-weight: 700;
          min-width: 36px;
        }

        .img-scale-slider {
          flex: 1;
          accent-color: var(--accent-color, #c9a84c);
          height: 4px;
          cursor: pointer;
        }

        .img-presets {
          display: flex;
          gap: 4px;
        }

        .img-preset-btn {
          background: rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 600;
          color: #555;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: sans-serif;
        }

        .img-preset-btn:hover {
          background: rgba(201,168,76,0.15);
          border-color: var(--accent-color, #c9a84c);
          color: #8a6a1a;
        }

        .img-preset-btn.active {
          background: var(--accent-color, #c9a84c);
          border-color: var(--accent-color, #c9a84c);
          color: #fff;
        }

        .img-transform-divider {
          width: 1px;
          height: 24px;
          background: rgba(0,0,0,0.15);
          flex-shrink: 0;
        }

        .img-crop-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #444;
          cursor: pointer;
          font-family: sans-serif;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .img-crop-btn:hover {
          background: rgba(201,168,76,0.15);
          border-color: var(--accent-color, #c9a84c);
          color: #7a5a0a;
        }

        /* ── Crop Modal ──────────────────────────────────── */
        .crop-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0,0,0,0.82);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crop-modal-box {
          background: #141414;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          width: min(90vw, 900px);
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7);
        }

        .crop-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          color: #eee;
          font-size: 14px;
          font-weight: 600;
          font-family: sans-serif;
        }

        .crop-close-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.15s;
          display: flex;
        }
        .crop-close-btn:hover { background: rgba(255,255,255,0.08); color: #ccc; }

        .crop-ratios {
          display: flex;
          gap: 6px;
          padding: 10px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }

        .crop-ratio-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #aaa;
          cursor: pointer;
          font-family: sans-serif;
          transition: all 0.15s;
        }
        .crop-ratio-btn:hover {
          background: rgba(201,168,76,0.15);
          border-color: var(--accent-color, #c9a84c);
          color: var(--accent-color, #c9a84c);
        }

        .crop-canvas-area {
          flex: 1;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #0a0a0a;
          min-height: 0;
        }

        .crop-img-wrapper {
          position: relative;
          display: inline-block;
          max-width: 100%;
          max-height: 60vh;
          user-select: none;
        }

        .crop-base-img {
          display: block;
          max-width: 100%;
          max-height: 60vh;
          pointer-events: none;
          border-radius: 2px;
        }

        .crop-shade {
          position: absolute;
          background: rgba(0,0,0,0.55);
          pointer-events: none;
        }

        .crop-box {
          position: absolute;
          border: 2px solid rgba(255,255,255,0.9);
          box-sizing: border-box;
        }

        .crop-thirds-h, .crop-thirds-v {
          position: absolute;
          background: rgba(255,255,255,0.25);
          pointer-events: none;
        }
        .crop-thirds-h { left:0; right:0; height:1px; }
        .crop-thirds-v { top:0; bottom:0; width:1px; }

        .crop-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #fff;
          border: 2px solid rgba(0,0,0,0.3);
          border-radius: 2px;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        .crop-handle-nw { top:0;   left:0;   }
        .crop-handle-n  { top:0;   left:50%; }
        .crop-handle-ne { top:0;   left:100%;}
        .crop-handle-w  { top:50%; left:0;   }
        .crop-handle-e  { top:50%; left:100%;}
        .crop-handle-sw { top:100%;left:0;   }
        .crop-handle-s  { top:100%;left:50%; }
        .crop-handle-se { top:100%;left:100%;}

        .crop-dims-hint {
          position: absolute;
          bottom: -26px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          font-family: monospace;
          white-space: nowrap;
          pointer-events: none;
        }

        .crop-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid rgba(255,255,255,0.07);
          gap: 10px;
          font-family: sans-serif;
        }

        .crop-btn-reset {
          display: flex; align-items: center; gap: 6px;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12px;
          color: #888;
          cursor: pointer;
          transition: all 0.15s;
        }
        .crop-btn-reset:hover { border-color: #aaa; color: #ccc; }

        .crop-btn-cancel {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #aaa;
          cursor: pointer;
          transition: all 0.15s;
        }
        .crop-btn-cancel:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .crop-btn-apply {
          display: flex; align-items: center; gap: 7px;
          background: var(--accent-color, #c9a84c);
          border: none;
          border-radius: 8px;
          padding: 9px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #1a1000;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 15px rgba(201,168,76,0.3);
        }
        .crop-btn-apply:hover {
          background: #d4b85a;
          box-shadow: 0 4px 20px rgba(201,168,76,0.5);
        }

        .crop-error-banner {
          background: rgba(220, 80, 60, 0.12);
          border-bottom: 1px solid rgba(220, 80, 60, 0.25);
          color: #f08070;
          font-size: 12px;
          font-family: sans-serif;
          padding: 10px 20px;
          line-height: 1.5;
        }

        .crop-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #555;
          font-family: sans-serif;
          font-size: 13px;
        }

        .crop-spinner {
          animation: crop-spin 1s linear infinite;
          color: var(--accent-color, #c9a84c);
        }

        @keyframes crop-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .typography-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 300px;
          background: #0a0a0a;
          border-left: 1px solid var(--border-color);
          z-index: 100;
          box-shadow: -10px 0 30px rgba(0,0,0,0.5);
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

        .ProseMirror h3 {
          font-family: ${style?.fontFamily || 'serif'};
          font-size: 25px;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          color: var(--header-color);
        }

        .ProseMirror p {
          margin-bottom: 6px;
          line-height: 1.2;
          font-size: 16px;
        }

        .ProseMirror blockquote {
          border-left: 4px solid var(--header-color);
          padding-left: 20px;
          font-style: italic;
          color: #444;
          margin: 2em 0;
        }

        .ProseMirror hr {
          border: none;
          border-top: 2px solid var(--header-color);
          width: 30%;
          margin: 3em auto;
          opacity: 0.4;
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
          padding: 8px 24px;
          border-radius: 12px;
          align-items: center;
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: fit-content;
          margin-bottom: 2rem;
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
