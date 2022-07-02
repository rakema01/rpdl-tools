const https = require("https");
const fs = require("fs");
const dlPath = `${process.cwd()}/files`;

const userOptions = fs.existsSync("./options.json") ? JSON.parse(fs.readFileSync("./options.json")) : {
    token: "",
    tokenUpdated: 0,
    waitTimeInSeconds: 180,
    pageSize: 200,
    maxSize: -1, //In MB
    useLogin: false,
    loginData: {
        login: "",
        password: ""
    }
};

let {
    token,
    tokenUpdated,
    waitTimeInSeconds,
    pageSize,
    useLogin,
    maxSize,
    loginData
} = userOptions;

let busy = false;
if(!fs.existsSync(dlPath)){
    fs.mkdirSync(dlPath, {recursive: true});
}

if(!fs.existsSync("./options.json")){
    fs.writeFileSync("./options.json",JSON.stringify(userOptions, null, "\t"));
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
function renameTorrent(title, retries=0){
    const maxRetries = 5;
    if(retries == maxRetries){
        console.log(`Failed to rename ${title} after ${retries} times... Check permissions and make sure you didn't screw it up ;).`);
        return;
    }

    setTimeout(() => {
        fs.rename(`${dlPath}/${title}.torrent.downloading`,`${dlPath}/${title}.torrent`, err => {
            if(err){
                console.log(`Failed renaming ${title}`);
                renameTorrent(title, retries + 1);
            }
        })
    }, 3000)
}
const downloadTorrent = (torrent) => {
    return new Promise((resolve, reject) => {
        if(fs.existsSync(`${dlPath}/${torrent.title}.torrent`)){
            console.log(`${torrent.title} is already downloaded! Skipping...`);
            resolve(true);
        }
        https.get(new Options(`/api/torrent/download/${torrent.torrent_id}`, token), res => {
            if(res.statusCode >= 400){
                reject(`Error ${res.statusCode} accessing https://dl.rpdl.net/torrent/${torrent.torrent_id}`);
            }
            const file = fs.createWriteStream(`${dlPath}/${torrent.title}.torrent.downloading`);
            res.pipe(file);
            res.on('end', () => {
                console.log(`${torrent.title} finished downloading!`);
                renameTorrent(torrent.title);
                resolve(true);
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
    busy = true;
    const results = data.results
        .filter(torrent => downloaded.find(v => v == torrent.torrent_id) ? false : true)
        // .filter(torrent => torrent.category_id != 14) //Filter out certain categories (14 is Renpy)
        .filter(torrent => maxSize > -1 ? torrent.file_size / 1000000 <= maxSize : true);
    const promises = [];
    results.forEach((torrent,index) => {
        const promise = new Promise((resolve, reject) => {
            setTimeout(function(){
                downloadTorrent(torrent)
                    .then((finishdl) => {
                        if(!finishdl){
                            resolve();
                        }
                        resolve(torrent.torrent_id);
                    }, (err) => {
                        errors.push(err);
                        resolve();
                    })
            }, index * (1000 / 10))
        });
        promises.push(promise);
    });
    Promise.all(promises).then(ids => {
        ids = ids.filter(v => v !== null);
        if(ids.length > 0){
            console.log(`${ids.length} torrents downloaded!`);
            console.log("Errors: ", errors, "\n");
            downloaded.push(...ids);
            fs.writeFileSync(`data.json`, JSON.stringify(downloaded));
        }
        busy = false;
    });
}

function fetchTorrents(){
    if(!token){
        console.log("Token is not set! Please check your options.");
        process.exit(1);
    }
    if(busy) return;
    try{
        https.get(new Options(`/api/torrents?page_size=${pageSize}&sort=uploaded_DESC`), res => {
            if(res.statusCode >= 400){
                console.log(`Error ${res.statusCode} trying to fetch the torrent list!`);
                return;
            }

            let data = ""
            res.on('data', d => {
                data += d
            });
            res.on('end', () => {
                parseResult(JSON.parse(data).data)
            })
        }).on('error', e => {
            console.log(`Error while trying to get latest torrents: \n\t${e}`)
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