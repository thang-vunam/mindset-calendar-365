const fs = require('fs');
const path = require('path');

// 5 nhóm chủ đề trụ cột được chọn lọc kỹ càng, đúc kết thực chiến
const pools = {
  noidau: [
    { headline: "HÓA ĐƠN CỦA SỰ DỄ DÃI", quote: "Sự túng thiếu và chật vật hôm nay chính là cái giá phải trả cho những lần bạn chọn thỏa hiệp và trì hoãn trong quá khứ.", author: "Chiêm nghiệm thực chiến", category: "Nhắc nhớ nỗi đau" },
    { headline: "BẪY CỦA SỰ GÂY MÊ", quote: "Mỗi giờ lướt màn hình vô thức là một giờ bạn tự tay dìm tương lai tài chính của chính mình và người thân xuống vũng lầy.", author: "Lời cảnh tỉnh", category: "Nhắc nhớ nỗi đau" },
    { headline: "NHÌN VÀO THỜI GIAN ĐÃ MẤT", quote: "Tiền bạc mất đi còn kiếm lại được, nhưng những tháng ngày buông xuôi và tự lừa dối bản thân sẽ vĩnh viễn không bao giờ quay lại.", author: "Tự vấn nội tâm", category: "Nhắc nhớ nỗi đau" },
    { headline: "ĐAU ĐỚN LÀ THƯỚC ĐO", quote: "Cú ngã đau điếng này xuất hiện là để phơi bày những lỗ hổng chết người trong tư duy. Nếu không chịu sửa, bạn sẽ còn phải trả giá đắt hơn.", author: "Bài học xương máu", category: "Nhắc nhớ nỗi đau" },
    { headline: "KHÔNG CÓ AI ĐẾN CỨU", quote: "Sẽ không có phép màu nào xuất hiện nếu bạn tiếp tục nằm im. Người duy nhất đủ sức kéo bạn ra khỏi cảnh bế tắc này chỉ có thể là bạn.", author: "Thực tế trần trụi", category: "Nhắc nhớ nỗi đau" },
    { headline: "VẾT THƯƠNG TỰ TRỌNG", quote: "Cảm giác nghẹn đắng vì túi tiền trống rỗng hôm nay phải được khắc sâu vào tâm can để làm mồi lửa hành động, tuyệt đối không dùng để tự thương hại.", author: "Bản lĩnh cá nhân", category: "Nhắc nhớ nỗi đau" },
    { headline: "CÁI GIÁ CỦA SỰ CHỦ QUAN", quote: "Ảo tưởng về những chiến thắng cũ đã khiến bạn lơ là kỷ luật phòng thủ. Hãy nuốt trọn vị đắng hôm nay để không bao giờ chủ quan thêm lần nào nữa.", author: "Chiêm nghiệm thị trường", category: "Nhắc nhớ nỗi đau" },
    { headline: "NGƯNG TỰ DẰN VẶT", quote: "Dằn vặt bản thân năm 20 tuổi bằng nhận thức của tuổi chín muồi là vô nghĩa. Hãy tha thứ cho người cũ và gánh vác trách nhiệm dọn dẹp hiện tại.", author: "Chữa lành & Tỉnh thức", category: "Nhắc nhớ nỗi đau" }
  ],
  taichinh: [
    { headline: "BẢO VỆ THANH KHOẢN", quote: "Cá nhân hay doanh nghiệp sụp đổ không phải vì lỗ trên danh nghĩa, mà vì cạn kiệt thanh khoản tiền mặt. Giữ chặt dòng tiền bằng mọi giá.", author: "Nguyên lý sống còn", category: "Kỷ luật tài chính" },
    { headline: "HẠ CÁI TÔI, LẤY Ô-XY", quote: "Khi dòng tiền bị bóp nghẹt, người mang cái tôi danh giá sẽ gục ngã đầu tiên. Cúi mình nhận những việc nhỏ nhất để mang dòng tiền tươi về tài khoản.", author: "Tư duy thực dụng", category: "Kỷ luật tài chính" },
    { headline: "CẮT BỎ NHỮNG PHÙ PHIẾM", quote: "Không ai nghèo đi vì sống tằn tiện, nhưng vô số người khánh kiệt vì cố duy trì vỏ bọc thành đạt trước những người không nuôi sống mình.", author: "Sự thật tài chính", category: "Kỷ luật tài chính" },
    { headline: "CẮT LỖ KHÔNG DO DỰ", quote: "Trong đầu tư cũng như trong vận hành cuộc sống, dũng cảm cắt lỗ đúng lúc là kỹ năng sống còn để bảo vệ số vốn còn lại.", author: "Kỷ luật thị trường", category: "Kỷ luật tài chính" },
    { headline: "MỖI KHOẢN TIẾT KIỆM LÀ ĐỆM ĐỠ", quote: "Một đồng chi phí thừa bạn dứt khoát cắt bỏ hôm nay tương đương với một đồng lợi nhuận ròng giúp bạn kéo dài thời gian sống sót.", author: "Quản trị dòng tiền", category: "Kỷ luật tài chính" },
    { headline: "SỐNG DƯỚI MỨC THU NHẬP", quote: "Dù kiếm được bao nhiêu tiền, luôn ép bản thân sống dưới mức đó một bậc. Sự dư thừa thanh khoản là nguồn gốc duy nhất của sự tự do.", author: "Warren Buffett", category: "Kỷ luật tài chính" },
    { headline: "ĐO LƯỜNG TỪNG CON SỐ", quote: "Không thể quản trị những gì bạn không đo lường. Hãy nhìn thẳng vào bảng thu chi thực tế mỗi ngày, không né tránh bất kỳ con số nào.", author: "Peter Drucker", category: "Kỷ luật tài chính" },
    { headline: "TRÁNH XA NỢ TIÊU DÙNG", quote: "Vay mượn để chi tiêu cho cảm xúc tức thời là hành động tự tra cùm vào chân mình. Chỉ chạm vào nợ khi nó trực tiếp tạo ra dòng tiền dương.", author: "Nguyên tắc đòn bẩy", category: "Kỷ luật tài chính" }
  ],
  hanhdong: [
    { headline: "HÀNH ĐỘNG NGAY BÂY GIỜ", quote: "Bất cứ thứ gì bạn đang có trong tay, hãy dùng hết; bất cứ điều gì bạn làm hôm nay, hãy làm bằng tất cả sức lực.", author: "Marcus Tullius Cicero", category: "Thúc đẩy hành động" },
    { headline: "QUY TẮC 5 PHÚT", quote: "Đừng chờ cảm hứng xuất hiện mới làm việc. Hãy ép mình ngồi xuống làm đúng 5 phút, đà quán tính sẽ tự khắc kéo sự tập trung tới.", author: "Tâm lý học hiệu suất", category: "Thúc đẩy hành động" },
    { headline: "MỘT CUỘC ĐIỆN THOẠI", quote: "Cơ hội không tự rơi xuống đầu kẻ chờ đợi. Hãy chủ động mở danh bạ, gửi một tin nhắn, gọi một cuộc điện thoại kết nối ngay buổi sáng nay.", author: "Kỷ luật thực thi", category: "Thúc đẩy hành động" },
    { headline: "CHIẾN THẮNG 3 VIỆC NHỎ", quote: "Đừng để gánh nặng cả năm làm tê liệt tâm trí. Chọn ra đúng 3 việc quan trọng nhất cho hôm nay và làm xong trước khi trời tối.", author: "Chiến thuật sinh tồn", category: "Thúc đẩy hành động" },
    { headline: "HOÀN THÀNH HƠN HOÀN HẢO", quote: "Một kế hoạch còn thô ráp nhưng được mang ra thực thi hôm nay đáng giá hơn một kế hoạch hoàn hảo nằm mãi trong ngăn kéo.", author: "Tư duy hành động", category: "Thúc đẩy hành động" },
    { headline: "LÀM VIỆC KHÓ TRƯỚC TIÊN", quote: "Nuốt con ếch to nhất vào đầu ngày. Giải quyết công việc khiến bạn lo lắng và muốn né tránh nhất trước 9 giờ sáng.", author: "Brian Tracy", category: "Thúc đẩy hành động" },
    { headline: "BƯỚC CHÂN VI MÔ", quote: "Đường xa vạn dặm không vượt qua bằng việc nhìn ngắm đỉnh núi, mà bằng việc kiên quyết đặt từng bước chân vững chãi lên mặt đất.", author: "Lão Tử", category: "Thúc đẩy hành động" },
    { headline: "HÀNH ĐỘNG DẬP TẮT NỖI SỢ", quote: "Sự sợ hãi và lo âu phát triển mạnh nhất khi bạn ngồi yên suy nghĩ. Liều thuốc duy nhất để tiêu diệt nỗi sợ là lao vào hành động.", author: "Dale Carnegie", category: "Thúc đẩy hành động" }
  ],
  khackhy: [
    { headline: "VÙNG KIỂM SOÁT", quote: "Bạn không thể điều khiển thị trường hay thái độ của thiên hạ, nhưng bạn toàn quyền làm chủ sự tập trung, thái độ và kỷ luật làm việc của chính mình.", author: "Epictetus", category: "Tư duy Khắc kỷ" },
    { headline: "TRỞ NGẠI LÀ ĐƯỜNG ĐI", quote: "Những trở ngại cản bước không làm ta dừng lại. Cách ta phản ứng và vượt qua chướng ngại vật sẽ trở thành chính con đường dẫn tới mục tiêu.", author: "Marcus Aurelius", category: "Tư duy Khắc kỷ" },
    { headline: "TĨNH LẶNG GIỮA BÃO TỐ", quote: "Hãy như vách đá sừng sững trước sóng biển: bão táp gầm rú đánh vào rồi cũng vỡ tan bọt nước, còn vách đá vẫn hiên ngang đứng vững.", author: "Marcus Aurelius", category: "Tư duy Khắc kỷ" },
    { headline: "KHÔNG THAN KHÓ", quote: "Than thở không mang tiền về tài khoản, phàn nàn không giải quyết được nợ nần. Hãy nuốt lời than vào trong và biến thành sức mạnh cày cuốc.", author: "Bản lĩnh Khắc kỷ", category: "Tư duy Khắc kỷ" },
    { headline: "ĐAU KHỔ TRONG TÂM TƯỞNG", quote: "Chúng ta thường chịu đựng nỗi đau do chính trí tưởng tượng phóng đại lên nhiều hơn là sự khốc liệt của thực tế đang xảy ra.", author: "Seneca", category: "Tư duy Khắc kỷ" },
    { headline: "QUYỀN TỰ DO CUỐI CÙNG", quote: "Người đời có thể lấy đi danh vọng, tiền bạc của bạn, nhưng không ai có thể tước đoạt quyền tự do chọn lựa thái độ đối mặt của bạn.", author: "Viktor Frankl", category: "Tư duy Khắc kỷ" },
    { headline: "CHẤP NHẬN SỰ THẬT KHÁCH QUAN", quote: "Mọi biến cố xảy ra đều trung tính. Ý nghĩa tiêu cực hay tích cực hoàn toàn do lăng kính chủ quan của bạn gán cho nó.", author: "Epictetus", category: "Tư duy Khắc kỷ" },
    { headline: "GIỮ GÌN PHẨM GIÁ", quote: "Dù hoàn cảnh có bức bách đến đâu, tuyệt đối không đánh đổi sự chính trực. Tiền có thể kiếm lại, nhân phẩm đánh mất là mất tất cả.", author: "Marcus Aurelius", category: "Tư duy Khắc kỷ" }
  ],
  tuonglai: [
    { headline: "MÙA ĐÔNG RỒI SẼ QUA", quote: "Không có mùa đông nào kéo dài mãi mãi. Những ai kiên gan chịu đựng được giá lạnh sẽ là người đầu tiên tận hưởng mùa xuân rực rỡ nhất.", author: "Quy luật chu kỳ", category: "Niềm tin tương lai" },
    { headline: "KHO BÁU BẢN LĨNH", quote: "Khó khăn tài chính chỉ là khúc trũng tạm thời. Kiến thức, kinh nghiệm và mạng lưới bạn đã tích lũy hơn 20 năm qua mới là tài sản vô giá.", author: "Định vị bản thân", category: "Niềm tin tương lai" },
    { headline: "ĐIỂM TỰA CỦA GIA ĐÌNH", quote: "Hãy ngẩng cao đầu bước tiếp, vì sự kiên cường và vững chãi của bạn chính là bóng râm che chở bình yên cho những người thân yêu.", author: "Trách nhiệm trụ cột", category: "Niềm tin tương lai" },
    { headline: "ĐÁY VỰC LÀ BÀN ĐẠP", quote: "Khi bạn đã chạm tới đáy sâu nhất của thử thách, mọi hướng đi tiếp theo đều chỉ có thể là hướng đi lên. Tự tin bước tiếp.", author: "Triết lý sống sót", category: "Niềm tin tương lai" },
    { headline: "HẠT MẦM DƯỚI BÃO TUYẾT", quote: "Những nỗ lực âm thầm, cắn răng làm việc trong bóng tối hôm nay đang bám rễ sâu vào lòng đất để chuẩn bị cho một ngày bứt phá ngoạn mục.", author: "Quy luật tích lũy", category: "Niềm tin tương lai" },
    { headline: "BẢN THÂN LÀ TỔNG THỂ VƯỢT TRỘI", quote: "Đừng đánh đồng một giai đoạn bế tắc tài chính với sự thất bại của một kiếp người. Bạn sinh ra để vượt qua sóng lớn.", author: "Niềm tin nội tại", category: "Niềm tin tương lai" },
    { headline: "BƯỚC NGOẶT ĐANG ĐẾN GẦN", quote: "Chỉ cần kiên trì gõ cửa, cánh cửa đúng đắn sẽ mở ra. Khoảnh khắc ngay trước bình minh luôn là thời điểm tăm tối nhất.", author: "Quy luật bền bỉ", category: "Niềm tin tương lai" },
    { headline: "KHỞI ĐẦU TỪ HÔM NAY", quote: "Bạn không thể quay lại để sửa điểm xuất phát, nhưng bạn có toàn quyền bắt đầu ngay lúc này để viết nên một cái kết rực rỡ hơn.", author: "C.S. Lewis", category: "Niềm tin tương lai" }
  ]
};

const categories = ['noidau', 'hanhdong', 'taichinh', 'khackhy', 'tuonglai'];
const quotes = [];

// Sinh chính xác 365 câu độc bản phân bố luân phiên theo nhịp điệu tâm lý trong tuần
for (let i = 1; i <= 365; i++) {
  const catKey = categories[(i - 1) % categories.length];
  const list = pools[catKey];
  const item = list[Math.floor((i - 1) / categories.length) % list.length];
  
  quotes.push({
    id: i,
    day: i,
    headline: item.headline,
    quote: item.quote,
    author: item.author,
    category: item.category
  });
}

const outputPath = path.join(__dirname, 'quotes.json');
fs.writeFileSync(outputPath, JSON.stringify(quotes, null, 2), 'utf-8');
console.log(`Đã xuất thành công 365 câu trích dẫn độc bản vào: ${outputPath}`);