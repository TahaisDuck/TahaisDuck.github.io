// Luồng thiệp mời: vịt ăn đủ bánh mì → mở phong bì → hiện thiệp.
(function () {
  const C = window.INVITE_CONFIG;
  const $ = (id) => document.getElementById(id);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion ? 0 : ms));
  const params = new URLSearchParams(location.search);
  // Link riêng dạng ?to=anh-danh (xem assets/letters/guests.json)
  // Không có ?to= (và không có ?name=) thì dùng thư chung "Mọi người" làm thư chính
  const DEFAULT_SLUG = "moi-nguoi";
  const slug = (params.get("to") || (params.get("name") ? "" : DEFAULT_SLUG)).trim();
  const isSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const STORAGE_KEY = `duck-invite-opened:${params.get("to") || params.get("name") || ""}`;

  // Tải thông tin thư riêng ngay, trong lúc khách cho vịt ăn
  const letterPromise = isSlug
    ? fetch("assets/letters/guests.json")
        .then((r) => (r.ok ? r.json() : {}))
        .then((guests) => {
          const pick = (s) => ({ ...guests[s], url: `assets/letters/${s}.png` });
          if (guests[slug]) return pick(slug);
          if (decodeName(slug) !== slug) return null; // link tên kiểu cũ (base64)
          return guests[DEFAULT_SLUG] ? { ...pick(DEFAULT_SLUG), wrongLink: true } : null; // link sai → thư chung
        })
        .catch(() => null)
    : Promise.resolve(null);

  // ---------- Tên khách mời từ link (?to=... do link.html tạo, hoặc ?name=...) ----------
  function decodeName(value) {
    try {
      const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(b64 + "===".slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0));
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.trim()) return text.trim();
    } catch (_) {
      /* không phải base64 */
    }
    return value.trim();
  }
  // ?to= là slug (anh-danh) thì chờ guests.json; còn lại là tên mã hoá base64 từ link.html
  let rawName = params.get("to") && !isSlug ? decodeName(params.get("to")) : (params.get("name") || "").trim();
  rawName = rawName.slice(0, 60);
  const guest = rawName || (isSlug ? "" : "bạn thân mến"); // thư riêng sẽ điền tên sau

  // ---------- Điền nội dung từ config ----------
  document.querySelectorAll("[data-config]").forEach((node) => {
    node.textContent = C[node.dataset.config];
  });
  $("guest").textContent = guest;
  if (rawName) document.title = `Gửi ${rawName} · Thiệp mời của ${C.host}`;

  const toCal = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const calParams = new URLSearchParams({
    action: "TEMPLATE",
    text: `${C.title} của ${C.host}`,
    dates: `${toCal(C.start)}/${toCal(C.end)}`,
    location: `${C.venue}, ${C.address}`,
    details: `Buổi lễ ${C.ceremony}, chụp ảnh & chúc mừng ${C.reception}. ${C.siteUrl}`,
  });
  $("btn-calendar").href = `https://calendar.google.com/calendar/render?${calParams}`;
  $("btn-map").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(C.mapQuery)}`;

  // ---------- Thư riêng ----------
  if (isSlug) {
    // Giữ chỗ ngay từ đầu để bánh mì không bị rải đè lên dòng này
    $("lock-to").hidden = false;
    $("lock-to").textContent = "Đang mở con dấu...";
  }
  letterPromise.then((letter) => {
    if (!isSlug) return;
    const to = $("lock-to");
    to.hidden = false;
    if (!letter) {
      // Không có trong danh sách: có thể là link tên kiểu cũ (base64 từ link.html)
      const decoded = decodeName(slug);
      if (decoded !== slug) {
        rawName = decoded.slice(0, 60);
        $("guest").textContent = rawName;
        document.title = `Gửi ${rawName} · Thiệp mời của ${C.host}`;
        to.hidden = true;
        return;
      }
      to.classList.add("error");
      to.textContent = `Link chưa đúng rồi, kiểm tra lại link ${C.host} gửi nha!`;
      return;
    }
    rawName = letter.name;
    if (letter.wrongLink) {
      to.classList.add("error");
      to.textContent = `Link chưa đúng rồi, kiểm tra lại link ${C.host} gửi nha!`;
    } else to.replaceChildren("Thư gửi ", Object.assign(document.createElement("strong"), { textContent: letter.name }));
    $("guest").textContent = letter.name;
    document.title = `Gửi ${letter.name} · Thiệp mời của ${C.host}`;
    $("invite-message").textContent = `Mời ${letter.you} đến chung vui ngày tốt nghiệp của ${letter.me} nha!`;
    $("sign-line").textContent = `Mong được gặp ${letter.you} hôm đó nha!`;

    const letterUrl = letter.url;
    const file = `Thu_moi_${letter.name.replace(/\s+/g, "_")}.png`;
    $("letter-img").src = letterUrl;
    $("letter-img").alt = `Thư mời tốt nghiệp gửi ${letter.name}`;
    for (const id of ["btn-download", "letter-download", "letter-save"]) {
      Object.assign($(id), { href: letterUrl, download: file });
    }
    $("btn-download").hidden = false;
    $("letter").hidden = false;
  });

  // ---------- Vịt ----------
  Duck.create();
  const ENV_SCALE = innerWidth < 600 ? 8 : 10;
  const envImg = Pixel.img(Pixel.sprites.envelopeClosed, ENV_SCALE);
  $("envelope").appendChild(envImg);

  // ---------- Bánh mì ----------
  const crumbLayer = $("crumbs");
  const meter = $("crumb-meter");
  let crumbs = []; // { el, fx, fy, eaten }
  let eaten = 0;
  let unlocking = false;
  let feedCount = 0;

  function crumbPos(c) {
    return { x: c.fx * innerWidth, y: c.fy * innerHeight };
  }

  function placeCrumb(c) {
    const { x, y } = crumbPos(c);
    c.el.style.left = x + "px";
    c.el.style.top = y + "px";
  }

  function makeCrumb(fx, fy, onEat) {
    const el = Pixel.img(Pixel.sprites.bread, 4, "crumb");
    crumbLayer.appendChild(el);
    const c = { el, fx, fy, eaten: false, onEat };
    placeCrumb(c);
    crumbs.push(c);
    return c;
  }

  // Rải bánh mì ngẫu nhiên, tránh tấm thẻ giữa màn hình và tránh chồng lên nhau.
  function scatterCrumbs(n) {
    const card = document.querySelector(".lock-card").getBoundingClientRect();
    const env = $("envelope").getBoundingClientRect();
    const blocked = [card, env].map((r) => ({ l: r.left - 30, r: r.right + 30, t: r.top - 30, b: r.bottom + 30 }));
    const placed = [];
    for (let i = 0; i < n; i++) {
      let fx, fy, tries = 0;
      do {
        fx = 0.08 + Math.random() * 0.84;
        fy = 0.18 + Math.random() * 0.74;
        tries++;
        const px = fx * innerWidth;
        const py = fy * innerHeight;
        const hitsBox = blocked.some((b) => px > b.l && px < b.r && py > b.t && py < b.b);
        const tooClose = placed.some((p) => Math.hypot((p.fx - fx) * innerWidth, (p.fy - fy) * innerHeight) < 90);
        if (!hitsBox && !tooClose) break;
      } while (tries < 80);
      placed.push({ fx, fy });
      makeCrumb(fx, fy, onLockCrumbEaten);
    }
  }

  function renderMeter() {
    meter.replaceChildren(
      ...Array.from({ length: C.crumbs }, (_, i) => {
        const s = document.createElement("span");
        s.className = i < eaten ? "pip full" : "pip";
        if (i < eaten) s.appendChild(Pixel.img(Pixel.sprites.bread, 3));
        return s;
      })
    );
  }

  const YUM = ["Măm măm!", "Ngon quá!", "Thêm nữa!", "Quác!", "+1 BÁNH MÌ"];

  function eatCrumb(c) {
    c.eaten = true;
    c.el.classList.add("eaten");
    setTimeout(() => c.el.remove(), 400);
    crumbs = crumbs.filter((k) => k !== c);
    Duck.quack();
    Duck.jump();
    c.onEat();
  }

  Duck.onMove((x, y) => {
    for (const c of crumbs) {
      if (c.eaten) continue;
      const p = crumbPos(c);
      if (Math.hypot(p.x - x, p.y - (y - 18)) < 46) eatCrumb(c);
    }
  });

  addEventListener("resize", () => crumbs.forEach(placeCrumb));

  function onLockCrumbEaten() {
    eaten += 1;
    renderMeter();
    if (eaten >= C.crumbs) {
      unlock();
    } else {
      Duck.say(YUM[Math.floor(Math.random() * YUM.length)], 1200);
      $("lock-status").textContent = `Còn ${C.crumbs - eaten} miếng nữa!`;
    }
  }

  // ---------- Mở thư ----------
  async function unlock() {
    if (unlocking) return;
    unlocking = true;
    Duck.setPaused(true);
    crumbs.forEach((c) => c.el.remove());
    crumbs = [];
    $("lock-status").textContent = "No rồi! Mở thư thôi!";
    Duck.say("No rồi! Mở thư nè!", 2500);

    const env = $("envelope").getBoundingClientRect();
    await new Promise((resolve) => Duck.goTo(env.left - 30, env.bottom - 4, resolve));
    Duck.jump();
    Duck.quack();
    await wait(300);
    envImg.src = Pixel.sprites.envelopeOpen.url;
    $("envelope").classList.add("opened");
    await wait(1300);
    $("stage-lock").classList.add("leaving");
    await wait(450);
    showInvite(true);
  }

  // ---------- Thiệp ----------
  let countdownTimer;
  function startCountdown() {
    const box = $("countdown");
    const units = Object.fromEntries([...box.querySelectorAll("[data-unit]")].map((el) => [el.dataset.unit, el]));
    const start = new Date(C.start);
    function tick() {
      const diff = start - Date.now();
      if (diff <= 0) {
        box.hidden = true;
        $("countdown-done").hidden = false;
        clearInterval(countdownTimer);
        return;
      }
      units.days.textContent = Math.floor(diff / 86400000);
      units.hours.textContent = String(Math.floor(diff / 3600000) % 24).padStart(2, "0");
      units.minutes.textContent = String(Math.floor(diff / 60000) % 60).padStart(2, "0");
      units.seconds.textContent = String(Math.floor(diff / 1000) % 60).padStart(2, "0");
    }
    tick();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 1000);
  }

  function showInvite(celebrate) {
    sessionStorage.setItem(STORAGE_KEY, "1");
    $("stage-lock").hidden = true;
    $("stage-invite").hidden = false;
    document.body.classList.add("is-open");
    window.scrollTo({ top: 0 });
    startCountdown();
    Duck.setPaused(false);
    Duck.setWander(true);
    if (celebrate) {
      confetti();
      setTimeout(() => Duck.say(`Chào ${rawName || "bạn"}! Nhớ đến nha!`, 3000), 400);
    }
  }

  // Bánh mì "cho vịt ăn" trong thiệp
  $("btn-feed").addEventListener("click", () => {
    const c = makeCrumb(0.1 + Math.random() * 0.8, 0.3 + Math.random() * 0.6, () => {
      feedCount += 1;
      $("feed-count").textContent = `Vịt đã ăn ${feedCount} miếng bánh mì`;
      Duck.say(YUM[Math.floor(Math.random() * YUM.length)], 1200);
    });
    const p = crumbPos(c);
    Duck.goTo(p.x, p.y + 18);
  });

  $("btn-replay").addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // ---------- Pháo giấy ----------
  function confetti() {
    if (reducedMotion) return;
    const canvas = $("confetti");
    const ctx = canvas.getContext("2d");
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const colors = ["#ffd23f", "#ff9f1c", "#4cc9f0", "#ff6b9a", "#7bd389", "#ffffff", "#2b1d0e"];
    const pieces = Array.from({ length: 170 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 240,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 4,
      size: Math.random() * 8 + 5,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.35,
    }));
    const end = performance.now() + 4200;
    (function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        ctx.save();
        ctx.translate(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4);
        ctx.fillStyle = p.color;
        const q = Math.round(p.size / 4) * 4;
        ctx.fillRect(-q / 2, -q / 2, q, q);
        ctx.restore();
      }
      if (now < end) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })(performance.now());
  }

  // ---------- Bắt đầu ----------
  $("lock-status").textContent = `Còn ${C.crumbs} miếng bánh mì!`;
  renderMeter();
  if (sessionStorage.getItem(STORAGE_KEY)) {
    showInvite(false);
  } else {
    // Đợi bố cục ổn định rồi mới rải bánh mì
    requestAnimationFrame(() => scatterCrumbs(C.crumbs));
    setTimeout(() => Duck.say("Đói quá… cho mình bánh mì đi!", 3000), 700);
  }
})();
