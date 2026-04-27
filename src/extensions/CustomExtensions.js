import { Extension } from '@tiptap/core';

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace('px', ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .run();
      },
    };
  },
});

export const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultLineHeight: '1.2',
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight,
            renderHTML: attributes => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight: lineHeight => ({ chain }) => {
        return chain()
          .updateAttributes('paragraph', { lineHeight })
          .updateAttributes('heading', { lineHeight })
          .run();
      },
      unsetLineHeight: () => ({ chain }) => {
        return chain()
          .updateAttributes('paragraph', { lineHeight: null })
          .updateAttributes('heading', { lineHeight: null })
          .run();
      },
    };
  },
});

export const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 1.0,
            parseHTML: element => parseFloat(element.style.textIndent) || 1.0,
            renderHTML: attributes => {
              if (!attributes.indent) return { style: 'text-indent: 1.0em' };
              return { style: `text-indent: ${attributes.indent}em` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setIndent: indent => ({ commands }) => {
        return commands.updateAttributes('paragraph', { indent });
      },
    };
  },
});

export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',
  addOptions() {
    return {
      types: ['paragraph'],
      defaultSpacing: '3',
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          spacing: {
            default: '3',
            parseHTML: element => element.style.marginBottom?.replace('px', '') || '3',
            renderHTML: attributes => {
              if (!attributes.spacing) return { style: 'margin-bottom: 3px' };
              return { style: `margin-bottom: ${attributes.spacing}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setParagraphSpacing: spacing => ({ commands }) => {
        return commands.updateAttributes('paragraph', { spacing });
      },
    };
  },
});

// ── ResizableImage ─────────────────────────────────────────────────────────
// Extends the base Image node with a `width` attribute so scale changes
// are persisted in the HTML and survive save/reload.
import { Node, mergeAttributes } from '@tiptap/core';
import { Image as TiptapImage } from '@tiptap/extension-image';

import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageNodeView from '../components/ImageNodeView';

export const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: element => element.style.width || element.getAttribute('width') || '100%',
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width};` };
        },
      },
      float: {
        default: 'none',
        parseHTML: element => element.style.float || 'none',
        renderHTML: attributes => {
          if (!attributes.float || attributes.float === 'none') return {};
          const margin = attributes.float === 'left' ? '0.5em 20px 0.5em 0' : '0.5em 0 0.5em 20px';
          return { style: `float: ${attributes.float}; margin: ${margin};` };
        },
      },
      display: {
        default: 'block',
        parseHTML: element => element.style.display || 'block',
        renderHTML: attributes => {
          let style = `display: ${attributes.display};`;
          if (attributes.display === 'block' && (!attributes.float || attributes.float === 'none')) {
            style += ' margin: 20px auto;';
          }
          return { style };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

