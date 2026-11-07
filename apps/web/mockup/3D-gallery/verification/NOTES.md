# Đối chiếu triển lãm 3D

## Bộ tham chiếu room-design — lần kiểm tra hiện tại

- `room-design-entry-final.png`, `room-design-02-final.png`, `room-design-03-final.png`: ảnh chụp WebGL thật của route tạm `/trien-lam-1975`, viewport 1536×1024. Dữ liệu ảnh là ảnh tư liệu có trong repository, kèm nguồn và thông tin quyền; không dùng ảnh sinh của bộ tham chiếu làm tư liệu.
- `room-design-editor-final.png`, `room-design-editor-selection-final.png`, `room-design-preview-final.png`: editor và preview mở lại nháp trong database test. Scene chung đã hiện kiến trúc mới, nhưng ảnh của bản nháp test không hiện trong lần kiểm tra này; chưa xác nhận được tính đồng nhất của nội dung ảnh sau tải lại ở lần kiểm tra mới.
- Topology: ba phòng thẳng hàng rộng 12m, sâu 20/16/16m; cửa x=2..5 tại z=-8/-24 theo SVG. Portal có chiều sâu 1,4m và va chạm ở hai jamb. Không dùng hình floorplan AI.
- Vách hồi/portal: đã có khối cửa dày và các vách hồi ngắn có kiểm tra va chạm, tự tránh ảnh. Dù vậy nhịp khối trong render vẫn đơn giản hơn đáng kể so với ba phối cảnh tham chiếu; đặc biệt phòng 3 còn giống một hộp nhìn trực diện.
- Tường chương: có panel tối và chữ lấy từ dữ liệu; phòng 1 đưa panel ra tường cuối khi không bị ảnh chiếm chỗ. Phòng 2 và 3 chưa có bố cục, tỷ lệ chữ và vị trí nhìn giống hình mẫu.
- Ảnh/caption: dữ liệu mới hỗ trợ chiều rộng thật, bản lưu cũ giữ thang cũ. Fixture có ảnh lớn hơn nhưng tỷ lệ và mật độ trong ảnh chụp vẫn chưa đạt reference, nhất là ảnh chủ đạo phòng 2 và 3.
- Trần/ánh sáng/sàn: có trần tối, track, đèn rọi và sàn có texture/phản chiếu; render còn phẳng, ít biến thiên vật liệu và ánh sáng hơn mẫu. Ghế giữa phòng có va chạm, nhưng hình khối và bề mặt còn thô.
- Kết luận: **chưa đạt gate thị giác PLAN 6.0**. Kiến trúc đã thay đổi và cùng được dùng trong editor/preview/visitor, nhưng ảnh thực tế vẫn chưa tái hiện được tỷ lệ, chiều sâu và chất lượng ánh sáng của bộ room-design; cần tiếp tục chỉnh và kiểm tra lại ảnh dữ liệu sau lưu/tải.
- Kiểm thử liên quan: 18 test schema/bố trí/va chạm đạt; typecheck API và shared đạt. Typecheck toàn web còn lỗi các fixture test không liên quan bị thiếu (`dashboardActions`, `releaseReviewFixtures`, `historicalCatalogServer`). Không chạy migration hoặc reset database trong lần này.

## Lần dựng lại phòng nối tiếp

- `redo-public-final.png`: route xem thử tạm với ảnh thật của project, nhìn từ phòng đầu qua hai cửa nối tiếp.
- `redo-editor-final.png`: editor mở lại bản lưu trong database test và chọn ảnh trên tường.
- `redo-preview.png`: preview từ bản đã lưu, dùng cùng kiến trúc với trang khách.
- `redo-create.png` và `redo-preview-detail.png`: form tạo và popup podcast sau thay đổi kiến trúc.
- Khác biệt còn lại: phòng đầu vẫn rộng và trống hơn mockup; ảnh nhỏ hơn tham chiếu ở góc đầu, sàn và ánh sáng chưa có độ chân thực như mẫu. Ảnh editor được chụp sau khi sửa camera, nhưng chưa tái hiện góc có cửa ở giữa như mockup. Chưa đạt nghiệm thu thị giác mục 6.0.
- Giữ nguyên ID tường và offset của dữ liệu cũ, nhưng tọa độ vật lý của phòng hai và ba được đổi sang trục mới; đây là thay đổi diện mạo của cả snapshot đang công khai, cần kiểm tra với dữ liệu thực trước khi triển khai.

Kiểm tra trên browser headless với API và PostgreSQL test riêng, không reset database. Ảnh tư liệu dùng file thật của project; podcast dùng bản kể đã phát hành và được sao chép tham chiếu sang database test để kiểm tra playback.

Dữ liệu kiểm thử gồm tài khoản `gallery-check@example.test`, bản triển lãm và bản ghi podcast trong database test `suky_historical_test`; ảnh kiểm thử đã được tải qua Cloudinary của project. Các tài nguyên này chưa được xóa.

- `list-desktop.png`: bảng dashboard và trạng thái trống.
- `create-desktop.png`: màn tạo. Cảnh là renderer thật với phòng trống, không chứa ảnh 1975 mặc định.
- `editor-final.png`, `editor-focus-desktop.png`, `editor-drag-before.png`, `editor-drag-after.png`: bố cục và thao tác kéo điểm trên tường; ảnh được upload và gắn vào nháp.
- `redesign-editor.png`: ảnh đối chiếu lần chỉnh giao diện, trước các tinh chỉnh góc camera cuối cùng; cần chụp lại sau khi phiên browser riêng hoạt động.
- `editor-laptop.png`, `editor-mobile.png`, `editor-mobile-tree.png`: kiểm tra màn nhỏ; trên mobile nội dung và thuộc tính mở bằng sheet.
- `preview-podcast-desktop.png`, `preview-podcast-playing.png`: chi tiết điểm với bản kể thật; đã kiểm tra phát và đóng chi tiết dừng audio.
- `public-laptop.png`, `public-mobile.png`, `public-guest-detail.png`, `public-guest-mobile-detail.png`: trang khách từ snapshot đã công khai trong database test và chi tiết khi chưa đăng nhập.
- `public-no-webgl.png`: giả lập trình duyệt không có WebGL; vào mục lục vẫn hiện điểm trưng bày.

Khác biệt còn lại so với mockup: hình học phòng có sẵn của project không giống góc nhìn và chiều sâu của ảnh mẫu; ảnh trong editor hiện nhỏ hơn mockup và ánh sáng/sàn còn phẳng. Popup podcast dùng điều khiển audio hiện có của thư viện nên không trùng hoàn toàn thanh phát trong mockup. Ảnh tạo có nội dung trống theo yêu cầu, không thể đối chiếu mật độ ảnh của mẫu khi chưa thêm đủ điểm. Chưa hoàn tất nghiệm thu thị giác theo mục 6.0.

Đã kiểm tra: tạo nháp, upload/verify ảnh, gắn bản kể, áp dụng, lưu, tải lại, preview bản chưa lưu và preview sau refresh, công khai từ dashboard, mở URL công khai, kéo/hoàn tác, pointer lock và Esc. Mô phỏng một phiên khác lưu trước cho thấy editor giữ nội dung cục bộ, báo lỗi và cho tải bản mới sau xác nhận. Khách ẩn danh thấy lời mời đăng nhập, endpoint playback trả 401. Không có WebGL vẫn mở được mục lục; chi tiết khách đã được xem ở 390px. Còn cần kiểm tra các biên kéo gần cửa/góc.
