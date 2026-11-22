"""Owner/thread-bound raw evidence retrieval behind continuation checkpoint IDs."""
import json
import re
from uuid import UUID
from typing import Literal
from fastapi import HTTPException
from pydantic import Field
from sqlalchemy import select,or_,case
from app.agent.contracts import Contract
from app.db.models.database import TutorChatMessages,TutorChatThreads
from app.db.models.agent import AgentToolCall,AgentRun

class SearchConversation(Contract):
    query:str=Field(min_length=2,max_length=200)
    limit:int=Field(default=5,ge=1,le=8)
class ReadContextEvidence(Contract):
    evidence_id:str=Field(min_length=10,max_length=100)
    offset:int=Field(default=0,ge=0,le=2000000)

async def thread(ctx):
    row=await ctx.db.scalar(select(TutorChatThreads).where(TutorChatThreads.id==ctx.run.thread_id,TutorChatThreads.user_id==ctx.user.id,TutorChatThreads.is_deleted.is_(False)))
    if row is None:raise HTTPException(404,'Conversation not found')
    return row

async def search(ctx,args):
    row=await thread(ctx)
    words=[word for word in re.findall(r'[\wÀ-ỹ]+',args.query.casefold()) if len(word)>2][:6]
    if not words:return {'items':[],'notice':'Hãy dùng tên, mốc hoặc từ khóa cụ thể.'}
    patterns=[TutorChatMessages.content.ilike('%'+word.replace('%','\\%').replace('_','\\_')+'%',escape='\\') for word in words]
    rank=sum(case((predicate,1),else_=0) for predicate in patterns)
    messages=(await ctx.db.scalars(select(TutorChatMessages).where(TutorChatMessages.thread_id==row.id,TutorChatMessages.user_id==ctx.user.id,or_(*patterns))
        .order_by(rank.desc(),TutorChatMessages.created_at.desc()).limit(args.limit))).all()
    items=[]
    for message in messages:
        first=min((message.content.casefold().find(word) for word in words if word in message.content.casefold()),default=0)
        start=max(0,first-500)
        items.append({'evidence_id':'message:'+str(message.id),'role':message.role,'content':message.content[start:start+3000],
                      'offset':start,'total_characters':len(message.content),'created_at':str(message.created_at)})
    return {'items':items,'notice':'Lời trong hội thoại thuộc tài khoản này, không phải nguồn bài học mới hay sự thật do AI xác minh.'}

async def read(ctx,args):
    row=await thread(ctx)
    try:kind,value=args.evidence_id.split(':',1);ident=UUID(value)
    except (ValueError,TypeError):raise HTTPException(422,'Invalid evidence ID') from None
    if kind=='message':
        message=await ctx.db.scalar(select(TutorChatMessages).where(TutorChatMessages.id==ident,TutorChatMessages.thread_id==row.id,TutorChatMessages.user_id==ctx.user.id))
        if message is None:raise HTTPException(404,'Evidence not found')
        body=message.content;role=message.role
    elif kind=='tool':
        call=await ctx.db.scalar(select(AgentToolCall).join(AgentRun,AgentRun.id==AgentToolCall.run_id).where(AgentToolCall.id==ident,AgentRun.thread_id==row.id,AgentRun.user_id==ctx.user.id))
        if call is None:
            from app.agent.semantic_compaction import decode
            from app.db.models.learning_memory import AgentThreadSummary
            projection=await ctx.db.get(AgentThreadSummary,row.id)
            checkpoint=decode(projection)
            if not projection or projection.user_id!=ctx.user.id or args.evidence_id not in checkpoint.get('validated_tool_refs',[]):
                raise HTTPException(404,'Evidence not found')
            body=json.dumps({'raw_tool_record_available':False,'checkpoint_notes':[note for note in checkpoint.get('checkpoint',{}).get('notes',[]) if args.evidence_id in note.get('evidence',[])],
                             'notice':'Bản ghi tool kỹ thuật đã hết hạn; chỉ còn checkpoint đã được kiểm tra quyền tại thời điểm nén. Không phải bản gốc đầy đủ hoặc lần chạy mới.'},ensure_ascii=False)
            role='archived_tool_checkpoint'
        else:
            body=json.dumps({'name':call.name,'status':call.status,'result':call.result},ensure_ascii=False,default=str);role='tool'
    else:raise HTTPException(422,'Invalid evidence type')
    return {'evidence_id':args.evidence_id,'role':role,'content':body[args.offset:args.offset+6000],
        'offset':args.offset,'next_offset':args.offset+6000 if len(body)>args.offset+6000 else None,
        'total_characters':len(body),'notice':'Bản tool gốc đã hết hạn; đây là checkpoint lịch sử, không phải lần chạy mới.' if role=='archived_tool_checkpoint' else 'Bằng chứng lịch sử gốc; giữ phân biệt lời user, lời assistant và trạng thái tool. Không tự coi là hành động vừa hoàn tất.'}
