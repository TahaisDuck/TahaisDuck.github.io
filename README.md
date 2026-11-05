# TahaisDuck.github.io

Thiệp mời tốt nghiệp của **Thanh Hằng**, vẽ theo phong cách **pixel art 8-bit**, có chú vịt pixel đội mũ tốt nghiệp chạy khắp trang.

- **Mở thư:** chạm vào các miếng bánh mì để vịt chạy tới ăn. Ăn đủ 5 miếng thì phong bì mở ra.
- **Điều khiển vịt:** chạm hoặc bấm vào chỗ trống để vịt chạy tới đó. Trên máy tính dùng phím mũi tên hoặc W A S D. Bấm vào vịt thì vịt kêu "quác". Khi không ai điều khiển, vịt tự đi dạo.
- **Link riêng cho từng khách:** mở `link.html`, nhập mỗi dòng một tên, rồi copy link (`?to=...`). Thiệp sẽ hiện "Gửi <tên>".

## Thư mời riêng cho từng khách

Mỗi khách có một link riêng theo tên, ví dụ `https://tahaisduck.github.io/?to=anh-danh`. Mở link ra, khách thấy tên mình, lời mời đúng xưng hô và thư mời riêng (có thể tải về).
Ảnh thư nằm công khai trong `assets/letters/`, danh sách khách trong `assets/letters/guests.json`.

Muốn tạo lại hoặc thêm khách: sửa `DANH SÁCH MỜI.xlsx` và thư mục `Thư mời TahaisDuck/`, rồi chạy

```
pip install openpyxl
python bin/build_invitations.py "C:/Users/minhn/Downloads/TahaisDuck Graduate Invitation"
```

Script ghi danh sách link ra `links_thu_moi.csv` trong thư mục đó.
Nếu tên trong danh sách không khớp với tên file thư, khai báo thêm trong bảng `MANUAL` ở đầu script.

## Sửa thông tin

Toàn bộ nội dung (ngày, giờ, địa điểm, lời mời, số bánh mì) nằm trong [`assets/js/config.js`](assets/js/config.js).

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `index.html` | Trang thiệp |
| `link.html` | Tạo link cá nhân cho khách mời |
| `assets/js/pixel.js` | Bộ vẽ pixel art: sprite vịt, bánh mì, phong bì, icon, cảnh nền |
| `assets/js/duck.js` | Chú vịt: đổi khung hình, chạy, đi dạo, tiếng kêu 8-bit |
| `bin/build_invitations.py` | Chép thư mời, tạo `guests.json` và file CSV link |
| `assets/js/app.js` | Mở thư, đếm ngược, lịch, bản đồ |
| `assets/css/style.css` | Giao diện pixel |

Đây là site tĩnh, không cần build. GitHub Pages phục vụ thẳng từ nhánh `main`.
