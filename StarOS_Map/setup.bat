SET site_path="C:/wamp/www"
SET srv_path=C:/Program Files/StarOS
SET current_dir=%CD%

@ECHO off
CLS


ECHO Setup server
@ECHO off

MKDIR "%srv_path%"
MKDIR "%srv_path%/log"
xcopy /s "srv/StarOS" "%srv_path%"

CD /D "%srv_path%"
DEL "settings.json"

ECHO { >> "settings.json"
ECHO 	"port": 8000, >> "settings.json"
ECHO 	"logdir": "%srv_path%/log" >> "settings.json"
ECHO } >> "settings.json"
ECHO off


ECHO Setup site
@ECHO off

CD /D %current_dir%
echo %current_dir%
xcopy /s "www" %site_path%

ECHO Creating shortcut
@ECHO off

CD /D "%UserProfile%\Desktop\"
DEL "StarOS.bat"
ECHO node "%srv_path%/server.js" >> "StarOS.bat"

CD /D "%srv_path%"
npm install socket.io

PAUSE > nul