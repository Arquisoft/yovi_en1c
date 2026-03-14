# yovi_en1c - Game Y at UniOvi

[![Release — Test, Build, Publish, Deploy](https://github.com/arquisoft/yovi_en1c/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_en1c/actions/workflows/release-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_en1c&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_en1c)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_en1c&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_en1c)

# Introduction

This is a base project for the Software Architecture course in 2024/2025. It is a basic application composed of several components.

- Users service. Express service that handles the insertion of new users in the system.
- Game service. Express service that handles the functionalities of the game.
- Gateway service. Express service that is exposed to the public and serves as a proxy to the previous ones.
- Webapp. React web application that uses the gateway service to manage the different application characteristics.

The user uses a Mongo database that is accessed with Mongoose.

# Team members

- Andrés Álvarez Fernández (AndresUO300170)
- Fernando Cachón Alonso (fercalonso)
- Javier Yáñez Luzón (JavierYanez23)
- Elif Busra Caylan (ebus99)
- Joona Santeri Pikkarainen (fjopi016)

# Launching the application using docker

To launch the application using Docker Compose, run:
    docker compose --profile dev up --build

You may optionally add the --watch flag to enable file watching and automatic reload when changes are saved:
    docker compose --profile dev up --build --watch

If you also want the front-end to hot-reload when saving changes, you need to modify the Dockerfile in the webapp module. Replace the last command with:

    CMD ["npm", "start"]
instead of:

    CMD ["npm", "run", "prod"]

⚠️ Important
If you modify the Dockerfile, make sure it is not included in your commits. To prevent this, you can add it to your .gitignore file.

# Running the Application Without Docker Compose

## Start the database
You first need to run a MongoDB instance. You can either install MongoDB locally or start it using Docker:

    docker run -d -p 27017:27017 --name=my-mongo mongo:latest

Alternatively, you can use a cloud-hosted database service such as MongoDB Atlas.

## Start the backend services

Navigate to the directories of the user and gateway services. In each one, install the dependencies and start the service:

    npm install
    npm start

## Start the frontend

Go to the webapp directory and run:

    npm install
    npm start

Once all components are running, the application should be accessible at: http://localhost:3000

# Deployment Environment Setup

The deployment machine can be created using cloud providers such as Microsoft Azure or Amazon AWS. In general, the virtual machine should meet the following requirements:

    - A Linux system running Ubuntu 20.04 or later (Ubuntu 24.04 is recommended).
    - Docker installed on the system.
    - The necessary network ports open for the application services:
        - Port 3000 for the web application
        - Port 8000 for the gateway service

## Installing Docker

After creating the virtual machine, you can install Docker by running the following commands:

    sudo apt update
    sudo apt install apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
    sudo apt update
    sudo apt install docker-ce
    sudo usermod -aG docker ${USER}

These steps install Docker and add your user to the docker group, allowing you to run Docker commands without needing sudo.

