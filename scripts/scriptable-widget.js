// =====================================================================
// SCRIPTABLE WIDGET: ĐỘNG LỰC 365 (MINDSET 365)
// Tác giả: Động Lực 365 (dong-luc-365.vercel.app)
// Hỗ trợ: Cả Màn hình khóa (Lock Screen) và Màn hình chính (Home Screen)
// Chế độ: Random (Ngẫu nhiên) & Daily (Theo ngày thực tế)
// =====================================================================

// [CẤU HÌNH] Chế độ mặc định: "random" (ngẫu nhiên) hoặc "daily" (theo ngày)
// Mẹo: Bạn cũng có thể điền trực tiếp "random" hoặc "daily" vào mục Parameter của Widget trên iOS!
const DEFAULT_MODE = "random"; 

const REPO_URL = "https://raw.githubusercontent.com/thang-vunam/mindset-calendar-365/main/quotes.json";
const APP_URL = "https://dong-luc-365.vercel.app";

// 1. Tải danh sách 365 câu trích dẫn (Hỗ trợ bộ nhớ đệm Offline tự động)
async function loadQuotes() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), "mindset-quotes-cache.json");
  
  try {
    const req = new Request(REPO_URL);
    req.timeoutInterval = 5;
    const data = await req.loadJSON();
    if (Array.isArray(data) && data.length > 0) {
      fm.writeString(cachePath, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    if (fm.fileExists(cachePath)) {
      try {
        return JSON.parse(fm.readString(cachePath));
      } catch (err) {}
    }
  }
  
  // Dữ liệu dự phòng nếu chưa có kết nối mạng lần đầu
  return [
    {
      day: 1,
      headline: "LÀM CHỦ HIỆN TẠI",
      quote: "Hành trình vạn dặm bắt đầu từ một bước chân kiên định.",
      author: "Lão Tử",
      category: "Thúc đẩy hành động"
    }
  ];
}

const quotes = await loadQuotes();

// 2. Xác định chế độ hiển thị (Ưu tiên Parameter của widget, sau đó đến DEFAULT_MODE)
const param = (args.widgetParameter && args.widgetParameter.trim().toLowerCase()) || DEFAULT_MODE;
const isRandom = param === "random";

// 3. Chọn câu trích dẫn
let selectedQuote;
let badgeText = "";

if (isRandom) {
  // Bốc ngẫu nhiên 1 câu trong kho 365 câu
  const randomIndex = Math.floor(Math.random() * quotes.length);
  selectedQuote = quotes[randomIndex];
  badgeText = `🎲 NGẪU NHIÊN • NGÀY ${selectedQuote.day}/365`;
} else {
  // Lấy theo ngày thực tế trong năm (1-365)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.min(365, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24))));
  selectedQuote = quotes[dayOfYear - 1] || quotes[0];
  badgeText = `📅 HÔM NAY • NGÀY ${selectedQuote.day}/365`;
}

// 4. Khởi tạo Widget
const widget = new ListWidget();
// Chạm vào widget sẽ mở ứng dụng đến đúng câu trích dẫn đó
widget.url = `${APP_URL}?day=${selectedQuote.day}`;

// Kiểm tra xem widget đang hiển thị ở Màn hình khóa hay Màn hình chính
const isLockScreen = config.runsInAccessory;

if (isLockScreen) {
  // ==========================================
  // A. GIAO DIỆN MÀN HÌNH KHÓA (Lock Screen Accessory)
  // ==========================================
  widget.addSpacer(1);
  
  const headerTxt = widget.addText(badgeText);
  headerTxt.font = Font.boldSystemFont(10);
  headerTxt.textColor = Color.white();
  
  widget.addSpacer(2);
  const quoteTxt = widget.addText(`"${selectedQuote.quote}" — ${selectedQuote.author}`);
  quoteTxt.font = Font.systemFont(11);
  quoteTxt.textColor = new Color("#e2e8f0");
  quoteTxt.lineLimit = 3;
} else {
  // ==========================================
  // B. GIAO DIỆN MÀN HÌNH CHÍNH (Home Screen Widget)
  // Phối màu Xanh Đại Dương Sâu (Deep Ocean Luxury)
  // ==========================================
  widget.setPadding(14, 16, 14, 16);
  
  const gradient = new LinearGradient();
  gradient.locations = [0, 0.5, 1];
  gradient.colors = [
    new Color("#0c2d64"),
    new Color("#051636"),
    new Color("#020817")
  ];
  widget.backgroundGradient = gradient;

  // Thanh tiêu đề phía trên
  const headerStack = widget.addStack();
  headerStack.layoutHorizontally();
  
  const badge = headerStack.addText(badgeText);
  badge.font = Font.boldSystemFont(10.5);
  badge.textColor = new Color("#38bdf8"); // Cyan nổi bật
  
  headerStack.addSpacer();
  
  const cat = headerStack.addText(selectedQuote.category || "Mindset");
  cat.font = Font.systemFont(10);
  cat.textColor = new Color("#94a3b8");

  widget.addSpacer(6);

  // Tiêu đề hành động
  const headlineTxt = widget.addText(selectedQuote.headline.toUpperCase());
  headlineTxt.font = Font.boldSystemFont(12.5);
  headlineTxt.textColor = Color.white();
  headlineTxt.lineLimit = 1;

  widget.addSpacer(4);

  // Nội dung trích dẫn
  const quoteTxt = widget.addText(`"${selectedQuote.quote}"`);
  quoteTxt.font = Font.italicSystemFont(12);
  quoteTxt.textColor = new Color("#f1f5f9");
  quoteTxt.lineLimit = 4;

  widget.addSpacer(4);

  // Tác giả
  const authorTxt = widget.addText(`— ${selectedQuote.author}`);
  authorTxt.font = Font.boldSystemFont(11);
  authorTxt.textColor = new Color("#38bdf8");
  authorTxt.rightAlignText();
}

Script.setWidget(widget);
Script.complete();
