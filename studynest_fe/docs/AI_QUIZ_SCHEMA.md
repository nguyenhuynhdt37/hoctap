# 📘 AI Quiz Generation API Contract

> **Version:** 1.0  
> **Date:** 2025-12-15  
> **Status:** Draft

Tài liệu này định nghĩa cấu trúc JSON mà Backend (AI Service) cần trả về cho Frontend khi thực hiện tính năng "Tạo câu hỏi Quiz bằng AI".

---

## 1. Flow làm việc

1. **Frontend**: Gửi `content` (nội dung bài học/văn bản), `topic`, `difficulty`, và `numberOfQuestions`.
2. **Backend**: Gọi LLM (Gemini/OpenAI) để xử lý.
3. **Backend**: Parse kết quả từ AI thành JSON chuẩn.
4. **Frontend**: Nhận JSON và render giao diện Quiz.

---

## 2. API Specification

### Endpoint

`POST /api/v1/ai/quizzes/generate`

### Request Body

```json
{
  "content": "Nội dung bài học hoặc context để tạo câu hỏi...",
  "numberOfQuestions": 5,
  "difficulty": "MEDIUM", // EASY, MEDIUM, HARD
  "language": "vi"
}
```

### Response Body (JSON Structure)

Backend trả về một object chứa danh sách câu hỏi.

```json
{
  "data": {
    "topic": "Tổng quan về ReactJS",
    "generatedAt": "2025-12-15T14:30:00Z",
    "questions": [
      {
        "id": 1,
        "type": "MULTIPLE_CHOICE",
        "question": "ReactJS là gì?",
        "options": [
          "Một Framework MVC hoàn chỉnh",
          "Một thư viện JavaScript để xây dựng giao diện người dùng",
          "Một ngôn ngữ lập trình backend",
          "Một hệ quản trị cơ sở dữ liệu"
        ],
        "correctOptionIndex": 1,
        "explanation": "React là một thư viện JS open-source được Facebook phát triển, tập trung vào việc xây dựng UI component."
      },
      {
        "id": 2,
        "type": "TRUE_FALSE",
        "question": "Virtual DOM giúp React cải thiện hiệu năng?",
        "options": ["Đúng", "Sai"],
        "correctOptionIndex": 0,
        "explanation": "Đúng, Virtual DOM giúp giảm thiểu số lần tương tác trực tiếp với Real DOM, tăng tốc độ render."
      }
    ]
  }
}
```

---

## 3. Chi tiết các trường (Schema)

| Field                | Type       | Description                                                                                                                                                       |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `topic`              | `string`   | Chủ đề được AI trích xuất (nếu có).                                                                                                                               |
| `questions`          | `array`    | Danh sách các câu hỏi.                                                                                                                                            |
| `question`           | `string`   | Nội dung câu hỏi.                                                                                                                                                 |
| `type`               | `enum`     | `MULTIPLE_CHOICE`, `TRUE_FALSE`, `MULTI_SELECT`.                                                                                                                  |
| `options`            | `string[]` | Danh sách các phương án trả lời (Nên cố định 4 cho trắc nghiệm).                                                                                                  |
| `correctOptionIndex` | `number`   | Index của đáp án đúng trong mảng `options` (bắt đầu từ 0).<br>_Lý do chọn index:_ Tránh lỗi typo so với việc gửi lại string đáp án, và dễ xử lý logic check ở FE. |
| `explanation`        | `string`   | Giải thích tại sao đáp án đó đúng (Quan trọng cho việc học).                                                                                                      |

---

## 4. TypeScript Interface (Frontend)

Sử dụng Interface này để map dữ liệu ở phía Client.

```typescript
// types/ai-quiz.ts

export type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface QuizOption {
  id: string; // FE tự generate id nếu cần key rendering
  text: string;
}

export interface AiQuizItem {
  question: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options: string[];
  correctOptionIndex: number; // 0-3
  explanation: string;
}

export interface AiQuizResponse {
  data: {
    topic?: string;
    questions: AiQuizItem[];
  };
}
```

## 5. Lưu ý cho Backend Dev

1. **Prompt Engineering**: Cần yêu cầu AI trả về **Strict JSON**. Không được có text dẫn dắt thừa (như "Here is result...").
2. **Validation**: Kiểm tra `correctOptionIndex` phải nằm trong khoảng hợp lệ của mảng `options` (ví dụ: `0 <= index < options.length`).
3. **Consistency**: Luôn trả về đủ 4 đáp án cho câu hỏi trắc nghiệm để UI đồng bộ (trừ câu hỏi True/False).
