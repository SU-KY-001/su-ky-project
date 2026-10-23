# UX 04: Giọng đọc AI (TTS)

Triển khai hiện tại (2026-10-23): Gemini TTS một người kể. Chọn giọng bằng một select dùng component `ModeratorSelect`, thay nhóm thẻ radio; đủ Riko, Kore, Charon, Puck, Aoede với tên và mô tả trong từng option. Khóa select khi đang bắt đầu/tạo audio. Nguồn mock lịch sử: `mockups/04-voice-wizard.html`; các mục wizard MiniMax/tốc độ/cao độ bên dưới không mô tả tính năng hiện hành.

## 1. Vào trang

Bước **3 Giọng đọc** của tập (Thông tin ✓ · Kịch bản ✓ · **Giọng đọc** · Xem lại). Cột đơn, rộng tối đa 760px.

Đầu trang có **hai tab phân đoạn**: **"Tải lên âm thanh"** | **"Tạo bằng AI"** (đang chọn). Tab "Tải lên" là luồng upload file đã có.

## 2. Màn chính, 3 trạng thái (`#main`)

### 2a. `empty`: thẻ "Tạo giọng đọc từ kịch bản"
- Mô tả: *"Kịch bản 1.842 ký tự, khoảng 2 phút 10 giây khi đọc. Bạn chọn giọng, nghe thử, rồi mới tạo cả tập."*
- Radio: **"Một người kể"** (mặc định) / **"Hai người kể xen kẽ"**.
- Nút **"Tạo giọng đọc"** (icon micro) → mở hộp thoại 4 bước.

### 2b. `ready`: sau khi tạo xong
- Tiêu đề "Giọng đọc đã tạo" + nhãn xanh **"12/12 đoạn"**.
- Dạng sóng âm.
- Nút **"Nghe cả tập"**, **"Xem từng đoạn"** (mở lại hộp thoại **thẳng bước 4**).
- Nút chính **"Dùng làm âm thanh của tập"** → sang 2c.

### 2c. `used`
- Hộp xanh: *"Đã ghép và lưu thành âm thanh của tập. Giọng AI sẽ được gắn nhãn khi phát hành."*

## 3. Hộp thoại "Giọng đọc AI · Tập 3", 4 bước (4 chấm)

### Bước 1 "Chọn giọng"
Hai cột:
- **Người kể chính** (ô vuông đen):
  - ô chọn giọng (mock: `Vietnamese_kindhearted_girl`);
  - nút **"Nghe thử câu mẫu"**;
  - **"Tốc độ"**: ô số, 0,5 đến 2, bước 0,05, mặc định 1,0;
  - **"Cao độ"**: ô số, −12 đến 12, bước 1, mặc định 0.
  - Rời ô: giá trị tự **kẹp** vào khoảng; rỗng/không phải số → về mặc định.
- **Người kể thứ hai (lời trích dẫn)** (ô vuông xanh, hơi mờ): ô chọn "Chưa chọn giọng"; chú thích *"Hệ thống mới có một giọng tiếng Việt. Giọng thứ hai cần tạo mới (tốn phí) hoặc dùng giọng nhân bản."*

Hộp cảnh báo vàng: *"Không dùng giọng giống người thật nếu chưa có sự đồng ý của họ."*
Chân: "Đóng" · "Tiếp →".

### Bước 2 "Ai đọc đoạn nào"
- Câu dẫn: *"Mặc định mọi đoạn do người kể chính đọc. Chỉ cần đổi những đoạn là lời trích dẫn."*
- Bảng 3 cột: **#** · **Nội dung** (câu đầu, cắt "…") · **Người đọc** (ô chọn: Người kể chính / Người kể thứ hai). Mock: đoạn 2 (câu trích Chiếu dời đô) đã chọn "Người kể thứ hai".
- Dòng: *"Hiện 3 trên 12 đoạn. Kéo xuống để xem hết."* (bảng thật có đủ 12 hàng, cuộn được).
- Chân: "Quay lại" · "Tiếp →".

### Bước 3 "Xác nhận và tạo"
- Bảng tóm tắt: **Số ký tự** (1.842) · **Chi phí ước tính** (*"khoảng $0,18 (bản chất lượng cao)"*) · **Số giọng** (*"2 (A: chính, B: trích dẫn)"*).
- Checkbox cam kết: *"Tôi hiểu giọng đọc do AI tạo và sẽ được gắn nhãn 'giọng AI' khi phát hành."*
- Chân: "Quay lại" · **"Tạo giọng đọc"** → bước 4. **Lưu ý:** mock **không khóa** nút theo checkbox; bản thật nên bắt buộc tick mới cho tạo (đề xuất, chưa có trong mock/spec).

### Bước 4 "Tiến độ và nghe thử"
- Đang chạy: "Đang tạo từng đoạn" + nhãn "Đang chạy" + thanh tiến độ + *"9/12 đoạn. Chạy nền, bạn đóng tab vẫn không mất."*
- Xong: hộp xanh *"Đã tạo xong 12 đoạn."*, dạng sóng, **bảng từng đoạn**: # · nội dung · người đọc (ô màu + "chính"/"thứ hai") · nút **"Nghe"** (và **"Tạo lại"** cho đoạn muốn làm lại).
- Ghi chú: *"Sửa kịch bản sau này chỉ tạo lại những đoạn đã đổi."*
- Chân: *"Bạn chưa nghe: âm thanh chưa được dùng cho tập."* · nút chính **"Xong, nghe cả tập"** → đóng hộp thoại, màn chính sang `ready`.

## 4. Quy tắc cứng

- Giọng AI luôn được **gắn nhãn khi phát hành**; cam kết thể hiện ở bước 3 và ở màn `used`.
- **Âm thanh AI chưa được dùng cho tập** cho tới khi bấm **"Dùng làm âm thanh của tập"** (bước ghép + lưu); nghe thử không gắn gì vào tập.
- Tạo chạy nền: đóng tab không mất.
- Sửa kịch bản sau đó: chỉ đoạn đã đổi bị đánh dấu cần tạo lại (liên quan dòng readiness "Giọng AI không còn đoạn chưa tạo lại sau khi sửa", xem UX 05).
- Chi phí và số ký tự hiện **trước** khi tạo.

## 5. Đối chiếu web hiện tại

Đã đọc: `PodcastVoiceStep.tsx`, `AiVoiceMockPanel.tsx`, `podcastWizardState.ts` (`voiceComplete`), grep API/DB không có `tts`/`synthes`/MiniMax (chỉ có hằng model `minimax-m3` của `ai-engine`, không phải TTS).

| # | Mock | Web | Kết luận |
|---|---|---|---|
| 1 | Tab phân đoạn "Tải lên âm thanh / Tạo bằng AI" | Hai **thẻ lựa chọn** "Tải file thu âm" / "Dùng giọng AI" | Khác hình thức, cùng ý |
| 2 | Thẻ "Tạo giọng đọc từ kịch bản": ước thời lượng đọc, chọn 1 hay 2 người kể | `AiVoiceMockPanel`: 3 giọng **bịa** (Nam trầm / Nữ thời sự / clone của Mod), nhãn "Bản xem trước", nút "Nghe thử" không phát gì | **Là mô phỏng**; không có chọn 1/2 người kể |
| 3 | Hộp thoại 4 bước | Không có hộp thoại; một panel phẳng | Thiếu |
| 4 | Giọng thật từ MiniMax, tốc độ 0,5–2 **ô số**, cao độ −12..12 **ô số** | Tốc độ **thanh trượt 0,75–1,25** (không lưu); "Độ ổn định" thanh trượt không có trong mock | Sai dải, sai kiểu; không có cao độ |
| 5 | Phân vai từng đoạn (bảng 12 đoạn) | Danh sách đoạn **cố định** 4 dòng "Mở đầu/Bối cảnh/Diễn biến/Kết" | Mô phỏng, không bám kịch bản |
| 6 | Xác nhận chi phí, cam kết gắn nhãn | Không có chi phí, không có cam kết | Thiếu |
| 7 | Tiến độ nền, nghe từng đoạn, Tạo lại từng đoạn | Nút "Tạo" chỉ quay spinner 0,9s rồi dừng; ghi rõ "không gọi dịch vụ AI" | Thiếu |
| 8 | "Dùng làm âm thanh của tập" ghép + lưu | Không có. `voiceComplete` chỉ đúng khi **có file upload** (`uploadedAudio.assetId`), chế độ AI không bao giờ hoàn thành bước | Thiếu; luồng AI không thể đi tiếp |
| 9 | Backend TTS, ghép đoạn (ffmpeg), nhãn "giọng AI" | Không có | Thiếu toàn bộ; chặn bởi khóa MiniMax, ffmpeg, giọng thứ hai |
