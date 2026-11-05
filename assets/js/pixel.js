// Bộ vẽ pixel art: mỗi sprite là một lưới ký tự, mỗi ký tự là một màu.
// Sprite được vẽ ra canvas 1 ô = 1 px rồi phóng to bằng CSS (image-rendering: pixelated).
window.Pixel = (function () {
  const PALETTE = {
    K: "#2b1d0e", // viền
    Y: "#ffd23f", // vàng vịt
    S: "#e8a800", // bóng cánh
    O: "#ff8a1c", // mỏ, chân
    W: "#ffffff",
    P: "#ff8fab", // hồng
    D: "#ff5c8a", // hồng đậm
    B: "#d98b3a", // vỏ bánh mì
    L: "#ffe3a3", // ruột bánh mì
    M: "#e8b765", // chấm bánh mì
    C: "#2a2840", // mũ tốt nghiệp
    R: "#ff3d5a", // đỏ
    A: "#bfe6ff", // bóng mây
    G: "#7bd389", // cỏ sáng
    H: "#4fb069", // cỏ đậm
    E: "#9be3a6", // đồi sáng
    F: "#ffb3c7", // hồng nhạt
    N: "#e85d8a", // trong phong bì
    T: "#ffd9a6", // dòng chữ
  };

  function fromGrid(rows) {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    return draw(w, h, (px) => {
      rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && px(x, y, ch)));
    });
  }

  function draw(w, h, paint) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    paint((x, y, ch) => {
      ctx.fillStyle = PALETTE[ch] || ch;
      ctx.fillRect(x, y, 1, 1);
    });
    return { url: canvas.toDataURL(), w, h };
  }

  // ---------- Vịt (22 x 20, quay mặt sang phải) ----------
  const DUCK_TOP = [
    "........KKKKKKKKKKKK..",
    ".......KCCCCCCCCCCCCK.",
    ".......YKKKCCCCCCKKK..",
    ".......Y.KYYYYYYYYK...",
    ".......YKYYYYYYYYYYK..",
  ];
  const EYE_OPEN = ["........KYYYYYYYWKYK..", "........KYYYYYYYKKYK.."];
  const EYE_SHUT = ["........KYYYYYYYYYYK..", "........KYYYYYYYKKYK.."];
  const DUCK_BODY = [
    "........KYYYYYYPYYYOOK",
    "........KYYYYYYYYYYOOK",
    ".........KYYYYYYYYKKK.",
    "..KK.....KYYYYYYYK....",
    "..KYKKKKKKYYYYYYYYKK..",
    "..KYYYYYYYYYYYYYYYYYK.",
    "..KYYSSSSSSSYYYYYYYYK.",
    "..KYYYSSSSSSSYYYYYYYK.",
    "...KYYYYSSSSYYYYYYYK..",
    "....KKYYYYYYYYYYYKK...",
    "......KKKKKKKKKKK.....",
  ];
  const WING_UP = [
    "........KYYYYYYPYYYOOK",
    "........KYYYYYYYYYYOOK",
    ".........KYYYYYYYYKKK.",
    "..KK.KK..KYYYYYYYK....",
    "..KYKSSKKKYYYYYYYYKK..",
    "..KYYSSSSSYYYYYYYYYYK.",
    "..KYYYSSSSSSYYYYYYYYK.",
    "..KYYYYYYYYYYYYYYYYYK.",
    "...KYYYYYYYYYYYYYYYK..",
    "....KKYYYYYYYYYYYKK...",
    "......KKKKKKKKKKK.....",
  ];
  const LEGS = {
    stand: [".........O...O........", "........OOO.OOO......."],
    stepA: ["........O.....O.......", ".......OOO...OOO......"],
    stepB: ["..........OO..........", ".........OOOO........."],
  };

  const duck = {};
  function makeDuck(name, eye, body, legs) {
    duck[name] = fromGrid([...DUCK_TOP, ...eye, ...body, ...LEGS[legs]]);
  }
  makeDuck("stand", EYE_OPEN, DUCK_BODY, "stand");
  makeDuck("blink", EYE_SHUT, DUCK_BODY, "stand");
  makeDuck("walkA", EYE_OPEN, DUCK_BODY, "stepA");
  makeDuck("walkB", EYE_OPEN, DUCK_BODY, "stepB");
  makeDuck("runA", EYE_OPEN, WING_UP, "stepA");
  makeDuck("runB", EYE_OPEN, DUCK_BODY, "stepB");

  // ---------- Đồ vật ----------
  const bread = fromGrid([
    "..KKKKKKK..",
    ".KBBBBBBBK.",
    "KBBLLLLLBBK",
    "KBLLLLLLLBK",
    ".KBLLMLLBK.",
    ".KBLLLLMBK.",
    ".KBLMLLLBK.",
    ".KBBBBBBBK.",
    "..KKKKKKK..",
  ]);

  const heart = fromGrid([".KK.KK.", "KRRKRRK", "KRWRRRK", ".KRRRK.", "..KRK..", "...K..."]);

  const cloud = fromGrid([
    ".....KKKK.......",
    "....KWWWWK.KKK..",
    "..KKWWWWWWKWWWK.",
    ".KWWWWWWWWWWWWWK",
    "KWWWWWWWWWWWWWWK",
    "KWWWWWWWWWWWWAAK",
    ".KAAWWWWWWAAAAK.",
    "..KKKKKKKKKKKK..",
  ]);

  const sun = draw(20, 20, (px) => {
    const c = 9.5;
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++) {
        const d = Math.hypot(x - c, y - c);
        if (d < 6) px(x, y, d > 4.9 ? "K" : x + y < 16 && d > 3 && d < 4.2 ? "W" : "Y");
      }
    // tia nắng
    [[9, 0], [10, 0], [9, 1], [10, 1], [9, 18], [10, 18], [9, 19], [10, 19],
     [0, 9], [0, 10], [1, 9], [1, 10], [18, 9], [18, 10], [19, 9], [19, 10],
     [3, 3], [4, 4], [16, 3], [15, 4], [3, 16], [4, 15], [16, 16], [15, 15]].forEach(([x, y]) => px(x, y, "Y"));
  });

  function hill(w, h, fill, tuft) {
    return draw(w, h, (px) => {
      const cx = (w - 1) / 2;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const v = ((x - cx) / (w / 2)) ** 2 + ((y - h) / h) ** 2;
          if (v > 1) continue;
          const edge = ((x - cx) / (w / 2 - 1)) ** 2 + ((y - h) / (h - 1)) ** 2 > 1;
          px(x, y, edge ? "K" : (x * 7 + y * 3) % 23 === 0 ? tuft : fill);
        }
    });
  }
  const hillBig = hill(64, 20, "E", "G");
  const hillSmall = hill(52, 16, "G", "H");

  const grassTile = fromGrid([
    "..G.....",
    ".GG...G.",
    "KKKKKKKK",
    "GGGGGGGG",
    "HHHGHHHH",
    "HHHHHHHH",
    "HHHHHGHH",
    "HHHHHHHH",
  ]);

  // ---------- Phong bì (24 x 24) ----------
  function envelope(open) {
    return draw(24, 24, (px) => {
      const top = 8;
      const inBox = (x, y) => y >= top && y <= 23;
      const border = (x, y) => x === 0 || x === 23 || y === top || y === 23;
      if (open) {
        // nắp mở hướng lên
        for (let y = 0; y < top; y++)
          for (let x = 0; x < 24; x++) {
            const half = (y + 1) * 1.5;
            const dx = Math.abs(x - 11.5);
            if (dx <= half) px(x, y, dx > half - 1.5 || y === 0 ? "K" : "D");
          }
      }
      for (let y = top; y < 24; y++) for (let x = 0; x < 24; x++) px(x, y, border(x, y) ? "K" : open ? "N" : "P");
      if (open) {
        // lá thư thò lên
        for (let y = 2; y <= 18; y++)
          for (let x = 4; x <= 19; x++) px(x, y, x === 4 || x === 19 || y === 2 ? "K" : "W");
        [5, 8, 11].forEach((y) => { for (let x = 7; x <= 16; x++) px(x, y, "T"); });
        for (let x = 7; x <= 12; x++) px(x, 14, "T");
      }
      // túi trước
      for (let y = top + 1; y < 23; y++)
        for (let x = 1; x < 23; x++) {
          const edgeY = 15 + Math.floor(Math.abs(x - 11.5) * -0.6);
          if (y > edgeY) px(x, y, y === edgeY + 1 ? "K" : open ? "P" : "F");
        }
      if (!open) {
        // nắp đóng hướng xuống
        for (let y = top; y < 23; y++)
          for (let x = 0; x < 24; x++) {
            const limit = 17 - Math.floor(Math.abs(x - 11.5) * 0.75);
            if (y <= limit && inBox(x, y)) px(x, y, y === limit || border(x, y) ? "K" : "D");
          }
        // con dấu trái tim
        const seal = [".KKKK.", "KYYYYK", "KYRYRK", "KYRRRK", "KYYRYK", ".KKKK."];
        seal.forEach((row, sy) => [...row].forEach((ch, sx) => ch !== "." && px(9 + sx, 13 + sy, ch)));
      }
    });
  }
  const envelopeClosed = envelope(false);
  const envelopeOpen = envelope(true);

  const icons = {
    bread,
    heart,
    calendar: fromGrid([".K.....K.", "KRRRRRRRK", "KRRRRRRRK", "KWWWWWWWK", "KWKWKWKWK", "KWWWWWWWK", "KWKWKWRWK", "KWWWWWWWK", "KKKKKKKKK"]),
    cap: fromGrid(["....KKK....", "..KKCCCKK..", "KKCCCCCCCKK", "..KKCCCKKY.", "...KCCCK.Y.", "...KCCCK.Y.", "....KKK..Y."]),
    camera: fromGrid(["...KKKK....", "KKKKWWKKKKK", "KCCCKKKCCRK", "KCCKWWWKCCK", "KCCKWAWKCCK", "KCCKWWWKCCK", "KCCCKKKCCCK", "KKKKKKKKKKK"]),
    pin: fromGrid([".KKKKK.", "KRRRRRK", "KRWWRRK", "KRWWRRK", "KRRRRRK", ".KRRRK.", "..KRK..", "..KRK..", "...K...", "...K..."]),
    map: fromGrid(["KKKKKKKKKK", "KGGKAAKGGK", "KGGKAAKGRK", "KGKAAKGRRK", "KGKAAKGGRK", "KKAAKGGGGK", "KAAKGGGGGK", "KKKKKKKKKK"]),
    link: fromGrid(["..KKK.....", ".KAAAK....", "KAK.KAK...", "KAK..KKK..", ".KAKKAAAK.", "..KKAK.KAK", "...KKA.KAK", "....KAAAK.", ".....KKK.."]),
    star: fromGrid(["....K....", "...KYK...", "KKKKYKKKK", "KYYYYYYYK", ".KYYYYYK.", "..KYYYK..", ".KYYKYYK.", ".KYK.KYK.", ".KK...KK."]),
  };
  const sprites = { ...icons, cloud, sun, hillBig, hillSmall, grassTile, envelopeClosed, envelopeOpen };

  // Ảnh pixel phóng to theo hệ số
  function img(sprite, scale, className) {
    const el = new Image(sprite.w * scale, sprite.h * scale);
    el.src = sprite.url;
    el.alt = "";
    el.draggable = false;
    el.className = "px" + (className ? " " + className : "");
    return el;
  }

  // Dựng cảnh nền cho mọi phần tử .scene
  function buildScene(scene) {
    const big = innerWidth < 600 ? 5 : 8;
    const add = (sprite, scale, cls) => scene.appendChild(img(sprite, scale, cls));
    add(sun, innerWidth < 600 ? 4 : 6, "sun");
    add(cloud, 6, "cloud c1");
    add(cloud, 4, "cloud c2");
    add(cloud, 3, "cloud c3");
    add(hillBig, big, "hill h1");
    add(hillSmall, big, "hill h2");
    // Khuôn viên trường: dãy nhà trái/phải neo vào hai mép, cây ở giữa
    const campus = document.createElement("div");
    campus.className = "campus";
    ["left", "tree", "right"].forEach((part) => {
      const piece = new Image();
      piece.src = `assets/img/campus-${part}.png?v=20261105-2`;
      piece.alt = "";
      piece.className = `px campus-${part}`;
      campus.appendChild(piece);
    });
    scene.appendChild(campus);
    const grass = document.createElement("div");
    grass.className = "grass";
    grass.style.backgroundImage = `url(${grassTile.url})`;
    scene.appendChild(grass);
  }

  // Thay mọi <i class="pxi" data-icon="..."> bằng ảnh pixel
  function fillIcons(root = document) {
    root.querySelectorAll("i.pxi:empty").forEach((i) => {
      const sprite = icons[i.dataset.icon];
      if (sprite) i.appendChild(img(sprite, Number(i.dataset.scale) || 3));
    });
  }

  document.querySelectorAll(".scene").forEach(buildScene);
  fillIcons();

  return { duck, sprites, img, fillIcons };
})();
