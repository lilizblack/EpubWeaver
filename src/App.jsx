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
  Edit2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  X,
  Save
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
  indent: 1.0,
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
  const [previewMode, setPreviewMode] = useState('paginated'); // 'paginated' or 'vertical'
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [imageSettings, setImageSettings] = useState({});
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // --- Refs ---
  const readerRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const allTocEntries = React.useMemo(() => {
    const entries = [];
    sections.forEach(section => {
      if (section.type === 'front') return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(section.html, 'text/html');
      const headings = Array.from(doc.querySelectorAll('h1, h2, h3'));
      headings.forEach(h => {
        entries.push({
          text: h.innerText || h.textContent,
          level: parseInt(h.tagName[1]),
          sectionId: section.id,
          sectionTitle: section.title
        });
      });
    });
    return entries;
  }, [sections]);

  // --- Effects ---
  useEffect(() => {
    const activePill = document.querySelector('.section-pill.active');
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSectionId, activeTab]);

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

  const saveWorkspace = () => {
    const data = JSON.stringify({ sections, metadata, style }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    saveAs(blob, `${metadata.title.replace(/\s+/g, '_')}_workspace.weaver`);
    notify('Workspace saved successfully!');
  };

  const loadWorkspace = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.sections) setSections(data.sections);
        if (data.metadata) setMetadata(data.metadata);
        if (data.style) setStyle(data.style);
        notify('Workspace loaded successfully!');
        setShowSettings(false);
      } catch (err) {
        notify('Invalid workspace file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
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
        hr { border: none; border-top: 1px solid ${style.chapterColor}; width: 30%; margin: 3em auto; opacity: 0.3; }
        blockquote { border-left: 4px solid ${style.chapterColor}; padding-left: 20px; font-style: italic; color: #444; margin: 1.5em 0; }
        img { max-width: 100%; height: auto; display: block; margin: 2em auto; }
      `;
      zip.file('OEBPS/style.css', bookCss);

      const chMeta = [];
      const imageManifest = [];
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
              imageManifest.push(`<item id="img${imageIdx}" href="images/${fileName}" media-type="${blob.type}"/>`);
            } catch (err) { console.warn('Image fetch failed'); }
          }
        }

        const processedHtml = sectionDoc.body.innerHTML;

        const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>${section.title}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <section epub:type="${section.type === 'front' ? 'frontmatter' : section.type === 'back' ? 'backmatter' : 'chapter'}">
        ${processedHtml}
    </section>
</body>
</html>`;
        const fileName = `${section.id}.xhtml`;
        zip.file(`OEBPS/${fileName}`, xhtml);
        chMeta.push({ id: section.id, fileName, title: section.title, type: section.type });
      }

      // Only include Body and Back matter in the Table of Contents as per standard practice & user request
      const tocListItems = chMeta.filter(c => c.type === 'body' || c.type === 'back');

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
        ...imageManifest,
        `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
        `<item id="css" href="style.css" media-type="text/css"/>`
      ].join('\n');

      // SPINE ORDER: Cover -> Front Matter -> TOC -> Body -> Back Matter
      const frontRefs = chMeta.filter(c => c.type === 'front').map(c => `<itemref idref="${c.id}"/>`);
      const bodyRefs = chMeta.filter(c => c.type === 'body').map(c => `<itemref idref="${c.id}"/>`);
      const backRefs = chMeta.filter(c => c.type === 'back').map(c => `<itemref idref="${c.id}"/>`);
      
      let finalSpineRefs = [];
      if (metadata.coverArt) finalSpineRefs.push('<itemref idref="cover"/>');
      finalSpineRefs.push(...frontRefs);
      finalSpineRefs.push('<itemref idref="nav"/>'); // TOC always after front matter
      finalSpineRefs.push(...bodyRefs);
      finalSpineRefs.push(...backRefs);
      
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="id">urn:uuid:${crypto.randomUUID()}</dc:identifier>
        <dc:title>${metadata.title}</dc:title>
        <dc:creator>${metadata.author}</dc:creator>
        <dc:language>${metadata.language}</dc:language>
        <dc:publisher>${metadata.publisher}</dc:publisher>
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
  const moveSection = (id, direction) => {
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const newSections = [...sections];
    const item = { ...newSections[index] };
    const neighbor = newSections[newIndex];

    // If crossing types, adopt the new category
    if (item.type !== neighbor.type) {
      item.type = neighbor.type;
    }

    newSections.splice(index, 1);
    newSections.splice(newIndex, 0, item);
    setSections(newSections);
  };

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
        <div className="section-manager-sidebar flex-1 overflow-y-auto custom-scrollbar">
          
          <div className="section-manager-header mb-8">
            <h4 className="section-group-title mb-4">Quick Actions</h4>
            <button 
              className="btn-secondary w-full py-2.5 text-[11px] justify-center bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => setActiveTab('upload')}
            >
              <UploadCloud size={14} /> Import Manuscript
            </button>
          </div>

          {[
            { id: 'front', label: 'Front Matter', icon: <Layout size={12} className="pill-icon" /> },
            { id: 'body', label: 'Body Content', icon: <BookOpen size={12} className="pill-icon" /> },
            { id: 'back', label: 'Back Matter', icon: <AlignLeft size={12} className="pill-icon" /> }
          ].map(group => (
            <div key={group.id} className="section-group mb-8">
              <div className="section-group-header">
                <h4 className={`section-group-title ${group.id === 'front' ? 'text-blue-400/80' : group.id === 'body' ? 'text-accent' : 'text-purple-400/80'}`}>
                  {group.label}
                </h4>
                <button 
                  onClick={() => addSection(group.id)} 
                  className="p-1 hover:text-white transition-colors" 
                  title={`Add ${group.label}`}
                >
                  <Plus size={14}/>
                </button>
              </div>
              
              <div className="flex flex-col gap-1">
                {sections.filter(s => s.type === group.id).map((s, idx, filtered) => (
                  <div 
                    key={s.id}
                    className={`section-pill ${activeSectionId === s.id ? 'active' : ''}`}
                    onClick={() => { setActiveTab('styles'); setActiveSectionId(s.id); }}
                  >
                    <GripVertical size={12} className="drag-handle" />
                    
                    <div className="flex-1 min-w-0">
                      {editingSectionId === s.id ? (
                        <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                          <input 
                            autoFocus
                            className="section-title-input"
                            value={s.title}
                            onChange={(e) => {
                              const newSections = sections.map(sec => sec.id === s.id ? {...sec, title: e.target.value} : sec);
                              setSections(newSections);
                            }}
                            onBlur={() => setEditingSectionId(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingSectionId(null)}
                          />
                          <div className="flex gap-1">
                            {['front', 'body', 'back'].map(t => (
                              <button
                                key={t}
                                onClick={() => {
                                  setSections(sections.map(sec => sec.id === s.id ? {...sec, type: t} : sec));
                                }}
                                className={`text-[9px] px-2 py-0.5 rounded capitalize ${s.type === t ? 'bg-accent/40 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 overflow-hidden">
                          {group.icon}
                          <span className="text-[12px] truncate font-semibold text-white/90">{s.title}</span>
                        </div>
                      )}
                    </div>

                    <div className="action-buttons flex items-center gap-1">
                      {!editingSectionId && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveSection(s.id, -1); }}
                            className="hover:text-accent p-1 opacity-40 hover:opacity-100 transition-opacity"
                            disabled={sections.indexOf(s) === 0}
                            title="Move Up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveSection(s.id, 1); }}
                            className="hover:text-accent p-1 opacity-40 hover:opacity-100 transition-opacity"
                            disabled={sections.indexOf(s) === sections.length - 1}
                            title="Move Down"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingSectionId(s.id); }} 
                            className="hover:text-accent p-1 opacity-40 hover:opacity-100 transition-opacity"
                            title="Edit Title / Change Category"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} 
                            className="hover:text-red-400 p-1 opacity-40 hover:opacity-100 transition-opacity"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {sections.filter(s => s.type === group.id).length === 0 && (
                  <div className="text-[10px] text-white/20 italic p-3 text-center border border-dashed border-white/5 rounded-lg">
                    No sections in this category
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-footer shrink-0 flex flex-col gap-2 p-5 bg-[#0a0a0a] border-t border-white/5 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
        <button className="btn-secondary w-full justify-center text-xs py-2.5 h-10 hover:bg-white/10" onClick={saveWorkspace}>
          <Save size={14} className="text-accent" /> Save Workspace
        </button>
        <button className="btn-primary w-full text-xs py-2.5 h-10 shadow-lg shadow-gold/10" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Processing...' : <><Download size={16} /> Download EPUB</>}
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
      case 'styles': {
        const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];
        return (
          <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden' }}>
            <div className="section-header flex items-center justify-between mb-4 px-4 pt-5">
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
            
            <div className="editor-view-container" style={{ overflow: 'hidden', minHeight: 0 }}>
              <ManuscriptEditor 
                key={activeSection.id}
                content={activeSection.html}
                onChange={updateSectionHtml}
                style={style}
                setStyle={setStyle}
              />
            </div>
          </div>
        );
      }
      case 'toc':
        return (
          <div className="tab-pane scrollable p-8">
            <h2 className="section-title">Table of Contents</h2>
            <div className="toc-builder glass p-6">
              <p className="description mb-6">These links will be automatically generated and hyperlinked in your e-book.</p>
              <div className="toc-list">
                {allTocEntries.map((entry, index) => (
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
                    <ChevronRight size={16} className="text-secondary" />
                  </div>
                ))}
                {allTocEntries.length === 0 && <p className="text-center text-secondary">Use Headings (H1, H2) in the editor to populate the T.O.C.</p>}
              </div>
            </div>
          </div>
        );
      case 'preview':
        // Generate a structured preview with Cover and TOC
        const frontMatter = sections.filter(s => s.type === 'front');
        const bodyContent = sections.filter(s => s.type === 'body');
        const backMatter = sections.filter(s => s.type === 'back');

        let previewSections = [];

        // 1. Cover Art
        if (metadata.coverArt) {
          previewSections.push(`
            <section class="preview-chapter cover-page" style="display: flex; align-items: center; justify-content: center; height: 100%;">
              <img src="${metadata.coverArt}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" />
            </section>
          `);
        }

        // 2. Front Matter
        frontMatter.forEach(s => {
          previewSections.push(`
            <section class="preview-chapter">
              <h1 class="preview-section-title" style="color: ${style.chapterColor}">${s.title}</h1>
              <div class="chapter-content">${s.html}</div>
            </section>
          `);
        });

        // 3. Generated TOC
        previewSections.push(`
          <section class="preview-chapter toc-page">
            <h1 class="preview-section-title" style="color: ${style.chapterColor}; margin-bottom: 60px;">Contents</h1>
            <div class="preview-toc-list" style="padding: 0 60px;">
              ${allTocEntries.map((entry, i) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dotted rgba(0,0,0,0.1); padding-bottom: 8px; font-size: ${entry.level === 1 ? '1.1em' : '0.9em'}; padding-left: ${(entry.level - 1) * 20}px;">
                  <span style="font-weight: ${entry.level === 1 ? '600' : '400'}; font-family: 'Lora', serif; color: #1a1a1a;">${entry.text}</span>
                  <span style="opacity: 0.3; font-family: sans-serif; font-size: 0.7em; align-self: flex-end;">${entry.level === 1 ? 'CH ' + (i + 1) : ''}</span>
                </div>
              `).join('')}
            </div>
          </section>
        `);

        // 4. Body Content
        bodyContent.forEach(s => {
          previewSections.push(`
            <section class="preview-chapter">
              <h1 class="preview-section-title" style="color: ${style.chapterColor}">${s.title}</h1>
              <div class="chapter-content">${s.html}</div>
            </section>
          `);
        });

        // 5. Back Matter
        backMatter.forEach(s => {
          previewSections.push(`
            <section class="preview-chapter">
              <h1 class="preview-section-title" style="color: ${style.chapterColor}">${s.title}</h1>
              <div class="chapter-content">${s.html}</div>
            </section>
          `);
        });

        const combinedHtml = previewSections.join('');

        return (
          <div className="tab-pane scrollable flex flex-col items-center gap-6 py-12 px-4 shadow-inner">
            <div className="flex bg-white/5 rounded-full p-1 self-center">
              <button 
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${previewMode === 'paginated' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setPreviewMode('paginated')}
              >
                PAGINATED
              </button>
              <button 
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${previewMode === 'vertical' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setPreviewMode('vertical')}
              >
                SCROLLABLE
              </button>
            </div>

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
                    className={`reader-content custom-scrollbar ${previewMode === 'vertical' ? 'vertical' : ''}`}
                    dangerouslySetInnerHTML={{ __html: combinedHtml }} 
                  />
                </div>
              </div>
              {previewMode === 'paginated' && (
                <div className="device-controls flex justify-between w-full mt-6 px-12">
                  <button 
                    className="btn-secondary rounded-full p-4 hover:bg-gold hover:text-white transition-all border-white/5 bg-white/5"
                    onClick={() => {
                      readerRef.current?.scrollBy({ left: -readerRef.current.clientWidth, behavior: 'smooth' });
                    }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="text-secondary text-sm flex flex-col items-center">
                    <span className="font-bold tracking-widest uppercase text-xs opacity-50">E-Reader Preview</span>
                    <span className="text-xs opacity-30 mt-1">Paginated book mode</span>
                  </div>
                  <button 
                    className="btn-secondary rounded-full p-4 hover:bg-gold hover:text-white transition-all border-white/5 bg-white/5"
                    onClick={() => {
                      readerRef.current?.scrollBy({ left: readerRef.current.clientWidth, behavior: 'smooth' });
                    }}
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              )}
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
        <header className="main-header glass sticky top-0 z-[100]">
          <div className="header-status flex items-center gap-4">
            <div className="project-chip">
              <span className="dot" />
              {metadata.title}
            </div>
          </div>
          <div className="header-actions flex items-center gap-3">
            <button 
              className="btn-secondary h-10 px-4 flex items-center gap-2 bg-white/5 border-white/10 hover:bg-white/10"
              onClick={saveWorkspace}
              title="Save Workspace"
            >
              <Save size={16} className="text-accent" />
              <span className="hidden md:inline">Save</span>
            </button>
            <button 
              className="btn-secondary h-10 px-4 flex items-center gap-2 bg-white/5 border-white/10 hover:bg-white/10" 
              onClick={() => setShowSettings(true)}
            >
              <Settings size={16} />
              <span className="hidden md:inline">Settings</span>
            </button>
            <div className="divider-v h-6 w-px bg-white/10 mx-1" />
            <button 
              className="btn-primary h-10 px-6 shadow-lg shadow-gold/20"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Processing...' : 'Export Final'}
            </button>
          </div>
        </header>

        <section className="content-area flex-1 min-h-0 overflow-hidden relative">
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

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Project Settings</h3>
                <button onClick={() => setShowSettings(false)} className="opacity-50 hover:opacity-100 p-2 hover:bg-white/5 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="settings-grid">
                  <div className="settings-section col-span-2">
                    <label>Workspace Management</label>
                    <div className="flex gap-4">
                      <button className="btn-primary flex-1" onClick={saveWorkspace}>
                        <Download size={18} /> Save Workspace
                      </button>
                      <label className="btn-secondary flex-1 cursor-pointer justify-center">
                        <Plus size={18} /> Load Workspace
                        <input type="file" hidden accept=".weaver" onChange={loadWorkspace} />
                      </label>
                    </div>
                    <p className="text-[10px] text-secondary mt-2 opacity-50">
                      Saving your workspace creates a .weaver file you can use to resume your work later.
                    </p>
                  </div>

                  <div className="settings-section">
                    <label>Publisher</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={metadata.publisher} 
                      onChange={e => setMetadata({...metadata, publisher: e.target.value})}
                    />
                  </div>
                  <div className="settings-section">
                    <label>Language Code</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={metadata.language} 
                      onChange={e => setMetadata({...metadata, language: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
