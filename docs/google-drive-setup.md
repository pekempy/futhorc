# Setting up Google Drive backup

Both apps back progress up to the same file in your Google Drive **application
data folder** — a hidden, per-app area that doesn't appear in your Drive and
that only this app can read. The only Drive permission either app asks for is
`drive.appdata`, which grants access to that folder and nothing else. Neither
app can see your documents.

This is the one part I couldn't do for you: it needs a Google Cloud project and
OAuth clients tied to your own account.

---

## 1. Create the project

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a
   project — call it **Futhorc**.
2. **APIs & Services → Library** → enable the **Google Drive API**.

## 2. Consent screen

**APIs & Services → OAuth consent screen**:

- User type: **External** (unless you have a Workspace domain, in which case
  Internal is simpler and skips verification entirely)
- App name: Futhorc · your email for both support and developer contact
- **Scopes**: add `.../auth/drive.appdata`, plus `openid`, `email`, `profile`
- **Test users**: add your own Google account

Leave it in **Testing**. That's the important bit: in testing mode only the
accounts you list can sign in, but you don't need Google's verification review.
`drive.appdata` is a "sensitive" scope, so publishing would mean submitting for
review. For a personal app, staying in testing is the right call — the only
cost is that a refresh token expires after seven days, which for our purposes
just means signing in again occasionally.

## 3. OAuth clients

**APIs & Services → Credentials → Create credentials → OAuth client ID.**

### Web client (for the web app)

- Type: **Web application**
- Authorised JavaScript origins:
  - `http://localhost:7863` (the dev server)
  - whatever you serve the built app from
- No redirect URI needed — Google Identity Services uses the popup flow

Copy the client ID. It looks like `1234-abcd.apps.googleusercontent.com`. It's
public by design: it identifies the app, it doesn't authorise anything on its
own, so it's fine in the repository.

Then either put it in `.env`:

```
VITE_GOOGLE_CLIENT_ID=1234-abcd.apps.googleusercontent.com
```

or paste it into the app's Settings, which stores it in `localStorage` — handy
if you don't want to rebuild.

### Android client

- Type: **Android**
- Package name: `com.pekempy.futhorc`
- SHA-1: **both** of these, as two separate clients or one with both added:

```bash
# release — the new Futhorc keystore
keytool -list -v -alias futhorc \
  -keystore ~/Development/AndroidApps/Futhorc-Keystore/release.keystore

# debug — so it works from Android Studio too
keytool -list -v -alias androiddebugkey \
  -keystore ~/.android/debug.keystore -storepass android -keypass android
```

The Android app needs no client ID in its source: Play Services identifies it
by package name and signing certificate.

> **This is the one that catches everyone.** The debug build carries
> `applicationIdSuffix = ".debug"`, so its package name is
> **`com.pekempy.futhorc.debug`**, not `com.pekempy.futhorc`. You need *two*
> Android OAuth clients:
>
> | Package name | SHA-1 |
> |---|---|
> | `com.pekempy.futhorc` | your release keystore |
> | `com.pekempy.futhorc.debug` | `~/.android/debug.keystore` |
>
> Without the debug one, the symptom is exactly this: the account chooser
> appears, you pick an account, and it fails. Google returns
> `ApiException` status **10, DEVELOPER_ERROR**, which means "no OAuth client
> matches this package name and signing certificate". The app now says so in
> as many words rather than calling it a cancellation.

New clients can take a few minutes to propagate. If it still fails immediately
after adding one, give it five minutes and force-stop the app.

## 4. Check it

Web: Settings → Google Drive → Connect. You should see a Google account
chooser, a consent screen mentioning only "see, create and delete its own
configuration data", and then "Backed up to Drive".

Android: same, under Settings → Google Drive backup.

To prove it round-trips, back up on one, then connect on the other and let it
pull.

---

## How syncing behaves

Newest wins, as configured, with two guards that stop the obvious ways that
loses data:

- **A clock that's wrong.** A backup claiming to be from more than a day in the
  future is ignored rather than trusted.
- **Newer but emptier.** Finishing a unit or earning XP never un-happens. If
  the backup is newer but has *both* fewer completed units and less XP, that's
  almost certainly a device that was opened but not used — so instead of
  overwriting, you're asked, and offered "keep the best of both", which takes
  the union of completed units and the higher of every score.

The web app also keeps a copy of what it replaced on the last restore, so a
pull you didn't want can be undone.

Worth being aware of: newest-wins can still lose work if you use a device
offline for a while and then open another one first. The merge path exists for
exactly that; if you find yourself hitting it often, switching the default from
newest-wins to always-merge is a one-line change in `decide()`.

## What gets backed up

Completed units, per-rune recall and drawing scores, XP, streaks, daily tasks,
your profile, and the three spelling preferences (ligatures, voiceless marking,
word separator).

Deliberately **not** backed up: your Gemini API key, chosen TTS voice and
speech rate. Those are per-device, and an API key has no business in a sync
file.

The format is defined once, in `src/lib/syncFormat.js`, and mirrored in
`data/DriveSync.kt`. Change one, change both, and bump `SYNC_SCHEMA`.
