from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import get_settings

_bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache
def _jwks_client(supabase_url: str) -> PyJWKClient:
    # One client (and its cached key set) per process, not per request -
    # PyJWKClient caches the fetched JWKS for 5 minutes by default, so this
    # doesn't hit Supabase's endpoint on every call.
    return PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Verifies the Supabase access token attached as `Authorization: Bearer <jwt>`
    and returns the user's id (the token's `sub` claim). `aud: "authenticated"` is
    always checked so an unrelated token can't pass.

    Which key verifies the signature depends on how the Supabase project is
    configured, not on anything this app controls: newer projects sign with an
    asymmetric key (ES256/RS256) published as JWKS, while older ones use a
    shared HS256 secret. The token's own `alg` header says which one it is, so
    both are supported here rather than assuming one - this project's tokens
    turned out to be ES256, sent to a verifier that only accepted HS256, which
    fails every single token outright (a bad `alg`, not a bad/expired token)."""
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or malformed Authorization header")

    settings = get_settings()

    try:
        alg = jwt.get_unverified_header(credentials.credentials).get("alg")

        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Auth is not configured on the server")
            payload = jwt.decode(
                credentials.credentials,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            if not settings.supabase_url:
                raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Auth is not configured on the server")
            signing_key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(credentials.credentials)
            payload = jwt.decode(
                credentials.credentials,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject claim")
    return user_id
