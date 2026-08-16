/**
 * PORTFOLIO — MAIN.JS
 * Topographic contour lines, original slot machine, and PERFECT SVG Liquid Mask.
 */
(function () {
  'use strict';

  /* ── DOM ───────────────────────────────────────────────── */
  let body, bgCanvas, bgCtx, nameDisplay, portraitIllus, portraitSection, slideGroup, cursorDot, cursorRing;
  let nameSection = null, portraitFrame = null;
  let illustrationCanvas = null, illustrationCtx = null;
  let portrecizimImg = null;
  let blobs = []; // SVG likit damlaları

  /* ── CONSTANTS ─────────────────────────────────────────── */
  const CHARS      = 'آابتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';
  const NAMES      = { left: 'رهیــــاد', right: 'رهیــــاد' };
  const MOUSE_EASE = 0.08;   
  const RING_EASE  = 0.12;    
  const SLIDE_EASE = 0.045;   
  const SLIDE_PX   = 250;     
  const MASK_EASE  = 0.012; // Lando/Inspira tarzı lastik gibi süzülme hızı
  const PARALLAX_X = 10;    // mouse inverse — right → video left
  const FLUID_HOVER_ENABLED = false; // موقت: پخش fluid با هاور غیرفعال
  window.FLUID_HOVER_ENABLED = FLUID_HOVER_ENABLED;

  /* ── STATE ─────────────────────────────────────────────── */
  let rawX = 0.5, rawY = 0.5;
  let smoothX = 0.5, smoothY = 0.5;
  let rawRingX = -200, rawRingY = -200;
  let mouseX = -200, mouseY = -200;
  // sessionStorage'dan başlangıç pozisyonu — transition sırasında sürekli yazılır
  { const _mx = parseFloat(sessionStorage.getItem('mx')||'');
    const _my = parseFloat(sessionStorage.getItem('my')||'');
    if (!isNaN(_mx) && !isNaN(_my)) { mouseX = _mx; mouseY = _my; rawRingX = _mx; rawRingY = _my; }
  }
  let currentSide = null, currentName = '', isAnimatingName = false;
  let idleTimer = null, isIdle = true, idleT = 0, bgTime = 0;
  let prevMouseX = 0, prevMouseY = 0;
  let idleFluidTimer = 0;
  let _hGrid = null; // marching-squares height field cache
  let _isMobile = window.innerWidth < 768;
  let _bgFrameSkip = 0;

  // Parallax + tilt
  let smoothTiltX = 0, smoothTiltY = 0;
  let smoothParaX = 0, smoothParaY = 0, smoothParaName = 0; // separate easing for depth
  let parallaxReady = false;

  // Menu morphing (positions for 6px dots in 48×48px button)
  const MENU_FORMATIONS = [
    // Grid 3×3 (center-to-center gap 11px)
    [[10,10],[21,10],[32,10],[10,21],[21,21],[32,21],[10,32],[21,32],[32,32]],
    // Ring (center 21,21 radius 13)
    [[21,8],[29,11],[34,19],[32,28],[25,33],[17,33],[9,28],[8,19],[11,11]],
    // Plus / Cross
    [[21,7],[21,13],[7,21],[13,21],[21,21],[29,21],[35,21],[21,29],[21,35]],
    // Diagonal scatter
    [[5,4],[21,6],[37,4],[7,21],[21,21],[35,21],[5,37],[21,35],[37,37]],
  ];
  let _menuFormIdx = 0;

  function applyMenuFormation(idx) {
    const spans = document.querySelectorAll('.menu-dots span');
    const f = MENU_FORMATIONS[idx];
    spans.forEach((s, i) => { s.style.left = f[i][0] + 'px'; s.style.top = f[i][1] + 'px'; });
  }

  // ── Canlı ayar objesi — fluid.js display shader okur ────
  window.BgConfig = {
    GRAY_R    : 194,   // gri renk R (0–255)
    GRAY_G    : 194,   // gri renk G (0–255)
    GRAY_B    : 194,   // gri renk B (0–255)
    EDGE_LOW  : 0.08,  // fluid sınır başlangıcı
    EDGE_HIGH : 0.09,  // sadece 0.01 aralık = kenar beyazlığı yok
  };
  let slideOffset = 0, targetSlide = 0, slideReady = false;
  let maskX = 0.5, maskY = 0.38, tgtMaskX = 0.5, tgtMaskY = 0.38;

  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── 1. SOLID TEXT FOR FARSI CONNECTED CHARS ───────────── */
  function buildSlots(name, animate = false) {
    if (!nameDisplay) return;
    nameDisplay.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'name-char-solid';
    span.textContent = name;
    nameDisplay.appendChild(span);
    isAnimatingName = false;
  }

  function animateNameChange(newName) {
    if (!nameDisplay) return;
    if (currentName === newName) return;
    currentName = newName;
    buildSlots(newName, false);
  }

 
  /* ── 2. BACKGROUND ── */
  function resizeBgCanvas() {
    // The canvas lives in the React tree, so it can be gone by the time a
    // resize or the rAF loop reaches this — cached at init, null afterwards.
    if (!bgCanvas) return;
    bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight;
  }

  function drawBackground(dt) {
    return; // background animation disabled — full-width video is the backdrop
  }


  /* ── 3. SVG LİKİT MASKE MOTORU (Kopuk Halkaları Çözen Sistem) ── */
  function updateLiquidMask() {
    if (!portraitIllus || !blobs[0]) return;
    const rect = portraitIllus.getBoundingClientRect();
    if (rect.width === 0) return;

    const localX = (maskX * window.innerWidth) - rect.left;
    const localY = (maskY * window.innerHeight) - rect.top;
    const t = bgTime;

    const positions = [
      { x: localX,                                           y: localY },
      { x: localX + Math.sin(t * 2.8) * 140,                y: localY + Math.cos(t * 6.2) * 140 },
      { x: localX + Math.cos(t * 2.2) * 130,                y: localY + Math.sin(t * 2.8) * 150 },
      { x: localX - Math.sin(t * 3.1) * 120,                y: localY - Math.cos(t * 2.1) * 160 },
      { x: localX + Math.cos(t * 4.0) * 110,                y: localY - Math.sin(t * 3.5) * 130 },
      { x: localX - Math.cos(t * 1.9) * 135,                y: localY + Math.sin(t * 4.1) * 115 },
    ];

    blobs.forEach((blob, i) => {
      if (blob) {
        blob.setAttribute('cx', positions[i].x);
        blob.setAttribute('cy', positions[i].y);
      }
    });
  }

  /* ── 4. IDLE & LOOP ── */
  function getIdleMask(dt) {
    idleT += dt;
    return { x: 0.5 + Math.cos(idleT * 0.44) * 0.32, y: 0.38 + Math.sin(idleT * 0.63) * 0.30 };
  }

  let lastTs = 0;
  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05); lastTs = ts;

    smoothX = lerp(smoothX, rawX, MOUSE_EASE); smoothY = lerp(smoothY, rawY, MOUSE_EASE);

    if (isIdle) {
      const idle = getIdleMask(dt);
      tgtMaskX = idle.x; tgtMaskY = idle.y;

      // ── İNAKTİF: fluid portre etrafında orbital dolaşır ──
      if (FLUID_HOVER_ENABLED && window.FluidSim) {
        idleFluidTimer += dt;
        const IDLE_INTERVAL = 0.038; // ~26 Hz
        if (idleFluidTimer >= IDLE_INTERVAL) {
          idleFluidTimer = 0;
          const cx = window.innerWidth  * 0.50;
          const cy = window.innerHeight * 0.44;
          const baseR = Math.min(window.innerWidth, window.innerHeight) * 0.15;
          // 3 streamer farklı hız ve yarıçap — lissajous benzeri yörüngeler
          [
            { spd: 0.52, r: baseR * 1.00, ph: 0.00 },
            { spd: 0.33, r: baseR * 1.55, ph: Math.PI * 0.667 },
            { spd: 0.74, r: baseR * 0.72, ph: Math.PI * 1.333 },
          ].forEach(s => {
            const ang = idleT * s.spd + s.ph;
            const sx  = cx + Math.cos(ang) * s.r;
            const sy  = cy + Math.sin(ang) * s.r;
            // tanjansiyel hız → akışkan swirl hissi
            const vx  = -Math.sin(ang) * s.spd * 0.0018;
            const vy  =  Math.cos(ang) * s.spd * 0.0018;
            window.FluidSim.splat(sx, sy, vx, vy);
          });
        }
      }
    } else {
      tgtMaskX = rawX; tgtMaskY = rawY;
      idleFluidTimer = 0; // idle çıkınca sıfırla
    }

    // Maskenin fareyi bir sıvı gibi geriden takip etmesi
    maskX = lerp(maskX, tgtMaskX, MASK_EASE);
    maskY = lerp(maskY, tgtMaskY, MASK_EASE);

    drawBackground(dt);
    updateLiquidMask();

    if (slideReady) {
      slideOffset = lerp(slideOffset, targetSlide, SLIDE_EASE);
      slideGroup.style.transform = `translateX(${slideOffset.toFixed(2)}px)`;
    }

    // ── Cursor ring: lerp in RAF so ring smoothly follows dot ──
    rawRingX += (mouseX - rawRingX) * RING_EASE;
    rawRingY += (mouseY - rawRingY) * RING_EASE;
    cursorRing.style.left = rawRingX.toFixed(2) + 'px';
    cursorRing.style.top  = rawRingY.toFixed(2) + 'px';

    // ── Menu dots: fluid menü üzerindeyse beyaz ──
    {
      const menuEl = document.getElementById('menuDots');
      if (menuEl && window.FluidSim && window.FluidSim.getFluidAlpha) {
        const mr  = menuEl.getBoundingClientRect();
        const mcx = (mr.left + mr.right)  / 2;
        const mcy = (mr.top  + mr.bottom) / 2;
        const alpha = window.FluidSim.getFluidAlpha(mcx, mcy);
        menuEl.classList.toggle('fluid-over', alpha > 0.08);
      }
    }

    // ── Illustration canvas: fluid-masked portrecizim ──
    if (window.HomePageConfig && window.HomePageConfig.illustrationEnabled === false) {
      if (illustrationCanvas) illustrationCtx && illustrationCtx.clearRect(0, 0, illustrationCanvas.width, illustrationCanvas.height);
    } else if (illustrationCtx && portrecizimImg && portrecizimImg.complete && portrecizimImg.naturalWidth > 0) {
      const fluidEl = document.getElementById('fluidCanvas');
      const frameRect = portraitFrame ? portraitFrame.getBoundingClientRect() : null;
      if (fluidEl && frameRect && frameRect.width > 0) {
        const cw = Math.round(frameRect.width);
        const ch = Math.round(frameRect.height);
        if (illustrationCanvas.width !== cw || illustrationCanvas.height !== ch) {
          illustrationCanvas.width  = cw;
          illustrationCanvas.height = ch;
        }
        const imgAR  = portrecizimImg.naturalWidth / portrecizimImg.naturalHeight;
        const canAR  = cw / ch;
        let dw, dh, dx, dy;
        if (imgAR > canAR) {
          dw = cw; dh = cw / imgAR;
          dx = 0;  dy = ch - dh;
        } else {
          dh = ch; dw = ch * imgAR;
          dx = (cw - dw) / 2; dy = 0;
        }
        illustrationCtx.clearRect(0, 0, cw, ch);
        illustrationCtx.drawImage(portrecizimImg, dx, dy, dw, dh);
        illustrationCtx.globalCompositeOperation = 'destination-in';
        illustrationCtx.drawImage(
          fluidEl,
          frameRect.left, frameRect.top, frameRect.width, frameRect.height,
          0, 0, cw, ch
        );
        illustrationCtx.globalCompositeOperation = 'source-over';
      }
    }

    // 3D tilt kaldırıldı

    // ── Video stays centered — no horizontal parallax ──
    if (parallaxReady && portraitSection) {
      if (portraitSection.classList.contains('portrait-section--video')) {
        portraitSection.style.transform = 'none';
      } else {
        portraitSection.style.transform = 'translateX(-50%) translateY(0)';
      }
      if (nameSection) {
        nameSection.style.transform = 'translateY(0)';
      }
    }

    requestAnimationFrame(loop);
  }

  /* ── ETKİLEŞİMLER ── */
  function setupEvents() {
    document.addEventListener('mousemove', (e) => {
      // WebGL Fluid splat
      if (FLUID_HOVER_ENABLED && window.FluidSim) {
        const dx = (e.clientX - prevMouseX) / window.innerWidth;
        const dy = (e.clientY - prevMouseY) / window.innerHeight;
        window.FluidSim.splat(e.clientX, e.clientY, dx, dy);
      }
      prevMouseX = e.clientX; prevMouseY = e.clientY;

      rawX = e.clientX / window.innerWidth; rawY = e.clientY / window.innerHeight;

      const isRTL = document.documentElement.dir === 'rtl';
      let side;
      if (rawX < 0.4) side = isRTL ? 'right' : 'left';
      else if (rawX > 0.6) side = isRTL ? 'left' : 'right';
      else side = 'center';
      if (side !== currentSide) {
        currentSide = side;
        targetSlide = 0;
        body.classList.remove('cursor-left', 'cursor-right');
        if (side === 'left') { body.classList.add('cursor-left'); }
        else if (side === 'right') { body.classList.add('cursor-right'); }
      }

      isIdle = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { isIdle = true; }, 2200);

      cursorDot.style.left = e.clientX + 'px'; cursorDot.style.top = e.clientY + 'px';
      mouseX = e.clientX; mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', () => { isIdle = true; });

    window.addEventListener('resize', () => {
      resizeBgCanvas();
      _isMobile = window.innerWidth < 768;
    });
  }

  async function initPortraitVideo() {
    const video = document.getElementById('portraitBase');
    if (!video || video.tagName !== 'VIDEO') return;

    const desktopSrc = '/assets/videos/loop-opt.mp4';
    const mobileSrc = '/assets/videos/loop-mobile.mp4';
    const isMobile = window.innerWidth <= 768;

    const applySrc = (src) => {
      video.src = src;
      while (video.firstChild) video.removeChild(video.firstChild);
      video.load();
      video.play().catch(() => {});
    };

    if (!isMobile) return;

    try {
      const res = await fetch(mobileSrc, { method: 'HEAD' });
      if (res.ok) applySrc(mobileSrc);
    } catch (_) { /* keep desktop source from markup */ }
  }

  /* ── INIT (HATA ÇÖZÜLDÜ: SVG body yüklendikten sonra ekleniyor) ── */
  function init() {
    body = document.body;
    bgCanvas = document.getElementById('bgCanvas');
    bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
    nameDisplay = document.getElementById('nameDisplay');
    portraitIllus = document.getElementById('portraitIllustration');
    portraitSection = document.getElementById('portraitSection');
    portraitFrame = document.getElementById('portraitFrame');
    nameSection = document.getElementById('nameSection');
    illustrationCanvas = document.getElementById('illustrationCanvas');
    if (illustrationCanvas) illustrationCtx = illustrationCanvas.getContext('2d');
    portrecizimImg = new Image();
    portrecizimImg.src = 'assets/images/portrecizim.webp';

    // ── Load homePage settings from Sanity ──
    window.HomePageConfig = { illustrationEnabled: false };
    void initPortraitVideo();
    if (window.sanityFetch) {
      window.sanityFetch('*[_type=="homePage"][0]{portraitImage{asset->{url}},illustrationEnabled,illustrationImage{asset->{url}},fluidBgEnabled,fluidBgImage{asset->{url}},fluidBgColor}')
        .then(function(data) {
          if (!data) return;
          // Ana portre fotoğrafı
          if (data.portraitImage && data.portraitImage.asset && data.portraitImage.asset.url) {
            var portraitBaseEl = document.getElementById('portraitBase');
            if (portraitBaseEl) {
              if (portraitBaseEl.tagName === 'VIDEO') {
                var source = portraitBaseEl.querySelector('source');
                if (source) source.src = data.portraitImage.asset.url;
                else portraitBaseEl.src = data.portraitImage.asset.url;
                portraitBaseEl.load();
                portraitBaseEl.play().catch(function () {});
              } else {
                portraitBaseEl.src = data.portraitImage.asset.url;
              }
            }
          }
          // Portrait illustration (portrecizim) — mevcut ayarlar korunuyor
          if (data.illustrationEnabled === false) {
            window.HomePageConfig.illustrationEnabled = false;
          }
          if (data.illustrationImage && data.illustrationImage.asset && data.illustrationImage.asset.url) {
            portrecizimImg = new Image();
            portrecizimImg.src = data.illustrationImage.asset.url;
          }
          // Fluid background image — controlled entirely from Sanity
          if (window.FluidSim) {
            if (data.fluidBgEnabled === false) {
              // Disabled: no image, apply color if set
              window.FluidSim.setBgImage(null);
              if (data.fluidBgColor) {
                var hex = data.fluidBgColor.replace('#', '');
                window.BgConfig.GRAY_R = parseInt(hex.substring(0,2), 16);
                window.BgConfig.GRAY_G = parseInt(hex.substring(2,4), 16);
                window.BgConfig.GRAY_B = parseInt(hex.substring(4,6), 16);
              }
            } else if (data.fluidBgImage && data.fluidBgImage.asset && data.fluidBgImage.asset.url) {
              // Enabled with Sanity image
              window.FluidSim.setBgImage(data.fluidBgImage.asset.url);
            } else {
              // Enabled but no Sanity image — load static fallback
              window.FluidSim.loadStaticBg();
            }
          }
        })
        .catch(function() {});
    }

    slideGroup = document.getElementById('slideGroup');
    cursorDot = document.getElementById('cursorDot');
    cursorRing = document.getElementById('cursorRing');
    if (cursorDot)  { cursorDot.style.left  = mouseX+'px'; cursorDot.style.top  = mouseY+'px'; }
    if (cursorRing) { cursorRing.style.left = rawRingX+'px'; cursorRing.style.top = rawRingY+'px'; }

    // Gizli SVG Motorunu Sayfaya Enjekte Ediyoruz (Gooey Değerleri Artırıldı)
    const svgLiquidEngine = `
      <svg style="width: 0; height: 0; position: absolute; pointer-events: none; z-index: -1;">
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="32" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -7" result="gooey" />
            <feBlend in="SourceGraphic" in2="gooey" />
          </filter>
          <mask id="liquidMask">
            <g filter="url(#gooey)">
              <circle id="blob1" cx="0" cy="0" r="180" fill="white" />
              <circle id="blob2" cx="0" cy="0" r="130" fill="white" />
              <circle id="blob3" cx="0" cy="0" r="100" fill="white" />
              <circle id="blob4" cx="0" cy="0" r="80"  fill="white" />
              <circle id="blob5" cx="0" cy="0" r="65"  fill="white" />
              <circle id="blob6" cx="0" cy="0" r="52"  fill="white" />
            </g>
          </mask>
        </defs>
      </svg>
    `;
    body.insertAdjacentHTML('afterbegin', svgLiquidEngine);

    // Enjekte edilen SVG damlalarını değişkene alıyoruz
    blobs = [
      document.getElementById('blob1'),
      document.getElementById('blob2'),
      document.getElementById('blob3'),
      document.getElementById('blob4'),
      document.getElementById('blob5'),
      document.getElementById('blob6'),
    ];

    resizeBgCanvas();
    setupEvents();
    
    buildSlots(NAMES.left, false);
    currentName = NAMES.left;
    idleTimer = setTimeout(() => { isIdle = true; }, 1800);
    setTimeout(() => { slideReady = true; }, 1800);
    prevMouseX = mouseX; prevMouseY = mouseY;
    
    // Menu formation cycling
    applyMenuFormation(0);
    setInterval(() => {
      _menuFormIdx = (_menuFormIdx + 1) % MENU_FORMATIONS.length;
      applyMenuFormation(_menuFormIdx);
    }, 3500);

    // Parallax + tilt ready after entrance animations settle
    setTimeout(() => { parallaxReady = true; }, 2600);

    body.classList.add('boot-pending');
    body.classList.add('js-ready');
    requestAnimationFrame((ts) => { lastTs = ts; requestAnimationFrame(loop); });

    // ── PAGE TRANSITION ───────────────────────────────────────

    // Intercept side nav links
    const sideLeftEl  = document.getElementById('sideLeft');
    const sideRightEl = document.getElementById('sideRight');

    if (sideLeftEl) {
      sideLeftEl.addEventListener('click', (e) => {
        e.preventDefault();
        const href = sideLeftEl.getAttribute('href');
        if (typeof window.TxOut === 'function') window.TxOut(href, 'پروژه\u200cها', '#ef4444');
        else window.location.href = href;
      });
    }
    if (sideRightEl) {
      sideRightEl.addEventListener('click', (e) => {
        e.preventDefault();
        const href = sideRightEl.getAttribute('href');
        if (typeof window.TxOut === 'function') window.TxOut(href, 'آثار', '#1d4ed8');
        else window.location.href = href;
      });
    }

    // Always run TxIn to handle SPA transitions
    if (typeof window.TxIn === 'function') window.TxIn();
    
    function revealPage() {
      body.classList.remove('boot-pending');
      const pSection = document.getElementById('portraitSection');
      const sLeft    = document.getElementById('sideLeft');
      const sRight   = document.getElementById('sideRight');

      if (sLeft)  { sLeft.style.animation  = 'none'; sLeft.style.opacity  = '0'; sLeft.style.transform  = 'translateY(-50%) translateX(-180%)'; }
      if (sRight) { sRight.style.animation = 'none'; sRight.style.opacity = '0'; sRight.style.transform = 'translateY(-50%) translateX(180%)'; }
      if (pSection) {
        pSection.style.animation  = 'none';
        pSection.style.transform  = pSection.classList.contains('portrait-section--video')
          ? 'none'
          : 'translateX(-50%) translateY(0)';
        pSection.style.transition = 'opacity 0.9s ease';
        pSection.style.opacity    = '0';
        requestAnimationFrame(() => {
          pSection.style.opacity = '1';
        });
      }
      setTimeout(() => {
        [sLeft, sRight].forEach(el => {
          if (!el) return;
          requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.transition = 'opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)';
            el.style.opacity    = '1';
            el.style.transform  = 'translateY(-50%) translateX(0)';
          }));
        });
      }, 800);
    }

    revealPage();
  }

  // Sayfa elementleri tamamen hazır olduğunda sistemi başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
