"""Run bounded SQLite reads over an owner-filtered projection, never production SQL."""
import asyncio
import sqlite3
import time
from contextlib import closing
from fastapi import HTTPException
from sqlalchemy import select
from app.db.models.database import CourseEnrollments, Courses, LessonProgress, Lessons

SCHEMA = {'my_courses': 'course_id TEXT, title TEXT, progress REAL, enrolled_at TEXT',
          'my_progress': 'course_id TEXT, lesson_id TEXT, lesson_title TEXT, completed INTEGER'}
FUNCTIONS = {'count', 'sum', 'avg', 'min', 'max', 'round', 'lower', 'upper', 'length', 'coalesce', 'nullif', 'abs', 'total', 'ifnull', 'like'}


def query_snapshot(sql, datasets):
    if not isinstance(sql, str) or not 1 <= len(sql.strip()) <= 5000:
        raise ValueError('SQL phải dài từ 1 đến 5000 ký tự')
    with closing(sqlite3.connect(':memory:')) as db:
        db.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, 100_000)
        db.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, 5000)
        db.setlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH, 30)
        db.setlimit(sqlite3.SQLITE_LIMIT_COLUMN, 64)
        for table, columns in SCHEMA.items():
            db.execute(f'CREATE TABLE {table} ({columns})')
            rows = datasets.get(table, [])[:500]
            db.executemany(f'INSERT INTO {table} VALUES (?,?,?,?)', rows)
        db.commit()
        db.execute('PRAGMA query_only = ON')
        deadline = time.monotonic() + .25
        db.set_progress_handler(lambda: int(time.monotonic() > deadline), 1000)
        def authorize(action, arg1, arg2, database, trigger):
            if action == sqlite3.SQLITE_SELECT:
                return sqlite3.SQLITE_OK
            if action == sqlite3.SQLITE_READ and arg1 in SCHEMA and database in {'main', None}:
                return sqlite3.SQLITE_OK
            if action == sqlite3.SQLITE_FUNCTION and arg2.lower() in FUNCTIONS:
                return sqlite3.SQLITE_OK
            return sqlite3.SQLITE_DENY
        db.set_authorizer(authorize)
        try:
            cursor = db.execute(sql)
            if cursor.description is None:
                raise ValueError('Chỉ được truy vấn SELECT')
            rows = cursor.fetchmany(101)
            columns = [column[0][:100] for column in cursor.description]
            return {'columns': columns, 'rows': [[str(value)[:1000] if isinstance(value, str) else value for value in row] for row in rows[:100]],
                    'truncated': len(rows) > 100, 'source': 'owned_account_snapshot',
                    'snapshot_truncated': any(len(rows) > 500 for rows in datasets.values()),
                    'notice': 'Bản dữ liệu tối đa 500 khóa học và 500 tiến độ gần nhất của chính tài khoản; không suy diễn tổng toàn bộ khi bản dữ liệu bị cắt.'}
        except sqlite3.Error:
            raise ValueError('SQL bị từ chối hoặc vượt giới hạn. Chỉ SELECT trên my_courses và my_progress, tối đa 100 dòng kết quả.') from None


async def account_query(ctx, args):
    courses = (await ctx.db.execute(select(Courses.id, Courses.title, CourseEnrollments.progress, CourseEnrollments.enrolled_at)
        .join(CourseEnrollments, CourseEnrollments.course_id == Courses.id)
        .where(CourseEnrollments.user_id == ctx.user.id, CourseEnrollments.status == 'active', Courses.deleted_at.is_(None))
        .order_by(CourseEnrollments.enrolled_at.desc()).limit(501))).all()
    progress = (await ctx.db.execute(select(LessonProgress.course_id, LessonProgress.lesson_id, Lessons.title, LessonProgress.is_completed)
        .join(Lessons, Lessons.id == LessonProgress.lesson_id)
        .where(LessonProgress.user_id == ctx.user.id,
            LessonProgress.course_id.in_(select(CourseEnrollments.course_id).where(CourseEnrollments.user_id == ctx.user.id, CourseEnrollments.status == 'active')))
        .order_by(LessonProgress.updated_at.desc()).limit(501))).all()
    datasets = {'my_courses': [(str(r[0]), r[1][:500], float(r[2] or 0), r[3].isoformat() if r[3] else None) for r in courses],
                'my_progress': [(str(r[0]), str(r[1]), r[2][:500], int(bool(r[3]))) for r in progress]}
    try:
        return await asyncio.to_thread(query_snapshot, args.sql, datasets)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
