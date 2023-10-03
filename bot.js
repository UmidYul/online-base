import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import express from 'express'
import bodyParser from 'body-parser'

const app = express()
const PORT = 3000
const __dirname = dirname(fileURLToPath(import.meta.url))
const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const defaultData = { logins: [], users: [] }
const db = new Low(adapter, defaultData)

app.use(express.static('public'));
app.use(bodyParser.json({ type: 'application/json' }))
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/views/main.html")
})
app.get('/login', function (req, res) {
    res.sendFile(__dirname + "/views/login.html")
})
app.get('/admin:id', function (req, res) {
    res.sendFile(__dirname + "/views/admin.html")
})
app.get('/teacher:id', function (req, res) {
    res.sendFile(__dirname + "/views/teacher.html")
})
app.post("/login-api", async function (req, res) {
    const { log, pass } = req.body
    await db.read()
    const { logins, users } = db.data
    const user = logins.find(({ login }) => login == log)
    if (user) {
        if (user.password === pass) {
            for (let i = 0; i < users.length; i++) {
                const el = users[i].info;
                if (el.id == user.id) {
                    if (el.role == "admin") {
                        res.redirect(`/admin:${el.id}`)
                    } else {
                        res.redirect(`/teacher:${el.id}`)
                    }
                }
            }
        } else {
            res.redirect("/login")
        }
    } else {
        res.redirect("/login")
    }
})
app.post("/id", async function (req, res) {
    const { data } = req.body
    await db.read()
    const { users } = db.data
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == data) {
            res.send(JSON.stringify(el))
        }
    }
})

app.listen(PORT, console.log(`http://localhost:${PORT}`))
