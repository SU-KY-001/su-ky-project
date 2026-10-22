# Research: kiểm tra văn bản theo nguồn chuẩn, nguồn dài (PDF upload)

Ngày: 2026-10-22. Bản 2 (sau khi mở nguồn gốc). Nhãn: **[ĐÃ ĐỌC]** = đọc trang gốc; **[SNIPPET]** = chỉ thấy trích đoạn tìm kiếm; **[INFERENCE]** = suy luận, chưa kiểm.

## Câu hỏi

Cho một đoạn văn (kịch bản) và nguồn lớn (PDF dài): kiểm đoạn văn có khớp nguồn không, bằng cách nào, rẻ nào?

## Phát hiện

### 1. Khuôn mẫu chung: tách claim, tìm bằng chứng, phán xét [SNIPPET]

Nhiều bài 2025-2026 (ToE, EACL 2026 Findings, "Fact in fragments", repo `rag-nli`) dùng một khuôn: tách claim nhỏ, truy xuất đoạn bằng chứng, rồi verifier (NLI hoặc LLM) phán ủng hộ / mâu thuẫn / không đủ. Chưa mở bài gốc; chỉ dùng như mô tả chung. Repo `claim-evidence-checker` nhấn mạnh: đây là kiểm **nhất quán với bằng chứng cho trước**, không phải kiểm sự thật độc lập.

### 2. Nguồn dài. Anthropic Contextual Retrieval [ĐÃ ĐỌC]

Nguồn: https://www.anthropic.com/research/contextual-retrieval (đăng 2024-09-19, cập nhật 2026-10-18).

- **Nguồn nhỏ thì không cần RAG:** "nếu kho tri thức nhỏ hơn 200.000 token (~500 trang), đưa cả vào prompt"; prompt caching giảm độ trễ >2x và chi phí tới 90% (số của Anthropic, cho Claude). Chưa kiểm tương đương cho Gemini flash-lite hay cửa sổ ngữ cảnh của nó.
- **Kho lớn:** chia chunk "tối đa vài trăm token", tìm bằng embedding **và** BM25, hợp nhất bằng rank fusion, rồi reranker.
- **Số đo (top-20 chunk, 1 trừ recall@20; thất bại truy xuất 5,7% lúc đầu):**
  - Contextual Embeddings: giảm 35% (còn 3,7%).
  - Contextual Embeddings + Contextual BM25: giảm 49% (còn 2,9%).
  - Thêm rerank (Cohere, lấy 150 rồi chọn 20): giảm **67%** (còn 1,9%).
  - Thử trên codebase, tiểu thuyết, bài ArXiv, bài khoa học; embedding tốt nhất là Gemini Text 004 và Voyage. Không có dữ liệu tiếng Việt, không có lịch sử/PDF scan.
- Chi phí tạo ngữ cảnh chunk: $1,02 mỗi triệu token tài liệu (có prompt caching, chunk 800 token, tài liệu 8k token).
- Kích thước chunk: Anthropic **không** đưa con số khuyến nghị riêng; "512 token, chồng 10-20%" ở bản 1 của báo cáo này là từ blog bên thứ ba [SNIPPET], không phải Anthropic. Họ chỉ nói chunk, ranh giới và độ chồng ảnh hưởng kết quả.
- Con số "giảm hai phần ba" chỉ đúng khi **xếp chồng đủ bốn thứ**: context cho chunk, embedding, BM25, rerank. Không áp cho cách chỉ dùng từ khóa.

### 3. MiniCheck [ĐÃ ĐỌC: README; abstract qua kết quả tìm kiếm]

Nguồn: https://github.com/Liyan06/MiniCheck , https://arxiv.org/abs/2404.10774

- Mô hình nhận (tài liệu, **một câu**) trả điểm [0,1]; câu nhiều ý phải tách trước. Flan-T5-Large 770M được README ghi là mô hình tốt nhất dưới 1B, ngang GPT-4; abstract nói rẻ hơn ~400 lần.
- Có thêm `Bespoke-MiniCheck-7B` (mạnh hơn); README ghi dùng thương mại cần liên hệ công ty [dự án đại học: không ảnh hưởng].
- Benchmark LLM-AggreFact gồm Wikipedia, phỏng vấn, web, tin tức, hội thoại, khoa học, y tế. README không nói gì về tiếng Việt hay văn bản lịch sử; **chưa có bằng chứng** dùng được cho tiếng Việt. Cần tự chạy mô hình (GPU để nhanh, Linux cho bản 7B với vLLM).

### 4. Dịch vụ có sẵn

- **Claude Citations** [ĐÃ ĐỌC một phần: 300/2264 dòng; chưa đọc phần PDF/chunk tùy biến]: bật `citations.enabled` trên tài liệu; mô hình trả **đúng đoạn nguồn** chống đỡ từng ý trong câu trả lời. Đây là tính năng cho mô hình *sinh câu trả lời có trích dẫn*, không phải bộ kiểm một văn bản có sẵn; không phải nhà cung cấp hiện dùng (Gemini).
- **Google Check Grounding** [ĐÃ ĐỌC một phần: 300/483 dòng]: nhận `answerCandidate` (tối đa 4096 token) và `facts` (**tối đa 200 mục, mỗi mục ≤ 10.000 ký tự**); trả điểm ủng hộ 0-1, điểm từng claim (một câu = một claim), trích dẫn về đoạn fact, cờ "cần kiểm grounding". Claim chỉ ủng hộ một phần (đúng tên, sai năm) thì **không** coi là grounded. Độ trễ khuyến cáo <500ms. Cần dự án GCP và xác thực. Google khuyên **tách fact lớn thành nhiều fact nhỏ**; nghĩa là nguồn PDF dài vẫn phải chia và chọn đoạn trước (trần ~2 triệu ký tự). **Không** thấy nói về tiếng Việt hay giá ở phần đã đọc.
- Gemini Grounding with Google Search: tra web, không phải nguồn riêng của ta; không dùng.

### 5. PostgreSQL full-text [ĐÃ ĐỌC]

Nguồn: https://www.postgresql.org/docs/current/textsearch-controls.html (bản 18)

- Có hai hàm xếp hạng sẵn: `ts_rank` (theo tần suất lexeme) và `ts_rank_cd` (cover density, tính khoảng cách giữa các từ). Tài liệu nói rõ hàm xếp hạng **không dùng thông tin toàn cục** (không có IDF toàn kho). Vậy **không phải BM25**.
- BM25 trong Postgres cần extension hoặc tự tính ở ứng dụng; báo cáo này **chưa đánh giá** lựa chọn nào.
- Tài liệu trang này không nói về tokenizer tiếng Việt; chưa kiểm cấu hình ngôn ngữ nào dùng được.

### 6. PDF tiếng Việt [SNIPPET]

Khảo sát Vietnamese DAR (arXiv 2506.05061) nêu dấu thanh làm OCR khó; có hướng hậu xử lý bằng LLM và OCR lai VietOCR + PaddleOCR. Chưa mở bài gốc. PDF có lớp chữ: trích trực tiếp; PDF scan cần OCR và lỗi dấu có thể tạo "mâu thuẫn giả" [INFERENCE].

## So sánh cho Su Ký

| Cách | Bằng chứng đã đọc | Hợp khi | Vấn đề |
|---|---|---|---|
| A. `excerpt` nhập tay vào prompt (thiết kế P1) | thiết kế nội bộ | nguồn ngắn | không nhận PDF; cắt thầm khi dài |
| B. Cả tài liệu vào prompt | Anthropic: <200k token, dùng prompt caching | PDF vừa, ít nguồn | Gemini: cửa sổ và caching **chưa kiểm**; mỗi chunk kịch bản lặp lại cả tài liệu |
| C. Truy xuất theo đoạn kịch bản | Anthropic (số đo ở mục 2) | nguồn rất dài hoặc nhiều | đây là bài toán thật, xem dưới |
| D. NLI nhỏ (MiniCheck) | README, abstract | khối lượng lớn | tiếng Việt chưa có bằng chứng; hạ tầng riêng |
| E. Check Grounding | tài liệu Google | đã có GCP | tiếng Việt, giá chưa kiểm; trần 200 x 10k ký tự nên vẫn cần chọn đoạn |

## Đề xuất (sau khi kiểm)

1. **Thang bậc, từ rẻ đến đắt.** Không nhảy thẳng sang truy xuất.
   - Bậc 0 (P1): `excerpt` nhập tay như hiện thiết kế.
   - Bậc 1: trích chữ từ PDF có lớp chữ; nếu tổng nguồn của series nằm gọn trong cửa sổ ngữ cảnh của model đang dùng, đưa vào prompt theo cách B. **Điều kiện:** kiểm cửa sổ ngữ cảnh và chi phí của `gemini-3.5-flash-lite` trước [chưa kiểm].
   - Bậc 2: nguồn vượt cửa sổ hoặc chi phí không chịu nổi thì lập chỉ mục chunk và truy xuất theo đoạn kịch bản (C).
2. **Nếu cần bậc 2, bắt đầu bằng đường cơ sở từ khóa của Postgres (`ts_rank_cd`), nhưng coi nó là CHƯA ĐƯỢC KIỂM:** nó không tương đương hệ hybrid có rerank mà Anthropic đã đo (không BM25, không embedding, không rerank, không ngữ cảnh chunk); các con số 35%/49%/67% **không áp dụng**. Cần tự đo recall@k trên một bộ câu hỏi lấy từ PDF thật của series trước khi chọn.
3. **Bước kiểm cơ học vẫn giữ:** câu nguồn mà `message` trích phải là chuỗi con của chunk đã đưa vào prompt.
4. **Ba kết quả tách bạch trong UI:** mâu thuẫn với đoạn X (có trích); "không thấy nguồn nào nói về điều này" (không phải sai); khớp (không báo). Retrieval lọt thì dễ rơi vào kết quả thứ hai, nên không được trình bày như "nguồn không chứa".
5. **Gắn cờ nguồn OCR** để hạ mức nghiêm trọng khi chỉ khác dấu hoặc số [INFERENCE].
6. Ngoài phạm vi: MiniCheck, Check Grounding, OCR scan, rerank, embedding, ngữ cảnh chunk (chỉ thêm khi số đo bậc 2 cho thấy cần).

## Chưa rõ

- Cửa sổ ngữ cảnh, giá và caching của model đang dùng (`gemini-3.5-flash-lite`).
- Postgres của dự án: phiên bản, có `pgvector` hoặc extension BM25 không; cấu hình tìm kiếm tiếng Việt.
- PDF thật của series: số trang, scan hay có lớp chữ.
- Model có phân biệt "mâu thuẫn" với "không có trong đoạn này" đủ tốt không.
- Citations API: các nguồn PDF và chunk tùy biến (chưa đọc trọn trang).
- Check Grounding: tiếng Việt, giá.

## Nguồn

Đã đọc:
- Anthropic Contextual Retrieval: https://www.anthropic.com/research/contextual-retrieval
- MiniCheck (README): https://github.com/Liyan06/MiniCheck
- Claude Citations (một phần): https://platform.claude.com/docs/en/build-with-claude/citations
- Google Check Grounding (một phần): https://docs.cloud.google.com/generative-ai-app-builder/docs/check-grounding
- PostgreSQL 12.3 Controlling Text Search: https://www.postgresql.org/docs/current/textsearch-controls.html

Chỉ thấy trích đoạn tìm kiếm:
- ToE https://arxiv.org/html/2606.27736 ; EACL 2026 https://aclanthology.org/2026.findings-eacl.309/ ; Fact in fragments https://www.sciencedirect.com/science/article/abs/pii/S0957417425041879 ; claim-evidence-checker https://github.com/la-minoo/claim-evidence-checker ; rag-nli https://github.com/jaulamine-afk/rag-nli ; PaperTrail https://dl.acm.org/doi/full/10.1145/3772318.3791101
- MiniCheck abstract: https://arxiv.org/abs/2404.10774
- Chunking blog (512 token, 10-20%): https://cesarayala.dev/blog/rag-chunking-strategies-contextual-retrieval/
- Vietnamese DAR: https://arxiv.org/html/2506.05061v1 ; post-OCR: https://www.scribd.com/document/821058097/2410-13305v1
