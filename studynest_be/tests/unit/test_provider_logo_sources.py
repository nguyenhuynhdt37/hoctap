import pytest

from scripts.crawl_provider_logos import logo_candidates, public_url


def test_school_logo_discovery_ignores_shared_department_identity():
    html = '<img src="/Images/logohanoi.png" alt="Logo Sở"><img src="/assets/school-logo.png" alt="Logo trường"><img src="/assets/logo-vnpay.png">'
    assert logo_candidates(html, "https://school.example.com/") == ["https://school.example.com/assets/school-logo.png"]


@pytest.mark.asyncio
@pytest.mark.parametrize("url", ["http://127.0.0.1/logo.png", "http://10.0.0.1/x", "file:///etc/passwd", "https://user:pass@example.com/logo.png"])
async def test_logo_crawler_rejects_private_addresses_and_non_public_urls(url):
    with pytest.raises(ValueError):
        await public_url(url)
