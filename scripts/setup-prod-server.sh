#!/usr/bin/env bash

source secrets.sh

ssh ${SSH_USER}@${SSH_HOST} '
    # nvm
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash;
    export NVM_DIR="$HOME/.nvm";
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh";  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion";  # This loads nvm bash_completion
    nvm install 12.16.1;
    nvm use 12.16.1;

    # yarn & pm2
    npm i -g yarn pm2;

    # mongo
    apt update
    apt install -y mongodb

    # create corgiSecrets.json
    touch ~/corgiSecrets.json
'
