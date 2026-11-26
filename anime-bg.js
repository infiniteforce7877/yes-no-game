/* ================================================================
   anime-bg.js — Demon Slayer Chaos Background
   Bas 1 image chahiye: chars.png (same folder me)
   ================================================================ */
(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const bgContainer = document.createElement('div');
  bgContainer.id = 'anime-chaos-bg';
  document.body.prepend(bgContainer);

  const speedLines = document.createElement('div');
  speedLines.className = 'manga-speed-lines';
  bgContainer.appendChild(speedLines);

  const COMIC_TEXTS = ['HA HA HA!!', 'NANI?!', 'LOL!', 'BAM!', 'SUGOI!', 'YABAI!', 'WTF!', 'ORA ORA!', 'USO!', 'BAKA!', 'Zzz...', 'OMG!', '???'];
  const COLORS = ['#ffea00', '#ff007f', '#00f0ff', '#a06bff', '#6ef2c8'];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randRange(min, max) { return min + Math.random() * (max - min); }

  function createSticker() {
    const el = document.createElement('div');
    el.className = 'anime-sticker';

    if (Math.random() > 0.85) {
      el.classList.add('comic-bubble');
      el.textContent = rand(COMIC_TEXTS);
      el.style.color = rand(COLORS);
      el.style.fontSize = randRange(2, 4) + 'rem';
    } else {
      const index = Math.floor(Math.random() * 40);
      const col = index % 8;
      const row = Math.floor(index / 8);
      const size = randRange(100, 160);

      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.backgroundImage = "url('chars.png')";
      el.style.backgroundSize = '800% 500%';
      el.style.backgroundPosition = ((col * 100) / 7) + '% ' + ((row * 100) / 4) + '%';
      el.style.borderRadius = '12px';
      el.style.border = '4px solid #fff';
      el.style.boxShadow = '4px 4px 0 #000';
      el.style.backgroundColor = '#fff';
    }

    const startLeft = Math.random() > 0.5;
    const yPos = randRange(-10, 90);
    el.style.top = yPos + 'vh';

    if (startLeft) {
      el.style.left = '-20vw';
      el.style.animation = 'floatChaosRight ' + randRange(10, 18) + 's linear forwards';
    } else {
      el.style.right = '-20vw';
      el.style.animation = 'floatChaosLeft ' + randRange(10, 18) + 's linear forwards';
    }

    el.style.setProperty('--rot', randRange(-35, 35) + 'deg');
    el.style.setProperty('--scale', randRange(0.8, 1.3));

    bgContainer.appendChild(el);
    setTimeout(() => el.remove(), 20000);
  }

  for (let i = 0; i < 10; i++) setTimeout(createSticker, i * 600);
  setInterval(createSticker, 1200);

  /* ============== YES/NO BURST PARTICLES ============== */
  window.burstParticles = function(x, y, color){
    const isYes = color.indexOf('110,242,200') !== -1;
    const mainColor = isYes ? '#6ef2c8' : '#ff4d8d';
    for (let i = 0; i < 22; i++){
      const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.5;
      const speed = randRange(4, 9);
      const spark = document.createElement('div');
      spark.style.cssText = `
        position:fixed;left:${x}px;top:${y}px;
        width:${randRange(4,8)}px;height:${randRange(4,8)}px;
        background:${Math.random() > 0.4 ? mainColor : '#fff'};
        border-radius:50%;
        pointer-events:none;z-index:999;
        box-shadow:0 0 10px ${mainColor};
      `;
      document.body.appendChild(spark);
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      let px = 0, py = 0, life = 1;
      function step(){
        px += dx * (1 - life * 0.6);
        py += dy * (1 - life * 0.6) + 0.3;
        life -= 0.025;
        spark.style.transform = `translate(${px}px,${py}px) scale(${life})`;
        spark.style.opacity = life;
        if (life > 0) requestAnimationFrame(step);
        else spark.remove();
      }
      requestAnimationFrame(step);
    }
    document.body.classList.add('anime-shake');
    setTimeout(() => document.body.classList.remove('anime-shake'), 320);
    const flash = document.createElement('div');
    flash.className = 'impact-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  };

  /* ============== FUNNY 8-BIT BGM ============== */
  let audioCtx = null;
  let isSoundOn = false;
  let loopTimer = null;

  const melody = [
    [523.25, 0.15], [523.25, 0.15], [783.99, 0.30],
    [698.46, 0.15], [659.25, 0.15], [587.33, 0.15], [523.25, 0.30],
    [659.25, 0.15], [659.25, 0.15], [1046.50, 0.30],
    [880.00, 0.15], [783.99, 0.15], [698.46, 0.15], [659.25, 0.30]
  ];

  function playNote(freq, duration){
    if (!audioCtx || !isSoundOn) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  }

  function startLoop(){
    if (loopTimer) clearTimeout(loopTimer);
    let index = 0;
    function playNext(){
      if (!isSoundOn) return;
      const [freq, dur] = melody[index];
      playNote(freq, dur);
      if (index % 4 === 0) playNote(freq / 2, dur * 1.5);
      index = (index + 1) % melody.length;
      loopTimer = setTimeout(playNext, dur * 1000 + 50);
    }
    playNext();
  }

  const soundBtn = document.createElement('button');
  soundBtn.className = 'sound-toggle-btn';
  soundBtn.innerHTML = '🔇 BGM OFF';
  document.body.appendChild(soundBtn);

  soundBtn.addEventListener('click', () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    isSoundOn = !isSoundOn;
    if (isSoundOn) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      soundBtn.innerHTML = '🔊 BGM ON';
      soundBtn.classList.add('active');
      startLoop();
    } else {
      soundBtn.innerHTML = '🔇 BGM OFF';
      soundBtn.classList.remove('active');
      clearTimeout(loopTimer);
    }
  });
})();
