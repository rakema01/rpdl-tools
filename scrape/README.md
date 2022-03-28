# Getting Started

Fill out `options.json` as needed

If you are not planning to enable logins, set `useLogin` to `false` and make sure you update the token every week or 2, as they expire 2 weeks after you login.

This means you would need to sign out, then sign back into dl.rpdl.net and grab your new token.

Otherwise, you can set `useLogin` to `true` and fill out `loginData` as needed. You can leave `token` empty as that will get filled out automatically.

## Pull all torrents currently being tracked:

If `data.json` exists, delete it. Leave the script running and it'll grab the torrents.

data.json exists to keep track of what torrents you have downloaded. This is to prevent needless API requests and torrent downloads.

## Running the script a single time

If you want to run the script as a one-time fetch to use with crontab or the like, open up `index.js` with your favorite text editor and delete lines 152 and 155

If you can't find it, it's the lines that starts with `setInterval`. Delete those and the contents in the parentheses, along with the semicolon at the end
