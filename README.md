# cloud functions
Functions console: https://console.cloud.google.com/functions/list?env=gen2&authuser=0&project=monbudget-2f616&tab=logs
created from:
- brew install firebase-cli
- firebase login
- firebase init firestore
- firebase init functions

when fetched
- cd functions
- yarn

dev mode, run in separated consoles:
- yarn run build:watch
- firebase emulators:start

to deploy:
- firebase deploy --only functions
