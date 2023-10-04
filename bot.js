import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import express from 'express'
import bodyParser from 'body-parser'
import session from 'express-session';
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

// Настройка сессий
app.use(session({
    secret: 'secret-key', // Секретный ключ для подписи сессии
    resave: false,
    saveUninitialized: true
}));

// Middleware для проверки аутентификации
const authMiddleware = (req, res, next) => {
    if (req.session.authenticated) {
        // Пользователь аутентифицирован, продолжаем выполнение запроса
        next();
    } else {
        // Пользователь не аутентифицирован, перенаправляем на страницу входа
        res.redirect('/');
    }
};



app.get('/', function (req, res) {
    if (req.session.authenticated == true) {
        res.redirect(`/user:${req.session.userId}`)
    } else {
        res.sendFile(__dirname + "/views/login.html")
    }
})
app.get('/user:id', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/user.html")
})
app.post("/login-api", async function (req, res) {
    const { log, pass } = req.body
    await db.read()
    const { logins, users } = db.data
    const user = logins.find(({ login }) => login == log)
    if (user) {
        if (user.password === pass) {
            req.session.authenticated = true;
            for (let i = 0; i < users.length; i++) {
                const el = users[i].info;
                if (el.id == user.id) {
                    res.redirect(`/user:${el.id}`)
                }
            }
        } else {
            res.redirect("/")
        }
    } else {
        res.redirect("/")
    }
})
app.post("/id", async function (req, res) {
    const { data } = req.body
    await db.read()
    const { users } = db.data
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == data) {
            req.session.userId = el.id
            res.send(JSON.stringify(el))
            console.log(el);
        }
    }
})

app.listen(PORT, console.log(`http://localhost:${PORT}`))
