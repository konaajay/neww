import { useState, useRef, useEffect } from "react";
import gyantrixLogo from "./../assets/gy1-png.png";
import isoLogo from "./../assets/iso-new-badge.png";

const EditableText = ({ value, onChange, style, isReadOnly = false }) => {
  const [editing, setEditing] = useState(false);
  const ref = useRef();

  const handleClick = () => {
    if (isReadOnly) return;
    setEditing(true);
    setTimeout(() => ref.current && ref.current.focus(), 0);
  };

  const handleBlur = () => setEditing(false);

  const commonStyle = {
    ...style,
    outline: editing ? "2px dashed #c9a84c" : "none",
    cursor: isReadOnly ? "default" : "text",
    background: editing ? "rgba(201,168,76,0.06)" : "transparent",
    borderRadius: "3px",
    padding: "2px 6px",
    minWidth: "40px",
    display: "inline-block",
    transition: "outline 0.2s",
  };

  return (
    <span
      ref={ref}
      contentEditable={!isReadOnly}
      suppressContentEditableWarning
      onInput={(e) => onChange && onChange(e.currentTarget.textContent)}
      onBlur={handleBlur}
      onClick={handleClick}
      style={commonStyle}
      title={isReadOnly ? "" : "Click to edit"}
    >
      {value}
    </span>
  );
};

const GLogoCertificateTemplate = ({
  studentName = "Name of Recipient",
  certificateId = "GTAWP001",
  issueDate = "11-12-2025",
  courseName = "Professional Certification Program",
  bodyLine1: propBodyLine1,
  bodyLine2: propBodyLine2,
  isReadOnly = false
}) => {
  // Use state only if not read-only, otherwise use props directly
  const [localName, setLocalName] = useState(studentName);
  const [localCertId, setLocalCertId] = useState(certificateId);
  const [localIssuedDate, setLocalIssuedDate] = useState(issueDate);
  const [localBodyLine1, setLocalBodyLine1] = useState(
    propBodyLine1 || `has actively participated in the ${courseName} verified by ISO 9001 – 2015.`
  );
  const [localBodyLine2, setLocalBodyLine2] = useState(
    propBodyLine2 || "We appreciate the active involvement, enthusiasm, and valuable contribution to the conference."
  );

  // Sync state if props change (for designer preview)
  useEffect(() => { setLocalName(studentName); }, [studentName]);
  useEffect(() => { setLocalCertId(certificateId); }, [certificateId]);
  useEffect(() => { setLocalIssuedDate(issueDate); }, [issueDate]);
  useEffect(() => {
    if (propBodyLine1) setLocalBodyLine1(propBodyLine1);
    else setLocalBodyLine1(`has actively participated in the ${courseName} verified by ISO 9001 – 2015.`);
  }, [propBodyLine1, courseName]);
  useEffect(() => { setLocalBodyLine2(propBodyLine2 || "We appreciate the active involvement, enthusiasm, and valuable contribution to the conference."); }, [propBodyLine2]);

  const containerRef = useRef(null);
  const nameContainerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [nameFontSize, setNameFontSize] = useState(44);

  // Responsive scaling logic
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setScale(entry.contentRect.width / 900);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-shrink student name font size to fit on one line
  useEffect(() => {
    const el = nameContainerRef.current;
    if (!el) return;
    const MIN_SIZE = 20;
    let size = 44;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.clientWidth && size > MIN_SIZE) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
    setNameFontSize(size);
  }, [localName]);

  return (
    <div ref={containerRef} style={{ width: "100%", aspectRatio: "900 / 656", position: "relative" }}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;500;600;700&display=swap');`}
      </style>

      <div style={{
        boxSizing: "border-box",
        width: "900px", height: "656px",
        transform: `scale(${scale})`, transformOrigin: "top left",
        position: "absolute", top: 0, left: 0,
        padding: "16px", background: "#0d1b3e",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}>
        <div style={{
          boxSizing: "border-box", width: "100%", height: "100%",
          background: "linear-gradient(90deg, #b8860b 0%, #ffd700 20%, #daa520 40%, #ffd700 60%, #b8860b 80%, #ffd700 100%)",
          padding: "6px"
        }}>
          <div style={{
            boxSizing: "border-box", width: "100%", height: "100%",
            backgroundColor: "#ffffff", padding: "24px 56px 16px",
            position: "relative",
          }}>
            {/* Watermark */}
            <div style={{ position: "absolute", top: "42%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.055, zIndex: 0 }}>
              <img src={gyantrixLogo} alt="" style={{ width: "340px", height: "340px", objectFit: "contain" }} />
            </div>

            {/* ISO Badge */}
            <div style={{ position: "absolute", top: "0px", right: "48px", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "110px" }}>
              <div style={{ width: "32px", height: "46px", backgroundColor: "#0d1b3e", position: "relative", zIndex: 1 }} />
              <div style={{ position: "relative", marginTop: "-52px", zIndex: 3 }}>
                <img src={isoLogo} alt="ISO" style={{ width: "225px", height: "225px", objectFit: "contain", filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.4))" }} />
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Header */}
              <div style={{ textAlign: "center", paddingTop: "24px" }}>
                <h1 style={{ fontSize: "48px", letterSpacing: "8px", color: "#0d1b3e", margin: "0 0 2px", fontWeight: "700", fontFamily: "'Times New Roman', serif" }}>CERTIFICATE</h1>
                <p style={{ fontSize: "17px", letterSpacing: "2px", color: "#0d1b3e", margin: "0 0 14px", fontWeight: "700", fontFamily: "Arial" }}>OF PARTICIPATION</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "14px" }}>
                  <div style={{ height: "1px", width: "80px", background: "linear-gradient(90deg, transparent, #c9a84c)" }} />
                  <div style={{ width: "7px", height: "7px", background: "#c9a84c", transform: "rotate(45deg)" }} />
                  <div style={{ height: "1px", width: "80px", background: "linear-gradient(90deg, #c9a84c, transparent)" }} />
                </div>
                <p style={{ fontSize: "14px", color: "#444", fontStyle: "italic", marginBottom: "8px" }}>This is to certify that</p>
                <div
                  ref={nameContainerRef}
                  style={{
                    margin: "0 0 4px",
                    fontSize: `${nameFontSize}px`,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  <EditableText isReadOnly={isReadOnly} value={localName} onChange={setLocalName} style={{ fontSize: "inherit", fontWeight: "700", color: "#111", display: "inline", textAlign: "center" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", margin: "6px auto 14px", width: "260px" }}>
                  <div style={{ height: "1px", flex: 1, background: "#c9a84c" }} />
                  <div style={{ width: "4px", height: "4px", background: "#c9a84c", transform: "rotate(45deg)" }} />
                  <div style={{ height: "1px", flex: 1, background: "#c9a84c" }} />
                </div>
              </div>

              {/* Body */}
              <div style={{ textAlign: "center", marginBottom: "22px" }}>
                <p style={{ fontSize: "13.5px", color: "#333", lineHeight: "1.85", fontWeight: "500", fontFamily: "Montserrat" }}>
                  <EditableText isReadOnly={isReadOnly} value={localBodyLine1} onChange={setLocalBodyLine1} style={{ fontSize: "13.5px" }} /><br />
                  <EditableText isReadOnly={isReadOnly} value={localBodyLine2} onChange={setLocalBodyLine2} style={{ fontSize: "13.5px" }} />
                </p>
              </div>

              {/* Signatures */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "22px" }}>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: "25px", color: "#0a2540", marginBottom: "10px" }}>N. Surya</div>
                  <div style={{ width: "150px", margin: "0 auto", borderTop: "1.5px solid #222", paddingTop: "8px" }}>
                    <div style={{ fontWeight: "700", fontSize: "12px", color: "#0d1b3e" }}>N. SURYA</div>
                    <div style={{ fontSize: "11px", color: "#444" }}>Operational Manager</div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <img src={gyantrixLogo} alt="" style={{ width: "90px", height: "90px", marginBottom: "4px" }} />
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#3a8fd4" }}>Gyantrix</div>
                  <div style={{ fontSize: "14px", color: "#7060c0" }}>Academy</div>
                </div>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: "25px", color: "#0a2540", marginBottom: "10px" }}>Varalakshmi</div>
                  <div style={{ width: "150px", margin: "0 auto", borderTop: "1.5px solid #222", paddingTop: "8px" }}>
                    <div style={{ fontWeight: "700", fontSize: "12px", color: "#0d1b3e" }}>M. VARALAKSHMI</div>
                    <div style={{ fontSize: "11px", color: "#444" }}>Chief Operating Officer</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#222" }}>
                <div><strong>Cert ID:</strong> <EditableText isReadOnly={isReadOnly} value={localCertId} onChange={setLocalCertId} /></div>
                <div><strong>Date:</strong> <EditableText isReadOnly={isReadOnly} value={localIssuedDate} onChange={setLocalIssuedDate} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GLogoCertificateTemplate;
