#!/bin/bash
# Démarre le backend en mode démonstration : trafic HTTP et requêtes SQL affichés dans ce terminal.
# Prérequis : XAMPP (MySQL) démarré et scripts sql/cours/*.sql exécutés (compte mboa_backend).
cd "$(dirname "$0")"
if [ ! -f target/mboaride-backend-1.0.0.jar ]; then
  ./apache-maven-3.9.6/bin/mvn -q -DskipTests package || exit 1
fi
SPRING_PROFILES_ACTIVE=demo java -jar target/mboaride-backend-1.0.0.jar
