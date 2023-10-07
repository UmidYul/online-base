import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import express from 'express'
import bodyParser from 'body-parser'
import session from 'express-session';
import moment from 'moment'
import path from "path"
import formidable from 'formidable'
import fs from "fs"
import { ifError } from 'node:assert'

const app = express()
const PORT = 3000
const __dirname = dirname(fileURLToPath(import.meta.url))
const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const defaultData = { logins: [], users: [] }
const db = new Low(adapter, defaultData)

app.use(express.static(__dirname + "/public/"))
app.use(bodyParser.json({ type: 'application/json' }))
app.use(bodyParser.urlencoded({ extended: false }))

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

const authMiddleware = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
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
app.get('/user:id/add-student', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/add_student.html")
})

app.post('/add-student', async function (req, res) {
    const currentDate = moment().format('DD-MM-YYYY');
    const id = Date.now().toString()
    await db.read()
    const { users } = db.data
    const form1 = formidable({ multiples: false });
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == req.session.userId) {
            form1.parse(req, (err, fields, files) => {
                if (err) {
                    console.log(err);
                }
                if (files.img) {
                    const oldPath = files.img[0].filepath;
                    const newPath = path.join(__dirname, '/public/images/student/', `${id}.webp`);
                    fs.rename(oldPath, newPath, (error) => {
                        if (error) {
                            res.status(500).json({ error: 'Ошибка при сохранении файла' });
                            return;
                        }
                    });
                    f(fields, "/images/student/" + `${id}.webp`)
                } else {
                    f(fields, "/images/error/error.webp")
                }
            });
            function f(log, img) {
                el.students.push({
                    id: id,
                    img: img,
                    name: log.student_name[0],
                    born_date: log.student_birth_date[0],
                    add_date: currentDate,
                    document: log.document_type[0],
                    phone_number: log.student_tel[0],
                    adress: log.adress[0],
                    mother_name: log.mother_name[0],
                    father_name: log.father_name[0],
                    family_status: log.family_status[0]
                })
                db.write()
                res.redirect(`/user:${req.session.userId}`)
            }

        }
    }
})
app.post('/logout', function (req, res) {
    const { data } = req.body
    req.session.authenticated = data
    res.redirect("/")
})
app.get('/user:id/add-class', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/add_class.html")
})
app.post('/add-class', async function (req, res) {
    const form = formidable({ multiples: false });
    const currentDate = moment().format('DD-MM-YYYY');
    await db.read()
    const { logins, users } = db.data
    const id = Date.now().toString()
    form.parse(req, (err, fields, files) => {
        if (files.img) {
            const oldPath = files.img[0].filepath;
            const newPath = path.join(__dirname, '/public/images/stuff/', `${id}.webp`);
            fs.rename(oldPath, newPath, (error) => {
                if (error) {
                    res.status(500).json({ error: 'Ошибка при сохранении файла' });
                    return;
                }
            });
            f(fields, "/images/stuff/" + `${id}.webp`)
        } else {
            f(fields, "/images/error/error.webp")
        }
    });
    function f(log, img) {
        logins.push({
            id: id,
            login: log.log[0],
            password: log.pass[0],
        })
        users.push({
            info: {
                id: id,
                name: log.name[0],
                class: log.clas[0] + log.letter[0],
                img: img,
                subject: log.subject[0],
                add_date: currentDate,
                role: "teacher",
                students: []
            }
        })
        db.write()
        res.redirect(`/user:${req.session.userId}`)
    }
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
        }
    }
})

app.listen(PORT, console.log(`http://localhost:${PORT}`))
