# EpubWeaver 🖋️

**Professional Manuscript to E-Book Exporter**

EpubWeaver is a premium, web-based editor designed for authors and publishers who demand professional-grade typesetting and seamless EPUB 3 production. Built with a "Dark Academic" aesthetic, it transforms raw manuscripts into beautifully formatted ebooks ready for distribution.

![Preview Art](https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200)

## ✨ Key Features

### 🖋️ Professional Typesetting
- **First Line Indentation**: Granular em-based control (starting from 0.2em) for classic literary paragraph flow.
- **Scene Dividers**: Instant insertion of stylised `***` separators for professional manuscript breaks.
- **Advanced Typography**: Precise control over line height, paragraph spacing, and font faces.
- **Full Alignment**: Support for justified text, centered headings, and standard block styling.

### 📚 Structure & Organization
- **Categorized Sections**: Manage Front Matter (Title Page, Copyright, Dedication), Body Content (Chapters), and Back Matter (Glossary, About Author) with ease.
- **Table of Contents Engine**: Automatically generates a logical TOC that follows the Front Matter, as per industry standards.
- **MS Word Import**: Import `.docx` files directly using the built-in Mammoth.js parser.

### 📱 E-Reader Preview
- **Paginated Viewer**: A high-fidelity, horizontal-scrolling preview that mimics physical e-readers and tablets.
- **CORS-Aware Imaging**: Embed cover art and internal illustrations with direct blob handling.

### 📦 Export Engine
- **EPUB 3 Compliance**: Generates standards-compliant EPUB files with automated manifest and spine generation.
- **Cover Art Integration**: Automatically renders high-quality cover pages as the primary entry point for the ebook.

## 🛠️ Technology Stack

- **Core**: React 19 + Vite
- **Editor Engine**: Tiptap v3 (Rich text framework)
- **Styling**: Vanilla CSS (Tailored Dark Academic Theme)
- **Packaging**: JSZip (Client-side archiving)
- **Import/Parsing**: Mammoth.js (.docx processing)
- **Icons**: Lucide React

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/[your-username]/EpubWeaver.git
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 📜 Deployment

To deploy to GitHub Pages:

1. Update the `base` in `vite.config.js` to your repository name:
   ```javascript
   export default defineConfig({
     base: '/EpubWeaver/',
     plugins: [react()],
   })
   ```
2. Run the build and push the `dist` folder to the `gh-pages` branch.

---
Designed with ❤️ for authors who value the art of the book.
