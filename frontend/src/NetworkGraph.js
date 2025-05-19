// // NetworkGraph.js
// import React, { useEffect, useRef, useState } from "react";
// import { Network } from "vis-network";

// function NetworkGraph({ nodes, edges }) {
//   const container = useRef(null);
//   const networkRef = useRef(null);
//   const [searchInput, setSearchInput] = useState("");
//   const [search, setSearch] = useState("");
//   const [highlighted, setHighlighted] = useState({ nodes: [], edges: [] });
//   const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: "" });

//   // 검색/하이라이트
//   useEffect(() => {
//     if (!search) {
//       setHighlighted({ nodes: [], edges: [] });
//       return;
//     }
//     const lower = search.toLowerCase();
//     const matchedNodes = nodes.filter(
//       n => n.label.toLowerCase().includes(lower) ||
//            (n.description && n.description.toLowerCase().includes(lower))
//     ).map(n => n.id);
//     const matchedEdges = edges.filter(
//       e => (e.label && e.label.toLowerCase().includes(lower)) ||
//            matchedNodes.includes(e.source) || matchedNodes.includes(e.target)
//     ).map((_, i) => i);
//     setHighlighted({ nodes: matchedNodes, edges: matchedEdges });
//   }, [search, nodes, edges]);

//   useEffect(() => {
//     if (!container.current) return;
//     const data = {
//       nodes: nodes.map(n => ({
//         id: n.id,
//         label: (() => {
//           let label = Array.isArray(n.label) ? n.label[0] : n.label;
//           if (typeof label === "string" && label.length > 20) {
//             return label.slice(0, 20) + "...";
//           }
//           return label;
//         })(),
//         group: n.group,
//         shape: n.group === 1 ? "ellipse" : n.group === 2 ? "box" : "dot",
//         size: n.size,
//         color: highlighted.nodes.includes(n.id)
//           ? { background: "#ffeb3b", border: "#f44336" }
//           : n.color,
//         font: n.font
//       })),
//       edges: edges.map((e, i) => ({
//         from: e.source,
//         to: e.target,
//         color: highlighted.edges.includes(i)
//           ? { color: "#f44336", highlight: "#f44336" }
//           : (e.type === "main2subtopic"
//               ? "#2b7ce9"
//               : e.type === "subtopic2keyword"
//                 ? "#7ec7f7"
//                 : e.type === "상위-하위"
//                   ? "#4caf50"
//                   : e.type === "원인-결과"
//                     ? "#ff9800"
//                     : e.type === "동의어"
//                       ? "#9c27b0"
//                       : "#aaa"),
//         width: e.type === "main2subtopic" ? 3 : 2,
//         arrows: "to",
//         label: e.label || (e.type && e.type !== "subtopic2keyword" && e.type !== "main2subtopic" ? e.type : "")
//       }))
//     };
//     const options = {
//       height: "900px",
//       width: "1800px",
//       nodes: {
//         font: { size: 16 }
//       },
//       edges: {
//         smooth: true,
//         font: { size: 14, align: "middle" }
//       },
//       physics: {
//         enabled: true,
//         barnesHut: {
//           gravitationalConstant: -30000,
//           centralGravity: 0.3,
//           springLength: 180,
//           springConstant: 0.04,
//           damping: 0.09
//         },
//         stabilization: { iterations: 250 }
//       },
//       interaction: {
//         dragNodes: true,
//         dragView: true,
//         zoomView: true,
//         navigationButtons: true,
//         keyboard: true,
//         tooltipDelay: 100
//       }
//     };
//     if (networkRef.current) {
//       networkRef.current.destroy();
//     }
//     networkRef.current = new Network(container.current, data, options);
//     setTimeout(() => {
//       networkRef.current.fit({ animation: true });

//       // HiDPI(고해상도) 대응: 캔버스 픽셀 수 조정
//       const canvas = container.current.querySelector("canvas");
//       if (canvas) {
//         const ratio = window.devicePixelRatio || 1;
//         canvas.style.width = "1800px";
//         canvas.style.height = "900px";
//         canvas.width = 1800 * ratio;
//         canvas.height = 900 * ratio;
//         const ctx = canvas.getContext("2d");
//         ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
//         if (networkRef.current) {
//           networkRef.current.setSize("1800px", "900px");
//           networkRef.current.redraw();
//         }
//       }
//     }, 300);

//     // 노드 툴팁
//     networkRef.current.on("hoverNode", function(params) {
//       const node = nodes.find(n => n.id === params.node);
//       if (node && node.description) {
//         // 툴팁 표시 (예: alert, 커스텀 div 등)
//       }
//     });
//     networkRef.current.on("blurNode", function() {
//       setTooltip({ show: false, x: 0, y: 0, text: "" });
//     });
//     // 엣지 툴팁
//     networkRef.current.on("hoverEdge", function(params) {
//       const edge = edges[params.edge];
//       if (edge && edge.label) {
//         setTooltip({
//           show: true,
//           x: params.event.center.x,
//           y: params.event.center.y,
//           text: `관계유형: ${edge.label}`
//         });
//       }
//     });
//     networkRef.current.on("blurEdge", function() {
//       setTooltip({ show: false, x: 0, y: 0, text: "" });
//     });
//   }, [nodes, edges, highlighted]);

//   // 검색 적용 함수
//   const handleSearch = () => setSearch(searchInput);

//   // 엔터키로 검색 적용
//   const handleInputKeyDown = (e) => {
//     if (e.key === "Enter") handleSearch();
//   };

//   // 이미지 다운로드 함수
//   const handleDownload = () => {
//     if (!networkRef.current) return;
//     const canvas = container.current.querySelector("canvas");
//     if (!canvas) {
//       alert("캔버스를 찾을 수 없습니다.");
//       return;
//     }
//     const url = canvas.toDataURL("image/png");
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = "concept_map.png";
//     link.click();
//   };

//   return (
//     <div style={{ textAlign: "center" }}>
//       <input
//         type="text"
//         placeholder="개념어/설명/관계유형 검색..."
//         value={searchInput}
//         onChange={e => setSearchInput(e.target.value)}
//         onKeyDown={handleInputKeyDown}
//         style={{
//           margin: "10px 0 10px 0",
//           padding: "8px 14px",
//           fontSize: "16px",
//           width: 320,
//           border: "1px solid #bbb",
//           borderRadius: 6
//         }}
//       />
//       <button
//         onClick={handleSearch}
//         style={{
//           margin: "10px 0 10px 16px",
//           padding: "8px 18px",
//           fontSize: "16px",
//           background: "#2b7ce9",
//           color: "#fff",
//           border: "none",
//           borderRadius: "6px",
//           cursor: "pointer"
//         }}
//       >
//         검색
//       </button>
//       <button
//         onClick={handleDownload}
//         style={{
//           margin: "10px 0 10px 16px",
//           padding: "8px 18px",
//           fontSize: "16px",
//           background: "#2b7ce9",
//           color: "#fff",
//           border: "none",
//           borderRadius: "6px",
//           cursor: "pointer"
//         }}
//       >
//         개념맵 이미지 다운로드
//       </button>
//       <div
//         ref={container}
//         style={{
//           height: "900px",
//           width: "1800px",
//           border: "1px solid #eee",
//           margin: "0 auto",
//           background: "#fff"
//         }}
//       />
//       {tooltip.show && (
//         <div
//           style={{
//             position: "fixed",
//             left: tooltip.x + 30,
//             top: tooltip.y + 30,
//             background: "#222",
//             color: "#fff",
//             padding: "8px 14px",
//             borderRadius: 8,
//             fontSize: 15,
//             zIndex: 1000,
//             whiteSpace: "pre-line",
//             pointerEvents: "none"
//           }}
//         >
//           {tooltip.text}
//         </div>
//       )}
//     </div>
//   );
// }

// export default NetworkGraph;