# Getting Started

Fill out token.json like so:

	"token.here-bop"

You can change this file while the script is running. It will automatically pull your new token the next time it tries to grab torrents.

You can get your token by logging into dl.rpdl.net, opening inspect element, clicking on Storage, then going to Local Storage and selecting https://dl.rpdl.net

You should then be able to see a table, with the key being `torrust_user` and the value being an object encoded as a JSON string

Copy the string after token, for example:

	"token":"this.is-your!token"

Update `token.json` as needed

## Pull all torrents currently being tracked:

If `data.json` exists, delete it. Leave the script running and it'll grab the torrents.

data.json exists to keep track of what torrents you have downloaded. This is to prevent needless API requests and torrent downloads.

## Running the script a single time

If you want to run the script as a one-time fetch to use with crontab or the like, open up `index.js` with your favorite text editor and delete the final line

If you can't find it, it's the line that starts with `setInterval`. Delete that and the contents in the parentheses, along with the semicolon at the end
