const https = require("https");
const fs = require("fs");
const dlPath = `${process.cwd()}/files`;

const userOptions = JSON.parse(fs.readFileSync("./options.json")) || {
    "token": "",
    "tokenUpdated": 0,
    "waitTimeInSeconds": 60,
    "pageSize": 5000,
    "useLogin": false,
    "loginData": {
        "login": "username",
        "password": "password"
    }
};

let {
    token,
    tokenUpdated,
    waitTimeInSeconds,
    pageSize,
    useLogin,
    loginData
} = userOptions;

if(!fs.existsSync(dlPath)){
    fs.mkdirSync(dlPath, {recursive: true});
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
function getTokenFromLogin(){
    if(!loginData || !loginData.login || !loginData.password){
        console.log("Login data is missing! Skipping login...");
        return;
    }
    return new Promise((resolve, reject) => {
        const loginString = JSON.stringify(loginData);
        
        const req = https.request({
            hostname: "dl.rpdl.net",
            port: 443,
            path: "/api/user/login",
            method: "POST",
            headers: {
                'Content-Type': "application/json",
                'Content-Length': loginString.length
            }
        }, res => {
            if(res.statusCode != 200){
                console.log("Login failed!");
                console.log(res);
                return;
            }
            let data = "";
            res.on("data", d => {
                data += d;
            })
    
            res.on("end", () => {
                token = JSON.parse(data).data.token;
                tokenUpdated = Date.now();
                userOptions.tokenUpdated = tokenUpdated; 
                userOptions.token = token;
                fs.writeFileSync("./options.json",JSON.stringify(userOptions, null, "\t"));
                resolve();
            })
        })
    
        req.on("error", err => {
            console.log(err);
        });
        req.write(loginString);
        req.end();

    });
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

function fetchTorrents(){
    if(!token){
        console.log("Token is not set! Please check your options.");
        return;
    }
    try{
        https.get(new Options(`/api/torrents?page_size=${pageSize}&sort=uploaded_DESC`), res => {
            if(res.statusCode >= 400){
                console.log(`Error ${res.statusCode} trying to fetch the torrent list!`);
                return;
            }
            console.log('statusCode:', res.statusCode);

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
async function init(){
    if(useLogin && Date.now() - tokenUpdated >= 24 * 60 * 60 * 1000){
        await getTokenFromLogin();
        setInterval(getTokenFromLogin, 24 * 60 * 60 * 1000);
    }
    fetchTorrents();
    setInterval(fetchTorrents, waitTimeInSeconds * 1000);
}

init();