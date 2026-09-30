// =====================================================================
// SCRIPTABLE WIDGET: ĐỘNG LỰC 365 (MINDSET 365)
// Tác giả: Động Lực 365 (dong-luc-365.vercel.app)
// Hỗ trợ: Cả Màn hình khóa (Lock Screen) và Màn hình chính (Home Screen)
// Tính năng: Đổi câu quote ngẫu nhiên nhưng VẪN GIỮ NGUYÊN NGÀY HÔM NAY!
// =====================================================================

// [CẤU HÌNH] Chế độ mặc định: "random" (ngẫu nhiên câu quote) hoặc "daily" (câu gốc của ngày)
// Mẹo: Bạn cũng có thể điền "random" hoặc "daily" vào mục Parameter của Widget trên iOS!
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
  
  return [
    {
      id: 273,
      day: 273,
      headline: "ĐO LƯỜNG TỪNG CON SỐ",
      quote: "Không thể quản trị những gì bạn không đo lường. Hãy nhìn thẳng vào bảng thu chi thực tế mỗi ngày.",
      author: "Peter Drucker",
      category: "Kỷ luật tài chính"
    }
  ];
}

const quotes = await loadQuotes();

// 2. Tính ngày thực tế hôm nay (Luôn giữ nguyên ngày hôm nay!)
const now = new Date();
const start = new Date(now.getFullYear(), 0, 0);
const diff = now - start;
const dayOfYear = Math.min(365, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24))));

const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const dayName = daysOfWeek[now.getDay()];
const dayOfMonth = now.getDate();
const month = now.getMonth() + 1;

// 3. Xác định chế độ hiển thị ("random" hay "daily")
const param = (args.widgetParameter && args.widgetParameter.trim().toLowerCase()) || DEFAULT_MODE;
const isRandom = param === "random";

let selectedQuote;
let badgeText = "";

if (isRandom) {
  // Bốc ngẫu nhiên 1 câu quote hợp tâm trạng, NHƯNG VẪN GIỮ NGUYÊN NGÀY HÔM NAY
  const randomIndex = Math.floor(Math.random() * quotes.length);
  selectedQuote = quotes[randomIndex];
  badgeText = `🎲 HÔM NAY (${dayOfMonth}/${month}) • NGÀY ${dayOfYear}/365`;
} else {
  // Lấy câu gốc mặc định của ngày hôm nay
  selectedQuote = quotes[dayOfYear - 1] || quotes[0];
  badgeText = `📅 HÔM NAY (${dayOfMonth}/${month}) • NGÀY ${dayOfYear}/365`;
}

// 4. Khởi tạo Widget
const widget = new ListWidget();
// Chạm vào widget sẽ mở Web App hiển thị đúng câu này trên nền ngày hôm nay
widget.url = `${APP_URL}?quoteId=${selectedQuote.id}`;

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

  // Thanh tiêu đề phía trên: Luôn hiển thị ngày hôm nay
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
