import { useState } from "react";

/** 照片缩略图 + 点击灯箱；旧照片只在各条记录内展示，不会被新记录覆盖 */
export default function PhotoGrid({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <div className="photos">
      {photos.map((src, i) => (
        <button
          type="button"
          key={i}
          className="photo-thumb"
          onClick={() => setIndex(i)}
          aria-label={`查看照片 ${i + 1}`}
        >
          <img src={src} alt={`蹄部照片 ${i + 1}`} />
        </button>
      ))}

      {index !== null && (
        <div className="lightbox" onClick={() => setIndex(null)} role="dialog" aria-modal="true">
          <button type="button" className="lightbox-close" onClick={() => setIndex(null)}>
            ✕ 关闭
          </button>
          <img src={photos[index]} alt="蹄部照片大图" onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && (
            <div className="lightbox-count">
              {index + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
