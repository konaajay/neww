// import { useState } from "react";

// const style = `
//   @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@400;500;600;700&display=swap');

//   * { box-sizing: border-box; margin: 0; padding: 0; }

//   body {
//     background: #f0f0f0;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     min-height: 100vh;
//     font-family: 'Montserrat', sans-serif;
//   }

//   .page-wrapper {
//     width: 100%;
//     padding: 24px;
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     gap: 24px;
//   }

//   /* ── Certificate Shell ─────────────────────────── */
//   .cert-shell {
//     width: 100%;
//     max-width: 960px;
//     aspect-ratio: 1.414 / 1;
//     position: relative;
//     background: #fff;
//     border: 10px solid #1a2a4a;
//     box-shadow: 0 8px 40px rgba(0,0,0,0.22);
//   }

//   /* Gold outer border line */
//   .cert-shell::before {
//     content: '';
//     position: absolute;
//     inset: 5px;
//     border: 2px solid #c9a227;
//     pointer-events: none;
//     z-index: 1;
//   }

//   /* ── ISO Seal (top right) ──────────────────────── */
//   .iso-seal {
//     position: absolute;
//     top: -2px;
//     right: 28px;
//     width: 100px;
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     z-index: 10;
//   }

//   .iso-ribbon {
//     width: 32px;
//     height: 48px;
//     background: linear-gradient(180deg, #1a2a4a 0%, #243558 100%);
//     clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%);
//     margin-bottom: -10px;
//     z-index: 2;
//   }

//   .iso-circle {
//     width: 82px;
//     height: 82px;
//     border-radius: 50%;
//     background: conic-gradient(
//       #c9a227 0deg,
//       #e8c84a 30deg,
//       #c9a227 60deg,
//       #e8c84a 90deg,
//       #c9a227 120deg,
//       #e8c84a 150deg,
//       #c9a227 180deg,
//       #e8c84a 210deg,
//       #c9a227 240deg,
//       #e8c84a 270deg,
//       #c9a227 300deg,
//       #e8c84a 330deg,
//       #c9a227 360deg
//     );
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     position: relative;
//     z-index: 3;
//   }

//   .iso-inner {
//     width: 66px;
//     height: 66px;
//     border-radius: 50%;
//     background: linear-gradient(145deg, #d4a820, #b8880f);
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     justify-content: center;
//     gap: 1px;
//   }

//   .iso-certified-top {
//     font-size: 5.5px;
//     font-family: 'Montserrat', sans-serif;
//     font-weight: 700;
//     color: #fff;
//     letter-spacing: 1px;
//     text-transform: uppercase;
//   }

//   .iso-number {
//     font-size: 15px;
//     font-family: 'Montserrat', sans-serif;
//     font-weight: 800;
//     color: #fff;
//     line-height: 1;
//   }

//   .iso-certified-bot {
//     font-size: 4.5px;
//     font-family: 'Montserrat', sans-serif;
//     font-weight: 700;
//     color: #fff;
//     letter-spacing: 1.5px;
//     text-transform: uppercase;
//   }

//   /* ── Hexagon watermark ─────────────────────────── */
//   .hex-watermark {
//     position: absolute;
//     top: 50%;
//     left: 50%;
//     transform: translate(-50%, -50%);
//     width: 38%;
//     opacity: 0.06;
//     z-index: 0;
//   }

//   /* ── Content ───────────────────────────────────── */
//   .cert-content {
//     position: relative;
//     z-index: 2;
//     width: 100%;
//     height: 100%;
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     padding: 32px 60px 24px;
//   }

//   /* Title */
//   .cert-title {
//     font-family: 'Cinzel', serif;
//     font-size: clamp(28px, 5.2vw, 52px);
//     font-weight: 600;
//     color: #1a2a4a;
//     letter-spacing: 0.25em;
//     text-align: center;
//     line-height: 1.1;
//     margin-bottom: 4px;
//   }

//   .cert-subtitle {
//     font-family: 'Montserrat', sans-serif;
//     font-size: clamp(10px, 1.6vw, 15px);
//     font-weight: 700;
//     color: #1a2a4a;
//     letter-spacing: 0.3em;
//     text-transform: uppercase;
//     text-align: center;
//   }

//   /* Ornament divider */
//   .ornament {
//     margin: 10px 0 8px;
//     color: #c9a227;
//     font-size: clamp(14px, 2vw, 20px);
//     letter-spacing: 8px;
//     text-align: center;
//   }

//   .certify-text {
//     font-family: 'EB Garamond', serif;
//     font-size: clamp(11px, 1.5vw, 14px);
//     color: #444;
//     letter-spacing: 0.05em;
//     text-align: center;
//     margin-bottom: 6px;
//   }

//   /* Student name */
//   .student-name {
//     font-family: 'EB Garamond', serif;
//     font-size: clamp(26px, 4.8vw, 48px);
//     font-weight: 700;
//     color: #1a1a1a;
//     text-align: center;
//     line-height: 1.1;
//     margin-bottom: 6px;
//   }

//   /* Diamond divider under name */
//   .diamond-divider {
//     display: flex;
//     align-items: center;
//     gap: 10px;
//     width: 55%;
//     margin-bottom: 12px;
//   }

//   .diamond-line {
//     flex: 1;
//     height: 1px;
//     background: #1a2a4a;
//   }

//   .diamond-icon {
//     color: #c9a227;
//     font-size: 14px;
//   }

//   /* Participation text */
//   .participation-text {
//     font-family: 'EB Garamond', serif;
//     font-size: clamp(10px, 1.55vw, 14.5px);
//     color: #333;
//     text-align: center;
//     line-height: 1.65;
//     max-width: 78%;
//     margin-bottom: 16px;
//   }

//   .webinar-highlight {
//     font-weight: 600;
//     color: #1a2a4a;
//   }

//   /* ── Bottom section ────────────────────────────── */
//   .cert-footer {
//     width: 100%;
//     display: flex;
//     align-items: flex-end;
//     justify-content: space-between;
//     padding: 0 8px;
//     flex: 1;
//   }

//   .sig-block {
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     gap: 2px;
//     min-width: 140px;
//   }

//   .sig-img {
//     font-family: 'EB Garamond', serif;
//     font-style: italic;
//     font-size: clamp(16px, 2.5vw, 24px);
//     color: #222;
//     line-height: 1.1;
//     margin-bottom: 2px;
//   }

//   .sig-line {
//     width: 120px;
//     height: 1px;
//     background: #333;
//     margin-bottom: 4px;
//   }

//   .sig-name {
//     font-family: 'Montserrat', sans-serif;
//     font-weight: 700;
//     font-size: clamp(8px, 1.1vw, 11px);
//     color: #1a1a1a;
//     letter-spacing: 0.05em;
//     text-align: center;
//   }

//   .sig-role {
//     font-family: 'Montserrat', sans-serif;
//     font-size: clamp(7px, 0.95vw, 9.5px);
//     color: #555;
//     text-align: center;
//   }

//   /* Logo center */
//   .logo-center {
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     gap: 4px;
//   }

//   .logo-circle {
//     width: clamp(44px, 7vw, 68px);
//     height: clamp(44px, 7vw, 68px);
//     border-radius: 50%;
//     background: linear-gradient(135deg, #4fc3f7, #1565c0);
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     box-shadow: 0 2px 8px rgba(0,0,0,0.15);
//   }

//   .logo-g {
//     font-family: 'Montserrat', sans-serif;
//     font-weight: 800;
//     font-size: clamp(20px, 3.2vw, 32px);
//     color: white;
//   }

//   .logo-name {
//     font-family: 'Montserrat', sans-serif;
//     font-weight: 700;
//     font-size: clamp(11px, 1.5vw, 15px);
//     color: #1565c0;
//     letter-spacing: 0.05em;
//   }

//   .logo-sub {
//     font-family: 'Montserrat', sans-serif;
//     font-size: clamp(8px, 1vw, 10px);
//     color: #666;
//     letter-spacing: 0.1em;
//   }

//   /* ── Bottom bar (cert ID + date) ───────────────── */
//   .cert-bottom-bar {
//     position: absolute;
//     bottom: 12px;
//     left: 22px;
//     right: 22px;
//     display: flex;
//     justify-content: space-between;
//     align-items: center;
//     z-index: 3;
//   }

//   .cert-meta {
//     font-family: 'Montserrat', sans-serif;
//     font-size: clamp(7.5px, 1vw, 10px);
//     color: #1a1a1a;
//   }

//   .cert-meta strong {
//     font-weight: 700;
//   }

//   /* ── Demo Controls ─────────────────────────────── */
//   .demo-panel {
//     width: 100%;
//     max-width: 960px;
//     background: #fff;
//     border-radius: 12px;
//     padding: 20px 28px;
//     box-shadow: 0 2px 12px rgba(0,0,0,0.1);
//     display: flex;
//     flex-wrap: wrap;
//     gap: 16px;
//     align-items: flex-end;
//   }

//   .field-group {
//     display: flex;
//     flex-direction: column;
//     gap: 5px;
//     flex: 1;
//     min-width: 180px;
//   }

//   .field-group label {
//     font-size: 11px;
//     font-weight: 600;
//     color: #666;
//     text-transform: uppercase;
//     letter-spacing: 0.08em;
//   }

//   .field-group input {
//     border: 1.5px solid #ddd;
//     border-radius: 6px;
//     padding: 8px 12px;
//     font-size: 13px;
//     font-family: 'Montserrat', sans-serif;
//     color: #222;
//     outline: none;
//     transition: border-color 0.2s;
//   }

//   .field-group input:focus {
//     border-color: #1a2a4a;
//   }

//   .demo-note {
//     font-size: 11px;
//     color: #888;
//     font-style: italic;
//     width: 100%;
//     margin-top: -8px;
//   }
// `;

// // Inline SVG hex shape for watermark
// const HexSVG = () => (
//   <svg viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <path
//       d="M100 5L190 55V155L100 205L10 155V55L100 5Z"
//       fill="#4fc3f7"
//       stroke="#4fc3f7"
//       strokeWidth="2"
//     />
//     <text
//       x="100" y="120"
//       textAnchor="middle"
//       fontSize="28"
//       fontFamily="Montserrat, sans-serif"
//       fontWeight="800"
//       fill="#4fc3f7"
//       opacity="0.5"
//     >
//       G
//     </text>
//   </svg>
// );

// export default function Certificate() {
//   // These would normally come from the backend / CSV
//   const [studentName, setStudentName] = useState("Name");
//   const [webinarName, setWebinarName] = useState("Campus to Corporate - Conference");
//   const [certificateId, setCertificateId] = useState("GTAWP001");
//   const [issueDate, setIssueDate] = useState("11-12-2025");

//   return (
//     <>
//       <style>{style}</style>
//       <div className="page-wrapper">

//         {/* ── Certificate ── */}
//         <div className="cert-shell">

//           {/* ISO Seal */}
//           <div className="iso-seal">
//             <div className="iso-ribbon" />
//             <div className="iso-circle">
//               <div className="iso-inner">
//                 <span className="iso-certified-top">CERTIFIED</span>
//                 <span className="iso-number">ISO 9001</span>
//                 <span className="iso-certified-bot">CERTIFIED</span>
//               </div>
//             </div>
//           </div>

//           {/* Hex watermark */}
//           <div className="hex-watermark">
//             <HexSVG />
//           </div>

//           {/* Main content */}
//           <div className="cert-content">
//             <div className="cert-title">CERTIFICATE</div>
//             <div className="cert-subtitle">of participation</div>

//             <div className="ornament">❧ ❦ ❧</div>

//             <div className="certify-text">This is to certify that</div>

//             <div className="student-name">{studentName}</div>

//             <div className="diamond-divider">
//               <div className="diamond-line" />
//               <span className="diamond-icon">◆</span>
//               <div className="diamond-line" />
//             </div>

//             <div className="participation-text">
//               has actively participated in the{" "}
//               <span className="webinar-highlight">{webinarName}</span>{" "}
//               verified by ISO 9001 – 2015.<br />
//               We appreciate the active involvement, enthusiasm, and valuable contribution to the conference.
//             </div>

//             {/* Footer signatures */}
//             <div className="cert-footer">
//               <div className="sig-block">
//                 <div className="sig-img">N. Surya</div>
//                 <div className="sig-line" />
//                 <div className="sig-name">N. SURYA</div>
//                 <div className="sig-role">Operational Manager</div>
//               </div>

//               <div className="logo-center">
//                 <div className="logo-circle">
//                   <span className="logo-g">G</span>
//                 </div>
//                 <div className="logo-name">Gyantrix</div>
//                 <div className="logo-sub">Academy</div>
//               </div>

//               <div className="sig-block">
//                 <div className="sig-img">Varalakshmi</div>
//                 <div className="sig-line" />
//                 <div className="sig-name">M. VARALAKSHMI</div>
//                 <div className="sig-role">Chief Operating Officer</div>
//               </div>
//             </div>
//           </div>

//           {/* Bottom meta bar */}
//           <div className="cert-bottom-bar">
//             <div className="cert-meta">
//               <strong>Certificate ID:</strong> {certificateId}
//             </div>
//             <div className="cert-meta">
//               <strong>Issued Date:</strong> {issueDate}
//             </div>
//           </div>
//         </div>

//         {/* ── Demo Controls (remove in production) ── */}
//         <div className="demo-panel">
//           <div className="field-group">
//             <label>Student Name (from CSV)</label>
//             <input
//               value={studentName}
//               onChange={e => setStudentName(e.target.value)}
//               placeholder="e.g. John Doe"
//             />
//           </div>
//           <div className="field-group">
//             <label>Webinar Name (from CSV)</label>
//             <input
//               value={webinarName}
//               onChange={e => setWebinarName(e.target.value)}
//               placeholder="e.g. Spring Boot Basics"
//             />
//           </div>
//           <div className="field-group">
//             <label>Certificate ID (from backend)</label>
//             <input
//               value={certificateId}
//               onChange={e => setCertificateId(e.target.value)}
//               placeholder="e.g. GTAWP1604260001"
//             />
//           </div>
//           <div className="field-group">
//             <label>Issue Date (from backend)</label>
//             <input
//               value={issueDate}
//               onChange={e => setIssueDate(e.target.value)}
//               placeholder="e.g. 16-04-2026"
//             />
//           </div>
//           <p className="demo-note">
//             ↑ Preview controls — in production, all values are injected from the backend API response.
//           </p>
//         </div>

//       </div>
//     </>
//   );
// }


import { useState } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: 'Montserrat', sans-serif;
  }

  .page-wrapper {
    width: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  /* ── Certificate Shell ─────────────────────────── */
  .cert-shell {
    width: 100%;
    max-width: 960px;
    aspect-ratio: 1.414 / 1;
    position: relative;
    background: #fff;
    border: 10px solid #1a2a4a;
    box-shadow: 0 8px 40px rgba(0,0,0,0.22);
  }

  /* Gold outer border line */
  .cert-shell::before {
    content: '';
    position: absolute;
    inset: 5px;
    border: 2px solid #c9a227;
    pointer-events: none;
    z-index: 1;
  }

  /* ── ISO Seal (top right) ──────────────────────── */
  .iso-seal {
    position: absolute;
    top: -2px;
    right: 28px;
    width: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;
  }

  .iso-ribbon {
    width: 32px;
    height: 48px;
    background: linear-gradient(180deg, #1a2a4a 0%, #243558 100%);
    clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%);
    margin-bottom: -10px;
    z-index: 2;
  }

  .iso-circle {
    width: 82px;
    height: 82px;
    border-radius: 50%;
    background: conic-gradient(
      #c9a227 0deg,
      #e8c84a 30deg,
      #c9a227 60deg,
      #e8c84a 90deg,
      #c9a227 120deg,
      #e8c84a 150deg,
      #c9a227 180deg,
      #e8c84a 210deg,
      #c9a227 240deg,
      #e8c84a 270deg,
      #c9a227 300deg,
      #e8c84a 330deg,
      #c9a227 360deg
    );
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 3;
  }

  .iso-inner {
    width: 66px;
    height: 66px;
    border-radius: 50%;
    background: linear-gradient(145deg, #d4a820, #b8880f);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
  }

  .iso-certified-top {
    font-size: 5.5px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    color: #fff;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .iso-number {
    font-size: 15px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 800;
    color: #fff;
    line-height: 1;
  }

  .iso-certified-bot {
    font-size: 4.5px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    color: #fff;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  /* ── Hexagon watermark ─────────────────────────── */
  .hex-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 38%;
    opacity: 0.06;
    z-index: 0;
  }

  /* ── Content ───────────────────────────────────── */
  .cert-content {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 60px 24px;
  }

  /* Title */
  .cert-title {
    font-family: 'Cinzel', serif;
    font-size: clamp(28px, 5.2vw, 52px);
    font-weight: 600;
    color: #1a2a4a;
    letter-spacing: 0.25em;
    text-align: center;
    line-height: 1.1;
    margin-bottom: 4px;
  }

  .cert-subtitle {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(10px, 1.6vw, 15px);
    font-weight: 700;
    color: #1a2a4a;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    text-align: center;
  }

  /* Ornament divider */
  .ornament {
    margin: 10px 0 8px;
    color: #c9a227;
    font-size: clamp(14px, 2vw, 20px);
    letter-spacing: 8px;
    text-align: center;
  }

  .certify-text {
    font-family: 'EB Garamond', serif;
    font-size: clamp(11px, 1.5vw, 14px);
    color: #444;
    letter-spacing: 0.05em;
    text-align: center;
    margin-bottom: 6px;
  }

  /* Student name */
  .student-name {
    font-family: 'EB Garamond', serif;
    font-size: clamp(26px, 4.8vw, 48px);
    font-weight: 700;
    color: #1a1a1a;
    text-align: center;
    line-height: 1.1;
    margin-bottom: 6px;
  }

  /* Diamond divider under name */
  .diamond-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 55%;
    margin-bottom: 12px;
  }

  .diamond-line {
    flex: 1;
    height: 1px;
    background: #1a2a4a;
  }

  .diamond-icon {
    color: #c9a227;
    font-size: 14px;
  }

  /* Participation text */
  .participation-text {
    font-family: 'EB Garamond', serif;
    font-size: clamp(10px, 1.55vw, 14.5px);
    color: #333;
    text-align: center;
    line-height: 1.65;
    max-width: 78%;
    margin-bottom: 16px;
  }

  .webinar-highlight {
    font-weight: 600;
    color: #1a2a4a;
  }

  /* ── Bottom section ────────────────────────────── */
  .cert-footer {
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0 8px;
    flex: 1;
  }

  .sig-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 140px;
  }

  .sig-img {
    font-family: 'EB Garamond', serif;
    font-style: italic;
    font-size: clamp(16px, 2.5vw, 24px);
    color: #222;
    line-height: 1.1;
    margin-bottom: 2px;
  }

  .sig-line {
    width: 120px;
    height: 1px;
    background: #333;
    margin-bottom: 4px;
  }

  .sig-name {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: clamp(8px, 1.1vw, 11px);
    color: #1a1a1a;
    letter-spacing: 0.05em;
    text-align: center;
  }

  .sig-role {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(7px, 0.95vw, 9.5px);
    color: #555;
    text-align: center;
  }

  /* Logo center */
  .logo-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .logo-circle {
    width: clamp(44px, 7vw, 68px);
    height: clamp(44px, 7vw, 68px);
    border-radius: 50%;
    background: linear-gradient(135deg, #4fc3f7, #1565c0);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  .logo-g {
    font-family: 'Montserrat', sans-serif;
    font-weight: 800;
    font-size: clamp(20px, 3.2vw, 32px);
    color: white;
  }

  .logo-name {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: clamp(11px, 1.5vw, 15px);
    color: #1565c0;
    letter-spacing: 0.05em;
  }

  .logo-sub {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(8px, 1vw, 10px);
    color: #666;
    letter-spacing: 0.1em;
  }

  /* ── Bottom bar (cert ID + date) ───────────────── */
  .cert-bottom-bar {
    position: absolute;
    bottom: 12px;
    left: 22px;
    right: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 3;
  }

  .cert-meta {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(7.5px, 1vw, 10px);
    color: #1a1a1a;
  }

  .cert-meta strong {
    font-weight: 700;
  }

  /* ── Demo Controls ─────────────────────────────── */
  .demo-panel {
    width: 100%;
    max-width: 960px;
    background: #fff;
    border-radius: 12px;
    padding: 20px 28px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    min-width: 180px;
  }

  .field-group label {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .field-group input {
    border: 1.5px solid #ddd;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    font-family: 'Montserrat', sans-serif;
    color: #222;
    outline: none;
    transition: border-color 0.2s;
  }

  .field-group input:focus {
    border-color: #1a2a4a;
  }

  .demo-note {
    font-size: 11px;
    color: #888;
    font-style: italic;
    width: 100%;
    margin-top: -8px;
  }
`;

// Inline SVG hex shape for watermark
const HexSVG = () => (
  <svg viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M100 5L190 55V155L100 205L10 155V55L100 5Z"
      fill="#4fc3f7"
      stroke="#4fc3f7"
      strokeWidth="2"
    />
    <text
      x="100" y="120"
      textAnchor="middle"
      fontSize="28"
      fontFamily="Montserrat, sans-serif"
      fontWeight="800"
      fill="#4fc3f7"
      opacity="0.5"
    >
      G
    </text>
  </svg>
);

export default function Certificate() {
  // These would normally come from the backend / CSV
  const [studentName, setStudentName] = useState("Name");
  const [webinarName, setWebinarName] = useState("Campus to Corporate - Conference");
  const [certificateId, setCertificateId] = useState("GTAWP001");
  const [issueDate, setIssueDate] = useState("11-12-2025");

  return (
    <>
      <style>{style}</style>
      <div className="page-wrapper">

        {/* ── Certificate ── */}
        <div className="cert-shell">

          {/* ISO Seal */}
          <div className="iso-seal">
            <div className="iso-ribbon" />
            <div className="iso-circle">
              <div className="iso-inner">
                <span className="iso-certified-top">CERTIFIED</span>
                <span className="iso-number">ISO 9001</span>
                <span className="iso-certified-bot">CERTIFIED</span>
              </div>
            </div>
          </div>

          {/* Hex watermark */}
          <div className="hex-watermark">
            <HexSVG />
          </div>

          {/* Main content */}
          <div className="cert-content">
            <div className="cert-title">CERTIFICATE</div>
            <div className="cert-subtitle">of participation</div>

            <div className="ornament">❧ ❦ ❧</div>

            <div className="certify-text">This is to certify that</div>

            <div className="student-name">{studentName}</div>

            <div className="diamond-divider">
              <div className="diamond-line" />
              <span className="diamond-icon">◆</span>
              <div className="diamond-line" />
            </div>

            <div className="participation-text">
              has actively participated in the{" "}
              <span className="webinar-highlight">{webinarName}</span>{" "}
              verified by ISO 9001 – 2015.<br />
              We appreciate the active involvement, enthusiasm, and valuable contribution to the conference.
            </div>

            {/* Footer signatures */}
            <div className="cert-footer">
              <div className="sig-block">
                <div className="sig-img">N. Surya</div>
                <div className="sig-line" />
                <div className="sig-name">N. SURYA</div>
                <div className="sig-role">Operational Manager</div>
              </div>

              <div className="logo-center">
                <div className="logo-circle">
                  <span className="logo-g">G</span>
                </div>
                <div className="logo-name">Gyantrix</div>
                <div className="logo-sub">Academy</div>
              </div>

              <div className="sig-block">
                <div className="sig-img">Varalakshmi</div>
                <div className="sig-line" />
                <div className="sig-name">M. VARALAKSHMI</div>
                <div className="sig-role">Chief Operating Officer</div>
              </div>
            </div>
          </div>

          {/* Bottom meta bar */}
          <div className="cert-bottom-bar">
            <div className="cert-meta">
              <strong>Certificate ID:</strong> {certificateId}
            </div>
            <div className="cert-meta">
              <strong>Issued Date:</strong> {issueDate}
            </div>
          </div>
        </div>

        {/* ── Demo Controls (remove in production) ── */}
        <div className="demo-panel">
          <div className="field-group">
            <label>Student Name (from CSV)</label>
            <input
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="field-group">
            <label>Webinar Name (from CSV)</label>
            <input
              value={webinarName}
              onChange={e => setWebinarName(e.target.value)}
              placeholder="e.g. Spring Boot Basics"
            />
          </div>
          <div className="field-group">
            <label>Certificate ID (from backend)</label>
            <input
              value={certificateId}
              onChange={e => setCertificateId(e.target.value)}
              placeholder="e.g. GTAWP1604260001"
            />
          </div>
          <div className="field-group">
            <label>Issue Date (from backend)</label>
            <input
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              placeholder="e.g. 16-04-2026"
            />
          </div>
          <p className="demo-note">
            ↑ Preview controls — in production, all values are injected from the backend API response.
          </p>
        </div>

      </div>
    </>
  );
}


