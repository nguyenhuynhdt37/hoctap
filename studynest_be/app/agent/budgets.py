"""Admission reservations are distinct from provider-reported token usage.

Monetary admission is optional and fails closed without operator-supplied rates.
No values here claim to be provider invoice/charge accounting.
"""
import json
from decimal import Decimal,InvalidOperation
from fastapi import HTTPException
from app.core.settings import settings


def declared_rates(model):
    try:
        data=json.loads(settings.AGENT_MODEL_PRICES_JSON)
        rate=data.get(model)
        if not isinstance(rate,dict):return None
        incoming=Decimal(str(rate['input_per_million_usd']))
        outgoing=Decimal(str(rate['output_per_million_usd']))
        if not incoming.is_finite() or not outgoing.is_finite() or incoming<0 or outgoing<0:return None
        return incoming,outgoing
    except (ValueError,KeyError,TypeError,InvalidOperation):
        return None


def reserve_model(usage,prompt,model,output_limit):
    result=dict(usage or {})
    estimated=max(1,len(prompt)//3)
    if result.get('estimated_input_tokens',0)+estimated>settings.AGENT_MAX_INPUT_TOKENS:
        raise HTTPException(429,'Đã hết ngân sách ngữ cảnh')
    if result.get('reserved_output_tokens',0)+output_limit>settings.AGENT_MAX_OUTPUT_TOKENS_TOTAL:
        raise HTTPException(429,'Đã hết ngân sách token trả lời')
    # Conservative pure-text byte bound, including the adapter JSON instruction.
    # This is a reservation, not provider-reported input token usage.
    upper_bound=len(prompt.encode('utf-8'))+512
    result['estimated_input_tokens']=result.get('estimated_input_tokens',0)+estimated
    result['reserved_input_token_upper_bound']=result.get('reserved_input_token_upper_bound',0)+upper_bound
    result['reserved_output_tokens']=result.get('reserved_output_tokens',0)+output_limit
    result['model_calls']=result.get('model_calls',0)+1
    result['last_model']=model
    if settings.AGENT_MAX_RUN_COST_USD is not None:
        cap=Decimal(str(settings.AGENT_MAX_RUN_COST_USD))
        if not cap.is_finite() or cap < 0:
            raise HTTPException(503,'Giới hạn chi phí cấu hình không hợp lệ')
        rates=declared_rates(model)
        if rates is None:
            raise HTTPException(503,'Giới hạn chi phí được bật nhưng chưa khai báo giá cho model; yêu cầu chưa gửi provider')
        reservation=(Decimal(upper_bound)*rates[0]+Decimal(output_limit)*rates[1])/Decimal(1_000_000)
        total=Decimal(str(result.get('reserved_cost_usd',0)))+reservation
        if total>cap:
            raise HTTPException(429,'Đã hết ngân sách chi phí cấu hình')
        result['reserved_cost_usd']=float(total)
        result['cost_method']='operator_declared_rate_reservation_not_actual_charge'
    else:
        result['cost_method']='monetary_limit_disabled_tokens_and_deadline_enforced'
    return result


def record_reported(usage,reported,model):
    result=dict(usage)
    valid={k:v for k,v in (reported or {}).items() if k in {'prompt_tokens','completion_tokens','total_tokens'} and isinstance(v,int) and not isinstance(v,bool) and v>=0}
    if not valid:
        result['provider_usage_missing_calls']=result.get('provider_usage_missing_calls',0)+1
        return result
    for key,value in valid.items():
        name='provider_reported_'+key
        result[name]=result.get(name,0)+value
    result['provider_usage_reported_calls']=result.get('provider_usage_reported_calls',0)+1
    rates=declared_rates(model)
    if rates and {'prompt_tokens','completion_tokens'}.issubset(valid):
        cost=(Decimal(valid['prompt_tokens'])*rates[0]+Decimal(valid['completion_tokens'])*rates[1])/Decimal(1_000_000)
        result['priced_reported_usage_usd']=float(Decimal(str(result.get('priced_reported_usage_usd',0)))+cost)
    return result
