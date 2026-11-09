import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, Response

from app.core.settings import settings
from app.schemas.auth.user import GoogleLogin
from app.services.shares.auth import AuthService


class GoogleLoginConfigurationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.service = AuthService.__new__(AuthService)
        self.service.db = AsyncMock()

    async def test_missing_client_id_fails_before_google_verification(self):
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "  "),
            patch("app.services.shares.auth.id_token.verify_oauth2_token") as verify,
            self.assertRaises(HTTPException) as error,
        ):
            await self.service.login_google_async(GoogleLogin(credential="test"), Response())
        self.assertEqual(error.exception.status_code, 503)
        verify.assert_not_called()
        self.service.db.execute.assert_not_awaited()

    async def test_configured_audience_is_passed_to_google(self):
        client_id = "123-example.apps.googleusercontent.com"
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", " " + client_id + " "),
            patch("app.services.shares.auth.id_token.verify_oauth2_token", return_value={}) as verify,
            self.assertRaises(HTTPException),
        ):
            await self.service.login_google_async(GoogleLogin(credential="test"), Response())
        self.assertEqual(verify.call_args.args[0], "test")
        self.assertEqual(verify.call_args.args[2], client_id)


if __name__ == "__main__":
    unittest.main()
