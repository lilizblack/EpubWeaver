import React, { useRef, useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

export default ({ node, updateAttributes, selected }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(node.attrs.width);
  const imgRef = useRef(null);

  const onMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.pageX;
    const startWidth = imgRef.current.clientWidth;
    const containerWidth = imgRef.current.parentElement.clientWidth;

    const onMouseMove = (e) => {
      const currentX = e.pageX;
      let diffX = currentX - startX;
      
      // If resizing from the left handles, the logic is inverted
      if (direction.includes('w')) diffX = -diffX;
      
      const newWidthPx = startWidth + diffX;
      const newWidthPct = Math.max(5, Math.min(100, (newWidthPx / containerWidth) * 100));
      
      setResizeWidth(`${newWidthPct}%`);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      updateAttributes({ width: `${parseFloat(resizeWidth).toFixed(1)}%` });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    setResizeWidth(node.attrs.width);
  }, [node.attrs.width]);

  const floatValue = node.attrs.float || 'none';
  const displayValue = node.attrs.display || (floatValue === 'none' ? 'block' : 'inline-block');

  const wrapperStyle = {
    display: displayValue,
    float: floatValue,
    margin: floatValue === 'left' ? '0.5em 20px 0.5em 0' : (floatValue === 'right' ? '0.5em 0 0.5em 20px' : '20px auto'),
    width: resizeWidth,
    position: 'relative',
    userSelect: 'none',
    transition: isResizing ? 'none' : 'width 0.2s ease-out, margin 0.2s',
    zIndex: selected ? 20 : 1,
    lineHeight: 0,
  };

  // Handle positioning
  const handleStyle = (pos) => ({
    position: 'absolute',
    width: '10px',
    height: '10px',
    background: '#d4af37',
    border: '1px solid white',
    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
    zIndex: 30,
    cursor: pos.includes('n') || pos.includes('s') ? (pos.includes('e') || pos.includes('w') ? `${pos}-resize` : 'ns-resize') : 'ew-resize',
    ... (pos.includes('n') ? { top: '-5px' } : pos.includes('s') ? { bottom: '-5px' } : { top: 'calc(50% - 5px)' }),
    ... (pos.includes('w') ? { left: '-5px' } : pos.includes('e') ? { right: '-5px' } : { left: 'calc(50% - 5px)' }),
  });

  return (
    <NodeViewWrapper style={wrapperStyle} className={`image-resizer-wrapper ${selected ? 'is-selected' : ''}`}>
      <div className="transform-bounding-box" style={{
        position: 'relative',
        outline: selected ? '2px dashed #d4af37' : 'none',
        outlineOffset: '2px',
        padding: '0',
        borderRadius: '2px',
      }}>
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: '4px',
            boxShadow: selected ? '0 10px 30px rgba(0,0,0,0.3)' : 'none',
            pointerEvents: 'none', // Allow clicking through to handle handles
          }}
        />
        
        {selected && (
          <>
            {/* Corners */}
            <div className="image-transform-handle" style={handleStyle('nw')} onMouseDown={(e) => onMouseDown(e, 'nw')} />
            <div className="image-transform-handle" style={handleStyle('ne')} onMouseDown={(e) => onMouseDown(e, 'ne')} />
            <div className="image-transform-handle" style={handleStyle('sw')} onMouseDown={(e) => onMouseDown(e, 'sw')} />
            <div className="image-transform-handle" style={handleStyle('se')} onMouseDown={(e) => onMouseDown(e, 'se')} />
            
            {/* Mid points */}
            <div className="image-transform-handle" style={handleStyle('n')} onMouseDown={(e) => onMouseDown(e, 'n')} />
            <div className="image-transform-handle" style={handleStyle('s')} onMouseDown={(e) => onMouseDown(e, 's')} />
            <div className="image-transform-handle" style={handleStyle('e')} onMouseDown={(e) => onMouseDown(e, 'e')} />
            <div className="image-transform-handle" style={handleStyle('w')} onMouseDown={(e) => onMouseDown(e, 'w')} />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};
