// =====================================================================
// SCRIPTABLE WIDGET: ĐỘNG LỰC 365 (MINDSET 365)
// Tự động xoay vòng câu trích dẫn ngẫu nhiên sau mỗi ~60 phút
// Tác giả: Động Lực 365 (dong-luc-365.vercel.app)
// Hỗ trợ: Màn hình chính (Home Screen) & Màn hình khóa (Lock Screen)
// =====================================================================

(async () => {
  const DEFAULT_MODE = "random-60m";
  const REPO_URL = "https://raw.githubusercontent.com/thang-vunam/mindset-calendar-365/main/quotes.json";
  const APP_URL = "https://dong-luc-365.vercel.app";
  const ROTATE_INTERVAL_MS = 60 * 60 * 1000; // 60 phút

  // 1. Tải danh sách 365 câu trích dẫn (Ưu tiên nạp đệm cục bộ 0.001s)
  async function loadQuotes() {
    const fm = FileManager.local();
    const cachePath = fm.joinPath(fm.documentsDirectory(), "mindset-quotes-cache.json");
    
    if (fm.fileExists(cachePath)) {
      try {
        const cached = JSON.parse(fm.readString(cachePath));
        if (Array.isArray(cached) && cached.length > 0) return cached;
      } catch (err) {}
    }

    try {
      const req = new Request(REPO_URL);
      req.timeoutInterval = 3;
      const data = await req.loadJSON();
      if (Array.isArray(data) && data.length > 0) {
        fm.writeString(cachePath, JSON.stringify(data));
        return data;
      }
    } catch (e) {}
    
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

  // 2. Tính ngày tháng hiện tại
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.min(365, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24))));

  // 3. Cơ chế xoay vòng ngẫu nhiên mỗi 60 phút (Tránh trùng lặp gần nhau)
  const fm = FileManager.local();
  const historyPath = fm.joinPath(fm.documentsDirectory(), "mindset-widget-history.json");

  let history = { lastQuoteId: null, recentIds: [], lastUpdated: 0 };
  if (fm.fileExists(historyPath)) {
    try {
      history = JSON.parse(fm.readString(historyPath));
      if (!Array.isArray(history.recentIds)) history.recentIds = [];
    } catch (e) {}
  }

  const isRandom = true;
  const isExpired = !history.lastUpdated || (now.getTime() - history.lastUpdated >= ROTATE_INTERVAL_MS);
  const shouldPickNew = isExpired || !history.lastQuoteId || config.runsInApp;

  let selectedQuote = null;

  if (shouldPickNew) {
    // Lọc bỏ 20 câu đã hiển thị gần nhất để không bao giờ bị lặp lại
    const recentSet = new Set(history.recentIds || []);
    let availableQuotes = quotes.filter(q => !recentSet.has(q.id));
    if (availableQuotes.length === 0) availableQuotes = quotes;

    const randomIndex = Math.floor(Math.random() * availableQuotes.length);
    selectedQuote = availableQuotes[randomIndex];

    // Cập nhật lịch sử hiển thị
    const updatedRecent = [selectedQuote.id, ...(history.recentIds || [])].slice(0, 25);
    try {
      fm.writeString(historyPath, JSON.stringify({
        lastQuoteId: selectedQuote.id,
        recentIds: updatedRecent,
        lastUpdated: now.getTime()
      }));
    } catch (e) {}
  } else {
    // Trong khung giờ 60 phút hiện tại: Giữ nguyên câu đang hiển thị
    selectedQuote = quotes.find(q => q.id === history.lastQuoteId) || quotes[dayOfYear - 1] || quotes[0];
  }

  if (!selectedQuote) {
    selectedQuote = quotes[dayOfYear - 1] || quotes[0];
  }

  const badgeText = `✨ TÂM THẾ MỖI GIỜ • NGÀY ${dayOfYear}/365`;

  // 4. Khởi tạo Widget
  const widget = new ListWidget();
  // Chạm vào bất kỳ vị trí nào trên widget sẽ mở Web App xem chi tiết
  widget.url = `${APP_URL}?quoteId=${selectedQuote.id}`;

  const isLockScreen = config.runsInAccessory;

  if (isLockScreen) {
    widget.addSpacer(1);
    const headerTxt = widget.addText(`✨ NGÀY ${dayOfYear}/365`);
    headerTxt.font = Font.boldSystemFont(10);
    headerTxt.textColor = Color.white();
    
    widget.addSpacer(2);
    const quoteTxt = widget.addText(`"${selectedQuote.quote}" — ${selectedQuote.author}`);
    quoteTxt.font = Font.systemFont(11);
    quoteTxt.textColor = new Color("#e2e8f0");
    quoteTxt.lineLimit = 3;
  } else {
    widget.setPadding(14, 16, 14, 16);
    
    const gradient = new LinearGradient();
    gradient.locations = [0, 0.5, 1];
    gradient.colors = [
      new Color("#0c2d64"),
      new Color("#051636"),
      new Color("#020817")
    ];
    widget.backgroundGradient = gradient;

    // Header Stack: Tinh tế & Không nút bấm
    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    headerStack.centerAlignContent();
    
    const badge = headerStack.addText(badgeText);
    badge.font = Font.boldSystemFont(10);
    badge.textColor = new Color("#38bdf8");
    
    headerStack.addSpacer();

    const tagStack = headerStack.addStack();
    tagStack.setPadding(2, 7, 2, 7);
    tagStack.backgroundColor = new Color("#0369a1", 0.3);
    tagStack.cornerRadius = 6;
    tagStack.borderWidth = 0.5;
    tagStack.borderColor = new Color("#0284c7", 0.4);

    const tagText = tagStack.addText(selectedQuote.category || "Mindset");
    tagText.font = Font.systemFont(9.5);
    tagText.textColor = new Color("#7dd3fc");

    widget.addSpacer(6);

    // Tiêu đề hành động
    const headlineTxt = widget.addText(selectedQuote.headline.toUpperCase());
    headlineTxt.font = Font.boldSystemFont(12.5);
    headlineTxt.textColor = Color.white();
    headlineTxt.lineLimit = 1;

    widget.addSpacer(4);

    // Nội dung trích dẫn
    const quoteTxt = widget.addText(`"${selectedQuote.quote}"`);
    quoteTxt.font = Font.italicSystemFont(11.5);
    quoteTxt.textColor = new Color("#f1f5f9");
    quoteTxt.lineLimit = 4;

    widget.addSpacer(4);

    // Footer Stack: Tác giả & Nhãn chu kỳ
    const footerStack = widget.addStack();
    footerStack.layoutHorizontally();
    footerStack.centerAlignContent();
    
    const cycleLabel = footerStack.addText("⏱️ Đổi mỗi 60p");
    cycleLabel.font = Font.systemFont(9);
    cycleLabel.textColor = new Color("#64748b");
    
    footerStack.addSpacer();
    
    const authorLabel = footerStack.addText(`— ${selectedQuote.author}`);
    authorLabel.font = Font.boldSystemFont(10.5);
    authorLabel.textColor = new Color("#38bdf8");
  }

  // 5. Cài đặt hẹn giờ cho iOS WidgetKit tự động làm mới sau đúng 60 phút
  widget.refreshAfterDate = new Date(Date.now() + ROTATE_INTERVAL_MS);

  // Đăng ký Widget với iOS
  Script.setWidget(widget);
  Script.complete();

  if (!config.runsInWidget) {
    widget.presentMedium();
  }
})();
