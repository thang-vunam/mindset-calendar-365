// =====================================================================
// SCRIPTABLE WIDGET: ĐỘNG LỰC 365 (MINDSET 365)
// Tác giả: Động Lực 365 (dong-luc-365.vercel.app)
// Hỗ trợ: Màn hình chính (Home Screen) & Màn hình khóa (Lock Screen)
// Đồng bộ 3 chiều thời gian thực (Scriptable <-> Safari <-> PWA App)
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
      req.timeoutInterval = 4;
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

  const isRefreshAction = Boolean(args.queryParameters && args.queryParameters.refresh === "1");
  const isSyncAction = Boolean(args.queryParameters && args.queryParameters.sync === "1");
  const param = (args.widgetParameter && args.widgetParameter.trim().toLowerCase()) || DEFAULT_MODE;
  const isRandom = param === "random" || isRefreshAction;

  let selectedQuote = null;
  let isCustomQuote = false;

  if (isRefreshAction || (isRandom && (!savedData || savedData.dayOfYear !== dayOfYear))) {
    // A. Người dùng bấm [🎲 Đổi] trên Widget -> Bốc câu ngẫu nhiên mới
    const randomIndex = Math.floor(Math.random() * quotes.length);
    selectedQuote = quotes[randomIndex];
    isCustomQuote = true;
    
    // Lưu bộ nhớ đệm cục bộ
    try {
      fm.writeString(savedQuotePath, JSON.stringify({
        dayOfYear: dayOfYear,
        quote: selectedQuote,
        isCustom: true
      }));
    } catch (e) {}

    // Đồng bộ lập tức lên Cloud Sync API để Safari và PWA App tự động khớp câu này
    try {
      const postReq = new Request(`${APP_URL}/api/sync-quote`);
      postReq.method = "POST";
      postReq.headers = { "Content-Type": "application/json" };
      postReq.body = JSON.stringify({ day: dayOfYear, quoteId: selectedQuote.id, isCustom: true });
      postReq.timeoutInterval = 3;
      await postReq.load();
    } catch (e) {}
  } else {
    // B. Chế độ hiển thị & Đồng bộ: Lấy câu quote mới nhất từ Cloud Sync API
    let cloudSynced = false;
    try {
      const syncReq = new Request(`${APP_URL}/api/sync-quote`);
      syncReq.timeoutInterval = 3;
      const cloudData = await syncReq.loadJSON();
      if (cloudData && cloudData.day === dayOfYear && cloudData.quoteId) {
        if (cloudData.isCustom && cloudData.quote) {
          selectedQuote = cloudData.quote;
          isCustomQuote = true;
          cloudSynced = true;
        } else if (!cloudData.isCustom) {
          selectedQuote = quotes[dayOfYear - 1] || quotes[0];
          isCustomQuote = false;
          cloudSynced = true;
        }
      }
    } catch (e) {}

    if (cloudSynced && selectedQuote) {
      // Cập nhật bộ nhớ đệm cục bộ với câu mới lấy từ đám mây
      try {
        fm.writeString(savedQuotePath, JSON.stringify({
          dayOfYear: dayOfYear,
          quote: selectedQuote,
          isCustom: isCustomQuote
        }));
      } catch (e) {}
    } else {
      // Nếu ngoại tuyến hoặc lỗi mạng, dùng bộ nhớ cục bộ đã lưu trước đó
      if (savedData && savedData.dayOfYear === dayOfYear) {
        selectedQuote = savedData.quote;
        isCustomQuote = Boolean(savedData.isCustom);
      } else {
        selectedQuote = quotes[dayOfYear - 1] || quotes[0];
        isCustomQuote = false;
      }
    }
  }

  if (!selectedQuote) {
    selectedQuote = quotes[dayOfYear - 1] || quotes[0];
  }

  const badgeIcon = isCustomQuote ? "🎲" : "📅";
  const badgeText = `${badgeIcon} HÔM NAY (${dayOfMonth}/${month}) • NGÀY ${dayOfYear}/365`;
  const scriptName = Script.name() || "Động lực 365";

  // 4. Khởi tạo Widget
  const widget = new ListWidget();
  // Chạm vào thân Widget sẽ mở Web App đồng bộ đúng câu này
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

    // Nút 1-chạm [🔄 Sync]
    const syncPill = headerStack.addStack();
    syncPill.setPadding(2, 6, 2, 6);
    syncPill.backgroundColor = new Color("#334155", 0.6);
    syncPill.cornerRadius = 6;
    syncPill.url = `scriptable:///run?scriptName=${encodeURIComponent(scriptName)}&sync=1`;
    
    const syncTxt = syncPill.addText("🔄 Sync");
    syncTxt.font = Font.boldSystemFont(9);
    syncTxt.textColor = new Color("#cbd5e1");

    headerStack.addSpacer(5);
    
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

  // Đặt lịch để iOS WidgetKit chủ động đánh thức widget và kéo dữ liệu mới từ Cloud
  widget.refreshAfterDate = new Date(Date.now() + 1000 * 60 * 5); // 5 phút

  // Luôn gắn widget vào Script để iOS cập nhật WidgetKit
  Script.setWidget(widget);

  // Nếu người dùng kích hoạt 1-chạm (Sync hoặc Đổi), tự động đóng app và quay về màn hình chính
  if (isRefreshAction || isSyncAction) {
    App.close();
  } else if (!config.runsInWidget) {
    widget.presentMedium();
  }

  Script.complete();
})();
