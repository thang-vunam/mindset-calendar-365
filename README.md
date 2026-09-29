# 🌟 Lịch Để Bàn 365 - Daily Mindset Fuel (PWA)

Ứng dụng **Progressive Web App (PWA)** tối ưu hóa cho màn hình **iPhone (tỉ lệ 19.5:9)**, mô phỏng chân thực trải nghiệm **Lịch lật để bàn 365 ngày** kết hợp năng lượng tư duy (Mindset Fuel) tiếp sức bản lĩnh mỗi ngày.

---

## 📱 Điểm nổi bật & Trải nghiệm UX

### 1. Trạng thái thu gọn (Collapsed / Widget View)
- Mô phỏng một cuốn lịch lật để bàn tinh tế với lò xo xoắn ốc kim loại (wire spiral rings) đặt trên mặt bàn gỗ ánh sáng ấm.
- Hiển thị ngày trong năm (`Ngày X / 365`), ngày tháng hiện tại (giờ Việt Nam GMT+7), số ngày nổi bật và câu khẩu hiệu hành động đanh thép.
- Nút gợi ý trực quan: **"Chạm để lật trang / Xem đầy đủ"** với hiệu ứng nhịp thở thu hút.

### 2. Trạng thái mở rộng (Expanded / Full App View)
- Khi chạm vào lịch, hiệu ứng chuyển cảnh mượt mà mở rộng toàn màn hình:
  - **Phần đỉnh:** Dải lò xo xoắn ốc kỹ thuật số hiện đại.
  - **Phần tiêu đề (Hero Action Headline):** Câu hành động chữ hoa tương phản cao phong cách editorial (đỏ thẫm Crimson / đen Obsidian).
  - **Phần giữa (Middle Badge):** Biểu tượng Mandala / Hình học thiêng liêng tối giản được tạo tự động bằng SVG, xoay nhẹ nhàng theo chu kỳ.
  - **Thẻ trích dẫn phía dưới (Bottom Glassmorphism Card):**
    - Ngày tháng định dạng tiếng Việt & chỉ số ngày (ví dụ: `Ngày 271 / 365 - Thứ Hai, 28 Tháng 9, 2026`).
    - Trích dẫn sâu sắc đầy đủ từ các bậc thầy tư duy (Marcus Aurelius, Seneca, Lão Tử, Steve Jobs, Viktor Frankl, James Clear...).
    - Tác giả & Tag phân loại (Tư duy Khắc kỷ, Kỷ luật & Bản lĩnh, v.v.).
    - Thanh tiến trình hoàn thành năm (0% -> 100%, tính theo thời gian thực).
- **Bộ điều khiển:**
  - Vuốt trái / phải trên màn hình cảm ứng để lật trang ngày trước/sau.
  - Phím mũi tên Trước / Sau.
  - Nút **"Hôm nay"** phát sáng để quay về ngày thực tế bất cứ lúc nào.
  - Nút **Thu gọn** để quay về dạng lịch để bàn.
  - Nút **Chọn ngày** (Modal chọn trực tiếp ngày 1 - 365 hoặc theo lịch ngày tháng).
  - Âm thanh lật trang chân thực được tổng hợp trực tiếp bằng Web Audio API (không cần tải file mp3, hoạt động offline).
  - Nút **Yêu thích (Bookmark)** lưu vào LocalStorage và nút **Chia sẻ/Sao chép**.

### 3. Tối ưu PWA & Offline
- Tệp `manifest.json` chuẩn cấu hình `display: "standalone"`, khóa hướng `portrait`.
- Thẻ iOS Safari: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, safe-area insets (`env(safe-area-inset-top)`).
- `sw.js` (Service Worker) lưu bộ đệm toàn bộ shell ứng dụng, biểu tượng và `quotes.json` giúp mở ngay lập tức kể cả khi ngắt kết nối mạng.
- Tự động tính toán ngày trong năm (1-365) theo múi giờ Việt Nam (GMT+7) và nạp dữ liệu tương ứng.

---

## 🚀 Khởi chạy & Sử dụng

### Chạy máy chủ xem thử:
```bash
node serve.js
# hoặc
npm start
```

### Cài đặt lên iPhone:
1. Đảm bảo iPhone và máy tính kết nối chung mạng Wi-Fi.
2. Mở trình duyệt **Safari** trên iPhone, nhập địa chỉ IP hiển thị trong terminal (ví dụ: `http://192.168.x.x:3000`).
3. Bấm vào nút **Chia sẻ** (biểu tượng mũi tên trỏ lên ở thanh điều hướng Safari).
4. Chọn **"Thêm vào MH chính" ("Add to Home Screen")**.
5. Mở icon từ màn hình chính để tận hưởng ứng dụng toàn màn hình độc lập như app iOS gốc!
