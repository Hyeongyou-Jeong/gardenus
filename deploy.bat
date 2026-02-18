@echo off
chcp 65001 > nul
cd /d %~dp0

echo [1/3] Functions build...
cd functions
call npm run build
if %ERRORLEVEL% neq 0 (
  echo Build failed!
  exit /b 1
)
cd ..

echo [2/3] Deploy Firestore rules...
call firebase deploy --only firestore:rules

echo [3/3] Deploy Functions...
call firebase deploy --only functions

echo Done!
