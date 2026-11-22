"""Create synthetic E2E fixtures in an explicitly isolated database ONLY."""
import asyncio,json,os
from datetime import UTC,datetime,timedelta
from pathlib import Path
from uuid import uuid4
from sqlalchemy import select
from app.core.security import SecurityService
from app.core.settings import settings
from app.db.sesson import AsyncSessionLocal,engine
from app.db.models.database import User,Role,UserRoles,Sessions,Courses,CourseSections,Lessons,LessonVideos,CourseEnrollments,LessonProgress,LessonActive,SupportedLanguages,LessonCodes,LessonCodeFiles,LessonCodeTestcases

async def main():
    if 'maymay_agent_verify_' not in settings.DATABASE_ASYNC_URL:
        raise RuntimeError('Only a named isolated verification clone is allowed')
    async with AsyncSessionLocal() as db:
        user=User(id=uuid4(),fullname='Agent browser fixture',email=f'agent-e2e-{uuid4().hex}@example.invalid',password='unused',is_banned=False)
        owner=User(id=uuid4(),fullname='Fixture instructor',email=f'agent-e2e-owner-{uuid4().hex}@example.invalid',password='unused')
        db.add_all([user,owner]);await db.flush()
        role=await db.scalar(select(Role).where(Role.role_name=='USER'))
        db.add(UserRoles(user_id=user.id,role_id=role.id))
        course=Courses(id=uuid4(),instructor_id=owner.id,title='Isolated Agent Browser Fixture',slug=f'agent-browser-fixture-{uuid4().hex[:8]}',is_published=True,approval_status='approved',is_lock_lesson=False,description='Synthetic fixture on disposable test DB only',level='beginner',language='vi',base_price=0,currency='VND',outcomes=['Browser verification'],requirements=['Test fixture'],target_audience=['Automated tests'])
        db.add(course);await db.flush()
        section=CourseSections(id=uuid4(),course_id=course.id,title='Browser fixtures',position=0);db.add(section);await db.flush()
        video=Lessons(id=uuid4(),course_id=course.id,section_id=section.id,title='Video fixture',lesson_type='video',position=0,is_preview=False)
        code=Lessons(id=uuid4(),course_id=course.id,section_id=section.id,title='Coding fixture',lesson_type='code',position=1,is_preview=False)
        db.add_all([video,code]);await db.flush()
        # Existing public video used solely to verify actual YouTube player state.
        db.add(LessonVideos(lesson_id=video.id,file_id='dQw4w9WgXcQ',video_url='https://www.youtube.com/watch?v=dQw4w9WgXcQ',duration=213))
        lang=await db.scalar(select(SupportedLanguages).where(SupportedLanguages.name=='python',SupportedLanguages.is_active.is_(True)).limit(1))
        exercise=LessonCodes(id=uuid4(),lesson_id=code.id,title='Print fixture',description='Print 42 to stdout.',language_id=lang.id,time_limit=3,memory_limit=256000000)
        db.add(exercise);await db.flush()
        db.add_all([LessonCodeFiles(lesson_code_id=exercise.id,filename='main.py',role='starter',content='print(0)',is_main=True),LessonCodeTestcases(lesson_code_id=exercise.id,input='',expected_output='42',is_sample=True,order_index=0)])
        db.add(CourseEnrollments(user_id=user.id,course_id=course.id,status='active'))
        db.add_all([LessonProgress(user_id=user.id,course_id=course.id,lesson_id=x.id,is_completed=False) for x in (video,code)])
        db.add(LessonActive(user_id=user.id,course_id=course.id,lesson_id=video.id))
        sid=uuid4();db.add(Sessions(id=sid,user_id=user.id,refresh_token_hash=uuid4().hex,expired_at=datetime.now(UTC)+timedelta(hours=2),is_revoked=False))
        await db.commit()
        token=await SecurityService().create_access_token(str(user.id),str(sid))
        output={'token':token,'user_id':str(user.id),'owner_id':str(owner.id),'course_id':str(course.id),'course_slug':course.slug,'video_lesson_id':str(video.id),'code_lesson_id':str(code.id),'exercise_id':str(exercise.id)}
        path=Path('/tmp/maymay-agent-verification/browser-fixture.json');path.write_text(json.dumps(output));os.chmod(path,0o600)
        print('Isolated browser fixture created; token stored privately, not logged.')
    await engine.dispose()

if __name__=='__main__':asyncio.run(main())
