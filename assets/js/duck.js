// Chú vịt pixel chạy khắp trang.
// Chạm/bấm vào chỗ trống: vịt chạy tới. Phím mũi tên hoặc WASD: tự điều khiển.
// Bấm vào vịt: vịt kêu "quác". Khi rảnh, vịt tự đi dạo.
window.Duck = (function () {
  const SCALE = 4; // 1 pixel sprite = 4 px màn hình
  const FRAMES = Pixel.duck;
  const W = FRAMES.stand.w * SCALE;
  const H = FRAMES.stand.h * SCALE;
  const WALK = 170; // px/giây
  const RUN = 340;
  const MARGIN = 40;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PHRASES = ["QUÁC QUÁC!", "Chào bạn!", "Đi chơi hông?", "Quác!", "Hehe <3", "Bắt được mình hông?", "Đói bụng quá..."];

  let el, sprite, flip, bubble, footLayer;
  let x, y; // vị trí chân vịt (toạ độ viewport)
  let target = null;
  let arriveCb = null;
  let facing = 1;
  let lastT = 0;
  let idleTime = 0;
  let wander = true;
  let paused = false;
  let stepDist = 0;
  let animTime = 0;
  let blinkAt = 2;
  let frame = "stand";
  let bubbleTimer;
  const keys = new Set();
  const moveListeners = [];
  let audio;

  function setFrame(name) {
    if (name === frame) return;
    frame = name;
    sprite.src = FRAMES[name].url;
  }

  function create() {
    footLayer = document.createElement("div");
    footLayer.className = "duck-footprints";
    footLayer.setAttribute("aria-hidden", "true");
    document.body.appendChild(footLayer);

    el = document.createElement("div");
    el.className = "duck";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "Chú vịt tốt nghiệp");
    el.title = "Bấm vào mình nè!";
    el.style.width = W + "px";
    el.style.height = H + "px";
    el.innerHTML = `<div class="duck-bubble px-box" hidden></div><div class="duck-flip"></div><div class="duck-shadow"></div>`;
    flip = el.querySelector(".duck-flip");
    sprite = Pixel.img(FRAMES.stand, SCALE, "duck-sprite");
    flip.appendChild(sprite);
    bubble = el.querySelector(".duck-bubble");
    document.body.appendChild(el);

    x = innerWidth * 0.18;
    y = innerHeight - 60;
    render();

    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      quack();
      jump();
      say(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
    });

    document.addEventListener("pointerdown", (e) => {
      if (paused || e.button > 0) return;
      if (e.target.closest("a, button, input, textarea, select, label, .no-duck, .duck")) return;
      goTo(e.clientX, e.clientY + 10);
    });

    const KEYMAP = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d", a: "l", d: "r", w: "u", s: "d" };
    const keyOf = (e) => KEYMAP[e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key];
    addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest("input, textarea")) return;
      const k = keyOf(e);
      if (!k || paused) return;
      e.preventDefault();
      keys.add(k);
      target = null;
    });
    addEventListener("keyup", (e) => {
      const k = keyOf(e);
      if (k) keys.delete(k);
    });
    addEventListener("blur", () => keys.clear());
    addEventListener("resize", () => {
      clamp();
      render();
    });

    requestAnimationFrame(loop);
  }

  function clamp() {
    x = Math.min(Math.max(x, MARGIN), innerWidth - MARGIN);
    y = Math.min(Math.max(y, H + 10), innerHeight - 8);
  }

  function goTo(tx, ty, cb) {
    target = {
      x: Math.min(Math.max(tx, MARGIN), innerWidth - MARGIN),
      y: Math.min(Math.max(ty, H + 10), innerHeight - 8),
    };
    arriveCb = cb || null;
    idleTime = 0;
  }

  function loop(t) {
    const dt = Math.min((t - lastT) / 1000 || 0, 0.05);
    lastT = t;
    animTime += dt;
    let dx = 0;
    let dy = 0;
    let speed = 0;

    if (keys.size && !paused) {
      dx = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0);
      dy = (keys.has("d") ? 1 : 0) - (keys.has("u") ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      speed = RUN;
    } else if (target) {
      const ddx = target.x - x;
      const ddy = target.y - y;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 4) {
        x = target.x;
        y = target.y;
        target = null;
        const cb = arriveCb;
        arriveCb = null;
        if (cb) cb();
      } else {
        speed = dist > 180 ? RUN : WALK;
        speed = Math.min(speed, dist / dt);
        dx = ddx / dist;
        dy = ddy / dist;
      }
    }

    if (speed > 0) {
      const step = speed * dt;
      x += dx * step;
      y += dy * step;
      clamp();
      if (Math.abs(dx) > 0.15) facing = dx > 0 ? 1 : -1;
      stepDist += step;
      if (stepDist > 24) {
        stepDist = 0;
        footprint();
      }
      idleTime = 0;
      const running = speed >= RUN * 0.9;
      const period = running ? 0.09 : 0.14;
      const even = Math.floor(animTime / period) % 2 === 0;
      setFrame(running ? (even ? "runA" : "runB") : even ? "walkA" : "walkB");
      el.classList.toggle("bob", !even);
      render();
      for (const fn of moveListeners) fn(x, y);
    } else {
      el.classList.remove("bob");
      // chớp mắt
      if (animTime > blinkAt) {
        setFrame("blink");
        if (animTime > blinkAt + 0.14) {
          blinkAt = animTime + 2 + Math.random() * 3;
          setFrame("stand");
        }
      } else setFrame("stand");
      idleTime += dt;
      if (wander && !paused && idleTime > 3.5 + Math.random() * 4) {
        idleTime = 0;
        const r = 220;
        goTo(x + (Math.random() - 0.5) * 2 * r, y + (Math.random() - 0.5) * r);
      }
    }
    requestAnimationFrame(loop);
  }

  // Làm tròn vị trí theo lưới pixel cho đúng chất 8-bit
  const snap = (v) => Math.round(v / 2) * 2;

  function render() {
    el.style.transform = `translate(${snap(x - W / 2)}px, ${snap(y - H)}px)`;
    el.style.zIndex = String(50 + Math.round(y / 10));
    flip.style.transform = `scaleX(${facing})`;
    if (bubble) fitBubble();
  }

  let footSide = 0;
  function footprint() {
    if (reducedMotion) return;
    const f = document.createElement("span");
    f.className = "footprint";
    footSide ^= 1;
    f.style.left = snap(x + (footSide ? -8 : 4)) + "px";
    f.style.top = snap(y - 6 + (footSide ? 0 : 4)) + "px";
    footLayer.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }

  // Giữ bong bóng thoại nằm trong màn hình khi vịt đứng sát mép
  let bubbleW = 0;
  function fitBubble() {
    if (bubble.hidden) return;
    const left = x - bubbleW / 2;
    const right = x + bubbleW / 2;
    const shift = Math.max(8 - left, 0) - Math.max(right - (innerWidth - 8), 0);
    bubble.style.marginLeft = Math.round(shift) + "px";
  }

  function say(text, ms = 2200) {
    bubble.textContent = text;
    bubble.hidden = false;
    bubbleW = bubble.offsetWidth;
    fitBubble();
    bubble.classList.remove("pop");
    void bubble.offsetWidth;
    bubble.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => (bubble.hidden = true), ms);
  }

  function jump() {
    el.classList.remove("jump");
    void el.offsetWidth;
    el.classList.add("jump");
  }

  // Tiếng "quác" kiểu 8-bit: sóng vuông quét xuống, hai lần
  function quack() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const now = audio.currentTime;
      [0, 0.15].forEach((offset) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(880, now + offset);
        osc.frequency.exponentialRampToValueAtTime(330, now + offset + 0.11);
        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset + 0.12);
        osc.connect(gain).connect(audio.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
    } catch (_) {
      /* trình duyệt không hỗ trợ âm thanh: bỏ qua */
    }
  }

  return {
    create,
    goTo,
    say,
    jump,
    quack,
    onMove: (fn) => moveListeners.push(fn),
    setWander: (on) => (wander = on),
    setPaused: (on) => {
      paused = on;
      if (on) {
        keys.clear();
        target = null;
      }
    },
    get pos() {
      return { x, y };
    },
  };
})();
