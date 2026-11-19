@echo off
echo ========================================================
echo Lancement du Backend MboaRide (Spring Boot)
echo ========================================================

cd /d "%~dp0\mboaride-backend"

echo [INFO] Utilisation du JDK Java 25 configure dans JAVA_HOME ou PATH...
.\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
pause
