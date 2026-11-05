"""Tạo thư mời riêng cho từng khách của trang thiệp TahaisDuck.

Mỗi khách có link riêng theo tên, ví dụ
    https://tahaisduck.github.io/?to=anh-danh
Ảnh thư được chép vào assets/letters/ (công khai, không mã hoá), danh sách
khách nằm trong assets/letters/guests.json.

Cách dùng:
    python bin/build_invitations.py "<thư mục Downloads/TahaisDuck Graduate Invitation>"

Thư mục đó cần có:
    DANH SÁCH MỜI.xlsx          danh sách khách (sheet DS)
    Thư mời TahaisDuck/*.png    thư mời, tên file = "<xưng hô> <tên>.png"
Kết quả:
    assets/letters/*.png, assets/letters/guests.json   (trong repo)
    links_thu_moi.csv                                   (trong thư mục trên)
"""

import csv
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

import openpyxl

SITE_URL = "https://tahaisduck.github.io/"
REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "assets" / "letters"

# Xưng hô có thể có ở đầu tên file thư mời (dài trước, ngắn sau)
PREFIXES = ["em guộc", "anh", "chị", "em", "bạn"]
# Thanh Hằng tự xưng thế nào với từng nhóm
SELF = {"anh": "em", "chị": "em", "em": "chị", "em guộc": "chị", "bạn": "mình", "mọi người": "mình"}

# Tên trong danh sách → tên file thư mời, cho các trường hợp không tự khớp được
MANUAL = {
    "Thập Bình Phương": "anh Phương",
    "Tấn Lợi (Loy)": "bạn Tấn Loy",
    "Tình yêu": "em Ty",
    "Duka": "em Đức Khải",
    "Long trời lở loét": "em Bảo Long",
}
GROUP_FILE = "Mọi người"  # thư chung, không có trong danh sách


def ascii_fold(text):
    text = unicodedata.normalize("NFD", text).replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def key(text):
    """So khớp tên: bỏ dấu, bỏ phần trong ngoặc, emoji, khoảng trắng; viết thường."""
    text = ascii_fold(re.sub(r"\(.*?\)", "", text))
    return "".join(c for c in text if c.isascii() and c.isalnum()).lower()


def slug(text):
    """'em guộc Hải Đăng' -> 'em-guoc-hai-dang'"""
    return re.sub(r"[^a-z0-9]+", "-", ascii_fold(text).lower()).strip("-")


def split_prefix(stem):
    for p in PREFIXES:
        if stem.lower().startswith(p + " "):
            return p, stem[len(p) + 1 :]
    return "", stem


def read_guests(xlsx):
    ws = openpyxl.load_workbook(xlsx, data_only=True)["DS"]
    guests = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        stt, xung_ho, name = row[0], row[1], row[2]
        if name and str(name).strip():
            guests.append({"stt": int(stt), "xung_ho": str(xung_ho or "").strip(), "name": str(name).strip()})
    return guests


def main():
    base = Path(sys.argv[1])
    images = {p.stem: p for p in (base / "Thư mời TahaisDuck").glob("*.png")}
    full_key = {key(stem): stem for stem in images}  # "anh Ty" khác "em Ty"
    by_key = {key(split_prefix(stem)[1]): stem for stem in images}
    guests = read_guests(base / "DANH SÁCH MỜI.xlsx")

    # Ghép khách với thư
    pairs = []
    for g in guests:
        stem = (MANUAL.get(g["name"]) or full_key.get(key(g["xung_ho"] + g["name"]))
                or by_key.get(key(g["name"])))
        if stem not in images:
            sys.exit(f"Không tìm thấy thư mời cho: {g['name']}")
        pairs.append((g, stem))
    pairs.append(({"stt": "", "xung_ho": "Mọi người", "name": "Mọi người"}, GROUP_FILE))
    used = {stem for _, stem in pairs}
    if used != set(images):
        print("Cảnh báo, thư chưa dùng:", sorted(set(images) - used))
    if len(used) != len(pairs):
        sys.exit("Có hai khách dùng chung một thư mời, kiểm tra lại MANUAL")

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    manifest, rows = {}, []
    for g, stem in pairs:
        s = slug(stem)
        if s in manifest:
            sys.exit(f"Trùng link: {s}")
        you, _ = split_prefix(stem)
        if stem == GROUP_FILE:
            you, display = "mọi người", "Mọi người"
        else:
            display = stem[0].upper() + stem[1:]
        shutil.copyfile(images[stem], OUT_DIR / f"{s}.png")
        manifest[s] = {"name": display, "you": you or "bạn", "me": SELF.get(you, "mình")}

        link = f"{SITE_URL}?to={s}"
        rows.append({"stt": g["stt"], "xung_ho": g["xung_ho"], "ten": g["name"], "thu_moi": display, "link": link})
        print(f"{str(g['stt']):>3}  {g['name']:24} -> {link}")

    (OUT_DIR / "guests.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    out_csv = base / "links_thu_moi.csv"
    try:
        f = out_csv.open("w", newline="", encoding="utf-8-sig")
    except PermissionError:  # file đang mở trong Excel
        out_csv = base / "links_thu_moi (moi).csv"
        print(f"links_thu_moi.csv đang được mở ở chương trình khác, ghi sang: {out_csv.name}")
        f = out_csv.open("w", newline="", encoding="utf-8-sig")
    with f:
        w = csv.DictWriter(f, fieldnames=["stt", "xung_ho", "ten", "thu_moi", "link"])
        w.writeheader()
        w.writerows(rows)
    print(f"\n{len(rows)} thư mời -> {OUT_DIR}\nLink đã lưu ở {out_csv}")


if __name__ == "__main__":
    main()
