const express = require('express')
const request = require('request')

const SERVER = 'v1'

const app = express()

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Listening on port 3000...")
})

let UPDATE = ''
let START = false
let STOP = false

if (SERVER == 'v1') {
    UPDATE = 'v2'
} else {
    UPDATE = 'v1'
}

changeServer()
updateServer()

setInterval(() => {
    updateServer()
}, 5*60*1000)

setInterval(() => {
    changeServer()
}, 30*60*1000)



function changeServer() {
    request({
        url: 'https://server-9099-default-rtdb.firebaseio.com/server/runing/'+UPDATE+'.json',
        json: true
    }, function (error, response, body) {
        let mData = body
        try {
            if(!error && body) {
                request({
                    url: mData['status'],
                    json: true
                }, function (error, response, body) {
                    let mServer = false
                    try {
                        if(!error && body && body == 'ok') {
                            mServer = true
                        }
                    } catch (e) {}

                    
                    request({
                        url: 'https://backboard.railway.app/graphql?q=deployments',
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                            'cookie': 'rw.session='+mData['session']
                        },
                        body: '{"query":"query deployments($projectId: ID!, $environmentId: ID, $serviceId: ID, $first: Int, $after: ID) {\\n  deployments(\\n    where: {projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId}\\n    first: $first\\n    after: $after\\n  ) {\\n    totalCount\\n    nodes {\\n      ...ProjectDeploymentFields\\n    }\\n    pageInfo {\\n      hasNextPage\\n      endCursor\\n    }\\n  }\\n}\\n\\nfragment ProjectDeploymentFields on Deployment {\\n  id\\n  status\\n  createdAt\\n  projectId\\n  serviceId\\n  url\\n  staticUrl\\n  canRollback\\n  meta\\n  environmentId\\n  suggestAddServiceDomain\\n}","variables":{"projectId":"'+mData['projectId']+'","environmentId":"'+mData['environmentId']+'","serviceId":"'+mData['serviceId']+'","first":10},"operationName":"deployments"}'
                    }, function (error, response, body) {
                        let ID = null
                        let ID2 = null 
                        try {
                            if(!error && body) {
                                let nodes = JSON.parse(body)['data']['deployments']['nodes']
        
                                for (let i = 0; i < nodes.length; i++) {
                                    if (nodes[i]['status'] == 'SUCCESS') {
                                        if (ID == null) {
                                            ID = nodes[i]['id']
                                        }
                                        mServer = true
                                    } else if (nodes[i]['status'] == 'REMOVED' && ID2 == null) {
                                        ID2 = nodes[i]['id']
                                    }
                                }
                            }
                        } catch (e) {}

                        let date = parseInt(new Date().getDate())

                        if (ID == null) {
                            ID = ID2
                        }

                        if(date > 15) {
                            if (SERVER == 'v1' && !mServer) {
                                startServer(ID, mData['session'])
                            } else if(SERVER == 'v2' && mServer) {
                                stopServer(ID, mData['session'])
                            }
                        } else {
                            if (SERVER == 'v1' && mServer) {
                                stopServer(ID, mData['session'])
                            } else if(SERVER == 'v2' && !mServer) {
                                startServer(ID, mData['session'])
                            }
                        }
                    })
                })
            }
        } catch (e) {}
    })
}

function startServer(ID, session) {
    if (!START) {
        request({
            url: 'https://backboard.railway.app/graphql/v2?q=deploymentRollback',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'cookie': 'rw.session='+session
            },
            body: '{"query":"mutation deploymentRollback($id: String!) {\\n  deploymentRollback(id: $id)\\n}","variables":{"id":"'+ID+'"},"operationName":"deploymentRollback"}'
        }, function (error, response, body) {
            try {
                if(!error && body) {
                    if(JSON.parse(body)['data']['deploymentRollback']) {
                        START = true
                    }
                }
            } catch (e) {}
        })
    }
}

function stopServer(ID, session) {
    if (!STOP) {
        request({
            url: 'https://backboard.railway.app/graphql/v2?q=deploymentRemove',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'cookie': 'rw.session='+session
            },
            body: '{"query":"mutation deploymentRemove($id: String!) {\\n  deploymentRemove(id: $id)\\n}","variables":{"id":"'+ID+'"},"operationName":"deploymentRemove"}'
        }, function (error, response, body) {
            try {
                if(!error && body) {
                    if(JSON.parse(body)['data']['deploymentRemove']) {
                        STOP = true
                    }
                }
            } catch (e) {}
        })
    }
}

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

        console.log('Update Server: '+mList.length)
    
        serverLive()
    })
}


function serverLive() {
    for (let i = 0; i < mList.length; i++) {
        try {
            request({ url: mList[i] }, function (error, response, body) {})
        } catch (error) {}
    }
}

app.get('/status', async function (req, res) {
    res.end('ok')
})

app.get('/', async function (req, res) {
    res.end(''+mList.length)
})

