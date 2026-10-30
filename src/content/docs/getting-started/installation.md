## Choose how to install Aide

Aide is available as a progressive web app in any browser, a Windows desktop
app, and a native Android app.

The browser app and the desktop app are the same application: they talk to your
Aide account, so your data follows you between them. **The Android app is a
separate, local-only client.** It keeps its own database on the phone, needs no
account or internet connection, and does not sync with the web or desktop app.
Installing it does not move data between the two.

| Platform | How to get it | Best for |
| --- | --- | --- |
| Android | Download the APK from [Get the app](/downloads) | Phones and tablets, including offline installs |
| Windows | Download the `.exe` from [Get the app](/downloads) | A fixed till machine on a counter |
| Any browser | Open the site and choose *Install app* | iPads, Chromebooks and anything else |

All published builds, with file sizes and SHA-256 checksums, are listed on the
[downloads page](/downloads). The same list is available as JSON through
[GET /api/releases](/docs/api/releases).

## Install on Android

1. Open [Get the app](/downloads) and choose the Android APK.
2. Download the file. It is an `.apk` supplied directly by us — there is no
   Play Store listing yet, so Android will ask you to allow installs from your
   browser or file manager.
3. Open the downloaded file and confirm the install.
4. Open Aide and enter your business name, currency and VAT rate. There is no
   sign-in: the account is created on the device and never leaves it.

Aide requests notification permission after first launch. Grant it so low-stock
and sale alerts reach you — see [Notifications](/docs/guides/notifications).

### If Android says "App not installed"

This is Android refusing to replace the copy already on the phone, not a broken
download. It has three causes:

| Cause | What you see | Fix |
| --- | --- | --- |
| The installed Aide was signed with a different certificate (a debug build, or a release from before the signing key changed) | "App not installed" with no other detail | Export your data, uninstall the old app, install the new APK |
| The download was truncated or altered | Install fails, or the app crashes immediately | Check the SHA-256 (below) and download again |
| The new APK's `versionCode` is lower than the installed one | "App not installed", or an offer to downgrade | Install the newest release, never an older one |

**Export before you uninstall.** The Android app's data lives only on that phone
— Settings → *Export data* writes a JSON copy of products, sales, expenses and
customers. Uninstalling deletes everything else.

Each release's notes record the package name, `versionCode`, APK SHA-256, and
the SHA-256 fingerprint of the certificate that signed it, so two builds can be
compared without a terminal.

## Install on Windows

1. Open [Get the app](/downloads) and choose the Windows installer.
2. Run the installer and follow the prompts.
3. Launch Aide and sign in.

The Windows build is the same cloud application in a desktop shell: the usual
choice for a dedicated till.

## Install as a progressive web app

Any modern browser can install Aide. On Android Chrome, use *Add to Home screen*.
On iOS Safari, use *Share* then *Add to Home Screen*. On desktop Chrome or Edge,
use the install icon in the address bar.

Once installed it launches full screen, keeps working offline and stores its data
on the device.

## Verify what you installed

Every release asset carries a SHA-256 checksum on the [downloads page](/downloads).
To check a file you have already downloaded:

```bash
sha256sum aide-<version>.apk
```

Compare the output against the checksum published for that release. If they do
not match, delete the file and download it again.

You can also confirm what the server currently considers the newest build:

```bash
curl https://aide.omixsystems.store/api/latest-release
```

See [Releases](/docs/api/releases) for the exact response shape.

## Next

[Set up your business](/docs/getting-started/setup) — categories, products and
your tax rate.
