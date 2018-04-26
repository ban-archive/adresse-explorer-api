#!/bin/bash

echo "> Démontage de l'environnement docker (le cas échéant)"
docker-compose -f docker/prepare-addok.yml stop
docker-compose -f docker/prepare-addok.yml rm -f

echo "> Suppression des anciennes données"
rm -Rf data/addok-data

echo "> Importation des données dans Redis"
gzcat data/addok-source-files/*.ndjson.gz | docker-compose -f docker/prepare-addok.yml run addok-importer batch

echo "> Création des ngrams"
docker-compose -f docker/prepare-addok.yml run addok-importer ngrams

echo "> Démontage de l'environnement docker"
docker-compose -f docker/prepare-addok.yml stop
docker-compose -f docker/prepare-addok.yml rm -f

echo "> Listing des fichiers produits"
ls -lh data/addok-data

echo "Terminé"
