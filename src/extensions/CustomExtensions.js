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
      defaultLineHeight: '1.6',
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
            default: 0.2,
            parseHTML: element => parseFloat(element.style.textIndent) || 0.2,
            renderHTML: attributes => {
              if (!attributes.indent) return { style: 'text-indent: 0.2em' };
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
      defaultSpacing: '20',
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          spacing: {
            default: null,
            parseHTML: element => element.style.marginBottom?.replace('px', ''),
            renderHTML: attributes => {
              if (!attributes.spacing) return {};
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
