// pages/index.js
import { useEffect, useMemo, useState } from "react";

// --- KONFIGURASI ---
const WA_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb6vaF6HVvTjeIcC723R";
const WA_CHANNEL_NAME = "Riff_fhh;
const DEV_NAME = "Udinaj";
const LOGO_URL = "https://h.top4top.io/p_3755kaoxf0.jpg"; // Foto Profil

const PLATFORM_BG = {
  default: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=1600&q=80",
  tiktok: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1600&q=80",
  instagram: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1600&q=80",
  youtube: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=1600&q=80",
  facebook: "https://images.unsplash.com/photo-1611162618071-b39a2ec05542?auto=format&fit=crop&w=1600&q=80",
  x: "https://images.unsplash.com/photo-1611605698383-ee9845280d39?auto=format&fit=crop&w=1600&q=80",
  spotify: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=1600&q=80",
};

// --- LOGIC FUNCTIONS ---
function detectPlatform(url = "") {
  const u = (url || "").toLowerCase();
  if (u.includes("tiktok")) return "tiktok";
  if (u.includes("instagram")) return "instagram";
  if (u.includes("youtu")) return "youtube";
  if (u.includes("facebook") || u.includes("fb.watch")) return "facebook";
  if (u.includes("twitter") || u.includes("x.com")) return "x";
  if (u.includes("spotify")) return "spotify";
  return "default";
}

function clampText(text = "", limit = 240) {
  if (!text) return { short: "", isLong: false };
  const isLong = text.length > limit;
  return { short: isLong ? text.slice(0, limit) + "…" : text, isLong };
}

function shortUrl(url = "", limit = 72) {
  if (!url) return "";
  return url.length > limit ? url.slice(0, limit) + "…" : url;
}

function safeFilename(str = "") {
  return (str || "").replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
}

function normalizeQuality(q = "") {
  const s = (q || "").toLowerCase();
  if (s.includes("no_watermark") || s.includes("nowatermark")) return "No Watermark";
  if (s.includes("watermark")) return "Watermark";
  if (s.includes("original")) return "Original";
  return q || "Standard"; 
}

function getQualityScore(quality = "", type = "") {
  const q = quality.toLowerCase();
  let score = 0;
  if (q.includes("8k") || q.includes("4320")) score += 100;
  else if (q.includes("4k") || q.includes("2160")) score += 90;
  else if (q.includes("2k") || q.includes("1440")) score += 80;
  else if (q.includes("1080")) score += 70;
  else if (q.includes("720")) score += 60;
  else if (q.includes("480")) score += 50;
  else if (q.includes("360")) score += 40;
  else if (q.includes("240")) score += 30;
  else if (q.includes("144")) score += 20;

  if (type === "audio") {
    if (q.includes("320")) score += 50;
    else if (q.includes("256")) score += 40;
    else if (q.includes("192")) score += 30;
    else if (q.includes("128")) score += 20;
    else score += 10;
  }
  if (q.includes("no watermark") || q.includes("nowatermark")) score += 1000;
  if (q.includes("hd") && !q.match(/\d/)) score += 65; 
  return score;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFullTitle, setShowFullTitle] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    setPlatform(detectPlatform(url));
  }, [url]);

  const bg = PLATFORM_BG[platform] || PLATFORM_BG.default;
  const title = data?.title || "";
  const { short: shortTitle, isLong: titleLong } = clampText(title, 260);

  const medias = useMemo(() => {
    let list = (data?.medias || []).map((m) => ({
      ...m,
      qualityLabel: normalizeQuality(m.quality || ""),
      score: getQualityScore(m.quality || "", m.type)
    }));
    if (typeFilter !== "all") {
      list = list.filter((m) => m.type === typeFilter);
    }
    list.sort((a, b) => b.score - a.score);
    return list;
  }, [data, typeFilter]);

  async function onSubmit() {
    setError("");
    setData(null);
    setShowFullTitle(false);
    const u = url.trim();
    if (!u) return setError("Tempelkan link dulu, ya.");
    if (!/^https?:\/\//i.test(u)) return setError("Link harus diawali http:// atau https://");

    setLoading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const txt = await res.text();
      let json;
      try { json = JSON.parse(txt); } catch { throw new Error("Server Error: Invalid JSON response."); }
      
      if (!res.ok || json?.error) throw new Error(json?.error || "Gagal mengambil media.");
      if (!json?.medias?.length) throw new Error("Media tidak ditemukan.");

      setData({
        title: json.title || "",
        source: json.source || u,
        medias: (json.medias || []).filter((m) => m?.url && m?.type).map((m) => ({
          type: m.type, url: m.url, quality: m.quality || "",
        })),
      });
    } catch (e) {
      setError(String(e?.message || e));
    }
    setLoading(false);
  }

  function openPreview(item) { setPreviewItem(item); setPreviewOpen(true); }
  function closePreview() { setPreviewOpen(false); setPreviewItem(null); }
  function buildDownloadLink(item) {
    const name = safeFilename(`${item.type}${item.quality ? "-" + item.quality : ""}`);
    return `/api/proxy?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(name || "download")}`;
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brandLeft">
          <div className="logoWrapper">
            <img src={LOGO_URL} alt="Profile" className="brandLogo" />
          </div>
          <div className="brandText">
            <span className="brandName">{DEV_NAME}</span>
            <span className="brandSub">Dev Tools</span>
          </div>
        </div>
        <div className="systemStatus">
          <div className="statusDot" />
          <span className="statusText">Online</span>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="heroMain" style={{ backgroundImage: `url(${bg})` }}>
        <div className="heroOverlay" />
        
        <div className="heroContent">
          <div className="heroTexts">
            <h1 className="heroTitle">
              Universal Media <br />
              <span className="textGradient">Downloader</span>
            </h1>
            <p className="heroDesc">
              Simpan video, musik, dan foto dari berbagai platform sosial media. Kualitas terbaik, diurutkan otomatis untuk Anda.
            </p>
          </div>

          <div className="inputCard glass">
            <div className="inputLabel">
              Detected Platform: <span className="platformBadge">{platform === 'default' ? 'Auto' : platform.toUpperCase()}</span>
            </div>
            
            <div className="inputRow">
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste link video/post disini..."
                inputMode="url"
              />
              <button className="btnMain" onClick={onSubmit} disabled={loading}>
                {loading ? "Process..." : "Download"}
              </button>
            </div>
            
            {error && <div className="errorMsg">⚠️ {error}</div>}
            
            <div className="inputFooter">
              Support: TikTok • IG • YT • FB • Twitter • Spotify
            </div>
          </div>
        </div>
      </section>

      {/* HASIL DOWNLOAD */}
      {data && (
        <section className="contentSection slideUp">
          <div className="panel">
            <div className="panelTop">
              <h2 className="panelH2">Results Found</h2>
              
              <div className="filtersWrap">
                <div className="filters">
                  {["all", "video", "image", "audio"].map((t) => (
                    <button
                      key={t}
                      className={typeFilter === t ? "chip chipActive" : "chip"}
                      onClick={() => setTypeFilter(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="metaInfo">
              <div className="metaRow">
                <span className="metaLabel">Title</span>
                <span className="metaValue">
                  {title ? (
                    <>
                      {showFullTitle ? title : shortTitle}
                      {titleLong && (
                        <span className="seeMore" onClick={() => setShowFullTitle((v) => !v)}>
                          {showFullTitle ? " Hide" : " ...More"}
                        </span>
                      )}
                    </>
                  ) : "-"}
                </span>
              </div>
            </div>

            <div className="list">
              {medias.map((m, i) => (
                <div className="item" key={i}>
                  <div className="left">
                    <div className="typeRow">
                      <span className={`typeTag ${m.type}`}>{m.type}</span>
                      <span className="qualityTag">
                         {m.quality ? m.quality : "Standard"}
                      </span>
                    </div>
                    <div className="urlPreview">{shortUrl(m.url, 40)}</div>
                  </div>
                  <div className="actions">
                    <button className="btnSec" onClick={() => openPreview(m)}>Preview</button>
                    <a className="btnPri" href={buildDownloadLink(m)}>Download</a>
                  </div>
                </div>
              ))}
              {!medias.length && <div className="emptyState">Format ini tidak tersedia.</div>}
            </div>
          </div>
        </section>
      )}

      {/* FITUR & WHATSAPP */}
      {!data && (
        <section className="contentSection">
          
          <div className="featureGrid">
            <div className="featureCard">
              <div className="fIconBox">⚡</div>
              <div className="fContent">
                <div className="fTitle">Ultra Fast</div>
                <div className="fDesc">Proses instan dengan prioritas koneksi tinggi.</div>
              </div>
            </div>
            <div className="featureCard">
              <div className="fIconBox">🛡️</div>
              <div className="fContent">
                <div className="fTitle">Secure</div>
                <div className="fDesc">Tanpa log, tanpa tracking. Privasi 100% aman.</div>
              </div>
            </div>
            <div className="featureCard">
              <div className="fIconBox">✨</div>
              <div className="fContent">
                <div className="fTitle">Best Quality</div>
                <div className="fDesc">Otomatis memilih resolusi tertinggi (hingga 4K).</div>
              </div>
            </div>
          </div>

          <div className="waCardWrapper">
            <div className="waCard">
                <div className="waBgImage" style={{backgroundImage: `url(${LOGO_URL})`}}></div>
                <div className="waOverlay"></div>
                
                <div className="waContentInner">
                    <div className="waTop">
                        <div className="waIconCircle">
                            {/* FIX: MENGGUNAKAN GAMBAR PNG WHATSAPP AGAR PASTI MUNCUL */}
                            <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/120px-WhatsApp.svg.png" 
                                alt="WhatsApp" 
                                style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
                            />
                        </div>
                        <div className="waMeta">
                            <span className="waTag">OFFICIAL CHANNEL</span>
                            <h3 className="waTitle">{WA_CHANNEL_NAME}</h3>
                            <span className="waSub">By: {DEV_NAME}</span>
                        </div>
                    </div>
                    
                    <p className="waDesc">
                        Gabung komunitas kami untuk update fitur terbaru, request tools, dan info menarik lainnya.
                    </p>
                    
                    <a className="waBtn" href={WA_CHANNEL_URL} target="_blank" rel="noreferrer">
                        Gabung Channel
                    </a>
                </div>
            </div>
          </div>

        </section>
      )}

      <footer className="footer">
        <p>© {new Date().getFullYear()} {DEV_NAME} • Soft UI Edition</p>
      </footer>

      {/* MODAL */}
      {previewOpen && previewItem && (
        <div className="modalBackdrop" onMouseDown={closePreview}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <span className="modalHTitle">Media Preview</span>
              <button className="modalClose" onClick={closePreview}>✕</button>
            </div>
            <div className="modalContent">
              {previewItem.type === "image" && <img className="modalMedia" src={previewItem.url} alt="preview" />}
              {previewItem.type === "video" && <video className="modalMedia" src={previewItem.url} controls autoPlay />}
              {previewItem.type === "audio" && <audio className="modalAudio" src={previewItem.url} controls autoPlay />}
            </div>
            <div className="modalFooter">
              <a className="modalBtnDownload" href={buildDownloadLink(previewItem)}>Download Now</a>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        html, body {
          margin: 0; padding: 0;
          background: #050505;
          color: #f0f0f0;
          font-family: 'Inter', -apple-system, sans-serif;
          overflow-x: hidden;
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>

      <style jsx>{`
        .page { min-height: 100vh; display: flex; flex-direction: column; }

        .header {
          position: absolute; top: 0; left: 0; right: 0;
          padding: 24px 28px;
          display: flex; justify-content: space-between; align-items: center;
          z-index: 50;
        }
        .brandLeft { display: flex; align-items: center; gap: 14px; }
        .logoWrapper {
            width: 42px; height: 42px; border-radius: 50%; overflow: hidden;
            border: 2px solid rgba(255,255,255,0.1);
            transition: transform 0.3s ease;
        }
        .logoWrapper:hover { transform: scale(1.05); border-color: rgba(255,255,255,0.3); }
        .brandLogo { width: 100%; height: 100%; object-fit: cover; }
        .brandText { display: flex; flex-direction: column; justify-content: center; }
        .brandName { font-weight: 700; font-size: 15px; color: #fff; letter-spacing: 0.3px; }
        .brandSub { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 500; }

        .systemStatus {
            display: flex; align-items: center; gap: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 6px 14px; border-radius: 100px;
            backdrop-filter: blur(10px);
        }
        .statusDot {
            width: 6px; height: 6px; background-color: #00ff9d;
            border-radius: 50%; box-shadow: 0 0 10px rgba(0,255,157,0.4);
            animation: pulse 2s infinite;
        }
        .statusText { font-size: 11px; font-weight: 600; color: #00ff9d; }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

        /* HERO REVISI: JARAK DIKURANGI */
        .heroMain {
          position: relative; 
          min-height: 60vh; /* Dikurangi biar dekat */
          display: flex; align-items: center; justify-content: center;
          background-size: cover; background-position: center;
          padding: 100px 20px 40px;
        }
        .heroOverlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(5,5,5,0.8) 0%, #050505 100%);
        }
        .heroContent {
          position: relative; z-index: 2; width: min(680px, 100%);
          display: flex; flex-direction: column; gap: 40px; text-align: center;
        }
        .heroTitle {
          font-size: clamp(36px, 7vw, 60px); margin: 0; line-height: 1.15; font-weight: 800; letter-spacing: -1.5px;
        }
        .textGradient {
          background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .heroDesc { font-size: 16px; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.6; font-weight: 400; }

        .inputCard {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px; padding: 28px;
          box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5);
          transition: transform 0.3s ease;
        }
        .inputCard:hover { transform: translateY(-2px); }
        .inputLabel { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 14px; text-align: left; font-weight: 500; }
        .platformBadge { color: #4facfe; font-weight: 700; }
        
        .inputRow { display: flex; gap: 12px; }
        .input {
          flex: 1; background: rgba(0,0,0,0.2); 
          border: 1px solid rgba(255,255,255,0.1);
          color: white; padding: 16px 20px; border-radius: 16px; font-size: 15px; outline: none;
          transition: all 0.3s;
        }
        .input:focus { 
            border-color: rgba(79, 172, 254, 0.5); 
            background: rgba(0,0,0,0.4);
            box-shadow: 0 0 15px rgba(79, 172, 254, 0.1);
        }
        .btnMain {
          background: white; color: black; font-weight: 700; border: none;
          padding: 16px 32px; border-radius: 16px; cursor: pointer; font-size: 15px;
          transition: all 0.2s;
        }
        .btnMain:hover { transform: scale(1.02); box-shadow: 0 5px 15px rgba(255,255,255,0.2); }
        .btnMain:disabled { opacity: 0.6; cursor: wait; transform: none; }
        .errorMsg { text-align: left; color: #ff6b6b; margin-top: 12px; font-size: 13px; padding-left: 4px; }
        .inputFooter { margin-top: 20px; font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.5px; }

        /* CONTENT: PAD TOP 0 SUPAYA NEMPEL */
        .contentSection { width: min(800px, 100%); margin: 0 auto; padding: 0 20px 60px; }

        .featureGrid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px; margin-bottom: 50px;
        }
        .featureCard {
          display: flex; align-items: flex-start; gap: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 24px; border-radius: 20px;
          transition: all 0.3s ease;
        }
        .featureCard:hover {
            background: rgba(255, 255, 255, 0.04);
            transform: translateY(-5px);
            border-color: rgba(255, 255, 255, 0.08);
        }
        .fIconBox {
            font-size: 22px;
            background: rgba(255,255,255,0.05);
            width: 44px; height: 44px;
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .fTitle { font-weight: 700; font-size: 15px; color: #fff; margin-bottom: 4px; }
        .fDesc { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.5; }

        .waCard {
          position: relative; border-radius: 24px; overflow: hidden;
          min-height: 220px; border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 15px 40px rgba(0,0,0,0.4);
        }
        .waBgImage {
            position: absolute; inset: 0; background-size: cover; background-position: center;
            transform: scale(1.0);
        }
        .waOverlay {
            position: absolute; inset: 0;
            background: rgba(0,0,0,0.7);
        }
        .waContentInner {
            position: relative; z-index: 2; padding: 32px;
            display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
            height: 100%; gap: 24px;
        }
        .waTop { display: flex; align-items: center; gap: 18px; }
        
        .waIconCircle {
            width: 56px; height: 56px; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center;
            border: 2px solid rgba(255,255,255,0.15); background: #25D366;
            box-shadow: 0 5px 15px rgba(37, 211, 102, 0.4);
        }
        
        .waMeta { display: flex; flex-direction: column; }
        .waTag { font-size: 10px; color: #25D366; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
        .waTitle { font-size: 18px; font-weight: 700; color: #fff; margin: 0; }
        .waSub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; }
        .waDesc { font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.6; max-width: 480px; margin: 0; }
        
        .waBtn {
            background: #25D366; color: #000; text-decoration: none;
            padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px;
            transition: all 0.2s; box-shadow: 0 4px 20px rgba(37, 211, 102, 0.2);
        }
        .waBtn:hover { transform: translateY(-2px); background: #20bd5a; }

        @media (max-width: 600px) {
            .inputRow { flex-direction: column; }
            .waContentInner { align-items: center; text-align: center; }
            .waTop { flex-direction: column; gap: 12px; }
        }

        .panel {
          background: rgba(20, 20, 20, 0.5);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.06); padding: 24px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
        }
        .panelH2 { margin: 0; font-size: 18px; font-weight: 700; color: #fff; }
        .filtersWrap { margin-top: 16px; }
        .chip {
          background: rgba(255,255,255,0.04); border: 1px solid transparent; color: #888;
          padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .chip:hover { background: rgba(255,255,255,0.08); }
        .chipActive { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.1); }
        
        .metaInfo { margin: 24px 0; padding: 16px 20px; background: rgba(255,255,255,0.02); border-radius: 16px; }
        .metaRow { display: flex; flex-direction: column; gap: 6px; }
        .metaLabel { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.4); }
        .metaValue { font-size: 14px; color: #fff; line-height: 1.5; }
        .seeMore { cursor: pointer; color: #4facfe; font-size: 12px; }

        .list { display: flex; flex-direction: column; gap: 14px; }
        .item {
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
          background: rgba(255,255,255,0.02); 
          border: 1px solid rgba(255,255,255,0.04);
          padding: 18px; border-radius: 18px;
          transition: background 0.2s;
        }
        .item:hover { background: rgba(255,255,255,0.04); }
        
        .typeTag { font-size: 10px; font-weight: 800; background: rgba(255,255,255,0.1); color: #fff; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; margin-right: 8px; }
        .qualityTag { font-size: 12px; color: #4facfe; font-weight: 600; }
        .urlPreview { font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 6px; }
        
        .btnPri, .btnSec {
          padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s;
        }
        .btnSec { background: transparent; color: #ccc; border: 1px solid rgba(255,255,255,0.1); }
        .btnSec:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
        .btnPri { background: #fff; color: #000; margin-left: 10px; border: none; }
        .btnPri:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,255,255,0.1); }

        .footer { padding: 40px 0 30px; text-align: center; }
        .footer p { font-size: 12px; color: rgba(255,255,255,0.2); }

        .modalBackdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          backdrop-filter: blur(15px); z-index: 100;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal {
          width: min(600px, 100%); background: #111; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.6);
        }
        .modalHeader { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; }
        .modalHTitle { font-weight: 700; color: #fff; font-size: 16px; }
        .modalClose { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; opacity: 0.5; transition: opacity 0.2s; }
        .modalClose:hover { opacity: 1; }
        .modalContent { padding: 24px; display: flex; justify-content: center; background: #000; }
        .modalMedia { max-width: 100%; max-height: 60vh; border-radius: 12px; }
        .modalFooter { padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: flex-end; background: #111; }
        .modalBtnDownload { background: #fff; color: #000; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 700; }
        
        .slideUp { animation: slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
