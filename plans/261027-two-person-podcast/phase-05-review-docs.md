# Phase 5: Kiểm duyệt, nhãn AI, tài liệu

Phụ thuộc: phase 2-4. Phải rebase trên P1 phase 7-8 (checklist tập, `scriptHash`/attach) nếu chúng chưa merge.

## Việc
1. **Checklist tập** (`episodeChecklist` + tài liệu `spec-episode-readiness.md` / `review-criteria-261022-podcast-episode.md` của P1): với tập hội thoại thêm mục tất định, mức WARNING không chặn:
   - `DIALOGUE_SPEAKER_UNASSIGNED`: tập thu thủ công mà `readerUserId` của một vai còn trống (chỉ áp dụng nếu phase 2 có trường này).
   - `AI_VOICE` (đã dự trù ở P1): tập có âm thanh từ TTS hai giọng phải hiện nhãn "giọng AI tái dựng, không phải ghi âm thật của nhân vật".
   - Mục "AI rà" trên trang duyệt: tập hội thoại hiển thị "AI rà chưa hỗ trợ kịch bản hội thoại" thay vì tóm tắt rỗng gây hiểu nhầm là AI không thấy gì.
2. **Công khai AI**: âm thanh sinh bằng TTS hai giọng gắn cờ nguồn `TTS` theo cách phase 8 của P1/luồng một giọng đang làm; thu thủ công không gắn cờ. Không thêm quy tắc pháp lý mới (chưa kiểm, vẫn là rủi ro mở trong báo cáo).
3. **Tài liệu**:
   - `docs/PODCAST-AI-BACKEND-NOTES.md`: mục kịch bản hội thoại, hợp đồng `POST /api/studio/episodes/:id/ai/voice` hai dạng, env mới, giới hạn thực tế gặp ở smoke phase 4.
   - `apps/api/CHANGELOG.md`: cột `dialogue`, thay đổi `CreateVoiceJobSchema`/`VoiceJobSchema`, env mới.
   - README/`.env.example`: env mới có giá trị mặc định và giải thích.
   - `plans/reports/brainstorm-261015-podcast-ai-script-assistant.md` mục 9 (T2 hai người kể) ghi "thay bằng plan 261027-two-person-podcast": đánh dấu `NarrationSegment`/`narrationMode` không còn dùng, và chuyển các câu MiniMax cũ thành "đã chuyển Gemini". Không để hai nguồn mâu thuẫn.
4. Cập nhật `plan.md`: trạng thái từng phase, ghi giới hạn thực tế đo ở phase 4 vào "Dữ kiện đã kiểm".

## Test
- Checklist: mục mới xuất hiện đúng điều kiện, không chặn xuất bản; tập một người kể không có mục mới.

## Xong khi
Không còn tài liệu nào mô tả hai người kể bằng `NarrationSegment` hay MiniMax như hiện hành; checklist đúng; build, typecheck, test toàn repo pass.
