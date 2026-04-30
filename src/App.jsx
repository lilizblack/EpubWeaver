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
  Save,
  RotateCcw
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
  lineHeight: 1.2,
  paragraphSpacing: 0.375, // 6px / 16px
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

  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const startNewProject = () => {
    if (window.confirm('Are you sure you want to start a new project? All unsaved progress will be lost.')) {
      setSections([
        { id: 'title-page', title: 'Title Page', type: 'front', html: '<h1>Title</h1>' },
        { id: 'copyright', title: 'Copyright', type: 'front', html: '<p>© 2026 Author Name. All rights reserved.</p>' },
        { id: 'dedication', title: 'Dedication', type: 'front', html: '<p style="text-align: center; margin-top: 20%; font-style: italic;">To someone special...</p>' },
        { id: 'chapter-1', title: 'Chapter 1', type: 'body', html: '<h2>Chapter One</h2><p>Start writing here...</p>' },
        { id: 'acknowledgements', title: 'Acknowledgements', type: 'back', html: '<h1>Acknowledgements</h1><p>I would like to thank...</p>' },
        { id: 'about-author', title: 'About Author', type: 'back', html: '<h1>About the Author</h1><p>Author biography here...</p>' }
      ]);
      setActiveSectionId('chapter-1');
      setMetadata({
        title: 'Untitled Masterpiece',
        author: 'Anonymous',
        description: '',
        language: 'en',
        publisher: 'Self Published',
        coverArt: null
      });
      setStyle(DEFAULT_STYLE);
      setActiveTab('upload');
      notify('New project started!', 'success');
    }
  };

  // --- Refs ---
  const readerRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const allTocEntries = React.useMemo(() => {
    if (activeTab !== 'toc' && activeTab !== 'preview' && !isExporting) return [];
    
    const entries = [];
    sections.forEach(section => {
      if (section.type === 'front') return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(section.html, 'text/html');
      const headings = Array.from(doc.querySelectorAll('h1, h2'));
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
  }, [sections, activeTab, isExporting]);

  const combinedHtml = React.useMemo(() => {
    // Optimization: Don't generate the massive combined HTML if we aren't previewing or exporting
    // This saves a lot of RAM and CPU cycles while typing in the editor
    if (activeTab !== 'preview' && !isExporting) return '';

    // Generate a structured preview with Cover and TOC
    const frontMatter = sections.filter(s => s.type === 'front');
    const bodyContent = sections.filter(s => s.type === 'body');
    const backMatter = sections.filter(s => s.type === 'back');

    let previewSections = [];

    // 1. Cover Art
    if (metadata.coverArt) {
      previewSections.push(`
        <section class="preview-chapter cover-page" style="text-align: center;">
          <img src="${metadata.coverArt}" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" />
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

    return previewSections.join('');
  }, [sections, metadata.coverArt, style.chapterColor, allTocEntries, activeTab, isExporting]);

  // --- Effects ---
  useEffect(() => {
    if (activeTab !== 'preview' || !readerRef.current) return;

    const reader = readerRef.current;
    let isScrolling = false;

    const handleWheel = (e) => {
      if (previewMode === 'paginated') {
        e.preventDefault();
        if (isScrolling) return;
        
        isScrolling = true;
        const width = reader.clientWidth;
        const direction = e.deltaY > 0 || e.deltaX > 0 ? 1 : -1;
        
        reader.scrollLeft += direction * width;
        
        setTimeout(() => {
          isScrolling = false;
        }, 300); // 300ms debounce to prevent multiple jumps
      }
    };

    const handleKeyDown = (e) => {
      if (previewMode === 'paginated') {
        const width = reader.clientWidth;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          reader.scrollLeft += width;
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          reader.scrollLeft -= width;
        }
      }
    };

    reader.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      reader.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, previewMode, combinedHtml]);

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
        let arrayBuffer = await file.arrayBuffer();
        
        // --- PRE-PROCESS DOCX to detect Auto-Formatted Scene Breaks ---
        // Word often converts '***' into a paragraph with a dotted bottom border.
        // Mammoth ignores borders, so we manually intercept them and inject '***'.
        try {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const docXmlFile = zip.file("word/document.xml");
          
          if (docXmlFile) {
            let xmlString = await docXmlFile.async("string");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            
            // Get all w:pBdr elements (Paragraph Borders)
            let pBdrs = xmlDoc.getElementsByTagNameNS ? xmlDoc.getElementsByTagNameNS("*", "pBdr") : [];
            if (!pBdrs || pBdrs.length === 0) pBdrs = xmlDoc.getElementsByTagName("w:pBdr");
            
            let modified = false;
            
            // Iterate backwards to avoid messing up live collections when inserting
            for (let i = pBdrs.length - 1; i >= 0; i--) {
              const pBdr = pBdrs[i];
              
              // Check if there is a bottom border inside
              let hasBottom = false;
              for (let j = 0; j < pBdr.childNodes.length; j++) {
                const nodeName = pBdr.childNodes[j].nodeName;
                if (nodeName === "w:bottom" || nodeName === "bottom") hasBottom = true;
              }
              
              if (hasBottom) {
                // Traverse up to find the paragraph <w:p>
                let p = pBdr.parentNode;
                while (p && p.nodeName !== "w:p" && p.nodeName !== "p") {
                  p = p.parentNode;
                }
                
                if (p) {
                  const wNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                  const newP = xmlDoc.createElementNS(wNS, "w:p");
                  const newR = xmlDoc.createElementNS(wNS, "w:r");
                  const newT = xmlDoc.createElementNS(wNS, "w:t");
                  newT.textContent = "***";
                  newR.appendChild(newT);
                  newP.appendChild(newR);
                  
                  if (p.nextSibling) {
                    p.parentNode.insertBefore(newP, p.nextSibling);
                  } else {
                    p.parentNode.appendChild(newP);
                  }
                  modified = true;
                }
              }
            }
            
            if (modified) {
              const serializer = new XMLSerializer();
              xmlString = serializer.serializeToString(xmlDoc);
              zip.file("word/document.xml", xmlString);
              arrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
            }
          }
        } catch (err) {
          console.warn("Could not pre-process DOCX for scene breaks:", err);
        }
        
        const result = await mammoth.convertToHtml({ arrayBuffer });
        html = result.value;
      } else {
        const text = await file.text();
        html = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
      }

      // Detect and normalize scene breaks (***, * * *, ---, ###, ___)
      // These are often used in manuscripts to denote scene dividers
      // We catch variations with 3 or more symbols and optional spaces
      html = html.replace(/<p>\s*([\*-_#]\s*){3,}\s*<\/p>/g, '<hr />');

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
          content: child.outerHTML, // Include the heading in the content itself
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

  const optimizeImage = async (blob, maxKB = 500) => {
    // If it's already small enough, just return it
    if (blob.size <= maxKB * 1024) return blob;

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Reasonably scale down if it's massive (common for original photos)
        const maxWidth = 1600;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white'; // Avoid black background on transparent PNGs when converting to JPEG
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Recursive quality reduction
        let quality = 0.8;
        const compress = () => {
          canvas.toBlob((result) => {
            if (result.size <= maxKB * 1024 || quality <= 0.2) {
              resolve(result);
            } else {
              quality -= 0.1;
              compress();
            }
          }, 'image/jpeg', quality);
        };
        compress();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(blob); // Fallback to original on error
      };
      img.src = url;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    // Wait for any pending debounced editor updates to commit to state
    await new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      const currentSections = sectionsRef.current;
      const zip = new JSZip();
      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
      zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);

      const bookCss = `
        body { font-family: 'Lora', serif; line-height: ${style.lineHeight}; color: #000; background: #fff; margin: 8%; }
        h1 { text-align: center; color: ${style.chapterColor}; margin-top: 2em; font-family: serif; font-size: 3em; }
        h2 { border-bottom: 2px solid ${style.chapterColor}; padding-bottom: 0.5em; margin-top: 2em; color: ${style.chapterColor}; font-family: serif; font-size: 2em; }
        h3 { color: ${style.chapterColor}; margin-top: 1.5em; font-family: serif; font-size: 1.5em; }
        p { margin-bottom: ${style.paragraphSpacing}em; text-indent: ${style.indent}em; text-align: justify; }
        hr { border: none; border-top: 1px solid ${style.chapterColor}; width: 30%; margin: 3em auto; opacity: 0.3; }
        blockquote { border-left: 4px solid ${style.chapterColor}; padding-left: 20px; font-style: italic; color: #444; margin: 1.5em 0; }
        img { max-width: 100%; height: auto; display: block; margin: 2em auto; }
      `;
      zip.file('OEBPS/style.css', bookCss);

      const chMeta = [];
      const imageManifest = [];
      let imageIdx = 0;
      const serializer = new XMLSerializer();

      // Deep TOC arrays
      const deepTOC = [];

      for (const section of currentSections) {
        // Parse as HTML then serialize to XHTML
        const sectionDoc = new DOMParser().parseFromString(section.html, 'text/html');
        const images = Array.from(sectionDoc.querySelectorAll('img'));
        
        for (const img of images) {
          const src = img.getAttribute('src');
          if (src && (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http'))) {
            try {
              const res = await fetch(src);
              let blob = await res.blob();
              
              // Apply compression if needed
              blob = await optimizeImage(blob, 500);
              
              const ext = blob.type.split('/')[1] || 'jpg';
              const fileName = `img_${imageIdx}.${ext}`;
              const imgId = `img${imageIdx}`;
              
              zip.file(`OEBPS/images/${fileName}`, blob);
              img.setAttribute('src', `images/${fileName}`);
              imageManifest.push(`<item id="${imgId}" href="images/${fileName}" media-type="${blob.type}"/>`);
              imageIdx++;
            } catch (err) { console.warn('Image fetch failed'); }
          }
        }

        // Build Deep TOC for this section
        const subToc = [];
        if (section.type === 'body' || section.type === 'back') {
          const headings = Array.from(sectionDoc.querySelectorAll('h1, h2'));
          headings.forEach((h, idx) => {
            if (!h.id) {
              const safeText = (h.textContent || '').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
              h.id = `heading-${idx}-${safeText || 'h'}`;
            }
            subToc.push({
              title: h.textContent || 'Untitled',
              href: `${section.id}.xhtml#${h.id}`,
              level: parseInt(h.tagName[1])
            });
          });

          deepTOC.push({
            title: section.title,
            href: `${section.id}.xhtml`,
            level: 1,
            children: subToc
          });
        }

        // Serialize the body content to ensure valid XHTML (self-closing tags, etc.)
        const serializedBody = serializer.serializeToString(sectionDoc.body)
          .replace(/^<body[^>]*>/, '')
          .replace(/<\/body>$/, '');

        const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${metadata.language || 'en'}" xml:lang="${metadata.language || 'en'}">
<head>
    <title>${section.title}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <section epub:type="${section.type === 'front' ? 'frontmatter' : section.type === 'back' ? 'backmatter' : 'chapter'}">
        ${serializedBody}
    </section>
</body>
</html>`;
        const fileName = `${section.id}.xhtml`;
        zip.file(`OEBPS/${fileName}`, xhtml);
        chMeta.push({ id: section.id, fileName, title: section.title, type: section.type });
      }

      // EPUB 3 Navigation Document (Deep TOC)
      const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${metadata.language || 'en'}" xml:lang="${metadata.language || 'en'}">
<head>
    <title>Table of Contents</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1 class="toc-title">Table of Contents</h1>
        <ol>
            ${deepTOC.map(c => `
              <li>
                <a href="${c.href}">${c.title}</a>
                ${c.children.length > 0 ? `
                  <ol>
                    ${c.children.map(sub => `<li><a href="${sub.href}">${sub.title}</a></li>`).join('\n')}
                  </ol>
                ` : ''}
              </li>
            `).join('\n')}
        </ol>
    </nav>
</body>
</html>`;
      zip.file('OEBPS/nav.xhtml', nav);

      // NCX Fallback for legacy iBooks / Kindle / EPUB 2 readers (Deep TOC)
      let ncxNavPoints = '';
      let ncxIndex = 1;
      deepTOC.forEach(c => {
        ncxNavPoints += `
        <navPoint id="navpoint-${ncxIndex}" playOrder="${ncxIndex}">
            <navLabel><text>${c.title}</text></navLabel>
            <content src="${c.href}"/>`;
        ncxIndex++;
        
        if (c.children.length > 0) {
          c.children.forEach(sub => {
            ncxNavPoints += `
            <navPoint id="navpoint-${ncxIndex}" playOrder="${ncxIndex}">
                <navLabel><text>${sub.title}</text></navLabel>
                <content src="${sub.href}"/>
            </navPoint>`;
            ncxIndex++;
          });
        }
        ncxNavPoints += `
        </navPoint>`;
      });

      const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:book-id"/>
        <meta name="dtb:depth" content="2"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle><text>${metadata.title}</text></docTitle>
    <navMap>
        ${ncxNavPoints}
    </navMap>
</ncx>`;
      zip.file('OEBPS/toc.ncx', ncx);

      if (metadata.coverArt) {
        try {
          const res = await fetch(metadata.coverArt);
          let blob = await res.blob();
          blob = await optimizeImage(blob, 500);
          zip.file('OEBPS/images/cover.jpg', blob);
          const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${metadata.language || 'en'}" xml:lang="${metadata.language || 'en'}">
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
        `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
        `<item id="css" href="style.css" media-type="text/css"/>`
      ].join('\n');

      const frontRefs = chMeta.filter(c => c.type === 'front').map(c => `<itemref idref="${c.id}"/>`);
      const bodyRefs = chMeta.filter(c => c.type === 'body').map(c => `<itemref idref="${c.id}"/>`);
      const backRefs = chMeta.filter(c => c.type === 'back').map(c => `<itemref idref="${c.id}"/>`);
      
      let finalSpineRefs = [];
      if (metadata.coverArt) finalSpineRefs.push('<itemref idref="cover"/>');
      finalSpineRefs.push(...frontRefs);
      finalSpineRefs.push('<itemref idref="nav"/>');
      finalSpineRefs.push(...bodyRefs);
      finalSpineRefs.push(...backRefs);
      
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="id">urn:uuid:${crypto.randomUUID()}</dc:identifier>
        <dc:title>${metadata.title}</dc:title>
        <dc:creator>${metadata.author}</dc:creator>
        <dc:language>${metadata.language}</dc:language>
        <dc:publisher>${metadata.publisher || 'EPUBSmith'}</dc:publisher>
        <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z')}</meta>
        ${metadata.coverArt ? '<meta name="cover" content="cover-image"/>' : ''}
    </metadata>
    <manifest>
        ${manifestItems}
    </manifest>
    <spine toc="ncx">
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
          <button className="btn-secondary justify-center text-xs py-2.5 h-10 hover:bg-white/10" onClick={saveWorkspace} title="Save Workspace" style={{ margin: 0, width: '100%' }}>
            <Save size={14} className="text-accent" /> Save
          </button>
          <label className="btn-secondary justify-center text-xs py-2.5 h-10 hover:bg-white/10 cursor-pointer" title="Load Workspace" style={{ margin: 0, width: '100%' }}>
            <UploadCloud size={14} className="text-blue-400" /> Load
            <input type="file" hidden accept=".weaver" onChange={loadWorkspace} />
          </label>
        </div>
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
                {allTocEntries.length === 0 && <p className="text-center text-secondary">Use Headings (H1, H2) in the editor to populate the T.O.C. — H3 is a visual style only and is excluded.</p>}
              </div>
            </div>
          </div>
        );
      case 'preview':
        return (
          <div className="tab-pane flex flex-col items-center py-12 px-4 shadow-inner overflow-hidden">
            <div className="flex bg-white/5 rounded-full p-1 mb-8 shrink-0 z-10">
              <button 
                className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${previewMode === 'paginated' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => {
                  setPreviewMode('paginated');
                  if (readerRef.current) readerRef.current.scrollLeft = 0;
                }}
              >
                PAGINATED
              </button>
              <button 
                className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${previewMode === 'vertical' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => {
                  setPreviewMode('vertical');
                  if (readerRef.current) readerRef.current.scrollTop = 0;
                }}
              >
                SCROLLABLE
              </button>
            </div>

            <div className="device-container flex-1 min-h-0 animate-fade-in relative flex flex-col">
              <div className="device-bezel flex-1 min-h-0 flex flex-col relative z-0">
                <div className="device-screen parchment flex-1 relative" style={{
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
                    style={{ position: 'relative', height: '100%', width: '100%', zIndex: 5 }}
                    dangerouslySetInnerHTML={{ __html: combinedHtml || '<div style="padding: 40px; text-align: center; opacity: 0.5;">No content to preview. Import a manuscript or add chapters to begin.</div>' }} 
                  />
                  
                  {previewMode === 'paginated' && (
                    <>
                      <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center z-50 pointer-events-none">
                        <button 
                          className="w-14 h-14 rounded-full bg-black/10 hover:bg-black/20 active:scale-95 text-black/40 hover:text-black/80 transition-all flex items-center justify-center border border-black/5 shadow-lg pointer-events-auto"
                          title="Previous Page (A or ←)"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (readerRef.current) {
                              const width = readerRef.current.clientWidth;
                              readerRef.current.scrollLeft -= width;
                            }
                          }}
                        >
                          <ChevronLeft size={32} />
                        </button>
                      </div>
                      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center z-50 pointer-events-none">
                        <button 
                          className="w-14 h-14 rounded-full bg-black/10 hover:bg-black/20 active:scale-95 text-black/40 hover:text-black/80 transition-all flex items-center justify-center border border-black/5 shadow-lg pointer-events-auto"
                          title="Next Page (D or →)"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (readerRef.current) {
                              const width = readerRef.current.clientWidth;
                              readerRef.current.scrollLeft += width;
                            }
                          }}
                        >
                          <ChevronRight size={32} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="text-secondary text-sm flex flex-col items-center mt-6 shrink-0">
                <span className="font-bold tracking-widest uppercase text-[10px] opacity-40">E-Reader Preview</span>
                <span className="text-[10px] opacity-20 mt-1">{previewMode === 'paginated' ? 'Use arrows to flip pages' : 'Scroll vertically to read'}</span>
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
        <header className="main-header glass sticky top-0 z-[100]">
          <div className="header-status flex items-center gap-4">
            <div className="project-chip">
              <span className="dot" />
              {metadata.title}
            </div>
            <button 
              className="btn-secondary h-8 px-3 flex items-center gap-2 bg-white/5 border-white/10 hover:bg-gold/20 hover:border-gold/30 hover:text-gold transition-all text-[10px] font-bold uppercase tracking-widest"
              onClick={startNewProject}
            >
              <RotateCcw size={12} />
              Start New
            </button>
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
            <label 
              className="btn-secondary h-10 px-4 flex items-center gap-2 bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer m-0"
              title="Load Workspace"
            >
              <UploadCloud size={16} className="text-blue-400" />
              <span className="hidden md:inline">Load</span>
              <input type="file" hidden accept=".weaver" onChange={loadWorkspace} />
            </label>
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

                  <div className="settings-section col-span-2">
                    <label>Manuscript Aesthetics</label>
                    <div className="flex items-center gap-6 p-4 glass rounded-xl mt-2">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] uppercase tracking-wider opacity-50">Heading Color (Chapters & Titles)</span>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            className="w-12 h-12 bg-transparent border-none cursor-pointer p-0" 
                            value={style.chapterColor} 
                            onChange={e => setStyle({...style, chapterColor: e.target.value})}
                          />
                          <span className="text-sm font-mono gold-text">{style.chapterColor}</span>
                        </div>
                      </div>
                      <div className="divider-v h-10 w-px bg-white/10" />
                      <div className="flex-1">
                        <p className="text-[10px] text-secondary leading-relaxed">
                          This color applies to all H1 and H2 headings in both the editor and the final EPUB export.
                        </p>
                      </div>
                    </div>
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
