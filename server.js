const express = require('express')
const request = require('request')

const app = express()

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Listening on port 3000...")
})

updateServer()

setInterval(() => {
    updateServer()
}, 5*60*1000)

let mList = []

function updateServer() {
    request({
        url: 'https://server-9099-default-rtdb.firebaseio.com/server/live.json',
        json: true
    }, function (error, response, body) {
        let list = []
        try {
            if(!error && body) {
                for (let url of Object.values(body)) {
                    list.push(url)
                }
            }
        } catch (e) {}

        if (list.length > 0) {
            mList = list
        }

        serverLive()
    })
}

function serverLive() {
    for (let i = 0; i < mList.length; i++) {
        try {
            console.log(mList[i])
            request({ url: mList[i] }, function (error, response, body) {})
        } catch (error) {}
    }
}

app.get('/status', async function (req, res) {
    res.end('ok')
})

app.get('/', async function (req, res) {
    res.end('ok')
})
