# Releasing to TestFlight

Nothing here runs until the repository variable `RELEASE_ENABLED` is `true`.
Everything runs on GitHub's macOS runners, so no Mac is needed.

## One-time setup (needs the $99 Apple Developer account)

1. Create the app in App Store Connect with bundle ID `com.shbhshs.pomodoro`.
2. Create an App Store Connect API key (Users and Access > Integrations, role App Manager) and download the `.p8`.
3. Create an empty **private** GitHub repo for certificates, e.g. `ios-certificates`.
4. Add these repository secrets:

| Secret | Value |
| --- | --- |
| `APPLE_TEAM_ID` | Team ID from developer.apple.com > Membership |
| `ASC_KEY_ID` | The API key's ID |
| `ASC_ISSUER_ID` | The issuer ID shown above the keys list |
| `ASC_KEY_P8_BASE64` | `base64 -w0 AuthKey_XXXX.p8` |
| `MATCH_GIT_URL` | `https://github.com/<you>/ios-certificates.git` |
| `MATCH_GIT_BASIC_AUTHORIZATION` | `base64 -w0 <<< "<github user>:<token with repo access>"` |
| `MATCH_PASSWORD` | A passphrase you choose; it encrypts the certificates |

5. Set the repository variable `RELEASE_ENABLED` to `true`.
6. Run the **Release to TestFlight** workflow by hand with lane `signing` once.

After that, every merge to `main` uploads a new build to TestFlight.
