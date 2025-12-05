# Android "Open With" PDF Integration Setup

This document explains how to configure the Android app to appear in the system "Open With" chooser for PDF files.

## Prerequisites

1. Capacitor project setup complete
2. Android platform added: `npx cap add android`

## Automatic Configuration

The `capacitor.config.ts` file already includes intent filters for PDF handling. When you run `npx cap sync`, these should be applied.

## Manual AndroidManifest.xml Configuration

If the intent filters are not automatically applied, you need to manually add them to your `android/app/src/main/AndroidManifest.xml` file.

Add the following inside the `<activity>` tag (the main activity):

```xml
<!-- PDF File Viewer Intent Filters -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="file" android:mimeType="application/pdf" />
</intent-filter>

<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="content" android:mimeType="application/pdf" />
</intent-filter>

<intent-filter>
    <action android:name="android.intent.action.OPEN_DOCUMENT" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/pdf" />
</intent-filter>

<!-- Handle PDFs from external apps like WhatsApp, Telegram -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/pdf" />
</intent-filter>
```

## Complete AndroidManifest.xml Example

Your main activity should look similar to this:

```xml
<activity
    android:name=".MainActivity"
    android:label="@string/app_name"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:launchMode="singleTask"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:exported="true">
    
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    
    <!-- PDF Intent Filters -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="file" android:mimeType="application/pdf" />
    </intent-filter>

    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="content" android:mimeType="application/pdf" />
    </intent-filter>

    <intent-filter>
        <action android:name="android.intent.action.OPEN_DOCUMENT" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="application/pdf" />
    </intent-filter>

    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="application/pdf" />
    </intent-filter>
</activity>
```

## File Permission for Android 10+

For Android 10 and above, add this to your `AndroidManifest.xml` in the `<application>` tag:

```xml
<application
    android:requestLegacyExternalStorage="true"
    ... >
```

## Testing

1. Build and install the app on an Android device
2. Open any file manager app
3. Navigate to a PDF file
4. Tap on the PDF file
5. The system "Open With" dialog should show "mridulpdf" as an option
6. Select the app to open the PDF in the in-app viewer

## Supported Sources

After configuration, the app will appear in "Open With" for PDFs from:
- File Manager apps
- Google Drive
- WhatsApp documents
- Telegram files
- Gmail attachments
- Browser downloads
- Any app that shares PDFs

## Troubleshooting

1. **App not appearing in chooser**: Make sure `android:exported="true"` is set on the activity
2. **Can't read file**: Check file permissions in AndroidManifest
3. **Intent not received**: Verify `launchMode="singleTask"` is set
4. **PDF not loading**: Ensure the app has storage permissions granted
