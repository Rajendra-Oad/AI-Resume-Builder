# AI Provider Choice and BYOK

Users can choose between two credential sources in **Settings → AI connection**:

- **Platform** — uses the deployment's OpenAI/Gemini key and consumes the platform AI budget.
- **Bring your own key (BYOK)** — uses the user's selected provider key. Platform fallback is optional and explicit.

## Security model

- Raw user keys are accepted only by authenticated `PUT` requests over HTTPS.
- Keys are encrypted server-side with AES-256-GCM before persistence.
- The AES master key comes from `USER_API_KEY_ENCRYPTION_KEY`; it is never stored in the database.
- API responses expose only `configured` and a last-four-character hint.
- Keys are never stored in frontend state after the save request, returned by an API, or written to logs.
- Deleting the active BYOK credential automatically returns the user to platform mode.
- BYOK costs are recorded as zero platform cost. If platform fallback is used, that call is recorded as platform usage.

Generate a deployment key with a cryptographically secure tool, Base64-encode the 32 random bytes, and provide it as `USER_API_KEY_ENCRYPTION_KEY`. Back it up in a secrets manager: losing it makes stored user credentials unreadable. Rotation requires a deliberate re-encryption migration using key versions.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/ai/settings` | Read mode/provider and masked credential statuses |
| `PUT` | `/api/v1/ai/settings` | Select platform/BYOK, provider, and fallback policy |
| `PUT` | `/api/v1/ai/settings/credentials/{provider}` | Encrypt and save/replace a user key |
| `DELETE` | `/api/v1/ai/settings/credentials/{provider}` | Delete a user key |

Supported provider identifiers are `gemini` and `openai`.

## Operational requirements

- Production must use HTTPS and a managed secret store for the AES master key and platform provider keys.
- Database backups and the encryption master key must be protected separately.
- Never include real values in `.env.example`, issues, logs, screenshots, commits, or support messages.
- Provider-key validity is confirmed when the first generation call reaches that provider; provider error responses remain sanitized.
