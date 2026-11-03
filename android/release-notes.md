## Reliability and safer updates

- Fix the startup crash affecting v1.0.12 after installation. Install this signed APK over the existing production app; do not uninstall or clear storage to retry an update.
- Check GitHub Releases in the background when Aide opens, at most once every six hours. You can also check manually in Settings.
- See the new version, release date, release notes and download size in a native update dialog. Choose Update now or Later for optional updates.
- Download the compatible APK with progress and retry after network or interrupted-download failures. Verify its size, SHA-256 checksum, package, version and signing certificate before installation.
- Explain Android's installation permission and hand the APK to Android for confirmation. Aide never installs silently and refreshes the installed version when you return.
- Preserve the existing production signing key and local business data during in-place upgrades. Required-update policy is supported; this release defaults to optional updates.
