import assert from "node:assert/strict";
import test from "node:test";
import {
  DEPTH_REPLY_REFUSAL,
  HIDDEN_COMMENT_MARKER,
  applyCommentListEvent,
  commentActionFlags,
  isSendEnabled,
  mapCreatedComment,
  replyRefusalMessage,
  type QaListComment,
} from "./qa-rules.ts";

function comment(overrides: Partial<QaListComment> = {}): QaListComment {
  return {
    id: "c1",
    depth: 0,
    created_at: "2025-11-01T00:00:00.000Z",
    content: "Câu hỏi gốc",
    root_id: null,
    reply_count_all: 0,
    user_name: "Ngọc Anh",
    user_avatar: null,
    reactions: { total: 0, has_reacted: false, counts: {}, my_reaction: null },
    ...overrides,
  };
}

test("empty and whitespace drafts disable send", () => {
  for (const draft of ["", " ", "   ", "\n", "\t", " \n\t "]) {
    assert.equal(isSendEnabled(draft), false, JSON.stringify(draft));
  }
});

test("a non-empty draft enables send", () => {
  assert.equal(isSendEnabled("Câu hỏi này thế nào?"), true);
  assert.equal(isSendEnabled("  có chữ  "), true);
});

test("hidden marker suppresses react, reply, edit, and delete", () => {
  const flags = commentActionFlags({
    content: HIDDEN_COMMENT_MARKER,
    depth: 0,
    is_owner: true,
    is_author: true,
  });
  assert.equal(flags.showReaction, false);
  assert.equal(flags.showReply, false);
  assert.equal(flags.showEdit, false);
  assert.equal(flags.showDelete, false);
  assert.equal(flags.showAuthorBadge, true);
});

test("depth 0 and 1 may reply and depth 2 may not", () => {
  for (const depth of [0, 1]) {
    const flags = commentActionFlags({
      content: "Nội dung",
      depth,
      is_owner: false,
      is_author: false,
    });
    assert.equal(flags.showReply, true, `depth ${depth}`);
    assert.equal(flags.showReaction, true, `depth ${depth}`);
  }
  const depth2 = commentActionFlags({
    content: "Nội dung",
    depth: 2,
    is_owner: true,
    is_author: false,
  });
  assert.equal(depth2.showReply, false);
  assert.equal(depth2.showReaction, true);
  assert.equal(depth2.showEdit, true);
  assert.equal(depth2.showDelete, true);
});

test("a non-author owner gets no Tác giả badge", () => {
  const student = mapCreatedComment(
    {
      id: "student-comment",
      root_id: null,
      parent_id: null,
      lesson_id: "lesson-1",
      user_id: "student-1",
      user_name: "Học viên",
      user_avatar: null,
      content: "Câu hỏi của học viên",
      depth: 0,
      created_at: "2025-11-10T00:00:00.000Z",
    },
    { currentUserId: "student-1", lessonAuthorId: "instructor-9" }
  );
  assert.equal(student.is_owner, true);
  assert.equal(student.is_author, false);
  assert.equal(commentActionFlags(student).showAuthorBadge, false);

  const listed = applyCommentListEvent([], {
    type: "comment_created",
    comment: student,
  });
  assert.equal(listed[0]?.is_author, false);
  assert.equal(commentActionFlags(listed[0]!).showAuthorBadge, false);

  const authorSeenByStudent = mapCreatedComment(
    {
      id: "author-comment",
      root_id: null,
      parent_id: null,
      lesson_id: "lesson-1",
      user_id: "instructor-9",
      user_name: "Giảng viên",
      user_avatar: null,
      content: "Trả lời của giảng viên",
      depth: 0,
      created_at: "2025-11-10T00:01:00.000Z",
    },
    { currentUserId: "student-1", lessonAuthorId: "instructor-9" }
  );
  assert.equal(authorSeenByStudent.is_owner, false);
  assert.equal(authorSeenByStudent.is_author, true);
  assert.equal(commentActionFlags(authorSeenByStudent).showAuthorBadge, true);
});

test("is_author is the only badge gate", () => {
  const authorNotOwner = commentActionFlags({
    content: "Nội dung",
    depth: 0,
    is_owner: false,
    is_author: true,
  });
  const ownerNotAuthor = commentActionFlags({
    content: "Nội dung",
    depth: 1,
    is_owner: true,
    is_author: false,
  });
  assert.equal(authorNotOwner.showAuthorBadge, true);
  assert.equal(authorNotOwner.showEdit, false);
  assert.equal(ownerNotAuthor.showAuthorBadge, false);
  assert.equal(ownerNotAuthor.showEdit, true);
});

test("owner and not hidden exposes edit and delete", () => {
  const flags = commentActionFlags({
    content: "Bình luận của tôi",
    depth: 0,
    is_owner: true,
    is_author: false,
  });
  assert.equal(flags.showEdit, true);
  assert.equal(flags.showDelete, true);
  const stranger = commentActionFlags({
    content: "Bình luận của người khác",
    depth: 0,
    is_owner: false,
    is_author: false,
  });
  assert.equal(stranger.showEdit, false);
  assert.equal(stranger.showDelete, false);
});

test("depth >= 2 reply is refused with the existing message", () => {
  assert.equal(replyRefusalMessage(0), null);
  assert.equal(replyRefusalMessage(1), null);
  assert.equal(replyRefusalMessage(2), DEPTH_REPLY_REFUSAL);
  assert.equal(replyRefusalMessage(3), DEPTH_REPLY_REFUSAL);
  assert.equal(
    DEPTH_REPLY_REFUSAL,
    "Không thể phản hồi comment có độ sâu >= 2."
  );
});

test("comment_created puts a new root at the top", () => {
  const older = comment({
    id: "old",
    created_at: "2025-11-01T00:00:00.000Z",
  });
  const created = comment({
    id: "new",
    content: "Mới hơn",
    created_at: "2025-11-10T00:00:00.000Z",
  });
  const next = applyCommentListEvent([older], {
    type: "comment_created",
    comment: created,
  });
  assert.equal(next[0]?.id, "new");
  assert.equal(next[1]?.id, "old");
  assert.equal(next.length, 2);

  const duplicate = applyCommentListEvent(next, {
    type: "comment_created",
    comment: created,
  });
  assert.equal(duplicate.length, 2);
});

test("comment_created on a reply increments the root reply count", () => {
  const root = comment({ id: "root", reply_count_all: 1 });
  const reply = comment({
    id: "reply",
    depth: 1,
    root_id: "root",
    content: "Phản hồi",
  });
  const next = applyCommentListEvent([root], {
    type: "comment_created",
    comment: reply,
  });
  assert.equal(next.length, 1);
  assert.equal(next[0]?.reply_count_all, 2);
});

test("comment_updated replaces the body", () => {
  const original = comment({ id: "c1", content: "Bản cũ" });
  const next = applyCommentListEvent([original], {
    type: "comment_updated",
    comment: { id: "c1", content: "Bản đã sửa", user_name: "Tên mới" },
  });
  assert.equal(next[0]?.content, "Bản đã sửa");
  assert.equal(next[0]?.user_name, "Tên mới");
  assert.equal(next[0]?.id, "c1");
});

test("comment_deleted removes the item", () => {
  const keep = comment({ id: "keep", reply_count_all: 2 });
  const drop = comment({ id: "drop" });
  const next = applyCommentListEvent([keep, drop], {
    type: "comment_deleted",
    comment: { id: "drop" },
  });
  assert.deepEqual(
    next.map((item) => item.id),
    ["keep"]
  );
  assert.equal(next[0]?.reply_count_all, 2);
});

test("comment_deleted for a reply that is not in the list decrements reply counts", () => {
  const withReplies = comment({ id: "root", reply_count_all: 3 });
  const empty = comment({ id: "other", reply_count_all: 0 });
  const next = applyCommentListEvent([withReplies, empty], {
    type: "comment_deleted",
    comment: { id: "missing-reply" },
  });
  assert.equal(next[0]?.reply_count_all, 2);
  assert.equal(next[1]?.reply_count_all, 0);
});

test("comment_hidden replaces the body with the hidden marker", () => {
  const original = comment({ id: "c1", content: "Sẽ bị ẩn" });
  const next = applyCommentListEvent([original], {
    type: "comment_hidden",
    comment: { id: "c1", content: HIDDEN_COMMENT_MARKER },
  });
  assert.equal(next[0]?.content, HIDDEN_COMMENT_MARKER);

  const fallback = applyCommentListEvent([original], {
    type: "comment_hidden",
    comment: { id: "c1" },
  });
  assert.equal(fallback[0]?.content, "[Bình luận đã bị ẩn]");
});

test("reaction events follow the event totals", () => {
  const original = comment({
    id: "c1",
    reactions: { total: 1, has_reacted: false, counts: { like: 1 }, my_reaction: null },
  });
  const reacted = applyCommentListEvent([original], {
    type: "comment_reacted",
    comment_id: "c1",
    reactions: { total: 2, has_reacted: true },
  });
  assert.equal(reacted[0]?.reactions.total, 2);
  assert.equal(reacted[0]?.reactions.has_reacted, true);
  assert.equal(reacted[0]?.reactions.counts?.like, 1);

  const unreacted = applyCommentListEvent(reacted, {
    type: "comment_unreacted",
    comment_id: "c1",
    reactions: { total: 1, has_reacted: false },
  });
  assert.equal(unreacted[0]?.reactions.total, 1);
  assert.equal(unreacted[0]?.reactions.has_reacted, false);
});
