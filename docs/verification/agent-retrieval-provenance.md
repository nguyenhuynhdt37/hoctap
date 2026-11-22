# RAG provenance và mốc video

## Thay đổi

Migration additive `o12de456f789` thêm vào `lesson_chunks`: `source_kind`, `source_reference`, `source_content_hash`, `timestamps_verified`, `timestamp_anchors`. Không thay signature của SQL function `rag_search_scope`, không đổi embedding model/dimensions và không tạo vector database mới.

Các chunk cũ mặc định `source_kind=unknown`, `timestamps_verified=false`, `timestamp_anchors=[]`. Migration **không** phân loại lại bằng cách đoán từ dấu `mm:ss` trong nội dung. Citation của đoạn truy xuất vẫn có thể hiển thị, nhưng câu trả lời mới không có seek timestamp được xác nhận cho nguồn cũ này. Cần lấy lại phụ đề thật bằng quy trình ingestion được cấp quyền để có verified anchors; chưa chạy reingestion hàng loạt.

Ingestion hiện hữu dùng `YoutubeTranscriptService` lấy phụ đề YouTube thực. Nay service trả `TranscriptEvidence`: văn bản và các start time số từ caption API. Chunker giữ ranh giới caption; caption quá dài có thể chia theo token và vẫn giữ thời gian API của caption đó. Nội dung caption dù chứa `99:00`, Markdown hoặc chỉ dẫn giả mạo không thêm được một anchor mới. Không dùng model sinh timestamp để thiết lập `timestamps_verified`.

Mọi embedding được tạo trước khi khóa database. Trước khi thay tập chunk dẫn xuất, background job khóa và đối chiếu `LessonVideos.file_id`. Nếu người dùng vừa thay video, job cũ rollback và không ghi lesson vector, transcript hoặc chunks lên video mới. Thay tập chunk và metadata diễn ra trong cùng transaction.

Retrieval dùng SQL lookup bổ sung provenance cho đúng chunk ID đã được tìm thấy. Nguồn caption có `source_reference` khác video hiện tại bị loại khỏi kết quả. Citation grounding chỉ phát `timestamp_seconds` khi nguồn là `youtube_transcript`, đã xác nhận timestamps và timestamp thuộc danh sách anchors hợp lệ từ server. Không còn dò regex trên văn bản để quyết định video seek.

Nguồn/code/OCR/history tiếp tục là dữ liệu không đáng tin ở cấp chỉ dẫn. Prompt được bổ sung provenance để phân biệt chunk chưa rõ nguồn gốc với transcript đã lấy được; các boundary quyền hạn thực thi ở service/tool, không dựa vào lời nhắc. Tutor không đưa teacher solutions, hidden test inputs/expected hoặc quiz answer keys trước attempt vào prompt, kể cả khi code comment yêu cầu tiết lộ chúng.

## Kiểm chứng

`tests/unit/test_transcript_provenance.py`: **9 passed**, dùng fixture caption có thời gian thật theo hợp đồng, không phải gọi YouTube live. Kiểm tra:

- Nội dung chứa timestamp giả không tạo được anchor.
- Hỗ trợ timestamp hơn một giờ.
- Unknown/model-analysis không bật seek.
- Boolean, số âm, NaN, Infinity không giả được thời gian số.
- Lỗi fetch không suy luận nội dung thay thế.
- Ingestion lưu provenance đúng.
- Job của video cũ không ghi SQL khi video đã đổi.

`tests/unit/test_learning_agent_security.py` còn kiểm tra code comments yêu cầu tiết lộ lời giải không làm teacher solution/hidden answer xuất hiện trong assembled prompt. Điều này kiểm chứng dữ liệu tại boundary; không tuyên bố mọi prompt injection đều được giải quyết chỉ nhờ prompt.

Lệnh unit từ `studynest_be/`:

```sh
.venv/bin/python -m pytest tests/unit/test_transcript_provenance.py tests/unit/test_learning_agent_security.py tests/unit/test_tutor_context.py -q
```

Bộ integration này hiện đạt **6 passed** (PostgreSQL bản sao, bao gồm test provenance). Integration bổ sung trong `tests/integration/test_learning_agent_security.py` chạy trên bản sao PostgreSQL đã migrate: tạo chunk fixture có vector, dùng SQL `rag_search_scope` thật, xác minh enrichment anchors, giữ citation unknown nhưng bỏ timestamp, và loại transcript của video đã thay. Embedding query trong test này là vector fixture; không gọi embedding provider.

## Giới hạn và rollout

Chưa xác minh YouTube caption API live trong lượt này; kiểm thử ingestion dùng caption fixtures xác định. Không suy ra chất lượng nội dung giáo viên hay đồng bộ từng từ từ việc có caption start time. Start time của caption không phải lời hứa rằng mọi câu trong chunk đều bắt đầu đúng giây đó. UI seek vẫn cần receipt và đọc lại player state.

Không chạy migration/reingestion trên database production. Rollout cần migration trước phiên bản backend truy vấn các cột mới; rollback nên hạ code và giữ additive columns. Không downgrade để xóa provenance đang được sử dụng nếu chưa có backup và kế hoạch phục hồi.
