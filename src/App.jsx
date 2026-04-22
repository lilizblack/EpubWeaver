import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Settings, 
  Image as ImageIcon, 
  Download, 
  Plus, 
  Trash2,
  Layout,
  AlignLeft,
  Type,
  BookOpen,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ManuscriptEditor from './components/ManuscriptEditor';
import './App.css';

// --- Constants ---
const DEFAULT_STYLE = {
  fontSize: 16,
  lineHeight: 1.6,
  paragraphSpacing: 1.5,
  indent: 1.5,
  fontFamily: "'Lora', serif",
  chapterColor: "#d4af37",
  textColor: "#e0e0e0"
};

function App() {
  // --- State ---
  const [sections, setSections] = useState([
    { id: 'title-page', title: 'Title Page', type: 'front', html: '<h1>Title</h1>' },
    { id: 'copyright', title: 'Copyright', type: 'front', html: '<p>© 2026 Author Name. All rights reserved.</p>' },
    { id: 'dedication', title: 'Dedication', type: 'front', html: '<p style="text-align: center; margin-top: 20%; font-style: italic;">To someone special...</p>' },
    { id: 'chapter-1', title: 'Chapter 1', type: 'body', html: '<h2>Chapter One</h2><p>Start writing here...</p>' },
    { id: 'acknowledgements', title: 'Acknowledgements', type: 'back', html: '<h1>Acknowledgements</h1><p>I would like to thank...</p>' },
    { id: 'about-author', title: 'About Author', type: 'back', html: '<h1>About the Author</h1><p>Author biography here...</p>' }
  ]);
  const [activeSectionId, setActiveSectionId] = useState('chapter-1');
  const [tocEntries, setTocEntries] = useState([]); 
  const [metadata, setMetadata] = useState({
    title: 'Untitled Masterpiece',
    author: 'Anonymous',
    description: '',
    language: 'en',
    publisher: 'Self Published',
    coverArt: null
  });
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [activeTab, setActiveTab] = useState('upload');
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [imageSettings, setImageSettings] = useState({});
  const [editingTitleId, setEditingTitleId] = useState(null);

  // --- Refs ---
  const readerRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // --- Handlers ---
  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let html = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        html = result.value;
      } else {
        const text = await file.text();
        html = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
      }

      // naive split into one main chapter for now, or use splitIntoChapters helper
      const newChapters = splitIntoChapters(html);
      setSections([
        ...sections.filter(s => s.type === 'front'),
        ...newChapters.map((ch, i) => ({
          id: `body-${Date.now()}-${i}`,
          title: ch.title,
          type: 'body',
          html: ch.content
        })),
        ...sections.filter(s => s.type === 'back')
      ]);
      
      setActiveTab('styles');
      notify('Manuscript imported and structured!');
    } catch (err) {
      console.error(err);
      notify('Failed to import file.', 'error');
    }
  };

  const splitIntoChapters = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const chapters = [];
    let currentChapter = { id: 1, title: 'Chapter 1', content: '', images: [] };

    // This is a naive splitter. Real EPUB tools use H1/H2 tags.
    const children = Array.from(doc.body.children);
    
    if (children.length === 0) {
      return [{ id: 1, title: 'Manuscript', content: html, images: [] }];
    }

    children.forEach((child, index) => {
      if (child.tagName === 'H1' || child.tagName === 'H2') {
        if (currentChapter.content) {
          chapters.push({ ...currentChapter });
        }
        currentChapter = { 
          id: Date.now() + index, 
          title: child.innerText || `Chapter ${chapters.length + 1}`, 
          content: '', 
          images: [] 
        };
      } else {
        currentChapter.content += child.outerHTML;
      }
    });
    
    chapters.push(currentChapter);
    return chapters;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const doc = new DOMParser().parseFromString('<div></div>', 'text/html');
      
      const zip = new JSZip();
      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
      zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);

      const bookCss = `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap');
        body { font-family: 'Lora', serif; line-height: ${style.lineHeight}; color: #000; background: #fff; margin: 8%; }
        h1 { text-align: center; color: ${style.chapterColor}; margin-top: 2em; font-family: serif; font-size: 3em; }
        h2 { border-bottom: 2px solid ${style.chapterColor}; padding-bottom: 0.5em; margin-top: 2em; color: ${style.chapterColor}; font-family: serif; font-size: 2em; }
        p { margin-bottom: ${style.paragraphSpacing}em; text-indent: ${style.indent}em; text-align: justify; }
        blockquote { border-left: 4px solid ${style.chapterColor}; padding-left: 20px; font-style: italic; color: #444; margin: 1.5em 0; }
        img { max-width: 100%; height: auto; display: block; margin: 2em auto; }
      `;
      zip.file('OEBPS/style.css', bookCss);

      const chMeta = [];
      let imageIdx = 0;

      for (const section of sections) {
        const sectionDoc = new DOMParser().parseFromString(section.html, 'text/html');
        const images = Array.from(sectionDoc.querySelectorAll('img'));
        
        for (const img of images) {
          const src = img.getAttribute('src');
          if (src && (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http'))) {
            try {
              const res = await fetch(src);
              const blob = await res.blob();
              const ext = blob.type.split('/')[1] || 'jpg';
              const fileName = `img_${imageIdx++}.${ext}`;
              zip.file(`OEBPS/images/${fileName}`, blob);
              img.setAttribute('src', `images/${fileName}`);
            } catch (err) { console.warn('Image fetch failed'); }
          }
        }

        const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>${section.title}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <section epub:type="${section.type === 'front' ? 'frontmatter' : section.type === 'back' ? 'backmatter' : 'chapter'}">
        ${section.html}
    </section>
</body>
</html>`;
        const fileName = `${section.id}.xhtml`;
        zip.file(`OEBPS/${fileName}`, xhtml);
        chMeta.push({ id: section.id, fileName, title: section.title, type: section.type });
      }

      const tocListItems = chMeta.filter(c => c.id !== 'title-page' && c.id !== 'copyright' && c.id !== 'dedication');

      // EPUB 3 Navigation
      const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Table of Contents</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1 class="toc-title">Table of Contents</h1>
        <ol>
            ${tocListItems.map(c => `<li><a href="${c.fileName}">${c.title}</a></li>`).join('\n')}
        </ol>
    </nav>
</body>
</html>`;
      zip.file('OEBPS/nav.xhtml', nav);

      // Handle Cover Art
      if (metadata.coverArt) {
        try {
          const res = await fetch(metadata.coverArt);
          const blob = await res.blob();
          zip.file('OEBPS/images/cover.jpg', blob);
          const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title><style>body { margin: 0; padding: 0; text-align: center; background-color: #000; } img { max-width: 100%; max-height: 100%; }</style></head>
<body><img src="images/cover.jpg" alt="Cover"/></body>
</html>`;
          zip.file('OEBPS/cover.xhtml', coverXhtml);
        } catch (e) { console.warn('Cover export failed'); }
      }

      const manifestItems = [
        ...(metadata.coverArt ? ['<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>', '<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>'] : []),
        ...chMeta.map(c => `<item id="${c.id}" href="${c.fileName}" media-type="application/xhtml+xml"/>`),
        `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
        `<item id="css" href="style.css" media-type="text/css"/>`
      ].join('\n');

      // Insert TOC after all Front Matter
      const lastFrontIndex = chMeta.reduce((acc, c, idx) => c.type === 'front' ? idx : acc, -1);
      
      let finalSpineRefs = [];
      const baseRefs = chMeta.map(c => `<itemref idref="${c.id}"/>`);
      
      if (metadata.coverArt) {
        finalSpineRefs.push('<itemref idref="cover"/>');
      }

      if (lastFrontIndex !== -1) {
        finalSpineRefs.push(...baseRefs.slice(0, lastFrontIndex + 1));
        finalSpineRefs.push('<itemref idref="nav"/>');
        finalSpineRefs.push(...baseRefs.slice(lastFrontIndex + 1));
      } else {
        finalSpineRefs.push('<itemref idref="nav"/>');
        finalSpineRefs.push(...baseRefs);
      }
      
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="id">urn:uuid:${crypto.randomUUID()}</dc:identifier>
        <dc:title>${metadata.title}</dc:title>
        <dc:creator>${metadata.author}</dc:creator>
        <dc:language>${metadata.language}</dc:language>
        <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z')}</meta>
        ${metadata.coverArt ? '<meta name="cover" content="cover-image"/>' : ''}
    </metadata>
    <manifest>
        ${manifestItems}
    </manifest>
    <spine>
        ${finalSpineRefs.join('\n')}
    </spine>
</package>`;
      zip.file('OEBPS/content.opf', opf);

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${metadata.title.replaceAll(' ', '_')}.epub`);
      notify('EPUB Exported Successfully!');
    } catch (err) {
      console.error(err);
      notify('Export failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // --- Section Helpers ---
  const addSection = (type = 'body') => {
    const id = `section-${Date.now()}`;
    const newSection = {
      id,
      title: type === 'body' ? `Chapter ${sections.filter(s => s.type === 'body').length + 1}` : 'New Section',
      type,
      html: type === 'body' ? '<h2>New Chapter</h2><p>Start writing...</p>' : '<p>Content...</p>'
    };
    setSections([...sections, newSection]);
    setActiveSectionId(id);
    setActiveTab('styles'); // Go to editor
  };

  const updateSectionHtml = (html) => {
    setSections(sections.map(s => s.id === activeSectionId ? { ...s, html } : s));
  };

  const removeSection = (id) => {
    if (sections.length <= 1) return;
    const newSections = sections.filter(s => s.id !== id);
    setSections(newSections);
    if (activeSectionId === id) setActiveSectionId(newSections[0].id);
  };
  const renderSidebar = () => (
    <div className="sidebar glass">
      <div className="sidebar-header">
        <h2 className="gold-text">EpubWeaver</h2>
        <p>Manuscript to E-Book</p>
      </div>

        <nav className="sidebar-nav">
          {[
            { id: 'metadata', icon: <FileText size={20} />, label: 'Project Info' },
            { id: 'styles', icon: <BookOpen size={20} />, label: 'Manuscript' },
            { id: 'toc', icon: <Layout size={20} />, label: 'T.O.C.' },
            { id: 'preview', icon: <Monitor size={20} />, label: 'Preview' },
          ].map(item => (
            <button 
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeTab === item.id && <motion.div layoutId="nav-glow" className="nav-glow" />}
            </button>
          ))}
        </nav>

      {/* Section Manager in Sidebar */}
      {(activeTab === 'styles' || activeTab === 'toc' || activeTab === 'preview' || activeTab === 'upload') && (
        <div className="section-manager-sidebar border-t border-white/5 p-4 flex-1 overflow-y-auto">
          
          <div className="section-manager-header mb-6">
            <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 flex items-center gap-2">
              <UploadCloud size={10} /> Actions
            </h4>
            <button 
              className="btn-secondary w-full py-2 text-[11px] justify-center"
              onClick={() => setActiveTab('upload')}
            >
              <UploadCloud size={14} /> Import File
            </button>
          </div>
          {/* Front Matter Group */}
          <div className="section-group mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase tracking-widest text-blue-400/60 font-bold">Front Matter</h4>
              <button onClick={() => addSection('front')} className="p-1 hover:text-blue-400" title="Add Front Matter Section"><Plus size={12}/></button>
            </div>
            <div className="space-y-1">
              {sections.filter(s => s.type === 'front').map(s => (                <div 
                  key={s.id}
                  className={`section-pill glass-sm flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${activeSectionId === s.id ? 'active bg-gold/10 border-gold/20' : 'hover:bg-white/5 border-transparent'}`}
                  onClick={() => { setActiveTab('styles'); setActiveSectionId(s.id); }}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <Layout size={12} className="text-gold/50 flex-shrink-0" />
                    {editingSectionId === s.id ? (
                      <input 
                        autoFocus
                        className="text-[11px] bg-white/10 border-none outline-none w-full rounded px-1"
                        value={s.title}
                        onChange={(e) => {
                          const newSections = sections.map(sec => sec.id === s.id ? {...sec, title: e.target.value} : sec);
                          setSections(newSections);
                        }}
                        onBlur={() => setEditingSectionId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingSectionId(null)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-[11px] truncate">{s.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeSectionId === s.id && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingSectionId(s.id); }} 
                          className="hover:text-gold"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} 
                          className="hover:text-red-400"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

              ))}
            </div>
          </div>

          {/* Body Content Group */}
          <div className="section-group mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase tracking-widest text-accent/60 font-bold">Body Content</h4>
              <button onClick={() => addSection('body')} className="p-1 hover:text-accent" title="Add Chapter"><Plus size={12}/></button>
            </div>
            <div className="space-y-1">
              {sections.filter(s => s.type === 'body').map(s => (
                <div 
                  key={s.id}
                  className={`section-pill glass-sm flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${activeSectionId === s.id ? 'active bg-accent/10 border-accent/20' : 'hover:bg-white/5 border-transparent'}`}
                  onClick={() => { setActiveTab('styles'); setActiveSectionId(s.id); }}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <BookOpen size={12} className="text-accent/50 flex-shrink-0" />
                    {editingSectionId === s.id ? (
                      <input 
                        autoFocus
                        className="text-[11px] bg-white/10 border-none outline-none w-full rounded px-1"
                        value={s.title}
                        onChange={(e) => {
                          const newSections = sections.map(sec => sec.id === s.id ? {...sec, title: e.target.value} : sec);
                          setSections(newSections);
                        }}
                        onBlur={() => setEditingSectionId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingSectionId(null)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-[11px] truncate">{s.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeSectionId === s.id && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingSectionId(s.id); }} 
                          className="hover:text-accent"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} 
                          className="hover:text-red-400"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Back Matter Group */}
          <div className="section-group mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase tracking-widest text-purple-400/60 font-bold">Back Matter</h4>
              <button onClick={() => addSection('back')} className="p-1 hover:text-purple-400" title="Add Back Matter Section"><Plus size={12}/></button>
            </div>
            <div className="space-y-1">
              {sections.filter(s => s.type === 'back').map(s => (
                <div 
                  key={s.id}
                  className={`section-pill glass-sm flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${activeSectionId === s.id ? 'active bg-purple-400/10 border-purple-400/20' : 'hover:bg-white/5 border-transparent'}`}
                  onClick={() => { setActiveTab('styles'); setActiveSectionId(s.id); }}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <FileText size={12} className="text-purple-400/50 flex-shrink-0" />
                    {editingSectionId === s.id ? (
                      <input 
                        autoFocus
                        className="text-[11px] bg-white/10 border-none outline-none w-full rounded px-1"
                        value={s.title}
                        onChange={(e) => {
                          const newSections = sections.map(sec => sec.id === s.id ? {...sec, title: e.target.value} : sec);
                          setSections(newSections);
                        }}
                        onBlur={() => setEditingSectionId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingSectionId(null)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-[11px] truncate">{s.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeSectionId === s.id && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingSectionId(s.id); }} 
                          className="hover:text-purple-400"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} 
                          className="hover:text-red-400"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <button className="btn-primary w-full" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Processing...' : <><Download size={18} /> Download EPUB</>}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'upload':
        return (
          <div className="tab-pane center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="upload-zone glass"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={48} className="gold-text mb-4" />
              <h3>Upload Manuscript</h3>
              <p>Drag and drop your .docx, .txt, or .md file here</p>
              <input 
                type="file" 
                hidden 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                accept=".docx,.txt,.md"
              />
            </motion.div>
          </div>
        );
      case 'metadata':
        return (
          <div className="tab-pane p-8">
            <h2 className="section-title">Book Details</h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  value={metadata.title} 
                  onChange={e => setMetadata({...metadata, title: e.target.value})}
                  className="glass-input"
                />
              </div>
              <div className="form-group">
                <label>Author</label>
                <input 
                  type="text" 
                  value={metadata.author} 
                  onChange={e => setMetadata({...metadata, author: e.target.value})}
                  className="glass-input"
                />
              </div>
              <div className="form-group col-span-2">
                <label>Description / Blurb</label>
                <textarea 
                  rows={4}
                  value={metadata.description} 
                  onChange={e => setMetadata({...metadata, description: e.target.value})}
                  className="glass-input"
                />
              </div>
              <div className="form-group">
                <label>Cover Art</label>
                <div 
                  className="cover-preview glass"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {metadata.coverArt ? (
                    <img src={metadata.coverArt} alt="Cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Plus size={24} />
                      <span>Upload Image</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  hidden 
                  ref={coverInputRef} 
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) setMetadata({...metadata, coverArt: URL.createObjectURL(file)});
                  }}
                  accept="image/*"
                />
              </div>
            </div>
          </div>
        );
      case 'styles':
        const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];
        return (
          <div className="tab-pane p-8 flex flex-col h-full">
            <div className="section-header flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-4">
                <input 
                  type="text"
                  value={activeSection.title}
                  onChange={(e) => setSections(sections.map(s => s.id === activeSectionId ? {...s, title: e.target.value} : s))}
                  className="section-title-input gold-text text-2xl font-bold bg-transparent border-none outline-none"
                />
                <span className={`badge px-3 py-1 text-[10px] uppercase tracking-tighter ${activeSection.type === 'front' ? 'text-blue-400 border-blue-400/30' : activeSection.type === 'back' ? 'text-purple-400 border-purple-400/30' : 'text-accent border-accent/30'}`}>
                  {activeSection.type} matter
                </span>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm px-4 py-2" onClick={() => addSection('body')}>+ New Chapter</button>
              </div>
            </div>
            
            <div className="editor-view-container flex-1 overflow-hidden">
              <ManuscriptEditor 
                key={activeSection.id}
                content={activeSection.html}
                onChange={updateSectionHtml}
                onUpdateTOC={setTocEntries}
                style={style}
                setStyle={setStyle}
              />
            </div>
          </div>
        );
      case 'toc':
        return (
          <div className="tab-pane p-8">
            <h2 className="section-title">Table of Contents</h2>
            <div className="toc-builder glass p-6">
              <p className="description mb-6">These links will be automatically generated and hyperlinked in your e-book.</p>
              <div className="toc-list">
                {tocEntries.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`toc-item glass mb-3 p-4 flex items-center justify-between toc-level-${entry.level}`}
                    style={{ borderLeftColor: entry.level === 1 ? 'var(--accent-color)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`level-dot level-${entry.level}`} />
                      <span className="font-semibold text-lg">{entry.text}</span>
                      <span className="badge glass text-[10px] px-2 py-0.5 opacity-50 uppercase tracking-tighter">H{entry.level}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-secondary text-sm">Target: ch_{index + 1}.xhtml</span>
                      <ChevronRight size={16} className="text-secondary" />
                    </div>
                  </div>
                ))}
                {tocEntries.length === 0 && <p className="text-center text-secondary">Use Headings (H1, H2) in the editor to populate the T.O.C.</p>}
              </div>
            </div>
          </div>
        );
      case 'preview':
        // Show all sections joined for the full preview
        const combinedHtml = sections.map(s => `
          <section class="preview-chapter">
            <h1 class="preview-section-title" style="color: ${style.chapterColor}">${s.title}</h1>
            ${s.html}
          </section>
        `).join('');

        return (
          <div className="tab-pane center overflow-hidden">
            <div className="device-container animate-fade-in">
              <div className="device-bezel">
                <div className="device-screen parchment" style={{
                  fontFamily: style.fontFamily,
                  fontSize: `${style.fontSize}px`,
                  lineHeight: style.lineHeight,
                  '--p-spacing': `${style.paragraphSpacing}em`,
                  '--p-indent': `${style.indent}em`,
                  '--header-color': style.chapterColor
                }}>
                  <div 
                    ref={readerRef}
                    className="reader-content" 
                    dangerouslySetInnerHTML={{ __html: combinedHtml }} 
                  />
                </div>
              </div>
              <div className="device-controls flex justify-between w-full mt-6 px-12">
                <button 
                  className="btn-secondary rounded-full p-4 hover:bg-gold hover:text-white transition-all"
                  onClick={() => {
                    readerRef.current?.scrollBy({ left: -readerRef.current.clientWidth, behavior: 'smooth' });
                  }}
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="text-secondary text-sm flex flex-col items-center">
                  <span className="font-bold tracking-widest uppercase text-xs opacity-50">E-Reader Preview</span>
                  <span className="text-xs opacity-30 mt-1">Simulate EPUB layout</span>
                </div>
                <button 
                  className="btn-secondary rounded-full p-4 hover:bg-gold hover:text-white transition-all"
                  onClick={() => {
                    readerRef.current?.scrollBy({ left: readerRef.current.clientWidth, behavior: 'smooth' });
                  }}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>
        );
      case 'images':
        return (
          <div className="tab-pane p-8">
            <h2 className="section-title">Media & Illustrations</h2>
            <div className="image-grid grid grid-cols-3 gap-6">
              {/* Dummy data for demonstration if no images found */}
              {[1, 2, 3].map(i => (
                <div key={i} className="image-item glass p-4 flex flex-col gap-4">
                  <div className="img-preview-box glass h-40 flex items-center justify-center overflow-hidden">
                    <ImageIcon size={32} className="opacity-20" />
                  </div>
                  <div className="image-controls">
                    <label className="text-xs uppercase opacity-50 mb-2 block">Scale (100%)</label>
                    <input type="range" min="10" max="150" defaultValue="100" />
                    <label className="text-xs uppercase opacity-50 mt-4 mb-2 block">Alignment</label>
                    <div className="flex gap-2">
                      <button className="btn-secondary p-2 flex-1"><AlignLeft size={16} /></button>
                      <button className="btn-secondary p-2 flex-1"><Layout size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {renderSidebar()}
      <main className="main-content">
        <header className="main-header glass">
          <div className="header-status">
            <div className="project-chip">
              <span className="dot" />
              {metadata.title}
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary">
              <Settings size={18} />
              Settings
            </button>
            <button className="btn-primary" onClick={handleExport}>
              Export Final
            </button>
          </div>
        </header>

        <section className="content-area">
          {renderContent()}
        </section>
      </main>

      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`notification ${notification.type}`}
          >
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
