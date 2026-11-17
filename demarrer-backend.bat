@echo off
echo ========================================================
echo Lancement du Backend CityShare (Spring Boot)
echo ========================================================

cd /d "%~dp0\cityshare-backend"

set "JAVA_HOME=%~dp0\cityshare-backend\jdk17\jdk-17.0.11+9"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [INFO] Utilisation de Java 17 pour eviter les erreurs Lombok...
.\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
pause
