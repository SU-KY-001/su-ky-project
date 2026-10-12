Đầu tiên, để tạo chức năng quản lí và sản xuất nội dung cho moderator tôi sẽ cung cấp requirements, userflow của tính năng này như sau. Mod sẽ có 2 phần nhiệm vụ chính đó là tạo các Thời kỳ > Giai đoạn > Sự kiện lịch sử trước, sau đó sẽ tạo các tập podcast dựa theo những sự kiện lịch sử đó. Chi tiết hơn về 2 flow này như sau:

1. Flow tạo các Thời kỳ > Giai đoạn > Sự kiện

- Lưu ý: Khi tạo mốc thì phải đính kèm thời gian chính xác của mốc này

* Theo cách phân kỳ phổ biến nhất trong nghiên cứu lịch sử Việt Nam, lịch sử nước ta được chia thành **5 giai đoạn chính** (Lưu ý: Tùy theo góc nhìn phân kỳ của từng tài liệu giáo khoa hay chuyên khảo, lịch sử có thể được rút gọn thành 3 thời kỳ lớn hoặc chi tiết hóa thành nhiều giai đoạn nhỏ hơn vậy nên không hard code ép người dùng phải nhập đúng theo 5 thời kỳ này). Nhiệm vụ của moderator sẽ xác định tạo ra chính xác các mốc ‘’cha’’ này rồi mới sang bước tiếp theo.
* Ứng với mỗi Thời kỳ lịch sử này sẽ có các Giai đoạn lịch sử(Ở đây hiểu theo cách **Giai đoạn** là một khoảng thời gian ngắn hơn, là **một phần, một nấc thang hoặc một bước phát triển cụ thể** nằm bên trong một quá trình hoặc bên trong một "thời kỳ". có thể dùng từ chính xác hơn). Moderator sẽ tiếp tục tạo các giai đoạn ứng với mốc thời kỳ đó tức mốc “cha”.
* Sau khi đã tạo các mốc Giai đoạn lịch sử xong tức mốc “con” Moderator sẽ tạo ra các Sự kiện lịch sử.
  Ví dụ minh họa cho Flow này:

**Thời kỳ Tiền sử và Sơ sử (Trước thế kỷ III TCN – 179 TCN)**

Thời kỳ đặt nền móng cho nền văn minh sông Hồng, hình thành bản sắc cộng đồng và những nhà nước sơ khai đầu tiên.

- **Giai đoạn Tiền sử (Thời đồ đá - đồng thau):**
  - _Sự kiện:_ Hình thành các nền văn hóa khảo cổ lớn như Hòa Bình, Bắc Sơn, Phùng Nguyên, Đồng Đậu, Gò Mun. Đỉnh cao là **Văn hóa Đông Sơn** (kỹ thuật đúc trống đồng đạt đến trình độ tuyệt mỹ kỹ thuật).

1. Flow tạo podcast sẽ gồm 2 phần: Tạo kịch bản và thu âm

- Sau khi đã xong flow 1, ứng với từng thời kỳ, giai đoạn, mod sẽ tạo các tập podcast(episode) podcast sẽ kể về sự kiện lịch sử đó, moderator có thể phát hành bao nhiêu tập podcast tùy ý để có thể kể đủ nội dung của sự kiện lịch sử đó. Ví dụ sự kiện Cách mạng tháng 8 thuộc thời kỳ cận đại, Mod có thể tạo tập 1, tập 2,… để tạo nội dung kể.
- Tạo kịch bản
  - Mod sẽ upload script content (Tài liệu file dạng pdf, doc,…) Hoặc Mod có thể tự soạn trực tiếp nội dung trên giao diện(rich editor tip tap). Khi đã upload/soạn kịch bản xong, hệ thống sẽ có \*\*\*AI Assistant để hỗ trợ việc lọc, đánh giá kịch bản để hỗ trợ mod tạo ra một kịch bản đọc podcast hay nhất. Mod có thể gán nhãn nguồn tham khảo để tăng độ tin cậy cho nội dung podcast .
- Thu âm
  - Khi mod đã xong bước content tiếp theo sẽ ghi âm. Mod có thể upload voice đã xử lí lên hệ thống hoặc có thể tùy chọn thêm sử dụng \*\*\*giọng đọc AI , hệ thống sẽ tự gọi API như EvenLab hoặc Voice Cloning để đọc podcast theo nội dung kịch bản mà mod đã tạo.