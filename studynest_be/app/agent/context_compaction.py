"""Bounded, extractive working context. Full chat/source records remain unchanged."""
import json
import re

MAX_PROMPT_CHARS = 24000


def excerpt(text, limit):
    if len(text) <= limit:
        return text
    # Explicitly mark omissions; never claim this is a complete source.
    head = max(1, limit * 2 // 3)
    tail = max(0, limit - head - 25)
    return text[:head] + '\n[…đã rút gọn…]\n' + (text[-tail:] if tail else '')


def trim(value, *, text_limit=1200, list_limit=8, depth=0):
    if depth > 8:
        return '[dữ liệu lồng sâu đã rút gọn]'
    if isinstance(value,str):
        return excerpt(value,text_limit)
    if isinstance(value,list):
        result=[trim(item,text_limit=text_limit,list_limit=list_limit,depth=depth+1) for item in value[:list_limit]]
        if len(value)>list_limit:
            result.append({'omitted_items':len(value)-list_limit})
        return result
    if isinstance(value,dict):
        return {key:trim(item,text_limit=text_limit,list_limit=list_limit,depth=depth+1) for key,item in list(value.items())[:35]}
    return value


def schema_minimal(value):
    if isinstance(value,list):return [schema_minimal(v) for v in value]
    if isinstance(value,dict):return {k:schema_minimal(v) for k,v in value.items() if k not in {'title','description','examples','default'}}
    return value


def prompt_payload(message, context, outputs):
    from copy import deepcopy
    data = deepcopy(context)
    data.pop('routing', None)
    tools = data.get('tools', [])
    data['tool_catalog'] = [{'name':t['name'],'description':t.get('description','')} for t in tools]
    data['context_policy'] = {
        'compacted':bool((data.get('conversation') or {}).get('recent_semantically_compacted') or (data.get('working_checkpoint') or {}).get('notes')),
        'full_history_preserved':True, 'automatic_threshold_percent':80,
        'notice':'Chỉ tự nén khi vượt 80% context window model. next_offset chỉ là lựa chọn đọc thêm khi cần, không phải lệnh phải đọc đến hết.',
    }
    return {'user_request':message,'context':data,'tool_results':deepcopy(outputs)}


def compact_prompt(instructions,message,context,outputs,limit=MAX_PROMPT_CHARS):
    # Legacy name/API: no character trimming. Runtime gates semantic compaction
    # against the selected model's real context window before dispatch.
    return instructions+json.dumps(prompt_payload(message,context,outputs),ensure_ascii=False,default=str,separators=(',',':'))


def transcript_excerpt(full, *, seconds=None, overview=False, limit=5000):
    if len(full)<=limit:
        return full,0,False,'complete'
    if overview:
        width=max(200,(limit-300)//6)
        pieces=[]
        for i in range(6):
            start=int((len(full)-width)*i/5)
            end=full.find('\n',start)
            if end>=0 and end-start<150:start=end+1
            pieces.append(f'[Trích đoạn {i+1}/6]\n'+full[start:start+width])
        return '\n\n'.join(pieces),0,True,'representative_excerpts'
    matches=list(re.finditer(r'(?:`|\[)?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:`|\])?',full))
    if seconds is not None and matches:
        nearest=min(matches,key=lambda m:abs(int(m[1] or 0)*3600+int(m[2])*60+int(m[3])-seconds))
        start=max(0,nearest.start()-limit//3)
        return full[start:start+limit],start,True,'current_video_window'
    return full[:limit],0,True,'opening_excerpt'
