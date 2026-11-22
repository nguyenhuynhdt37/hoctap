"""Deterministic hashing and sandbox-result interpretation; no model grades execution."""
import hashlib
import json


def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def files_manifest(files):
    return sorted([{'filename': f.filename, 'is_main': bool(f.is_main),
                    'content_hash': content_hash(f.content)} for f in files], key=lambda f: f['filename'])


def files_hash(files):
    return content_hash(json.dumps(files_manifest(files), sort_keys=True, separators=(',', ':')))


def classify_execution(response, expected):
    """Piston enforces limits; its CPU time is milliseconds and may be absent."""
    compile_result = response.get('compile') or {}
    if compile_result and compile_result.get('code') != 0:
        return 'compile_error', compile_result
    run = response.get('run') or {}
    if run.get('status') == 'TO':
        return 'time_limit_exceeded', run
    if run.get('status') in {'ML', 'ME'}:
        return 'memory_limit_exceeded', run
    if run.get('code') != 0 or run.get('signal'):
        return 'runtime_error', run
    if (run.get('stdout') or '').strip() == (expected or '').strip():
        return 'passed', run
    return 'failed', run


def exercise_suite_hash(code):
    # Kept server-side only: raw hidden inputs never enter the attempt result.
    payload = {'exercise_id':str(code.id),'language_id':str(code.language_id),
               'time_limit':code.time_limit,'memory_limit':code.memory_limit,
               'cases': sorted([{'id':str(tc.id),'input':tc.input,'expected':tc.expected_output,
                                  'is_sample':bool(tc.is_sample)} for tc in code.lesson_code_testcases],key=lambda t:t['id'])}
    return content_hash(json.dumps(payload,sort_keys=True,separators=(',',':')))
