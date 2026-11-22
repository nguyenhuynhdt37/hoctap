"""Model window metadata and explicitly estimated current-request occupancy."""
import asyncio
import json
import time
import httpx
from app.core.settings import settings

CACHE = {}


def estimate_tokens(value):
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, default=str)
    return max(1, (len(text.encode('utf-8')) + 2) // 3)


async def model_window(provider, model):
    try:
        overrides = json.loads(settings.AGENT_CONTEXT_WINDOWS_JSON)
        value = overrides.get(model)
        if isinstance(value, int) and not isinstance(value, bool) and value > 0:
            return value, 'operator_override'
    except (ValueError, TypeError):
        pass
    key = (provider, settings.NINEROUTER_BASE_URL, model)
    cached = CACHE.get(key)
    if cached and cached[0] > time.monotonic():
        return cached[1:]
    try:
        if provider == '9router':
            async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
                response = await client.get(settings.NINEROUTER_BASE_URL.rstrip('/')+'/models',
                    headers={'Authorization':'Bearer '+settings.NINEROUTER_API_KEY})
                response.raise_for_status()
                for row in response.json().get('data', []):
                    window = row.get('context_length') or (row.get('capabilities') or {}).get('contextWindow')
                    if isinstance(window, int) and not isinstance(window, bool) and window > 0:
                        CACHE[(provider,settings.NINEROUTER_BASE_URL,row['id'])] = (time.monotonic()+300,window,'provider_metadata')
                cached = CACHE.get(key)
                if cached:return cached[1:]
        elif provider == 'gemini':
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY_CHAT or settings.GOOGLE_API_KEY)
            info = await asyncio.wait_for(asyncio.to_thread(genai.get_model, model if model.startswith('models/') else 'models/'+model), timeout=8)
            window = info.input_token_limit
            if isinstance(window, int) and window > 0:
                CACHE[key] = (time.monotonic()+300,window,'provider_metadata')
                return window,'provider_metadata'
    except Exception:
        pass
    CACHE[key] = (time.monotonic()+30,None,'unknown')
    return None,'unknown'


def occupancy(prompt, *, model, window, source, output_tokens=0, image_count=0, tool_history=None, native_tools=None):
    used = estimate_tokens(prompt) + (estimate_tokens(tool_history) if tool_history else 0) + (estimate_tokens(native_tools) if native_tools else 0) + image_count*8192 + output_tokens
    return {'model':model,'used_tokens':used,'context_window_tokens':window,
            'percent':round(used/window*100,2) if window else None,
            'should_compact':bool(window and used > window*0.8),
            'threshold_percent':80,'estimated':True,'limit_source':source,
            'includes_output_reserve':output_tokens}
