import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import HTTPException, Response
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.db.models.database import User
from app.db.models.user_identity import UserIdentity
from app.schemas.auth.user import GoogleLogin
from app.services.shares.auth import AuthService


class GoogleLoginConfigurationTests(unittest.IsolatedAsyncioTestCase):
    @pytest.fixture(autouse=True)
    def google_dpop_request(self, dpop_login):
        self.dpop_login = dpop_login

    def setUp(self):
        self.service = AuthService.__new__(AuthService)
        self.service.db = AsyncMock(spec=AsyncSession)
        self.service._create_session = AsyncMock(return_value={"session_id": "test-session"})
        self.service._broadcast_new_session = AsyncMock()

    async def test_missing_client_id_fails_before_google_verification(self):
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "  "),
            patch("app.services.shares.auth.id_token.verify_oauth2_token") as verify,
            self.assertRaises(HTTPException) as error,
        ):
            await self.service.login_google_async(
                GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
            )
        self.assertEqual(error.exception.status_code, 503)
        verify.assert_not_called()
        self.service.db.scalar.assert_not_awaited()

    async def test_configured_audience_is_passed_to_google(self):
        client_id = "123-example.apps.googleusercontent.com"
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", " " + client_id + " "),
            patch("app.services.shares.auth.id_token.verify_oauth2_token", side_effect=ValueError) as verify,
            self.assertRaises(HTTPException) as error,
        ):
            await self.service.login_google_async(
                GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
            )
        self.assertEqual(error.exception.status_code, 401)
        verify.assert_called_once()
        self.assertEqual(verify.call_args.args[0], "test")
        self.assertEqual(verify.call_args.args[2], client_id)
        self.service.db.scalar.assert_not_awaited()

    async def test_unverified_google_email_is_rejected_before_account_lookup(self):
        for verification in ({}, {"email_verified": False}, {"email_verified": "true"}):
            with (
                self.subTest(verification=verification),
                patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "123-example.apps.googleusercontent.com"),
                patch("app.services.shares.auth.id_token.verify_oauth2_token",
                      return_value={"sub": "subject", "email": "student@example.test", **verification}),
            ):
                response = Response()
                with self.assertRaises(HTTPException) as error:
                    await self.service.login_google_async(
                        GoogleLogin(credential="test"), response, request=self.dpop_login.request("google"),
                    )
                self.assertEqual(error.exception.status_code, 401)
                self.assertEqual(error.exception.code, "invalid_token")
                self.assertFalse(response.headers.getlist("set-cookie"))
        self.service.db.scalar.assert_not_awaited()
        self.service.db.execute.assert_not_awaited()

    async def test_invalid_google_subject_is_rejected_before_account_lookup(self):
        self.service.db.execute.side_effect = AssertionError("Account lookup requires a valid Google subject")
        for subject in (None, "", True, "has spaces", "é", "s" * 256):
            claims = {"email": "student@example.test", "email_verified": True}
            if subject is not None:
                claims["sub"] = subject
            with (
                self.subTest(subject=subject),
                patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "123-example.apps.googleusercontent.com"),
                patch("app.services.shares.auth.id_token.verify_oauth2_token", return_value=claims),
                self.assertRaises(HTTPException) as error,
            ):
                await self.service.login_google_async(
                    GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
                )
                self.assertEqual(error.exception.status_code, 401)
                self.assertEqual(error.exception.code, "invalid_token")
        self.service.db.scalar.assert_not_awaited()
        self.service.db.execute.assert_not_awaited()

    async def test_untrusted_issuer_is_rejected_by_google_verifier(self):
        claims = {"iss": "https://example.test", "sub": "subject", "email_verified": True}
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "test-client"),
            patch("app.services.shares.auth.id_token.verify_token", return_value=claims),
            self.assertRaises(HTTPException) as error,
        ):
            await self.service.login_google_async(
                GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
            )
        self.assertEqual(error.exception.status_code, 401)
        self.service.db.scalar.assert_not_awaited()

    async def test_linked_google_subject_is_used_without_email_and_session_keeps_dpop_key(self):
        user = User(id=uuid4(), email="a@example.test", fullname="Test", password="")
        self.service.db.scalar.return_value = user
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "test-client"),
            patch("app.services.shares.auth.id_token.verify_oauth2_token",
                  return_value={"sub": "linked-subject", "email_verified": True}),
        ):
            result = await self.service.login_google_async(
                GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
            )
        self.assertEqual(result["session_id"], "test-session")
        self.service.db.scalar.assert_awaited_once()
        query = self.service.db.scalar.call_args.args[0].compile(dialect=postgresql.dialect())
        self.assertIn("user_identities.provider_subject =", str(query))
        self.assertEqual(set(query.params.values()), {"google", "linked-subject"})
        self.assertEqual(self.service._create_session.call_args.args[0], user.id)
        self.assertEqual(self.service._create_session.call_args.kwargs["jkt"], self.dpop_login.jkt)

    async def test_eligible_legacy_account_links_verified_subject(self):
        user = User(id=uuid4(), email="test@gmail.com", fullname="Test",
                    password="google-oauth", is_verified_email=True)
        self.service.db.scalar.side_effect = [None, None, user, None]
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "test-client"),
            patch("app.services.shares.auth.id_token.verify_oauth2_token",
                  return_value={"sub": "legacy-subject", "email_verified": True, "email": user.email}),
        ):
            await self.service.login_google_async(
                GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
            )
        identity = self.service.db.add.call_args.args[0]
        self.assertIsInstance(identity, UserIdentity)
        self.assertEqual((identity.provider, identity.provider_subject), ("google", "legacy-subject"))
        self.assertEqual((identity.user_id, identity.email_at_link), (user.id, user.email))
        self.service.db.commit.assert_awaited_once()

    async def test_verified_password_account_links_verified_personal_gmail(self):
        user = User(id=uuid4(), email="test@gmail.com", fullname="Test",
                    password="local-hash", is_verified_email=True)
        self.service.db.scalar.side_effect = [None, None, user, None]
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "test-client"),
            patch("app.services.shares.auth.id_token.verify_oauth2_token",
                  return_value={"sub": "password-subject", "email_verified": True, "email": user.email}),
        ):
            await self.service.login_google_async(
                GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
            )
        identity = self.service.db.add.call_args.args[0]
        self.assertIsInstance(identity, UserIdentity)
        self.assertEqual((identity.provider_subject, identity.user_id), ("password-subject", user.id))
        self.assertEqual(self.service._create_session.call_args.args[0], user.id)

    async def test_unsafe_email_matches_do_not_create_a_session_or_identity(self):
        cases = (
            ("external", "test@example.test", "google-oauth", {}, []),
            ("workspace", "test@gmail.com", "google-oauth", {"hd": "workspace.example.test"}, []),
            ("local-password-external", "test@example.test", "local-hash", {}, []),
            ("local-password-workspace", "test@gmail.com", "local-hash", {"hd": "workspace.example.test"}, []),
            ("local-password-another-subject", "test@gmail.com", "local-hash", {}, [uuid4()]),
            ("another-subject", "test@gmail.com", "google-oauth", {}, [uuid4()]),
        )
        for case, email, password, claims, prior_link in cases:
            user = User(id=uuid4(), email=email, fullname="Test", password=password, is_verified_email=True)
            self.service.db.scalar.side_effect = [None, None, user, *prior_link]
            with (
                self.subTest(case=case),
                patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "test-client"),
                patch("app.services.shares.auth.id_token.verify_oauth2_token",
                      return_value={"sub": "other-subject", "email_verified": True, "email": email, **claims}),
                self.assertRaises(HTTPException) as error,
            ):
                await self.service.login_google_async(
                    GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
                )
            self.assertEqual(error.exception.status_code, 409)
        self.service._create_session.assert_not_awaited()
        self.service.db.add.assert_not_called()

    async def test_banned_linked_account_cannot_create_a_session(self):
        self.service.db.scalar.return_value = User(id=uuid4(), is_banned=True)
        with (
            patch.object(settings, "GOOGLE_API_CLIENT_ID_LOGIN_GOOGLE", "test-client"),
            patch("app.services.shares.auth.id_token.verify_oauth2_token",
                  return_value={"sub": "linked-subject", "email_verified": True}),
            self.assertRaises(HTTPException) as error,
        ):
            await self.service.login_google_async(
                GoogleLogin(credential="test"), Response(), request=self.dpop_login.request("google"),
            )
        self.assertEqual(error.exception.status_code, 403)
        self.service._create_session.assert_not_awaited()


def test_google_identity_migration_follows_learning_hub():
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    revisions = ScriptDirectory.from_config(config)
    assert "ai23yz567v890" in {revision.revision for revision in revisions.walk_revisions()}
    assert revisions.get_revision("ai23yz567v890").down_revision == "ah12xy456u789"


if __name__ == "__main__":
    unittest.main()
