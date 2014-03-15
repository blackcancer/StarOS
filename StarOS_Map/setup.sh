#!/bin/sh

SITE_PATH="/var/www"
SRV_PATH="/opt/StarOS"
CURRENT_DIR=$PWD

echo INSTALL SERVER
sudo useradd -M -s /bin/nologin staros
sudo mkdir -p $SRV_PATH
sudo cp -R ./srv/StarOS/* $SRV_PATH
sudo mkdir /var/log/StarOS
sudo chown -R staros:staros /var/log/StarOS
sudo chmod -R 644 /var/log/StarOS

echo INSTALL NODE MODULE
cd /usr/lib/node_modules
sudo npm install socket.io

echo INSTALL DAEMON
cd $CURRENT_DIR
sudo cp ./etc/init.d/staros /etc/init.d/
sudo chmod +x /etc/init.d/staros
sudo update-rc.d staros defaults
sudo service staros start

echo INSTALL SITE
sudo cp -R ./www/* $SITE_PATH