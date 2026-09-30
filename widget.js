// =====================================================================
// SCRIPTABLE WIDGET: ĐỘNG LỰC 365 (MINDSET 365)
// Tác giả: Động Lực 365 (dong-luc-365.vercel.app)
// Hỗ trợ: Màn hình chính (Home Screen) & Màn hình khóa (Lock Screen)
// =====================================================================

(async () => {
  const DEFAULT_MODE = "daily"; 
  const REPO_URL = "https://raw.githubusercontent.com/thang-vunam/mindset-calendar-365/main/quotes.json";
  const APP_URL = "https://dong-luc-365.vercel.app";

  // 1. Tải danh sách 365 câu trích dẫn
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

  // 2. Tính ngày thực tế hôm nay
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.min(365, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24))));

  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;

  // 3. Quản lý lưu trữ câu quote của ngày hôm nay (FileManager)
  const fm = FileManager.local();
  const savedQuotePath = fm.joinPath(fm.documentsDirectory(), "mindset-today-saved-quote.json");

  let savedData = null;
  if (fm.fileExists(savedQuotePath)) {
    try {
      savedData = JSON.parse(fm.readString(savedQuotePath));
    } catch (e) {}
  }

  const isRefreshAction = (args.queryParameters && args.queryParameters.refresh === "1") || config.runsInApp;
  const param = (args.widgetParameter && args.widgetParameter.trim().toLowerCase()) || DEFAULT_MODE;
  const isRandom = param === "random" || isRefreshAction;

  let selectedQuote;
  let isCustomQuote = false;

  if (isRefreshAction || (param === "random" && (!savedData || savedData.dayOfYear !== dayOfYear))) {
    // Người dùng bấm nút [🎲 Đổi] trên Widget hoặc chạy trong app
    const randomIndex = Math.floor(Math.random() * quotes.length);
    selectedQuote = quotes[randomIndex];
    isCustomQuote = true;
    
    // Lưu câu mới vào máy để CỐ ĐỊNH cả ngày
    try {
      fm.writeString(savedQuotePath, JSON.stringify({
        dayOfYear: dayOfYear,
        quote: selectedQuote,
        isCustom: true
      }));
    } catch (e) {}

    // Nếu bấm từ nút trên Widget: Tự động đóng Scriptable quay về màn hình chính ngay lập tức!
    if (args.queryParameters && args.queryParameters.refresh === "1") {
      App.close();
    }
  } else if (savedData && savedData.dayOfYear === dayOfYear) {
    // Đã có câu lưu cho hôm nay: CỐ ĐỊNH CẢ NGÀY!
    selectedQuote = savedData.quote;
    isCustomQuote = Boolean(savedData.isCustom);
  } else {
    // Bắt đầu ngày mới: Nạp câu chuẩn của ngày hôm nay và lưu lại
    selectedQuote = quotes[dayOfYear - 1] || quotes[0];
    isCustomQuote = false;
    try {
      fm.writeString(savedQuotePath, JSON.stringify({
        dayOfYear: dayOfYear,
        quote: selectedQuote,
        isCustom: false
      }));
    } catch (e) {}
  }

  const badgeIcon = isCustomQuote ? "🎲" : "📅";
  const badgeText = `${badgeIcon} HÔM NAY (${dayOfMonth}/${month}) • NGÀY ${dayOfYear}/365`;
  const scriptName = Script.name() || "Động lực 365";

  // 4. Khởi tạo Widget
  const widget = new ListWidget();
  widget.url = `${APP_URL}?quoteId=${selectedQuote.id}`;

  const isLockScreen = config.runsInAccessory;

  if (isLockScreen) {
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
    widget.setPadding(13, 15, 13, 15);
    
    const gradient = new LinearGradient();
    gradient.locations = [0, 0.5, 1];
    gradient.colors = [
      new Color("#0c2d64"),
      new Color("#051636"),
      new Color("#020817")
    ];
    widget.backgroundGradient = gradient;

    // Header Stack
    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    headerStack.centerAlignContent();
    
    const badge = headerStack.addText(badgeText);
    badge.font = Font.boldSystemFont(10);
    badge.textColor = new Color("#38bdf8");
    
    headerStack.addSpacer();
    
    // Nút 1-chạm [🎲 Đổi]
    const refreshPill = headerStack.addStack();
    refreshPill.setPadding(2, 6, 2, 6);
    refreshPill.backgroundColor = new Color("#0284c7", 0.35);
    refreshPill.cornerRadius = 6;
    refreshPill.url = `scriptable:///run?scriptName=${encodeURIComponent(scriptName)}&refresh=1`;
    
    const refreshTxt = refreshPill.addText("🎲 Đổi");
    refreshTxt.font = Font.boldSystemFont(9.5);
    refreshTxt.textColor = new Color("#7dd3fc");

    widget.addSpacer(5);

    // Tiêu đề hành động
    const headlineTxt = widget.addText(selectedQuote.headline.toUpperCase());
    headlineTxt.font = Font.boldSystemFont(12);
    headlineTxt.textColor = Color.white();
    headlineTxt.lineLimit = 1;

    widget.addSpacer(4);

    // Nội dung trích dẫn
    const quoteTxt = widget.addText(`"${selectedQuote.quote}"`);
    quoteTxt.font = Font.italicSystemFont(11.5);
    quoteTxt.textColor = new Color("#f1f5f9");
    quoteTxt.lineLimit = 4;

    widget.addSpacer(4);

    // Tác giả & Danh mục
    const footerStack = widget.addStack();
    footerStack.layoutHorizontally();
    
    const categoryLabel = footerStack.addText(selectedQuote.category || "Mindset");
    categoryLabel.font = Font.systemFont(9.5);
    categoryLabel.textColor = new Color("#94a3b8");
    
    footerStack.addSpacer();
    
    const authorLabel = footerStack.addText(`— ${selectedQuote.author}`);
    authorLabel.font = Font.boldSystemFont(10.5);
    authorLabel.textColor = new Color("#38bdf8");
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentMedium();
  }

  Script.complete();
})();
