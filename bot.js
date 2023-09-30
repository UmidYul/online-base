import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import express from 'express'
import bodyParser from 'body-parser'

const app = express()
const __dirname = dirname(fileURLToPath(import.meta.url))
const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const defaultData = { users: [], students: [] }
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
app.get('/admin', function (req, res) {
    res.send("admin")
})
app.get('/teacher', function (req, res) {
    res.sendFile(__dirname + "/views/teacher.html")
})
app.post("/login-api", async function (req, res) {
    const { log, pass } = req.body
    await db.read()
    const { users } = db.data
    const user = users.find(({ login }) => login == log)
    if (pass === user.password) {
        console.log(true)
        if (user.role === "admin") {
            res.redirect("/admin")
        } else {
            res.redirect("/teacher")
        }
    } else {
        res.redirect("/login")
    }
})

app.listen(3000)