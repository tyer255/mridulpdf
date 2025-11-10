# Firebase Setup Guide for Scan & Share PDF

This app requires Firebase for storing PDFs and metadata. Follow these steps to set up Firebase:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "scan-share-pdf")
4. Follow the setup wizard

## 2. Enable Firebase Services

### Enable Firestore Database:
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location close to your users

### Enable Storage:
1. Go to "Storage" in Firebase Console
2. Click "Get started"
3. Use the default security rules for now

## 3. Get Your Firebase Configuration

1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the `firebaseConfig` object

## 4. Update Your App

Replace the placeholder configuration in `src/lib/firebase.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

## 5. Set Up Security Rules

### Firestore Rules:
Go to Firestore → Rules and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pdfs/{pdfId} {
      allow read: if resource.data.visibility == 'public' || 
                     resource.data.userId == request.auth.uid;
      allow write: if request.auth.uid != null;
    }
  }
}
```

### Storage Rules:
Go to Storage → Rules and paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pdfs/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

## Done!

Your app is now ready to use with Firebase!
