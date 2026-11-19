@echo off
echo ========================================================
echo Lancement du Frontend MboaRide (React Native / Expo)
echo ========================================================

cd /d "%~dp0\mboaride-mobile"

echo [INFO] Redirection ADB pour l'emulateur...
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8080 tcp:8080

echo [INFO] Demarrage de Expo en mode offline...
set EXPO_OFFLINE=1
npx expo start --localhost --port 8081

pause
