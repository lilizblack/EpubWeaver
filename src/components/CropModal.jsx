import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Crop, X, Check, RotateCcw, Loader } from 'lucide-react';

const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
const MIN_PCT = 5;

const CURSORS = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  w: 'ew-resize',                    e: 'ew-resize',
  sw: 'nesw-resize', s: 'ns-resize', se: 'nwse-resize',
  move: 'move',
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Convert any image URL to a local data URL so canvas can read its pixels
// without hitting the cross-origin security restriction.
async function toDataUrl(src) {
  if (!src) return src;
  // Already a local format — no fetch needed
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function CropModal({ src, onApply, onClose }) {
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);

  const [box, setBox] = useState({ l: 10, t: 10, r: 90, b: 90 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [localSrc, setLocalSrc] = useState(null);   // resolved local data URL
  const [loadError, setLoadError] = useState(null);

  // ── Convert src to local data URL on mount ───────────────────────
  useEffect(() => {
    setImgLoaded(false);
    setLoadError(null);
    setLocalSrc(null);
    toDataUrl(src)
      .then(url => setLocalSrc(url))
      .catch(() => {
        // fetch itself failed (e.g. network error or strict CORS with no redirect)
        // Try loading the original src directly; canvas crop will still fail for
        // tainted images, but at least the modal UI will show the image.
        setLocalSrc(src);
        setLoadError('This image is hosted on a server that blocks cross-origin requests. Crop may not work. Try downloading and re-uploading the image.');
      });
  }, [src]);

  // ── Drag handlers ────────────────────────────────────────────────
  const startDrag = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, startBox: { ...box }, rect };
  }, [box]);

  const onMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const { handle, startX, startY, startBox, rect } = dragRef.current;

    const dx = ((e.clientX - startX) / rect.width) * 100;
    const dy = ((e.clientY - startY) / rect.height) * 100;

    setBox(() => {
      let { l, t, r, b } = startBox;
      if (handle === 'move') {
        const bw = r - l, bh = b - t;
        l = clamp(startBox.l + dx, 0, 100 - bw);
        t = clamp(startBox.t + dy, 0, 100 - bh);
        r = l + bw;
        b = t + bh;
      } else {
        if (handle.includes('w')) l = clamp(startBox.l + dx, 0, startBox.r - MIN_PCT);
        if (handle.includes('e')) r = clamp(startBox.r + dx, startBox.l + MIN_PCT, 100);
        if (handle.includes('n')) t = clamp(startBox.t + dy, 0, startBox.b - MIN_PCT);
        if (handle.includes('s')) b = clamp(startBox.b + dy, startBox.t + MIN_PCT, 100);
      }
      return { l, t, r, b };
    });
  }, []);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // ── Reset crop ───────────────────────────────────────────────────
  const resetCrop = () => setBox({ l: 10, t: 10, r: 90, b: 90 });

  // ── Aspect ratio presets ─────────────────────────────────────────
  const applyRatio = (ratio) => { // ratio = w/h, null = free
    if (!ratio) { resetCrop(); return; }
    const img = imgRef.current;
    if (!img) return;
    const natRatio = img.naturalWidth / img.naturalHeight;
    // Find largest centered box satisfying the aspect ratio
    let bw, bh;
    if (ratio > natRatio) {
      bw = 80; bh = bw / ratio * natRatio;
    } else {
      bh = 80; bw = bh * ratio / natRatio;
    }
    const l = (100 - bw) / 2, t = (100 - bh) / 2;
    setBox({ l, t, r: l + bw, b: t + bh });
  };

  // ── Apply crop via canvas ────────────────────────────────────────
  const applyCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    const cropX = (box.l / 100) * natW;
    const cropY = (box.t / 100) * natH;
    const cropW = ((box.r - box.l) / 100) * natW;
    const cropH = ((box.b - box.t) / 100) * natH;

    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext('2d');

    try {
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      onApply(canvas.toDataURL('image/png'));
    } catch {
      setLoadError('Crop failed: the image server blocks pixel access. Download and re-upload the image to crop it.');
    }
  };

  const bw = box.r - box.l;
  const bh = box.b - box.t;
  const isLoading = !localSrc;

  return (
    <div className="crop-overlay" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div className="crop-modal-box">

        {/* Header */}
        <div className="crop-modal-header">
          <div className="flex items-center gap-2">
            <Crop size={16} />
            <span>Crop Image</span>
          </div>
          <button className="crop-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Error / warning banner */}
        {loadError && (
          <div className="crop-error-banner">
            ⚠️ {loadError}
          </div>
        )}

        {/* Aspect ratio presets */}
        <div className="crop-ratios">
          {[
            { label: 'Free', ratio: null },
            { label: '1:1',  ratio: 1 },
            { label: '4:3',  ratio: 4/3 },
            { label: '16:9', ratio: 16/9 },
            { label: '3:4',  ratio: 3/4 },
            { label: '2:3',  ratio: 2/3 },
          ].map(({ label, ratio }) => (
            <button key={label} className="crop-ratio-btn" onClick={() => applyRatio(ratio)}>
              {label}
            </button>
          ))}
        </div>

        {/* Canvas area */}
        <div className="crop-canvas-area">
          {isLoading ? (
            <div className="crop-loading">
              <Loader size={28} className="crop-spinner" />
              <span>Loading image…</span>
            </div>
          ) : (
            <div ref={wrapRef} className="crop-img-wrapper">
              {/* Base image — localSrc is a data URL, canvas can always read it */}
              <img
                ref={imgRef}
                src={localSrc}
                className="crop-base-img"
                draggable={false}
                onLoad={() => setImgLoaded(true)}
              />

              {imgLoaded && (
                <>
                  {/* Dark shades outside the crop box */}
                  <div className="crop-shade" style={{ top:0, left:0, right:0, height:`${box.t}%` }} />
                  <div className="crop-shade" style={{ top:`${box.b}%`, left:0, right:0, bottom:0 }} />
                  <div className="crop-shade" style={{ top:`${box.t}%`, left:0, width:`${box.l}%`, height:`${bh}%` }} />
                  <div className="crop-shade" style={{ top:`${box.t}%`, left:`${box.r}%`, right:0, height:`${bh}%` }} />

                  {/* Crop box */}
                  <div
                    className="crop-box"
                    style={{ left:`${box.l}%`, top:`${box.t}%`, width:`${bw}%`, height:`${bh}%`, cursor: CURSORS.move }}
                    onMouseDown={e => startDrag(e, 'move')}
                  >
                    <div className="crop-thirds-h" style={{ top:'33.33%' }} />
                    <div className="crop-thirds-h" style={{ top:'66.66%' }} />
                    <div className="crop-thirds-v" style={{ left:'33.33%' }} />
                    <div className="crop-thirds-v" style={{ left:'66.66%' }} />

                    {HANDLES.map(h => (
                      <div
                        key={h}
                        className={`crop-handle crop-handle-${h}`}
                        style={{ cursor: CURSORS[h] }}
                        onMouseDown={e => startDrag(e, h)}
                      />
                    ))}
                  </div>

                  <div className="crop-dims-hint">
                    {Math.round(bw)}% × {Math.round(bh)}%
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="crop-modal-footer">
          <button className="crop-btn-reset" onClick={resetCrop}>
            <RotateCcw size={14} /> Reset
          </button>
          <div className="flex gap-3">
            <button className="crop-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="crop-btn-apply" onClick={applyCrop} disabled={isLoading}>
              <Check size={16} /> Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
