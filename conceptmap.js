import React, { useState } from 'react';
import ConceptMapTree from './ConceptMapTree';

function ConceptMap() {
  const [slides, setSlides] = useState([]);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [slideTree, setSlideTree] = useState(null);
  const [finalTree, setFinalTree] = useState(null);
  const [file, setFile] = useState(null);

  // 1. PDF 업로드 → 슬라이드 리스트 받기
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setFile(file);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/extract-slides', { method: 'POST', body: formData });
    const data = await res.json();
    setSlides(data.slides);
    setSelectedSlide(null);
    setSlideTree(null);
    setFinalTree(null);
  };

  // 2. 슬라이드 클릭 → 개념지도 요청
  const handleSlideClick = async (slide) => {
    setSelectedSlide(slide);
    const res = await fetch('/analyze-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slide_text: slide.text, slide_title: slide.title })
    });
    const data = await res.json();
    setSlideTree(data);
    setFinalTree(null);
  };

  // 3. 최종 개념지도 요청
  const handleFinalConceptMap = async () => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/analyze-pdf', { method: 'POST', body: formData });
    const data = await res.json();
    setFinalTree(data.concept_map_tree || data); // 트리 구조
    setSlideTree(null);
    setSelectedSlide(null);
  };

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <div style={{ display: 'flex' }}>
        <div style={{ width: 250 }}>
          <h3>목차(슬라이드)</h3>
          <ul>
            {slides.map(slide => (
              <li key={slide.index} onClick={() => handleSlideClick(slide)} style={{ cursor: 'pointer', margin: 4, background: selectedSlide?.index === slide.index ? '#e3f2fd' : '' }}>
                {slide.title}
              </li>
            ))}
          </ul>
          <button onClick={handleFinalConceptMap} disabled={!file}>최종 개념지도</button>
        </div>
        <div style={{ flex: 1 }}>
          <h3>
            {finalTree
              ? '최종 개념지도'
              : selectedSlide
              ? `슬라이드: ${selectedSlide.title}`
              : '개념지도'}
          </h3>
          {slideTree && <ConceptMapTree data={slideTree} />}
          {finalTree && <ConceptMapTree data={finalTree} />}
        </div>
      </div>
    </div>
  );
}

export default ConceptMap;