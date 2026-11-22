import sys,asyncio,json,argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.agent.semantic_compaction import summarize

async def main():
    parser=argparse.ArgumentParser();parser.add_argument('--state-file');parser.add_argument('--resume',action='store_true');args=parser.parse_args()
    delta=[{'id':f'message:fixture-{i}','kind':'message','role':'user','text':f'Trao đổi phụ {i}: hôm nay luyện viết câu, không có quyết định mới.'} for i in range(50)]
    delta[0]['text']='Mục tiêu của tôi: ôn Văn bằng hiểu ý và ví dụ; tuyệt đối không ép học thuộc toàn bộ bài.'
    delta[24]['text']='Chốt hạn nộp dàn ý là thứ Sáu.'
    if args.resume and args.state_file:
        first=json.loads(Path(args.state_file).read_text())
    else:
        first=await summarize({'notes':[]},delta)
        if args.state_file:Path(args.state_file).write_text(json.dumps(first,ensure_ascii=False))
    print(json.dumps({'stage':1,'goal_retained':any(note['kind']=='goal' for note in first['notes']),'middle_decision_retained':any('sáu' in note['text'].casefold() for note in first['notes'])}),flush=True)
    second=await summarize(first,[{'id':'message:correction','kind':'message','role':'user','text':'Đổi hạn nộp dàn ý sang thứ Hai, thay cho thứ Sáu. Tiếp tục giải thích cách lập luận bằng ví dụ.'},
        {'id':'tool:result','kind':'tool','text':'Tool trả exit_code=1, status=failed; chưa tạo được dàn ý, cần làm tiếp. Không được nhận đã hoàn tất.'}])
    text=json.dumps(second,ensure_ascii=False)
    assert 'thứ hai' in text.casefold()
    assert any(note['kind']=='goal' for note in second['notes'])
    assert any(any(word in note['text'] for word in ['thuộc','hiểu','vẹt','ví dụ']) for note in second['notes'])
    assert any(note['kind'] in {'pending','current_task','uncertainty','tool_result'} and ('chưa' in note['text'] or 'lỗi' in note['text'] or 'failed' in note['text'] or 'thất bại' in note['text']) for note in second['notes'])
    print(json.dumps({'passed':True,'original_messages':52,'checkpoint_notes':len(second['notes']),'checkpoint_characters':len(text),'retained_middle_decision':True,'retained_failure':True},ensure_ascii=False))
asyncio.run(main())
