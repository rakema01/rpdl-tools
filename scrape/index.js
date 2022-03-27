const waitTimeInSeconds = 60;

const https = require("https");
const fs = require("fs");

let token = "";
const dlPath = `${process.cwd()}/files`;
const tokenFile = `${process.cwd()}/token.json`;

if(!fs.existsSync(dlPath)){
    fs.mkdirSync(dlPath, {recursive: true});
}
if(!fs.existsSync(tokenFile)){
    fs.writeFileSync(tokenFile, JSON.stringify(token));
}

class Options{
    constructor(path){
        this.hostname = "dl.rpdl.net",
        this.port = 443,
        this.path = path,
        this.headers = {
            "Authorization": `Bearer ${token}`
        }
    }
}

const downloadTorrent = (torrent) => {
    if(fs.existsSync(`${dlPath}/${torrent.title}.torrent`)){
        console.log(`${torrent.title} is already downloaded! Skipping...`);
        return;
    }
    return new Promise((resolve, reject) => {
        https.get(new Options(`/api/torrent/download/${torrent.torrent_id}`, token), res => {
            if(res.statusCode >= 400){
                reject(`Error ${res.statusCode} accessing https://dl.rpdl.net/torrent/${i}`);
            }
            const file = fs.createWriteStream(`${dlPath}/${torrent.title}.torrent`);
            res.pipe(file);
            res.on('end', () => {
                console.log(`${torrent.title} finished downloading!`);
                resolve();
            })

        })
    })
}

async function parseResult(data){
    const downloaded = fs.existsSync(`data.json`) ? Array.from(JSON.parse(fs.readFileSync(`data.json`))) : [];
    const errors = [];
    const results = data.results.filter(torrent => downloaded.find(v => v == torrent.torrent_id) ? false : true);
    results.forEach((torrent,index) => {
        setTimeout(async function(){
            try {
                await downloadTorrent(torrent);
                downloaded.push(torrent.torrent_id);
                if(index == data.results.length - 1){
                    console.log(`${downloaded.length} torrents downloaded!`);
                    console.log(errors);
                }
                fs.writeFileSync(`data.json`, JSON.stringify(downloaded));
            } catch (err) {
                errors.push(err);
                if(index == data.results.length - 1){
                    console.log(`${downloaded.length} torrents downloaded!`);
                    console.log(errors);
                }
            }
        }, index * (1000 / 15))
    });
}

function init(){
    try{
        token = JSON.parse(fs.readFileSync(tokenFile));
        https.get(new Options("/api/torrents?page_size=5000&sort=uploaded_DESC"), res => {
            if(res.statusCode >= 400){
                console.log(`Error ${res.statusCode} trying to fetch the torrent list!`);
                return;
            }
            console.log('statusCode:', res.statusCode);
            // console.log('headers:', res.headers);
            let data = ""
            res.on('data', d => {
                data += d
            });
            res.on('end', () => {
                parseResult(JSON.parse(data).data)
            })
        })
    } catch (err) {
        console.log("Failed to get torrent list!");
    }
}
init();
setInterval(init, waitTimeInSeconds * 1000);