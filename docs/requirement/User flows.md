Hệ thống Podcast kể chuyện lịch sử 

Danh sách Actor

* Guest — người dùng chưa đăng nhập / chưa có tài khoản.  
* User — người nghe đã đăng ký / đăng nhập tài khoản. (Cần xác nhận: có phải tài khoản trả phí hay không.)  
* Moderator — biên tập viên / quản trị nội dung.  
* Admin — quản trị hệ thống.   

**Yêu cầu chức năng theo Topic**

1. **Khám phá & nghe podcast (Hệ thống Podcast kể chuyện lịch sử)**  
    Primary Actors: Guest, Customer  
    Functional Requirements:

Guest:

* Xem được danh sách các podcast kèm giới thiệu (intro).  
* Xem chi tiết một podcast: mô tả và danh sách các tập phát.  
* Tìm kiếm podcast: Tìm theo Tên podcast, sự kiện, nhân vật, giai đoạn lịch sử. Filter theo Chủ đề và giai đoạn lịch sử.  
* Guest không nghe preview/trailer. Bấm Phát thì chuyển sang trang Login.   
* Đăng ký tài khoản bằng email  
* Đăng nhập bằng email  
* Sau khi đăng nhập từ nút Phát, hệ thống đưa người dùng quay lại đúng Episode vừa bấm.

Customer:

* Có các quyền xem và nghe như Guest.  
* Hồ sơ cá nhân: xem và sửa tên hiển thị, ảnh đại diện. Đổi mật khẩu.  
* Đánh dấu/ Lưu tiến trình nghe podcast . Tiếp tục nghe từ vị trí đã dừng ở lần nghe trước. Tiến trình nghe podcast nên được lưu theo tài khoản để đồng bộ  
* Lịch sử nghe: danh sách các Episode đã nghe, kèm thời điểm nghe gần nhất và tiến trình.   
* Làm Flashcard quiz để Customer có thể review lại các mốc kiến thức quan trọng trong podcast đó (Không cần thiết phải fix cứng số lượng các câu hỏi trong bộ câu hỏi là bao nhiêu bởi vì thời lượng của các tập podcast lịch sử là khác nhau và mỗi sự kiện dài ngắn thì nó đều khác thì có thể linh hoạt tạo ra bộ câu hỏi).  
* Game hóa: Thực hiện các nhiệm vụ được đánh dấu theo tuần/tháng. Customer có thể thực hiện các nhiệm vụ trong quá trình sử dụng nghe podcast trên hệ thống. Các nhiệm vụ sẽ được update theo tuần. Cuối tháng sẽ có Review lại nhiệm vụ hoàn thành rõ các mốc người dùng hoàn thành nhiệm vụ là vào khi nào,…………………………………………………….  
* **Timeline node:** là **một timeline toàn cục** đặt ở landing page. Nó đánh dấu các sự kiện lịch sử từ thời nguyên thủy đến thời hiện đại (cuối thế kỷ 20, đầu 21). Người dùng bấm vào node để tương tác.   
* Người dùng có thể chọn ngôi kể . **Ngôi kể:** áp dụng **theo từng Episode**. Mặc định ngôi thứ 3 (toàn bộ diễn biến). Ngôi thứ 1 là nhân vật lịch sử. Moderator xác định nhân vật cốt lõi làm người kể chính cho Episode đó (và cho cả Series nếu muốn). 

**\[SUGGESTION SCOPE\]**

* Thông báo khi có Episode mới.  
* Cơm thêm : đánh dấu yêu thích, bình luận, đánh giá (tính năng feedback từ người dùng)  
    
2. **Quản lý nội dung podcast**  
    Primary Actors: Moderator

Functional Requirements:  
 Moderator

* Quy trình tạo ra một podcast. Danh sách đầy đủ các trường thông tin bắt buộc khi tạo (tên, mô tả, hình ảnh minh họa, v.v.).  
* Tạo Series, tạo/sửa Episode, cập nhật thông tin.   
* Nhập script: upload file (pdf, doc) hoặc soạn trực tiếp bằng rich editor Tiptap (copy/paste được).   
* AI lọc nội dung để tạo kịch bản.  
* Voice: tự thu hoặc dùng bên thứ ba (ElevenLabs, voice cloning).   
* Ẩn hoặc xóa một podcast/tập phát không còn phù hợp. Cần xác nhận: có cần quy trình duyệt trước khi ẩn/xóa hay không.   
* Cập nhật thông tin một podcast đã tồn tại.  
* Thêm hoặc cập nhật một tập phát (episode) cho podcast, bao gồm nội dung lịch sử liên quan.  
* Nhập nguồn tham khảo lịch sử cho mỗi Episode (tên tài liệu/sách, tác giả, link nếu có) để đảm bảo độ chính xác. Chưa chốt Episode có bắt buộc phải có nguồn mới được phát hành hay không.  
* Dashboard thống kê nội dung cho Moderator: lượt nghe, đánh giá của các Series/Episode do mình quản lý. 

 Main Entities: Podcast; Tập podcast (Episode); Nội dung lịch sử

**2.1 Phân loại & lên lịch phát hành nội dung**  
 •	Lên lịch thời điểm phát hành cho một tập phát mới. Cần xác nhận: hệ thống có tự động phát hành theo lịch đã đặt, hay chỉ lưu nháp để Moderator phát hành thủ công.  
 Main Entities: Chủ đề/Danh mục; Lịch phát hành

**3\. Quản lý tài khoản & vai trò người dùng**  
 Primary Actors: Admin  
 Functional Requirements:  
 Admin

* Tạo, cập nhật, khóa hoặc mở khóa tài khoản người dùng.  
* Gán hoặc thay đổi vai trò (role) cho một tài khoản. Cần xác nhận: danh sách vai trò đầy đủ và quyền hạn tương ứng của từng vai trò.  
* Dashboard thống kê toàn hệ thống cho Admin: lượt nghe, đánh giá, và số lượng người dùng.   
   Main Entities: Tài khoản; Vai trò (Role)

**3.1 Cấu hình hệ thống & quyền truy cập**

* Cấu hình các thiết lập chung của hệ thống. Cần xác nhận: danh sách cụ thể các thiết lập cần quản lý chưa được cung cấp.  
* Quản lý quyền truy cập chức năng theo từng vai trò. Cần xác nhận: ma trận quyền chi tiết theo vai trò và chức năng.  
   Main Entities: Cấu hình hệ thống; Quyền truy cập  
* Audit log: ghi lại thao tác của Admin và Moderator (ai làm gì, lúc nào, trên đối tượng nào). Admin xem được và lọc theo người thực hiện, loại thao tác, thời gian.   
* Danh sách thao tác cần ghi log (đề xuất: tạo/sửa/ẩn/xóa nội dung, duyệt xóa, khóa/mở khóa tài khoản, đổi role, đổi cấu hình) và thời gian lưu log.   
    
  Link references trực tiếp tới sheet requirement   
  [Requirement](https://docs.google.com/spreadsheets/d/18hGv1bGNj1jCEmfim6BIM6PKxHY6m1S8PBN61T5hweQ/edit?gid=0#gid=0)

(--\> Định nghĩa cấp độ các thành phần podcast:  
Series →Chuỗi nhiều tập   
Episode → Tập  
Ví dụ:  
Series: Trận Bạch Đằng năm 938  
│  
├── Episode 1: Bối cảnh trước trận đánh  
├── Episode 2: Ngô Quyền chuẩn bị trận địa  
├── Episode 3: Quân Nam Hán tiến vào Bạch Đằng  
├── Episode 4: Trận đánh quyết định  
└── Episode 5: Kết quả và ý nghĩa)

 ⇒ Mô tả chi tiết cho requirement Tạo podcast của Moderator: Flow để tạo ra một podcast: Mod sẽ upload script content(Ở đây cần phải xác nhận rõ là upload nội dung loại gì? Có thể tích hợp cho upload tài liệu file dạng pdf, doc,… và cho mod tự soạn trực tiếp nội dung trên giao diện luôn xài rich editor tip tap chỉ cần copy paste nội dung vào thì nó sẽ dễ cho AI agent nó tự xử lí lọc nội dung kể lại theo ngôi kể Nhân vật lịch sử hơn nhiều) để tạo podcast thì hệ thống mình sẽ thêm một cái ngôi kể theo Nhân vật lịch sử có ảnh hưởng trực tiếp liên quan đến kết quả của sự kiện đó (Thì phần này sẽ là phần cơm thêm\* để người dùng thêm lựa chọn để nghe podcast), còn mặc định default sẽ là kể chuyện theo ngôi thứ 3 tức là kể lại toàn bộ diễn biến của sự kiện đó . Ví dụ như trận Bạch Đằng năm 938\. Khi mod chuẩn bị content vào tạo podcast thì phần xử lí voice \=\> có thể tự thu hoặc sử dụng 3rd party như EvenLab hoặc Voice Cloning \+ kết hợp với phần xử lí voice là phần lọc nội dung để làm flow kể theo Nhân vật lịch sử \=\> Phần này sẽ sử dụng AI để lọc và tạo kịch bản sau khi có kịch bản để sử dụng cho flow này thì có thể chọn Thu voice bằng AI sử dụng 3rd party như EvenLab, Voice Cloning ,.…

