import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7f8e89ffe9ec4537b51988a84e118974',
  appName: 'mridulpdf',
  webDir: 'dist',
  server: {
    url: 'https://7f8e89ff-e9ec-4537-b519-88a84e118974.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    // Intent filters for "Open With" PDF support
    // These will be added to AndroidManifest.xml
    intentFilters: [
      {
        action: 'android.intent.action.VIEW',
        autoVerify: false,
        data: [
          {
            scheme: 'content',
            mimeType: 'application/pdf'
          },
          {
            scheme: 'file',
            mimeType: 'application/pdf'
          },
          {
            scheme: 'file',
            pathPattern: '.*\\.pdf'
          },
          {
            scheme: 'content',
            pathPattern: '.*\\.pdf'
          }
        ],
        categories: [
          'android.intent.category.DEFAULT',
          'android.intent.category.BROWSABLE'
        ]
      },
      {
        action: 'android.intent.action.OPEN_DOCUMENT',
        autoVerify: false,
        data: [
          {
            mimeType: 'application/pdf'
          }
        ],
        categories: [
          'android.intent.category.DEFAULT'
        ]
      },
      {
        action: 'android.intent.action.SEND',
        autoVerify: false,
        data: [
          {
            mimeType: 'application/pdf'
          }
        ],
        categories: [
          'android.intent.category.DEFAULT'
        ]
      }
    ]
  },
  plugins: {
    App: {
      // Enable deep link handling
    }
  }
};

export default config;
