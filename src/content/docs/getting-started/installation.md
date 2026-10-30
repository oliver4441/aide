## Choose how to install Aide

Aide is available as an Android app, a Windows desktop app and a progressive
web app you can install from any browser. All three run the same application and
talk to the same account, so your data follows you between them.

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
4. Sign in with the email and password you registered with.

Aide requests notification permission after first launch. Grant it so low-stock
and sale alerts reach you — see [Notifications](/docs/guides/notifications).

## Install on Windows

1. Open [Get the app](/downloads) and choose the Windows installer.
2. Run the installer and follow the prompts.
3. Launch Aide and sign in.

The Windows build is the usual choice for a dedicated till: it keeps running in
the background and prints receipts to a connected thermal printer.

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
