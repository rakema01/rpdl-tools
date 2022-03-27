class Options {
    constructor(path, token){
        this.hostname = "dl.rpdl.net",
        this.port = 443,
        this.path = path,
        this.headers = {
            "Authorization": `Bearer ${token}`
        }
    }
}

module.exports = Options;